/**
 * The route ids a first clear can pay one free draw for: the pilgrimages in src/data/pilgrimages.ts, and the welcome gift.
 * Add a route here when the app gets one (tests/server.test.mjs fails if this list is missing one).
 */
export const FREE_PULL_ROUTE_IDS = [
  "firstStep", "sanctuary", "mountain", "circuit", "compassion", "vow", "story",
  "sanctuaryDawn", "mountainRidge", "circuitWater", "compassionMoon", "vowSevenLights", "storyRiver",
  "festival", "festivalSnow",
  "welcome-gift"
] as const;

export const isFreePullRoute = (routeId: string): boolean => (FREE_PULL_ROUTE_IDS as readonly string[]).includes(routeId);
