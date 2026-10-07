export type PropertyFilters = {
  city: string | null;
  maxPrice: number | null;
  maxHoa: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  type: string | null;
  pool: string | null;
  hasView: string | null;
};

export function parsePropertyQuery(query: string): PropertyFilters {
  const cityMatch = query.match(
    /in ([A-Za-z\s]+?)(?:\s+under|\s+with|\s+at|$)/i
  );

  const hoaMatch = query.match(
    /(?:\bHOA\s+(?:under|below)|\bmax\s+HOA)\s+\$?([\d,]+(?:\.\d+)?)/i
  );
  const priceQuery = hoaMatch ? query.replace(hoaMatch[0], "") : query;
  const priceMatch = priceQuery.match(/under \$?([\d,.]+)(k|m)?/i);
  const bedsMatch = query.match(
    /(\d+)[\s-]*(bed|beds|bedroom|bedrooms)/i
  );
  const bathsMatch = query.match(
    /(\d+(?:\.5)?)[\s-]*(bath|baths|bathroom|bathrooms)/i
  );
  const sqftMatch = query.match(
    /(\d+)[\s,]*(sqft|sq ft|square feet)/i
  );

  const poolMatch = /pool/i.test(query);
  const viewMatch = /view/i.test(query);

  const typeMap: Record<string, string> = {
    condo: "Condominium",
    townhome: "Townhouse",
    townhouse: "Townhouse",
    "single family": "SingleFamilyResidence",
    land: "UnimprovedLand",
  };

  const typeKey = Object.keys(typeMap).find((key) =>
    query.toLowerCase().includes(key)
  );

  let maxPrice: number | null = null;

  if (priceMatch) {
    maxPrice = Number(priceMatch[1].replace(/,/g, ""));

    if (priceMatch[2]?.toLowerCase() === "k") {
      maxPrice *= 1000;
    } else if (priceMatch[2]?.toLowerCase() === "m") {
      maxPrice *= 1_000_000;
    }
  }

  return {
    city: cityMatch?.[1]?.trim() || null,
    maxPrice,
    maxHoa: hoaMatch ? Number(hoaMatch[1].replace(/,/g, "")) : null,
    beds: bedsMatch ? Number(bedsMatch[1]) : null,
    baths: bathsMatch ? Number(bathsMatch[1]) : null,
    sqft: sqftMatch ? Number(sqftMatch[1]) : null,
    type: typeKey ? typeMap[typeKey] : null,
    pool: poolMatch ? "True" : null,
    hasView: viewMatch ? "True" : null,
  };
}

const query = process.argv.slice(2).join(" ").trim();

if (!query) {
  console.error("Usage: npx tsx parse-property-query.ts '<property query>'");
  process.exit(1);
}

console.log(JSON.stringify(parsePropertyQuery(query), null, 2));
