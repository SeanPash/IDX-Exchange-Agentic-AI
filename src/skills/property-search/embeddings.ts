import dotenv from "dotenv";

dotenv.config({ quiet: true });

export class GeminiEmbeddingError extends Error {
  constructor(public readonly kind: "credentials" | "api", public readonly status?: number) {
    super(kind === "credentials"
      ? "GEMINI_API_KEY is not configured in the project environment."
      : `Gemini embeddings request failed${status ? ` (HTTP ${status})` : " (network or service error)"}.`);
  }
}

export function normalizeEmbeddingText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  let result = "", bytes = 0;
  for (const character of normalized) {
    bytes += Buffer.byteLength(character, "utf8");
    if (bytes > 2000) break;
    result += character;
  }
  return result.trim();
}

export function isValidEmbedding(vector: number[]): boolean {
  return Array.isArray(vector) && vector.length > 0 && vector.every(Number.isFinite) && vector.some(value => value !== 0);
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const contents = texts.map(normalizeEmbeddingText);
  if (!contents.length || contents.some(text => !text)) throw new Error("Embedding text is required.");
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiEmbeddingError("credentials");
  let response;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    response = await new GoogleGenAI({ apiKey }).models.embedContent({
      model: "gemini-embedding-001", contents,
      config: { taskType: "SEMANTIC_SIMILARITY", outputDimensionality: 768,
        httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } } },
    });
  } catch (error) {
    const status = (error as { status?: unknown })?.status;
    throw new GeminiEmbeddingError("api", typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined);
  }
  const vectors = response.embeddings?.map(item => item.values ?? []) ?? [];
  if (vectors.length !== contents.length || vectors.some(vector => !isValidEmbedding(vector) || vector.length !== 768)) {
    throw new Error("Gemini returned invalid embeddings or inconsistent dimensions.");
  }
  return vectors;
}

export async function getEmbedding(text: string): Promise<number[]> {
  return (await getEmbeddings([text]))[0];
}

export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length !== b.length || !isValidEmbedding(a) || !isValidEmbedding(b)) return null;
  const scaleA = Math.max(...a.map(Math.abs));
  const scaleB = Math.max(...b.map(Math.abs));
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] / scaleA, y = b[i] / scaleB;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return Math.max(-1, Math.min(1, dot / Math.sqrt(normA * normB)));
}
