import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "../src/tools/database";
import { getEmbedding, getEmbeddings, GeminiEmbeddingError, cosineSimilarity } from "../src/skills/property-search/embeddings";
import { buildListingEmbeddingText, semanticSearch, formatSemanticResults, formatSemanticError, SemanticListing } from "../src/skills/property-search/semanticSearch";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class { models = { embedContent: create }; } }));
vi.mock("../src/tools/database", () => ({ query: vi.fn() }));
const listing = (id: number): SemanticListing => ({ L_ListingID: String(id), L_Status: "Active", L_Remarks: `Character home ${id}` });
const vector = (values: number[]) => [...values, ...Array(Math.max(0, 768 - values.length)).fill(0)];
const response = (vectors: number[][]) => ({ embeddings: vectors.map(values => ({ values: values.length ? vector(values) : [] })) });

beforeEach(() => { vi.mocked(query).mockReset(); create.mockReset(); vi.stubEnv("GEMINI_API_KEY", "mock-test-key"); });
afterEach(() => vi.unstubAllEnvs());

describe("Week 6 embeddings", () => {
  it("combines MLS fields with remarks first and omits missing values", () => {
    const text = buildListingEmbeddingText({ ...listing(1), L_Type_: "Craftsman", L_City: "Pasadena", L_Keyword2: 3,
      LM_Dec_3: 2, LM_Int2_3: 1800, YearBuilt: 1920, L_SystemPrice: 900000 });
    for (const value of ["Remarks: Character home", "Craftsman", "Pasadena", "Bedrooms: 3", "Bathrooms: 2", "1800", "1920", "900000"]) expect(text).toContain(value);
    expect(buildListingEmbeddingText({ L_ListingID: "1", L_Status: "Active", L_City: null })).toBe("");
    expect(text).not.toMatch(/undefined|null/);
  });
  it("normalizes, bounds and embeds supplied text with the official model", async () => {
    create.mockResolvedValue(response([[1, 0]]));
    expect(await getEmbedding(" mountain\n  views ")).toEqual(vector([1, 0]));
    expect(create.mock.calls[0][0]).toMatchObject({ model: "gemini-embedding-001", contents: ["mountain views"], config: { taskType: "SEMANTIC_SIMILARITY", outputDimensionality: 768, httpOptions: { retryOptions: { attempts: 1 } } } });
    await getEmbedding("a".repeat(9000));
    expect(create.mock.calls[1][0].contents[0]).toHaveLength(2000);
    await expect(getEmbedding(" \n")).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(2);
  });
  it("calculates cosine and safely rejects invalid vectors", () => {
    expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(Math.SQRT1_2);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
    for (const bad of [[], [0, 0], [1], [NaN, 1], [Infinity, 1]]) expect(cosineSimilarity([1, 0], bad)).toBeNull();
  });
  it.each([[[]], [[0, 0]], [[NaN, 1]]])("rejects invalid API vectors %j", async vector => {
    create.mockResolvedValue(response([vector]));
    await expect(getEmbedding("home")).rejects.toThrow("invalid embeddings");
  });
  it("ranks only the best five active candidates and uses the supplied description", async () => {
    vi.mocked(query).mockResolvedValue([...Array.from({ length: 7 }, (_, i) => listing(i)), { ...listing(9), L_Status: "Sold" }]);
    create.mockResolvedValue(response([[1, 0], ...Array.from({ length: 7 }, (_, i) => [i + 1, 1])]));
    const result = await semanticSearch("Charming mountain retreat");
    expect(result.matches.map(item => item.listing.L_ListingID)).toEqual(["6", "5", "4", "3", "2"]);
    expect(result.candidateCount).toBe(7);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].contents[0]).toBe("Charming mountain retreat");
    const sql = vi.mocked(query).mock.calls[0][0];
    for (const part of ["L_Status = 'Active'", "LIMIT 50", "ROW_NUMBER()", "CEIL(total / 50.0)"]) expect(sql).toContain(part);
    expect(formatSemanticResults(result)).toContain("not the entire MLS");
  });
  it("handles no candidates, fewer than five, dimension mismatch, and API failures honestly", async () => {
    vi.mocked(query).mockResolvedValue([]);
    expect((await semanticSearch("home")).matches).toEqual([]);
    expect(create).not.toHaveBeenCalled();
    await expect(semanticSearch(" ")).rejects.toThrow();
    vi.mocked(query).mockResolvedValue([listing(1), listing(2)]);
    create.mockResolvedValue(response([[1, 0], [1, 0], [0, 1]]));
    expect((await semanticSearch("home")).matches).toHaveLength(2);
    create.mockResolvedValue({ embeddings: [{ values: vector([1, 0]) }, { values: [1] }, { values: vector([0, 1]) }] });
    await expect(semanticSearch("home")).rejects.toThrow("inconsistent dimensions");
    create.mockRejectedValue(new Error("API unavailable"));
    await expect(semanticSearch("home")).rejects.toThrow("Gemini embeddings request failed");
  });
});


describe("Week 6 safe errors", () => {
  it("rejects missing Gemini credentials without a request", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(getEmbedding("home")).rejects.toThrow("GEMINI_API_KEY");
    expect(create).not.toHaveBeenCalled();
  });
  it("bounds multibyte input safely", async () => {
    create.mockResolvedValue(response([[1, 0]]));
    await getEmbedding("🏡".repeat(2000));
    const text = create.mock.calls[0][0].contents[0];
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(2000);
    expect(text).not.toContain("\uFFFD");
  });
  it("rejects mismatched counts and dimensions", async () => {
    create.mockResolvedValue(response([[1, 0]]));
    await expect(getEmbeddings(["query", "listing"])).rejects.toThrow("invalid embeddings");
    create.mockResolvedValue({ embeddings: [{ values: [1, 0] }] });
    await expect(getEmbedding("home")).rejects.toThrow("inconsistent dimensions");
  });
  it("classifies API errors with only a safe HTTP status", async () => {
    create.mockRejectedValue({ status: 429, message: "sensitive response" });
    try {
      await getEmbedding("home");
      throw new Error("Expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiEmbeddingError);
      expect(formatSemanticError(error)).toContain("Gemini API failure");
      expect(formatSemanticError(error)).toContain("HTTP 429");
      expect(formatSemanticError(error)).not.toContain("sensitive");
    }
    expect(formatSemanticError(new GeminiEmbeddingError("credentials"))).toContain("credentials failure");
    expect(formatSemanticError({ code: "ER_DBACCESS_DENIED_ERROR", message: "sensitive" })).toContain("database failure (ER_DBACCESS_DENIED_ERROR)");
    expect(formatSemanticError(new Error("sensitive"))).toContain("processing failure");
  });
});
