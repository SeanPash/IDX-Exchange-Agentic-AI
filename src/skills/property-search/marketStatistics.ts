import { query } from "../../tools/database";

type Numeric = number | string | null;
type MarketRow = { month: string; ClosePrice: Numeric; ListPrice: Numeric; DaysOnMarket: Numeric };

function validNumber(value: Numeric, minimum: number): number | null {
  if (value === null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum ? number : null;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function metrics(rows: MarketRow[]) {
  const prices = rows.map(row => Number(row.ClosePrice)).sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const ratios = rows.flatMap(row => {
    const listPrice = validNumber(row.ListPrice, Number.MIN_VALUE);
    return listPrice === null ? [] : [Number(row.ClosePrice) / listPrice * 100];
  });
  const days = rows.flatMap(row => {
    const dom = validNumber(row.DaysOnMarket, 0);
    return dom === null ? [] : [dom];
  });
  return {
    soldCount: rows.length,
    medianClosePrice: prices.length % 2 ? prices[middle] : prices[middle - 1] / 2 + prices[middle] / 2,
    averageClosePrice: average(prices)!,
    averageDaysOnMarket: average(days),
    listToClosePercent: average(ratios),
    domSampleCount: days.length,
    ratioSampleCount: ratios.length,
  };
}

export async function getMarketSummary(city: string) {
  city = city.trim();
  if (!city) throw new Error("City is required.");
  const rows = await query<MarketRow>(`
    SELECT DATE_FORMAT(CloseDate, '%Y-%m') AS month, ClosePrice, ListPrice, DaysOnMarket
    FROM california_sold
    WHERE City = ? AND PropertyType = 'Residential' AND ClosePrice > 0
      AND CloseDate >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 12 MONTH)
      AND CloseDate < DATE_FORMAT(CURDATE(), '%Y-%m-01')
    ORDER BY CloseDate
  `, [city]);
  const usable = rows.filter(row => validNumber(row.ClosePrice, Number.MIN_VALUE) !== null);
  if (!usable.length) return null;
  const grouped = new Map<string, MarketRow[]>();
  for (const row of usable) {
    const group = grouped.get(row.month) ?? [];
    group.push(row);
    grouped.set(row.month, group);
  }
  const monthly = [...grouped].sort(([a], [b]) => a.localeCompare(b))
    .map(([month, sales]) => ({ month, ...metrics(sales) }));
  return { city, ...metrics(usable), monthly };
}

export function summarizeMarketTrend(monthly: { month: string; averageClosePrice: number }[]) {
  if (monthly.length < 2) return "Insufficient monthly data to compare prices.";
  const first = monthly[0];
  const last = monthly[monthly.length - 1];
  const change = (last.averageClosePrice / first.averageClosePrice - 1) * 100;
  const direction = Math.abs(change) < 1 ? "relatively stable" : change > 0 ? "up" : "down";
  return `Average sold prices are ${direction} (${change >= 0 ? "+" : ""}${change.toFixed(1)}%) from ${first.month} to ${last.month}, across ${monthly.length} available months. Monthly averages reflect the mix of homes sold.`;
}

export function formatMarketSummary(city: string, summary: Awaited<ReturnType<typeof getMarketSummary>>) {
  if (!summary) return `No usable residential sold data for ${city.trim()} in the previous 12 completed calendar months.`;
  const decimal = (value: number | null) => value === null ? "Unavailable" : value.toFixed(1);
  return [
    `${summary.city} Market Summary`,
    "Previous 12 completed calendar months | california_sold residential sales",
    `Median sold price: $${summary.medianClosePrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    `Average days on market: ${decimal(summary.averageDaysOnMarket)} (${summary.domSampleCount} sales)`,
    `List-to-close ratio: ${summary.listToClosePercent === null ? "Unavailable" : decimal(summary.listToClosePercent) + "%"} (${summary.ratioSampleCount} sales; average ClosePrice / ListPrice)`,
    `Sold transactions analyzed: ${summary.soldCount}`,
    "", "12-month trend:", summarizeMarketTrend(summary.monthly),
  ].join("\n");
}
