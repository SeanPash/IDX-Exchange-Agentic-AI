import { handlePropertySearch } from "../../../src/skills/property-search/conversationalSearch";
import { closeDatabase } from "../../../src/tools/database";

async function main() {
  const [userId, ...messages] = process.argv.slice(2);
  try {
    if (!userId || !messages.length) {
      throw new Error('Usage: converse-properties.ts "<userId>" "<message 1>" ["<message 2>" ...]');
    }
    let response = "";
    for (let index = 0; index < messages.length; index++) {
      response = await handlePropertySearch(userId, messages[index],
        index < messages.length - 1 ? async () => [] : undefined);
    }
    console.log(response);
  } catch (error) {
    const code = (error as { code?: string }).code;
    console.error(code ? `Property search failed (${code}).` : (error as Error).message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main();
