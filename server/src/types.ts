export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}


export interface Env {
  DB: D1Database;
  APPLE_ROOT_CERTIFICATES?: string;
  APPLE_BUNDLE_ID?: string;
  /** Apple's identity-token signing keys as JSON; when set, they are used instead of downloading Apple's. */
  APPLE_JWKS_JSON?: string;
  PRODUCT_CATALOG_JSON?: string;
  GIFTS_JSON?: string;
  CATALOG_JSON?: string;
  /** Sign in with Apple, server side: the Team ID, the key's ID and the key itself (the .p8 file's text). Without them the token is not revoked. */
  APPLE_TEAM_ID?: string;
  APPLE_SIGN_IN_KEY_ID?: string;
  APPLE_SIGN_IN_PRIVATE_KEY?: string;
  /** Comma-separated purchase environments to accept; default "Production". Add "Sandbox" only while testing (TestFlight, App Review). */
  PURCHASE_ENVIRONMENTS?: string;
  /** Extra words a display name may not contain, comma-separated (added to the built-in list). */
  NG_WORDS?: string;
  EVENT_STEPS_WINDOW_START?: string;
  EVENT_STEPS_DAILY_MAX?: string;
  /** How many earlier days a player may still send steps for (default 2), so a day without opening the app is not lost. */
  EVENT_STEPS_GRACE_DAYS?: string;
  /** Optional Expo access token for push sends (raises the limits; not needed to send). */
  EXPO_PUSH_ACCESS_TOKEN?: string;
}

export interface User {
  id: string;
  friendCode: string;
  name: string;
  petId: string | null;
  goshuinCount: number;
  routeName: string | null;
}

export interface Gift {
  id: string;
  title: string;
  tickets?: number;
  freePulls?: number;
  paidPulls?: number;
  /** What the app shows and grants on the device (木札 and ミニチュア引換券). The server only guards against claiming twice. */
  message?: string;
  from?: string;
  sentAt?: string;
  expiresAt?: string;
  items?: { kind: 'gachaTicket' | 'keychainDrop'; quantity: number }[];
}

export interface ProductDefinition {
  plan?: string;
  monthlyTickets?: number;
  /** Gacha 木札 (the paid wallet) a plan hands over for each billing period; they carry over like bought ones. */
  monthlyPulls?: number;
  paidPulls?: number;
  /** Price in yen, used for the monthly spending cap of younger players. */
  priceYen?: number;
}

export interface VerifiedTransaction {
  transactionId: string;
  originalTransactionId?: string;
  productId: string;
  bundleId: string;
  purchaseDate: number;
  expiresDate?: number;
  revocationDate?: number;
  appAccountToken?: string;
  /** "Production" or "Sandbox" (TestFlight and App Review buy in the Sandbox). */
  environment?: string;
}

export interface Draw {
  petId: string;
  kind: "free" | "paid";
  isNew: boolean;
  guaranteed: boolean;
}

export interface EventRecord {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  mapId: string;
  /** Team size limits and the fixed goal in team steps (0 = no fixed goal). */
  minMembers: number;
  maxMembers: number;
  goalSteps: number;
}

export interface EventTeamMemberView {
  id: string;
  name: string;
  petId: string | null;
  /** Everything this member has walked for the event. */
  steps: number;
  /** When this member joined the team (ISO 8601); their steps count from then on. */
  joinedAt: string;
}

export interface EventTeamView {
  id: string;
  code: string;
  /** "active" covers a team that has reached the goal too; the goal is judged against the event. */
  status: "recruiting" | "active";
  /** The member who joined first; they start the team. */
  creatorId: string;
  members: EventTeamMemberView[];
  /** When the team set out (ISO 8601); null while it is still recruiting. */
  startedAt: string | null;
  /** Whether the asking player has already received the reward. */
  claimed: boolean;
}

export type EventJoinResult = "ok" | "not_found" | "full" | "already_started" | "already_member";
export type JoinRequestRequestResult = "ok" | "already_requested" | "not_found" | "already_member" | "full" | "request_pending";
export type JoinRequestAnswerResult = "accepted" | "declined" | "not_found" | "not_creator" | "full";
export type JoinRequestView = { id: string; userId: string; name: string; petId: string | null };
export type EventStartResult = "ok" | "no_team" | "not_creator" | "not_recruiting" | "too_few";

export type AgeGroup = "under16" | "16to19" | "adult";

export type AppleLinkResult = "linked" | "already_linked" | "apple_in_use" | "account_has_other_apple";

