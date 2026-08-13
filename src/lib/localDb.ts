// ---------------------------------------------------------------------------
// Local-only data layer. Everything lives in localStorage — no backend.
// ---------------------------------------------------------------------------

export interface LocalUser {
  id: string;
  phone: string;
  username: string;
  password: string;
  is_admin: boolean;
  created_at: string;
}

export interface LocalProfile {
  id: string;
  username: string;
  phone: string;
  balance: number; // coins
  total_wagered: number;
  xp: number;
  level: number;
}

export interface LocalBet {
  id: string;
  user_id: string;
  username: string;
  amount: number; // coins
  cashout_multiplier: number | null;
  crash_multiplier: number;
  payout: number; // coins
  won: boolean;
  created_at: string;
}

export type PaymentMethod = string;
export type TxStatus = "pending" | "approved" | "rejected";

export interface LocalTx {
  id: string;
  user_id: string;
  username: string;
  phone: string;
  type: "deposit" | "withdraw";
  amount: number; // coins
  method: PaymentMethod;
  account: string; // sender/receiver account or phone
  proof: string | null; // data URL of uploaded payment proof
  status: TxStatus;
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface LocalChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

export interface LocalScore {
  user_id: string;
  username: string;
  tournament_key: string;
  profit: number;
  updated_at: string;
}

export interface PaymentMethodDef {
  id: PaymentMethod;
  label: string;
  account: string;
  hint: string;
  logo: string | null; // data URL
  enabled: boolean;
}

const DEFAULT_METHODS: PaymentMethodDef[] = [
  { id: "telebirr", label: "Telebirr", account: "0941815119", hint: "Send via Telebirr to this number, then upload the screenshot.", logo: null, enabled: true },
  { id: "cbe", label: "CBE (Commercial Bank of Ethiopia)", account: "1000123456789", hint: "Transfer to this CBE account, then upload the receipt.", logo: null, enabled: true },
];

const ADMIN_PHONE = "0941815119";
const ADMIN_PASSWORD = "Yo1221@_";

const K = {
  users: "jetx:users",
  profiles: "jetx:profiles",
  bets: "jetx:bets",
  txs: "jetx:transactions",
  chat: "jetx:chat",
  scores: "jetx:scores",
  session: "jetx:session",
  methods: "jetx:payment_methods",
  game: "jetx:game_config",
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
  emit();
};

// --- tiny pub/sub so components re-render on data change ------------------
const listeners = new Set<() => void>();
export const subscribeDb = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
const emit = () => listeners.forEach(l => l());

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
};

