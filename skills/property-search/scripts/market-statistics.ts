import { getMarketSummary, formatMarketSummary } from "../../../src/skills/property-search/marketStatistics";
import { closeDatabase } from "../../../src/tools/database";

async function main() {
  try {
    const city = process.argv.slice(2).join(" ").trim();
    if (!city) throw new Error('Usage: market-statistics.ts "<city>"');
    console.log(formatMarketSummary(city, await getMarketSummary(city)));
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.error(code ? `Market query failed (${code}).` : "Market query failed. Supply a city and check the database connection.");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main();
