import { parsePropertyQuery } from "./parsePropertyQuery";
import { searchActiveListings } from "./searchActiveListings";
import { formatPropertyCards } from "./formatPropertyCards";
import { clearSession, getSession, updateSession } from "./session";

export async function handlePropertySearch(userId: string, message: string, search = searchActiveListings) {
  if (/^(reset|clear|start over)$/i.test(message.trim())) {
    clearSession(userId);
    return "Search reset. Which city would you like to search in?";
  }

  const parsed = parsePropertyQuery(message);
  const updates = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== null));
  const session = updateSession(userId, {
    ...updates,
    conversationStep: getSession(userId).conversationStep + 1,
    lastResults: undefined,
  });

  if (!session.city) return "Which city would you like to search in?";
  if (session.maxPrice === null) return "What is your budget?";
  const { city, maxPrice, lastResults, conversationStep, ...preferences } = session;
  if (Object.values(preferences).every((value) => value === null)) {
    return "What property type or minimum number of bedrooms would you like?";
  }

  const listings = await search({ city, maxPrice, ...preferences });
  updateSession(userId, { lastResults: listings });
  return formatPropertyCards(listings);
}
