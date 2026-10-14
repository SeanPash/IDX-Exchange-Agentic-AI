import { query } from "../../tools/database";
import { PropertyFilters } from "./parsePropertyQuery";

export type ListingRow = {
  L_ListingID: string;
  L_DisplayId: string;
  L_Address: string | null;
  L_City: string | null;
  L_Zip: string | null;
  price: number | null;
  beds: number | null;
  baths: number | string | null;
  sqft: number | null;
  type: string | null;
  status: string;
  lat: number | string | null;
  lng: number | string | null;
  YearBuilt: number | null;
  AssociationFee: number | null;
  DaysOnMarket: number | null;
  PoolPrivateYN: string | null;
  ViewYN: string | null;
  FireplaceYN: string | null;
  PhotoCount: number | null;
  LA1_UserFirstName: string | null;
  LA1_UserLastName: string | null;
  LO1_OrganizationName: string | null;
};

export async function searchActiveListings(filters: PropertyFilters, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 50 ||
      !Number.isSafeInteger(offset)) {
    throw new Error("Page must be a positive integer and limit must be between 1 and 50.");
  }

  let sql = `
    SELECT
      L_ListingID, L_DisplayId, L_Address, L_City, L_Zip,
      L_SystemPrice AS price, L_Keyword2 AS beds, LM_Dec_3 AS baths,
      LM_Int2_3 AS sqft, L_Type_ AS type, L_Status AS status,
      LMD_MP_Latitude AS lat, LMD_MP_Longitude AS lng,
      YearBuilt, AssociationFee, DaysOnMarket,
      PoolPrivateYN, ViewYN, FireplaceYN, PhotoCount,
      LA1_UserFirstName, LA1_UserLastName, LO1_OrganizationName
    FROM rets_property WHERE L_Status = 'Active'
  `;
  const params: (string | number)[] = [];
  const conditions: [keyof PropertyFilters, string][] = [
    ["city", "L_City = ?"],
    ["maxPrice", "L_SystemPrice <= ?"],
    ["beds", "L_Keyword2 >= ?"],
    ["baths", "LM_Dec_3 >= ?"],
    ["sqft", "LM_Int2_3 >= ?"],
    ["type", "L_Type_ = ?"],
    ["pool", "PoolPrivateYN = ?"],
    ["hasView", "ViewYN = ?"],
    ["maxHoa", "AssociationFee <= ?"],
  ];

  for (const [key, condition] of conditions) {
    if (filters[key] != null) {
      sql += " AND " + condition;
      params.push(filters[key]);
    }
  }

  sql += " ORDER BY L_SystemPrice ASC, id ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return query<ListingRow>(sql, params);
}
