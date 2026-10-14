import { closeDatabase } from "../../../src/tools/database";
import { parsePropertyQuery } from "../../../src/skills/property-search/parsePropertyQuery";
import { searchActiveListings } from "../../../src/skills/property-search/searchActiveListings";
import { getSoldComps } from "../../../src/skills/property-search/getSoldComps";
import { formatPropertyCards } from "../../../src/skills/property-search/formatPropertyCards";

async function main() {
  const [mode, input, first, second] = process.argv.slice(2);
  try {
    if (!input || (mode !== "active" && mode !== "sold")) {
      throw new Error('Usage: search-properties.ts active "<query>" [page] [limit] | sold "<city>" [months]');
    }
    if (mode === "sold") {
      console.log(JSON.stringify(await getSoldComps(input, first === undefined ? 12 : Number(first)), null, 2));
    } else {
      const listings = await searchActiveListings(
        parsePropertyQuery(input),
        first === undefined ? 1 : Number(first),
        second === undefined ? 10 : Number(second)
      );
      console.log(formatPropertyCards(listings));
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.error(code ? `Database query failed (${code}).` : (error as Error).message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main();
