export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://192.168.1.8:8082";

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
};

export type FoodLogListItem = {
  id: string;
  food_label: string;
  logged_at: string | null;
  confidence: number | null;
};
