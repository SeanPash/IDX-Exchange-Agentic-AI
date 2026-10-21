import { ListingRow } from "./searchActiveListings";

function formatYesNo(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (["1", "true"].includes(text.toLowerCase())) return "Yes";
  if (["0", "false"].includes(text.toLowerCase())) return "No";
  return text;
}

export function formatPropertyCards(listings: ListingRow[]): string {
  if (!listings.length) return "No active listings found.";

  return listings.map((listing) => {
    const lines = [
      `${listing.L_Address ?? "Address unavailable"}, ${listing.L_City ?? "City unavailable"}`,
      `Price: ${listing.price == null ? "Unavailable" : "$" + Number(listing.price).toLocaleString("en-US")}`,
      `${listing.beds ?? "?"} beds | ${listing.baths ?? "?"} baths | ${listing.sqft ?? "?"} sq ft`,
      `Type: ${listing.type ?? "Unavailable"}`,
      `Photos: ${listing.PhotoCount ?? "Unavailable"}`,
    ];
    if (listing.AssociationFee != null) lines.push(`HOA: $${Number(listing.AssociationFee).toLocaleString("en-US")}`);
    if (listing.DaysOnMarket != null) lines.push(`Days on market: ${listing.DaysOnMarket}`);
    const pool = formatYesNo(listing.PoolPrivateYN);
    const view = formatYesNo(listing.ViewYN);
    if (pool !== null) lines.push(`Pool: ${pool}`);
    if (view !== null) lines.push(`View: ${view}`);
    return lines.join("\n");
  }).join("\n\n");
}
