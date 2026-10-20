import { ListingRow } from "./searchActiveListings";

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
    if (listing.PoolPrivateYN) lines.push(`Pool: ${listing.PoolPrivateYN}`);
    if (listing.ViewYN) lines.push(`View: ${listing.ViewYN}`);
    return lines.join("\n");
  }).join("\n\n");
}