// --- seeding ---------------------------------------------------------------
export const ensureSeed = () => {
  const users = read<LocalUser[]>(K.users, []);
  if (!users.some(u => u.is_admin)) {
    const id = uid();
    users.push({
      id,
      phone: normalizePhone(ADMIN_PHONE)!,
      username: "admin",
      password: ADMIN_PASSWORD,
      is_admin: true,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(K.users, JSON.stringify(users));
    const profiles = read<LocalProfile[]>(K.profiles, []);
    profiles.push({ id, username: "admin", phone: ADMIN_PHONE, balance: 10000, total_wagered: 0, xp: 0, level: 1 });
    localStorage.setItem(K.profiles, JSON.stringify(profiles));
  }
};

// --- users / auth ----------------------------------------------------------
export const getUsers = () => read<LocalUser[]>(K.users, []);
export const getProfiles = () => read<LocalProfile[]>(K.profiles, []);

export const getSessionUser = (): LocalUser | null => {
  const id = read<string | null>(K.session, null);
  if (!id) return null;
  return getUsers().find(u => u.id === id) ?? null;
};

export const signIn = (phoneRaw: string, password: string): { user?: LocalUser; error?: string } => {
  ensureSeed();
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { error: "Enter a valid phone number" };
  const user = getUsers().find(u => u.phone === phone);
  if (!user || user.password !== password) return { error: "Invalid phone or password" };
  write(K.session, user.id);
  return { user };
};

export const signUp = (phoneRaw: string, password: string, usernameRaw: string): { user?: LocalUser; error?: string } => {
  ensureSeed();
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { error: "Enter a valid phone number" };
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  const users = getUsers();
  if (users.some(u => u.phone === phone)) return { error: "Phone already registered" };
  const username = usernameRaw.trim() || `pilot_${phone.slice(-4)}`;
  const user: LocalUser = { id: uid(), phone, username, password, is_admin: false, created_at: new Date().toISOString() };
  users.push(user);
  localStorage.setItem(K.users, JSON.stringify(users));
  const profiles = getProfiles();
  profiles.push({ id: user.id, username, phone, balance: 1000, total_wagered: 0, xp: 0, level: 1 });
  write(K.profiles, profiles);
  write(K.session, user.id);
  return { user };
};

export const signOut = () => {
  localStorage.removeItem(K.session);
  emit();
};

// --- profiles --------------------------------------------------------------
export const getProfile = (userId: string): LocalProfile | null =>
  getProfiles().find(p => p.id === userId) ?? null;

export const updateProfile = (userId: string, patch: Partial<LocalProfile>) => {
  const profiles = getProfiles();
  const i = profiles.findIndex(p => p.id === userId);
  if (i < 0) return;
  profiles[i] = { ...profiles[i], ...patch };
  write(K.profiles, profiles);
};

export const topProfiles = (limit = 5) =>
  [...getProfiles()].sort((a, b) => b.total_wagered - a.total_wagered).slice(0, limit);

/** Admin: credit (or debit with a negative amount) a user's balance in coins.
 *  `key` may be the user id, phone number, or username. */
export const adminAdjustBalance = (
  key: string,
  coins: number
): { profile?: LocalProfile; error?: string } => {
  const k = key.trim();
  if (!k) return { error: "Enter a user id, phone or username" };
  if (!Number.isFinite(coins) || coins === 0) return { error: "Enter a valid amount" };
  const phone = normalizePhone(k);
  const profiles = getProfiles();
  const i = profiles.findIndex(
    p => p.id === k || p.username.toLowerCase() === k.toLowerCase() || (phone && normalizePhone(p.phone) === phone)
  );
  if (i < 0) return { error: "User not found" };
  const next = { ...profiles[i], balance: Math.max(0, profiles[i].balance + coins) };
  profiles[i] = next;
  write(K.profiles, profiles);
  return { profile: next };
};


// --- bets ------------------------------------------------------------------
export const getBets = () => read<LocalBet[]>(K.bets, []);

export const insertBet = (bet: Omit<LocalBet, "id" | "created_at">) => {
  const bets = getBets();
  bets.unshift({ ...bet, id: uid(), created_at: new Date().toISOString() });
  write(K.bets, bets.slice(0, 500));
};

export const getUserBets = (userId: string, limit = 100) =>
  getBets().filter(b => b.user_id === userId).slice(0, limit);

// --- transactions ----------------------------------------------------------
export const getTransactions = () => read<LocalTx[]>(K.txs, []);

export const getUserTransactions = (userId: string, type?: "deposit" | "withdraw") =>
  getTransactions().filter(t => t.user_id === userId && (!type || t.type === type));

export const createTransaction = (
  tx: Omit<LocalTx, "id" | "status" | "created_at" | "reviewed_at" | "note">
): LocalTx => {
  const txs = getTransactions();
  const full: LocalTx = {
    ...tx,
    id: uid(),
    status: "pending",
    note: null,
    created_at: new Date().toISOString(),
    reviewed_at: null,
  };
  txs.unshift(full);
  write(K.txs, txs.slice(0, 500));
  return full;
};

/** Admin action. Deposits credit on approval; withdrawals are held at request
 *  time and refunded on rejection. */
export const reviewTransaction = (txId: string, status: "approved" | "rejected", note?: string) => {
  const txs = getTransactions();
  const i = txs.findIndex(t => t.id === txId);
  if (i < 0 || txs[i].status !== "pending") return;
  const tx = txs[i];
  txs[i] = { ...tx, status, note: note ?? null, reviewed_at: new Date().toISOString() };
  localStorage.setItem(K.txs, JSON.stringify(txs));

  const profile = getProfile(tx.user_id);
  if (profile) {
    if (tx.type === "deposit" && status === "approved") {
      updateProfile(tx.user_id, { balance: profile.balance + tx.amount });
    }
    if (tx.type === "withdraw" && status === "rejected") {
      updateProfile(tx.user_id, { balance: profile.balance + tx.amount });
    }
  }
  emit();
};

// --- chat ------------------------------------------------------------------
export const getChat = () => read<LocalChatMessage[]>(K.chat, []);

export const sendChat = (user_id: string, username: string, message: string) => {
  const chat = getChat();
  chat.push({ id: uid(), user_id, username, message, created_at: new Date().toISOString() });
  write(K.chat, chat.slice(-200));
};

// --- tournament scores -----------------------------------------------------
export const getScores = (tournamentKey: string) =>
  read<LocalScore[]>(K.scores, [])
    .filter(s => s.tournament_key === tournamentKey)
    .sort((a, b) => b.profit - a.profit);

export const addScore = (user_id: string, username: string, tournament_key: string, delta: number) => {
  const scores = read<LocalScore[]>(K.scores, []);
  const i = scores.findIndex(s => s.user_id === user_id && s.tournament_key === tournament_key);
  if (i >= 0) scores[i] = { ...scores[i], profit: scores[i].profit + delta, updated_at: new Date().toISOString() };
  else scores.push({ user_id, username, tournament_key, profit: delta, updated_at: new Date().toISOString() });
  write(K.scores, scores);
};
