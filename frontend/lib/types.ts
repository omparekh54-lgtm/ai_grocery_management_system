export type Unit = "kg" | "g" | "L" | "ml" | "pcs";
export type Household = {
  id: string;
  name: string;
  city: string;
  size: number;
  currency: string;
  buffer_percent: number;
  demand_multiplier: number;
};
export type Identity = {
  user: { id: string; name: string; email: string; demo: boolean };
  household: Household;
  owner: boolean;
  ai_available: boolean;
  members: { name: string; owner: boolean }[];
};
export type Batch = {
  id: string;
  item_id: string;
  quantity: number;
  initial_quantity: number;
  location: string;
  purchased: string;
  expiry: string | null;
  cost: number;
};
export type Item = {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  location: string;
  weekly_use: number;
  pack_size: number;
  price_per_unit: number;
  shelf_days: number;
  barcode: string;
  source: string;
  source_id: string;
  source_url: string;
  created: string;
  archived: boolean;
  stock: number;
  usable_stock: number;
  expired_stock: number;
  batches: Batch[];
  next_expiry: string | null;
};
export type Forecast = {
  item_id: string;
  name: string;
  unit: Unit;
  category: string;
  month: string;
  cycle: string;
  days: number;
  daily_rate: number;
  predicted_consumption: number;
  opening_stock: number;
  stock_offset: number;
  buffer: number;
  recommended_purchase: number;
  estimated_cost: number;
  cost_known: boolean;
  model: string;
  confirmed_days: number;
  coverage: number;
  basis: string;
  days_left: number | null;
  runout_date: string | null;
  purchase_interval_days: number;
  planned_visits: number;
  suggested_per_visit: number;
  explanation: string;
};
export type ForecastData = {
  month: string;
  cycle: string;
  rows: Forecast[];
  estimated_cost: number;
  missing_prices: number;
  sample: boolean;
};
export type Dashboard = {
  items_count: number;
  low_stock: Forecast[];
  expiring: (Batch & { name: string; unit: Unit; expired: boolean })[];
  monthly_spending: number;
  waste_value: number;
  next_month_cost: number;
  forecast_rows: Forecast[];
};
export type Movement = {
  id: string;
  item_id: string;
  kind: string;
  quantity: number;
  day: string;
  cost: number;
  note: string;
  name: string;
  unit: Unit;
};
export type History = { movements: Movement[]; confirmed_days: string[] };
export type Shopping = {
  id: string;
  item_id: string;
  quantity: number;
  checked: boolean;
  cycle: string;
  name: string;
  unit: Unit;
  estimated_cost: number;
  cost_known: boolean;
  shelf_days: number;
};
export type CatalogFood = {
  name: string;
  category?: string;
  unit?: Unit;
  pack_size?: number;
  shelf_days?: number;
  location?: string;
  aliases?: string[];
  brand?: string;
  package_label?: string;
  ingredients?: string;
  barcode?: string;
  source?: string;
  source_id?: string;
  source_url?: string;
  attribution?: string;
};
export type ReceiptLine = {
  name: string;
  quantity: number;
  unit: Unit;
  total_price: number;
};
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    const detail = data.detail;
    throw Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((x: { msg: string }) => x.msg).join("; ")
          : "The request could not be completed.",
    );
  }
  return data;
}
export function day(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function qty(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(n);
}
