import { PropertyFilters, parsePropertyQuery } from "./parsePropertyQuery";
import { ListingRow } from "./searchActiveListings";

export interface UserSession extends PropertyFilters {
  lastResults?: ListingRow[];
  conversationStep: number;
}

const sessions = new Map<string, UserSession>();

export function getSession(userId: string): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, { ...parsePropertyQuery(""), conversationStep: 0 });
  }
  return sessions.get(userId)!;
}

export function updateSession(userId: string, updates: Partial<UserSession>) {
  const session = { ...getSession(userId), ...updates };
  sessions.set(userId, session);
  return session;
}

export function clearSession(userId: string) {
  sessions.delete(userId);
}
