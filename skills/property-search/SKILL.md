---
name: property-search
description: Use Week 4 conversational search for all normal active property requests and follow-up preferences; also supports explicit direct searches, parsing, and sold comps.
---

# Property Search

Use this skill to query active MLS listings, retrieve sold comps, or explicitly
parse a free-text property search into structured filters.
Requires Node.js and npm with `npx tsx` available.

IMPORTANT: Do not execute database search scripts from `{baseDir}` or use the
copied OpenClaw workspace `search-properties.ts` or `converse-properties.ts`. The installed OpenClaw workspace
copy does not contain the project's `src` directory.

When the user asks for homes, listings, active properties, properties for sale,
or MLS results, ALWAYS use the Week 4 command below by default, including a first
message such as "Find homes in Irvine" and all follow-up preferences. Do not treat
a short first message as an explicit single-turn search. Read this skill's current
instructions rather than reusing commands from older conversation history.
When the user asks
for sold comps, recent sales, or sold properties, use the sold Week 3 database
command below. Do NOT fall back to `parse-property-query.ts` for those requests.
Return the actual command output to the user.

For conversational active searches and follow-up preferences, execute from the
actual IDX repo:

```bash
cd "/mnt/c/Documents and Settings/seanp/Documents/GitHub/IDX-Exchange-Agentic-AI" && \
npx tsx skills/property-search/scripts/converse-properties.ts '<channel/session/user ID>' '<first search message>' '<next preference message>'
```

Use the current channel's stable session/user ID, never one shared across users.
Each invocation starts a fresh process: pass this user's property-search messages
in order from the current conversation, including the latest message, as separate
shell-escaped arguments. Do not include other users' messages or assistant replies.
Use single quotes for every message argument so dollar amounts stay literal:
`'Under $1.2M'`, never `"Under $1.2M"` (the shell expands `$1` in double quotes).
Escape any apostrophe inside a message with the shell sequence `'\''`.
Return the command's latest response verbatim, including follow-up questions and
photo counts. "Find homes in Irvine" must return "What is your budget?", without
listings or additional text. A message of `reset`, `clear`, or
`start over` clears the search; discard earlier search history after that reset.
The handler uses an in-memory Map within each process; replay reconstructs its
filters across OpenClaw commands. This uses the existing channel history, without
adding WhatsApp transport or persistent storage. Use the Week 3 active command
ONLY when the user explicitly requests a direct/single-turn database search or
pagination. Normal requests for homes or listings must use Week 4.

Use the Week 2 parser only when the user explicitly requests structured filters
rather than database results. For those parser/filter requests, run:

```bash
npx tsx {baseDir}/scripts/parse-property-query.ts "<user property query>"
```

Pass the user's query as a single argument. Quote and escape it for the shell so
dollar amounts and other shell characters remain literal.

Return the resulting structured JSON filter object. It contains `city`,
`maxPrice`, `beds`, `baths`, `sqft`, `type`, `pool`, and `hasView`.
Unspecified filters are `null`; pool and view matches are `"True"`.

Only for explicitly requested direct/single-turn database searches or pagination,
execute the Week 3 active command from the actual IDX repo:

```bash
cd "/mnt/c/Documents and Settings/seanp/Documents/GitHub/IDX-Exchange-Agentic-AI" && \
npx tsx skills/property-search/scripts/search-properties.ts active "<user property query>" [page] [limit]
```

Page defaults to 1. Limit defaults to 10 and must not exceed 50. The existing parser supplies
the filters, including `maxHoa` when specified.

For sold comps, ALWAYS execute from the actual IDX repo:

```bash
cd "/mnt/c/Documents and Settings/seanp/Documents/GitHub/IDX-Exchange-Agentic-AI" && \
npx tsx skills/property-search/scripts/search-properties.ts sold "<city>" [months]
```

Months defaults to 12. Returns at most 50 residential transactions, newest first.
Database commands require `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and
`MYSQL_DATABASE` in the environment or the `.env` file in the working directory.
Run from the project root to use its `.env` file. Return command output to the user.
