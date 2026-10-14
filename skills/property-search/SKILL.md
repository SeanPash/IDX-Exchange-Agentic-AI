---
name: property-search
description: Parse real estate searches, query active MLS listings, and retrieve sold comps.
---

# Property Search

Use this skill to parse a free-text property search into structured filters.
Requires Node.js and npm with `npx tsx` available.

Use your exec capability to run:

```bash
npx tsx {baseDir}/scripts/parse-property-query.ts "<user property query>"
```

Pass the user's query as a single argument. Quote and escape it for the shell so
dollar amounts and other shell characters remain literal.

Return the resulting structured JSON filter object. It contains `city`,
`maxPrice`, `beds`, `baths`, `sqft`, `type`, `pool`, and `hasView`.
Unspecified filters are `null`; pool and view matches are `"True"`.

To search active listings and return readable property cards:

```bash
npx tsx {baseDir}/scripts/search-properties.ts active "<user property query>" [page] [limit]
```

Page defaults to 1 and limit to 10 (maximum 50). The existing parser supplies
the filters, including `maxHoa` when specified.

To retrieve sold comps directly as JSON:

```bash
npx tsx {baseDir}/scripts/search-properties.ts sold "<city>" [months]
```

Months defaults to 12. Returns at most 50 residential transactions, newest first.
Database commands require `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and
`MYSQL_DATABASE` in the environment or the `.env` file in the working directory.
Run from the project root to use its `.env` file. Return command output to the user.
