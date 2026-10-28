import { beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "../src/tools/database";
import { getMarketSummary, formatMarketSummary, summarizeMarketTrend } from "../src/skills/property-search/marketStatistics";

vi.mock("../src/tools/database", () => ({ query: vi.fn() }));
const sale = (price: number | string | null, list: number | string | null = 100, dom: number | null = 10, month = "2026-01") =>
  ({ month, ClosePrice: price, ListPrice: list, DaysOnMarket: dom });

describe("Week 5 market statistics", () => {
  beforeEach(() => vi.mocked(query).mockReset());

  it("calculates exact even median, mean ratios, DOM and monthly data using the requested city", async () => {
    vi.mocked(query).mockResolvedValue([sale("300", 200, 0), sale(100), sale(200, 200, 20), sale(1000, 500, 30, "2026-02")]);
    const result = await getMarketSummary("  sAn DiEgO  ");
    expect(result).toMatchObject({ city: "sAn DiEgO", soldCount: 4, medianClosePrice: 250,
      averageClosePrice: 400, averageDaysOnMarket: 15, listToClosePercent: 137.5 });
    expect(result?.monthly).toEqual([
      expect.objectContaining({ month: "2026-01", soldCount: 3, averageClosePrice: 200, averageDaysOnMarket: 10 }),
      expect.objectContaining({ month: "2026-02", soldCount: 1, averageClosePrice: 1000 }),
    ]);
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(params).toEqual(["sAn DiEgO"]);
    expect(sql).toContain("City = ?");
    expect(sql).toContain("PropertyType = 'Residential'");
    expect(sql).toContain("INTERVAL 12 MONTH");
    expect(sql).toContain("CloseDate <");
    expect(sql).not.toContain("LIMIT");
    const text = formatMarketSummary("sAn DiEgO", result);
    for (const label of ["Median sold price: $250", "Average days on market: 15.0", "List-to-close ratio: 137.5%", "12-month trend:"]) {
      expect(text).toContain(label);
    }
  });

  it("calculates odd median and excludes invalid prices, denominators and DOM", async () => {
    vi.mocked(query).mockResolvedValue([sale(300, 0, null), sale(100, null, -1), sale(200, 100, 0), sale(0), sale(null), sale(-1)]);
    expect(await getMarketSummary("Pasadena")).toMatchObject({ soldCount: 3, medianClosePrice: 200,
      listToClosePercent: 200, ratioSampleCount: 1, averageDaysOnMarket: 0, domSampleCount: 1 });
    vi.mocked(query).mockResolvedValue([sale(100, 0, null)]);
    const summary = await getMarketSummary("Irvine");
    expect(summary).toMatchObject({ medianClosePrice: 100, listToClosePercent: null, averageDaysOnMarket: null });
    expect(formatMarketSummary("Irvine", summary)).toContain("List-to-close ratio: Unavailable");
  });

  it("handles no data and rejects an empty city without querying", async () => {
    await expect(getMarketSummary(" ")).rejects.toThrow("City is required");
    expect(query).not.toHaveBeenCalled();
    vi.mocked(query).mockResolvedValue([]);
    expect(formatMarketSummary("Unknown City", await getMarketSummary("Unknown City"))).toContain("No usable residential sold data for Unknown City");
  });

  it.each([[110, "up (+10.0%)"], [90, "down (-10.0%)"], [100.5, "relatively stable (+0.5%)"]])("summarizes price direction for %s", (price, expected) => {
    const text = summarizeMarketTrend([{ month: "2025-11", averageClosePrice: 100 }, { month: "2026-09", averageClosePrice: price }]);
    expect(text).toContain(expected);
    expect(text).toContain("2 available months");
    expect(text).toContain("2025-11 to 2026-09");
  });

  it("does not invent a trend for fewer than two months", () => {
    expect(summarizeMarketTrend([])).toContain("Insufficient");
    expect(summarizeMarketTrend([{ month: "2026-01", averageClosePrice: 100 }])).toContain("Insufficient");
  });
});
