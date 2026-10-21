import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, getSession } from "../src/skills/property-search/session";
import { handlePropertySearch } from "../src/skills/property-search/conversationalSearch";
import { searchActiveListings } from "../src/skills/property-search/searchActiveListings";
import { query } from "../src/tools/database";

vi.mock("../src/tools/database", () => ({ query: vi.fn() }));

describe("conversational property search", () => {
  beforeEach(() => {
    clearSession("alice");
    clearSession("bob");
    vi.mocked(query).mockReset();
  });

  it("starts with empty filters and keeps users separate", async () => {
    expect(getSession("alice")).toMatchObject({ city: null, maxPrice: null, conversationStep: 0 });
    expect(getSession("alice").lastResults).toBeUndefined();
    await handlePropertySearch("alice", "Find homes in Irvine");
    expect(getSession("bob").city).toBeNull();
    expect(getSession("bob").conversationStep).toBe(0);
  });

  it("accumulates three messages and sends their filters through the Week 3 SQL layer", async () => {
    vi.mocked(query).mockResolvedValue([{
      L_Address: "123 Test St", L_City: "Irvine", price: 1100000,
      beds: 3, baths: 2, PhotoCount: 12,
    }]);
    expect(await handlePropertySearch("alice", "Find homes in Irvine")).toBe("What is your budget?");
    expect(getSession("alice").city).toBe("Irvine");
    expect(await handlePropertySearch("alice", "Under $1.2M")).toBe("What property type or minimum number of bedrooms would you like?");
    expect(getSession("alice")).toMatchObject({ city: "Irvine", maxPrice: 1200000 });
    expect(query).not.toHaveBeenCalled();
    const response = await handlePropertySearch("alice", "single family with at least 3 beds", searchActiveListings);
    expect(getSession("alice")).toMatchObject({
      city: "Irvine", maxPrice: 1200000, type: "SingleFamilyResidence", beds: 3, conversationStep: 3,
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM rets_property"),
      ["Irvine", 1200000, 3, "SingleFamilyResidence", 10, 0]);
    expect(response).toContain("123 Test St, Irvine");
    expect(response).toContain("$1,100,000");
    expect(response).toContain("3 beds | 2 baths");
    expect(response).toContain("Photos: 12");
    expect(getSession("alice").lastResults).toHaveLength(1);
  });

  it("clears only the requested session, including results and step", async () => {
    await handlePropertySearch("alice", "in Irvine");
    await handlePropertySearch("bob", "in Anaheim");
    clearSession("alice");
    expect(getSession("alice")).toMatchObject({ city: null, conversationStep: 0 });
    expect(getSession("alice").lastResults).toBeUndefined();
    expect(getSession("bob").city).toBe("Anaheim");
    expect(await handlePropertySearch("bob", "reset")).toContain("Search reset");
    expect(getSession("bob").city).toBeNull();
  });

  it("asks for city and preserves all supported filters during refinement", async () => {
    expect(await handlePropertySearch("alice", "under $2M")).toBe("Which city would you like to search in?");
    vi.mocked(query).mockResolvedValue([]);
    await handlePropertySearch("alice", "in Irvine with 2 baths 1800 sqft pool view HOA under $500");
    await handlePropertySearch("alice", "under $1.5M");
    expect(getSession("alice")).toMatchObject({
      city: "Irvine", maxPrice: 1500000, baths: 2, sqft: 1800,
      pool: "True", hasView: "True", maxHoa: 500, lastResults: [],
    });
  });
});
