import Constants from "expo-constants";

/**
 * FastAPI base (port 8082).
 * On a physical phone, never use 127.0.0.1/localhost because that points to the phone itself.
 */
function parseHostFromExpLike(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const withoutQuery = v.split("?")[0] ?? v;
  const hostPort = withoutQuery.includes("://")
    ? (withoutQuery.split("://")[1] ?? "").split("/")[0]
    : withoutQuery.split("/")[0];
  const host = (hostPort ?? "").split(":")[0]?.trim();
  if (!host) return null;
  const h = host.toLowerCase();
  if (h === "127.0.0.1" || h === "localhost" || h === "0.0.0.0") return null;
  return host;
}

function inferApiHostFromExpo(): string | null {
  const fromLink = parseHostFromExpLike(Constants.linkingUri ?? "");
  if (fromLink) return fromLink;
  const hu = Constants.expoConfig?.hostUri;
  if (typeof hu === "string") {
    const h = parseHostFromExpLike(hu);
    if (h) return h;
  }
  const dbg = (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost;
  if (typeof dbg === "string") {
    const h = parseHostFromExpLike(dbg);
    if (h) return h;
  }
  return null;
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv;
  const inferred = inferApiHostFromExpo();
  if (inferred) return `http://${inferred}:8082`;
  if (!Constants.isDevice) {
    return "http://127.0.0.1:8082";
  }
  // Physical device, no .env / extra / Expo host: iPhone Personal Hotspot often assigns the PC here.
  return "http://172.20.10.3:8082";
}

export const API_BASE_URL = resolveApiBaseUrl();

export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export type DayTotals = {
  date: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fats_g: number;
  sugar_g: number;
  salt_mg: number;
  entries: number;
};

export type LogsSummaryResponse = {
  ok: boolean;
  today: DayTotals;
  week: DayTotals[];
  targets: {
    calories: number;
    fats_g: number;
    sugar_g: number;
    salt_mg: number;
  };
};

export type FoodLogListItem = {
  id: string;
  food_label: string;
  logged_at: string | null;
  confidence: number | null;
};
