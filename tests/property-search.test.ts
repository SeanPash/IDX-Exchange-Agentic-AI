import { describe, expect, it } from "vitest";
import { parsePropertyQuery } from "../src/skills/property-search/parsePropertyQuery";

describe("parsePropertyQuery", () => {
  it("parses a maximum HOA requirement", () => {
    expect(parsePropertyQuery("HOA under $500").maxHoa).toBe(500);
    expect(parsePropertyQuery("HOA below 400").maxHoa).toBe(400);
    expect(parsePropertyQuery("max HOA $350").maxHoa).toBe(350);
    expect(parsePropertyQuery("HOA under $500").maxPrice).toBeNull();
    expect(parsePropertyQuery("Show homes in Irvine").maxHoa).toBeNull();
  });

  it("parses a condo search with a pool", () => {
    const result = parsePropertyQuery(
      "I want a 2-bedroom condo in Newport Beach under $1.4M with a pool"
    );

    expect(result.city).toBe("Newport Beach");
    expect(result.maxPrice).toBe(1400000);
    expect(result.beds).toBe(2);
    expect(result.type).toBe("Condominium");
    expect(result.pool).toBe("True");
  });

  it("parses a townhouse search", () => {
    const result = parsePropertyQuery(
      "Find me a townhouse in Pasadena under $850k"
    );

    expect(result.city).toBe("Pasadena");
    expect(result.maxPrice).toBe(850000);
    expect(result.type).toBe("Townhouse");
  });

  it("parses a single family home search", () => {
    const result = parsePropertyQuery(
      "Show single family homes in San Diego with 4 bedrooms under $2.2M"
    );

    expect(result.city).toBe("San Diego");
    expect(result.beds).toBe(4);
    expect(result.maxPrice).toBe(2200000);
    expect(result.type).toBe("SingleFamilyResidence");
  });

  it("parses a bathroom requirement", () => {
    const result = parsePropertyQuery(
      "Find homes in Irvine with 2.5 bathrooms"
    );

    expect(result.city).toBe("Irvine");
    expect(result.baths).toBe(2.5);
  });

  it("parses a square footage requirement", () => {
    const result = parsePropertyQuery(
      "Show homes in Anaheim with 2000 sqft"
    );

    expect(result.city).toBe("Anaheim");
    expect(result.sqft).toBe(2000);
  });

  it("parses a view preference", () => {
    const result = parsePropertyQuery(
      "Find condos in Malibu with a view under $3M"
    );

    expect(result.city).toBe("Malibu");
    expect(result.maxPrice).toBe(3000000);
    expect(result.type).toBe("Condominium");
    expect(result.hasView).toBe("True");
  });

  it("parses a land search", () => {
    const result = parsePropertyQuery(
      "Show me land in Temecula under $600k"
    );

    expect(result.city).toBe("Temecula");
    expect(result.maxPrice).toBe(600000);
    expect(result.type).toBe("UnimprovedLand");
  });

  it("parses a price written with commas", () => {
    const result = parsePropertyQuery(
      "Find homes in Long Beach under $1,075,000"
    );

    expect(result.city).toBe("Long Beach");
    expect(result.maxPrice).toBe(1075000);
  });

  it("parses multiple preferences together", () => {
    const result = parsePropertyQuery(
      "Find 3-bedroom townhomes in Riverside under $700k with a pool"
    );

    expect(result.city).toBe("Riverside");
    expect(result.beds).toBe(3);
    expect(result.maxPrice).toBe(700000);
    expect(result.type).toBe("Townhouse");
    expect(result.pool).toBe("True");
  });

  it("leaves filters null when they are not included", () => {
    const result = parsePropertyQuery(
      "Show homes in Sacramento"
    );

    expect(result.city).toBe("Sacramento");
    expect(result.maxPrice).toBeNull();
    expect(result.beds).toBeNull();
    expect(result.baths).toBeNull();
    expect(result.sqft).toBeNull();
  });
});
