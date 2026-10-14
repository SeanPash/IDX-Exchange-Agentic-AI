---
name: property-search
description: Parse real estate searches, query active MLS listings, and retrieve sold comps.
---

# Property Search

Use this skill to query active MLS listings, retrieve sold comps, or explicitly
parse a free-text property search into structured filters.
Requires Node.js and npm with `npx tsx` available.

IMPORTANT: Do not execute database search scripts from `{baseDir}` or use the
copied OpenClaw workspace `search-properties.ts`. The installed OpenClaw workspace
copy does not contain the project's `src` directory.

When the user asks for homes, listings, active properties, properties for sale,
or MLS results, use the active Week 3 database command below. When the user asks
for sold comps, recent sales, or sold properties, use the sold Week 3 database
command below. Do NOT fall back to `parse-property-query.ts` for those requests.
Return the actual command output to the user.

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

For active MLS listing searches, ALWAYS execute from the actual IDX repo:

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
