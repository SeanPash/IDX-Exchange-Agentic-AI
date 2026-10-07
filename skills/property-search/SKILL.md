---
name: property-search
description: Convert natural-language real estate searches into structured MLS property filters.
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
