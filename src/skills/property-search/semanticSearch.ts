import { query } from "../../tools/database";
import { GeminiEmbeddingError, cosineSimilarity, getEmbeddings, normalizeEmbeddingText } from "./embeddings";

export type SemanticListing = {
  L_ListingID: string;
  L_Address?: string | null;
  L_City?: string | null;
  L_Status: string;
  L_Type_?: string | null;
  L_Keyword2?: number | string | null;
  LM_Dec_3?: number | string | null;
  LM_Int2_3?: number | string | null;
  YearBuilt?: number | string | null;
  L_SystemPrice?: number | string | null;
  L_Remarks?: string | null;
};

export function buildListingEmbeddingText(listing: SemanticListing): string {
  const fields: [string, unknown][] = [
    ["Remarks", listing.L_Remarks], ["Property type", listing.L_Type_],
    ["City", listing.L_City], ["Bedrooms", listing.L_Keyword2],
    ["Bathrooms", listing.LM_Dec_3], ["Square feet", listing.LM_Int2_3],
    ["Year built", listing.YearBuilt], ["Price USD", listing.L_SystemPrice],
  ];
  return fields.filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${String(value).trim()}`).join(". ");
}

export async function semanticSearch(description: string) {
  const text = normalizeEmbeddingText(description);
  if (!text) throw new Error("A property description is required.");
  const rows = await query<SemanticListing>(`
    WITH candidates AS (
      SELECT L_ListingID, L_Address, L_City, L_Status, L_Type_, L_Keyword2,
        LM_Dec_3, LM_Int2_3, YearBuilt, L_SystemPrice, L_Remarks,
        ROW_NUMBER() OVER (ORDER BY L_ListingID, id) AS position,
        COUNT(*) OVER () AS total
      FROM rets_property
      WHERE L_Status = 'Active' AND NULLIF(TRIM(L_Remarks), '') IS NOT NULL
    )
    SELECT * FROM candidates
    WHERE MOD(position - 1, CEIL(total / 50.0)) = 0
    ORDER BY position LIMIT 50
  `);
  const candidates = rows.filter(row => row.L_Status === "Active" && row.L_Remarks?.trim()).slice(0, 50);
  if (!candidates.length) return { candidateCount: 0, matches: [] };
  const vectors = await getEmbeddings([text, ...candidates.map(buildListingEmbeddingText)]);
  const matches = candidates.flatMap((listing, index) => {
    const similarity = cosineSimilarity(vectors[0] ?? [], vectors[index + 1] ?? []);
    return similarity === null ? [] : [{ listing, similarity }];
  }).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  if (!matches.length) throw new Error("No valid embedding comparisons were available.");
  return { candidateCount: candidates.length, matches };
}

export function formatSemanticResults(result: Awaited<ReturnType<typeof semanticSearch>>): string {
  if (!result.matches.length) return "No usable active listings with remarks found.";
  return `Top ${result.matches.length} semantic matches from ${result.candidateCount} sampled active listings (not the entire MLS):\n\n` +
    result.matches.map(({ listing: row, similarity }, index) => [
      `${index + 1}. ${row.L_Address || "Address unavailable"}, ${row.L_City || "City unavailable"} (MLS ${row.L_ListingID})`,
      `Price: ${row.L_SystemPrice == null ? "Unavailable" : "$" + Number(row.L_SystemPrice).toLocaleString("en-US")}`,
      `${row.L_Keyword2 ?? "?"} beds | ${row.LM_Dec_3 ?? "?"} baths | Type: ${row.L_Type_ || "Unavailable"}`,
      `Cosine similarity: ${similarity.toFixed(4)}`,
    ].join("\n")).join("\n\n");
}

export function formatSemanticError(error: unknown): string {
  if (error instanceof GeminiEmbeddingError) {
    return `Semantic search ${error.kind === "credentials" ? "credentials" : "Gemini API"} failure: ${error.message} No results returned.`;
  }
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && /^(ER_[A-Z0-9_]+|E[A-Z0-9_]+|PROTOCOL_[A-Z0-9_]+)$/.test(code)) {
    return `Semantic search database failure (${code}). Check database access. No results returned.`;
  }
  return "Semantic search processing failure. Supply a nonempty description; candidate embeddings must be valid and have consistent dimensions. No results returned.";
}
