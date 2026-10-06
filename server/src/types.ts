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
  EVENT_STEPS_WINDOW_START?: string;
  EVENT_STEPS_DAILY_MAX?: string;
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
}

export type AgeGroup = "under16" | "16to19" | "adult";

export type AppleLinkResult = "linked" | "already_linked" | "apple_in_use" | "account_has_other_apple";

export interface CloudSave {
  data: string;
  version: number;
  updatedAt: string;
}

export interface Store {
  /** Remove the account and everything that belongs to it (profile, friends, wallet, pulls, purchases, saves, Apple link). */
  deleteUser(userId: string): Promise<void>;
  cloudSave(userId: string): Promise<CloudSave | null>;
  /** Store the save if `baseVersion` is the stored version (0 when there is none); returns the new version, or null on a conflict. */
  putCloudSave(userId: string, data: string, baseVersion: number): Promise<number | null>;
  linkApple(userId: string, appleSub: string): Promise<AppleLinkResult>;
  userByApple(appleSub: string): Promise<string | null>;
  appleLinked(userId: string): Promise<boolean>;
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
  hitRateLimit(key: string, window: number): Promise<number>;
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
  revokePurchase(transactionId: string, paidPulls?: number): Promise<void>;
  wallet(userId: string): Promise<{ paid: number; free: number; paidPulls: number; refundDebt: number }>;
  ownedPets(userId: string): Promise<Record<string, number>>;
  chooseStarter(userId: string, petId: string): Promise<boolean>;
  /** Raise each pet's copy count to at least the given number (never lowers it). */
  mergeOwnedPets(userId: string, owned: Record<string, number>): Promise<void>;
  claimFreePull(userId: string, routeId: string): Promise<boolean>;
  commitDraws(userId: string, draws: Draw[], kind: "free" | "paid", paidPulls: number): Promise<void>;
  friends(userId: string): Promise<unknown[]>;
  friendRequests(userId: string): Promise<unknown[]>;
  requestFriend(fromId: string, toId: string, id: string): Promise<void>;
  answerFriendRequest(userId: string, requestId: string, answer: "accepted" | "declined"): Promise<boolean>;
  event(eventId: string): Promise<EventRecord | null>;
  saveEventSteps(userId: string, eventId: string, day: string, cumulative: number): Promise<number>;
  eventStatus(eventId: string): Promise<{ totalCumulative: number; members: number }>;
}

export interface ExecutionContext {
  waitUntil?(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}