export interface CloudSave {
  data: string;
  version: number;
  updatedAt: string;
}

/** What an hourly clean-up did: a growing `expiredLeft` (or the limit reached) means it is behind. */
export type PurgeOutcome = {
  rateLimitsRemoved: number;
  /** Counters that have not expired yet. */
  rateLimitsRemaining: number;
  /** Counters that were already past their time but are still there after this run. */
  expiredLeft: number;
  /** How long ago (ms) the oldest of those expired; 0 when none. */
  oldestExpiredAgeMs: number;
  /** The run used all its slices: there may be more to remove. */
  reachedLimit: boolean;
};

export interface Store {
  /** Remove the account and everything that belongs to it (profile, friends, wallet, pulls, purchases, saves, Apple link). */
  deleteUser(userId: string): Promise<void>;
  cloudSave(userId: string): Promise<CloudSave | null>;
  /** Store the save if `baseVersion` is the stored version (0 when there is none); returns the new version, or null on a conflict. */
  putCloudSave(userId: string, data: string, baseVersion: number): Promise<number | null>;
  linkApple(userId: string, appleSub: string): Promise<AppleLinkResult>;
  userByApple(appleSub: string): Promise<string | null>;
  appleLinked(userId: string): Promise<boolean>;
  /** The Apple ID (its stable `sub`) this account is linked to, or null. */
  appleSubOf(userId: string): Promise<string | null>;
  /** Replace the account's secret, so a sign-in on a new device takes over. */
  rotateSecret(userId: string, secretHash: string): Promise<void>;
  /** Name and main Mobby shown to friends. */
  updateProfile(userId: string, name: string, petId: string | null): Promise<void>;
  friendshipExists(userId: string, friendId: string): Promise<boolean>;
  /** Whether `fromId` has a pending request to `toId`. */
  pendingRequestExists(fromId: string, toId: string): Promise<boolean>;
  ageGroup(userId: string): Promise<AgeGroup | null>;
  setAgeGroup(userId: string, group: AgeGroup): Promise<void>;
  /** Product ids of this user's purchases (not revoked) granted in [from, to). */
  purchasedProducts(userId: string, from: string, to: string): Promise<string[]>;
  /** Count one hit against `key` in the fixed window numbered `window`; returns the count including this hit. */
  /** Count one call in this window (`window` is the number of the `windowMs`-long period); the counter expires two periods after it started. */
  hitRateLimit(key: string, window: number, windowMs: number): Promise<number>;
  registerUser(user: User, secretHash: string): Promise<void>;
  credentialHash(userId: string): Promise<string | null>;
  user(userId: string): Promise<User | null>;
  userByFriendCode(friendCode: string): Promise<User | null>;
  claimGift(userId: string, gift: Gift): Promise<boolean>;
  ticketBalance(userId: string): Promise<number>;
  consumeTickets(userId: string, amount: number, ref: string): Promise<boolean>;
  grantMonthlyTickets(userId: string, plan: string, periodStart: string, periodEnd: string, amount: number): Promise<boolean>;
  recordPurchase(userId: string, transaction: VerifiedTransaction, product: ProductDefinition): Promise<boolean>;
  /** One billing period of a plan: remember it and credit that period's gacha 木札 once. Safe to repeat. */
  recordPlanPeriod(userId: string, plan: string, periodStart: string, periodEnd: string, pulls: number, transactionId: string): Promise<void>;
  /** The plan whose billing period covers `at`, or null. */
  activePlan(userId: string, at: string): Promise<string | null>;
  /** Apple refunded this purchase: take back its unspent tickets and record the spent part as a debt. Safe to repeat. */
  revokePurchase(transactionId: string, paidPulls?: number, plan?: { name: string; periodStart: string }): Promise<void>;
  refundShortfalls(userId: string, since: string): Promise<number>;
  wallet(userId: string): Promise<{ paid: number; free: number; paidPulls: number; refundDebt: number }>;
  ownedPets(userId: string): Promise<Record<string, number>>;
  chooseStarter(userId: string, petId: string): Promise<boolean>;
  /** Whether a refund or revocation of this transaction is on record (it may have arrived before the purchase did). */
  isRevoked(transactionId: string): Promise<boolean>;
  /** Remember a device that may be sent notifications; a token already known moves to this player. A player keeps the latest few. */
  savePushToken(userId: string, token: string, prefs: { team: boolean; friend: boolean }): Promise<void>;
  /** Forget a token (the device refused it, or its owner turned notifications off: then `userId` must match). */
  removePushToken(token: string, userId?: string): Promise<void>;
  /** The tokens of these players who want this kind of notification. */
  pushTokens(userIds: readonly string[], category: "team" | "friend"): Promise<string[]>;
  /** Record that a one-time notification went out. False when it had already been sent. */
  markPushSent(key: string): Promise<boolean>;
  claimFreePull(userId: string, routeId: string): Promise<boolean>;
  /**
   * Records draws and spends the balance in one step. `previousPaidPulls` is the count the draw was worked out from:
   * if another draw changed it meanwhile, nothing is written and this throws. `opId` and `result` are stored together
   * with the draws so the same request can be answered again.
   */
  commitDraws(userId: string, draws: Draw[], kind: "free" | "paid", paidPulls: number, options?: { opId?: string; result?: string; previousPaidPulls?: number }): Promise<void>;
  /** Removes counters and stored answers that can no longer matter, so an address or an operation is not kept past its window. */
  purgeExpired(now: Date): Promise<PurgeOutcome>;
  /** Whether either of the two has blocked the other. */
  blockedEither(a: string, b: string): Promise<boolean>;
  /** Blocks a player: also ends their friendship and any pending requests between the two. */
  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  blockedUsers(userId: string): Promise<{ id: string; name: string; petId: string | null }[]>;
  reportUser(reporterId: string, reportedId: string, reason: "name" | "behavior" | "other", note: string | null, id: string): Promise<void>;
  /** The ids of everyone in the team that has this code (to check blocks before someone joins). */
  eventTeamMemberIdsByCode(eventId: string, code: string): Promise<string[]>;
  /** Apple's refresh token for this account (kept to revoke it on deletion), or null. */
  appleRefreshToken(userId: string): Promise<string | null>;
  setAppleRefreshToken(userId: string, token: string): Promise<void>;
  /** The stored answer of an earlier draw with this operation id, or null. */
  gachaOp(userId: string, opId: string): Promise<string | null>;
  friends(userId: string): Promise<unknown[]>;
  friendRequests(userId: string): Promise<unknown[]>;
  requestFriend(fromId: string, toId: string, id: string): Promise<void>;
  answerFriendRequest(userId: string, requestId: string, answer: "accepted" | "declined"): Promise<boolean>;
  event(eventId: string): Promise<EventRecord | null>;
  saveEventSteps(userId: string, eventId: string, day: string, cumulative: number): Promise<number>;
  eventStatus(eventId: string): Promise<{ totalCumulative: number; members: number }>;
  /** The team the player is in for this event, with every member's total steps. */
  eventTeam(userId: string, eventId: string): Promise<EventTeamView | null>;
  createEventTeam(userId: string, eventId: string, teamId: string, code: string): Promise<"ok" | "already_member" | "code_taken">;
  joinEventTeam(userId: string, eventId: string, code: string, maxMembers: number): Promise<EventJoinResult>;
  startEventTeam(userId: string, eventId: string, minMembers: number): Promise<EventStartResult>;
  /** A player asks to join the team with this code. The player who made the team answers; nobody is added until then. */
  requestJoinEventTeam(userId: string, eventId: string, code: string, maxMembers: number): Promise<{ result: JoinRequestRequestResult; request?: { id: string } }>;
  /** The open requests of the team this player made (empty for anyone else). */
  eventJoinRequests(creatorId: string, eventId: string): Promise<JoinRequestView[]>;
  /** The open request this player sent, with the name of the player who will answer it. */
  pendingJoinRequest(userId: string, eventId: string): Promise<{ id: string; creatorName: string } | null>;
  /** Accepting adds the member and, once the team has minMembers, sets it out. */
  answerJoinRequest(creatorId: string, eventId: string, requestId: string, accept: boolean, maxMembers: number, minMembers: number): Promise<{ result: JoinRequestAnswerResult; requesterId?: string }>;
  cancelJoinRequest(userId: string, eventId: string): Promise<boolean>;
  leaveEventTeam(userId: string, eventId: string): Promise<"ok" | "no_team" | "already_started">;
  /** Records that this player took the reward. False if they already had. */
  claimEvent(userId: string, eventId: string): Promise<boolean>;
  /** The two players become friends (both directions). */
  makeFriends(userId: string, otherId: string): Promise<void>;
}

export interface ExecutionContext {
  waitUntil?(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}
