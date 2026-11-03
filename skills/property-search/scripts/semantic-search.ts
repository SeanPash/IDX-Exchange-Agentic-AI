import { semanticSearch, formatSemanticResults, formatSemanticError } from "../../../src/skills/property-search/semanticSearch";
import { closeDatabase } from "../../../src/tools/database";

async function main() {
  try {
    const description = process.argv.slice(2).join(" ").trim();
    if (!description) throw new Error("Description required.");
    console.log(formatSemanticResults(await semanticSearch(description)));
  } catch (error) {
    console.error(formatSemanticError(error));
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main();
