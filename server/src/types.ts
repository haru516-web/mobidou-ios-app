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
  PRODUCT_CATALOG_JSON?: string;
  GIFTS_JSON?: string;
  CATALOG_JSON?: string;
  EVENT_STEPS_WINDOW_START?: string;
  EVENT_STEPS_WINDOW_END?: string;
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
}

export interface ProductDefinition {
  plan?: string;
  monthlyTickets?: number;
  paidPulls?: number;
}

export interface VerifiedTransaction {
  transactionId: string;
  originalTransactionId?: string;
  productId: string;
  bundleId: string;
  purchaseDate: number;
  expiresDate?: number;
  revocationDate?: number;
}

export interface Draw {
  petId: string;
  paid: boolean;
}

export interface EventRecord {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  mapId: string;
}

export interface Store {
  registerUser(user: User, secretHash: string): Promise<void>;
  credentialHash(userId: string): Promise<string | null>;
  user(userId: string): Promise<User | null>;
  userByFriendCode(friendCode: string): Promise<User | null>;
  claimGift(userId: string, gift: Gift): Promise<boolean>;
  ticketBalance(userId: string): Promise<number>;
  consumeTickets(userId: string, amount: number, ref: string): Promise<boolean>;
  grantMonthlyTickets(userId: string, plan: string, periodStart: string, periodEnd: string, amount: number): Promise<boolean>;
  recordPurchase(userId: string, transaction: VerifiedTransaction, product: ProductDefinition): Promise<boolean>;
  revokePurchase(transactionId: string): Promise<void>;
  wallet(userId: string, poolId: string): Promise<{ paid: number; free: number; pity: number }>;
  commitDraws(userId: string, poolId: string, draws: Draw[], freeSpent: number, paidSpent: number, pity: number): Promise<void>;
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
