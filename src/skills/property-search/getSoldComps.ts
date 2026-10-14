import { query } from "../../tools/database";

export type SoldRow = {
  ListingKey: number;
  UnparsedAddress: string | null;
  City: string | null;
  CloseDate: string;
  ClosePrice: number | null;
  OriginalListPrice: number | null;
  ListPrice: number | null;
  DaysOnMarket: number | null;
  BedroomsTotal: number | null;
  BathroomsTotalInteger: number | null;
  LivingArea: number | null;
  PropertyType: string;
  PropertySubType: string | null;
  YearBuilt: number | null;
  ListAgentFullName: string | null;
  ListOfficeName: string | null;
  BuyerOfficeName: string | null;
};

export async function getSoldComps(city: string, months = 12) {
  if (!city.trim() || !Number.isSafeInteger(months) || months < 1) {
    throw new Error("City is required and months must be a positive integer.");
  }
  return query<SoldRow>(`
    SELECT
      ListingKey, UnparsedAddress, City, CloseDate, ClosePrice,
      OriginalListPrice, ListPrice, DaysOnMarket,
      BedroomsTotal, BathroomsTotalInteger, LivingArea,
      PropertyType, PropertySubType, YearBuilt,
      ListAgentFullName, ListOfficeName, BuyerOfficeName
    FROM california_sold
    WHERE City = ?
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND PropertyType = 'Residential'
    ORDER BY CloseDate DESC
    LIMIT 50
  `, [city, months]);
}
