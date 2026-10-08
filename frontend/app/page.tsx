"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Apple,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ShoppingBasket as Basket,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  History,
  Leaf,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  api,
  day,
  qty,
  type Identity,
  type Item,
  type Unit,
  type Batch,
  type Forecast,
  type ForecastData,
  type Dashboard,
  type History as HistoryData,
  type Shopping,
  type CatalogFood,
  type ReceiptLine,
} from "../lib/types";
type Section =
  | "overview"
  | "inventory"
  | "forecast"
  | "shopping"
  | "history"
  | "catalog"
  | "settings";
type Modal = {
  kind: "item" | "stock" | "usage" | "count" | "batch";
  item?: Item;
  batch?: Batch;
  food?: CatalogFood;
} | null;
const sections = [
  { key: "overview", label: "Kitchen overview", icon: LayoutIcon },
  { key: "inventory", label: "My inventory", icon: Package },
  { key: "forecast", label: "Next month", icon: TrendingUp },
  { key: "shopping", label: "Shopping list", icon: ShoppingBasket },
  { key: "history", label: "Consumption log", icon: History },
  { key: "catalog", label: "Food catalogue", icon: Apple },
  { key: "settings", label: "Household", icon: Settings2 },
];
function LayoutIcon({ size = 18 }: { size?: number }) {
  return <BarChart3 size={size} />;
}
const categories = [
  "Grains",
  "Pulses",
  "Dairy",
  "Vegetables",
  "Fruit",
  "Essentials",
  "Beverages",
  "Bakery",
  "Nuts",
  "Spices",
  "Frozen",
  "Other",
];
const units: Unit[] = ["kg", "g", "L", "ml", "pcs"];
function ModalShell({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog className="modal" ref={ref} onCancel={close}>
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Close dialog" onClick={close}>
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Input({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Basket size={30} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span>
        <Basket size={24} />
      </span>
      kitchenly<span className="brand-dot">.</span>
    </div>
  );
}
export default function Home() {
  const [me, setMe] = useState<Identity | null>(null),
    [checking, setChecking] = useState(true),
    [section, setSection] = useState<Section>("overview"),
    [items, setItems] = useState<Item[]>([]),
    [dashboard, setDashboard] = useState<Dashboard | null>(null),
    [forecast, setForecast] = useState<ForecastData | null>(null),
    [shopping, setShopping] = useState<Shopping[]>([]),
    [history, setHistory] = useState<HistoryData>({
      movements: [],
      confirmed_days: [],
    }),
    [catalog, setCatalog] = useState<CatalogFood[]>([]),
    [modal, setModal] = useState<Modal>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [location, setLocation] = useState("All locations"),
    [query, setQuery] = useState(""),
    [lookup, setLookup] = useState(""),
    [selectedTrend, setSelectedTrend] = useState(""),
    [confirmDate, setConfirmDate] = useState(day(-1)),
    [expanded, setExpanded] = useState(""),
    [invite, setInvite] = useState(""),
    [joinCode, setJoinCode] = useState(""),
    [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]),
    [archived, setArchived] = useState<Item[]>([]),
    [usdaResults, setUsdaResults] = useState<CatalogFood[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false),
    [receiptText, setReceiptText] = useState(""),
    [receiptLines, setReceiptLines] = useState<
      (ReceiptLine & { selected: boolean })[]
    >([]),
    [receiptNote, setReceiptNote] = useState(""),
    [receiptRef, setReceiptRef] = useState(""),
    [receiptDay, setReceiptDay] = useState(day()),
    [receiptLocation, setReceiptLocation] = useState("Pantry"),
    [receiptImage, setReceiptImage] = useState<{
      data: string;
      mime: string;
    } | null>(null);
  const [authMode, setAuthMode] = useState("register"),
    [authEmail, setAuthEmail] = useState(""),
    [authPassword, setAuthPassword] = useState(""),
    [authName, setAuthName] = useState(""),
    [authKitchen, setAuthKitchen] = useState("My kitchen");
  const receiptInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: me?.household.currency || "INR",
      maximumFractionDigits: 0,
    }).format(n);
  async function refresh() {
    const [identity, it, d, f, s, h, c, sp, ar] = await Promise.all([
      api<Identity>("/me"),
      api<Item[]>("/items"),
      api<Dashboard>("/dashboard"),
      api<ForecastData>("/forecast"),
      api<Shopping[]>("/shopping"),
      api<HistoryData>("/history"),
      api<CatalogFood[]>("/catalog"),
      api<{ id: string; name: string }[]>("/households"),
      api<Item[]>("/items/archived/list"),
    ]);
    setMe(identity);
    setItems(it);
    setDashboard(d);
    setForecast(f);
    setShopping(s);
    setHistory(h);
    setCatalog(c);
    setSpaces(sp);
    setArchived(ar);
    setSelectedTrend((v) => (it.some((i) => i.id === v) ? v : it[0]?.id || ""));
  }
  useEffect(() => {
    api<Identity>("/me")
      .then(async (identity) => {
        setMe(identity);
        await refresh();
      })
      .catch((e) => {
        if (!String(e?.message).toLowerCase().includes("sign in"))
          setError(e?.message || "The local backend is unavailable.");
      })
      .finally(() => setChecking(false));
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  function toast(s: string) {
    setNotice(s);
    setTimeout(() => setNotice(""), 5000);
  }
  function exportText(content: string, name: string, type = "text/csv") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const locations = [
    "All locations",
    ...new Set(
      items.flatMap((i) => [i.location, ...i.batches.map((b) => b.location)]),
    ),
  ];
  const filtered = items.filter(
    (i) =>
      (!search || i.name.toLowerCase().includes(search.toLowerCase())) &&
      (location === "All locations" ||
        i.location === location ||
        i.batches.some((b) => b.location === location)),
  );
  const shoppingCycle = forecast?.cycle || "";
  const currentShopping = shopping.filter((s) => s.cycle === shoppingCycle);
  const trend = useMemo(() => {
    const out: Record<string, number> = {};
    for (let ago = 13; ago >= 0; ago--) out[day(-ago)] = 0;
    for (const x of history.movements) {
      if (
        x.item_id === selectedTrend &&
        ["consume", "history"].includes(x.kind) &&
        x.day in out
      )
        out[x.day] += x.quantity;
    }
    return Object.entries(out).map(([d, q]) => ({
      day: d.slice(5),
      quantity: Number(q.toFixed(3)),
      confirmed: history.confirmed_days.includes(d),
    }));
  }, [history, selectedTrend]);
  const spending = useMemo(() => {
    const out: Record<string, number> = {};
    for (let ago = 13; ago >= 0; ago--) out[day(-ago)] = 0;
    for (const x of history.movements)
      if (x.kind === "purchase" && x.day in out) out[x.day] += x.cost;
    return Object.entries(out).map(([d, cost]) => ({
      day: d.slice(5),
      cost: Number(cost.toFixed(2)),
    }));
  }, [history]);
  async function auth(e: React.FormEvent) {
    e.preventDefault();
    await act(async () => {
      await api(
        authMode === "register" ? "/auth/register" : "/auth/login",
        "POST",
        authMode === "register"
          ? {
              email: authEmail,
              password: authPassword,
              name: authName,
              household_name: authKitchen,
            }
          : { email: authEmail, password: authPassword },
      );
      setAuthPassword("");
      await refresh();
    });
  }
  async function openReceipt() {
    setReceiptText("");
    setReceiptLines([]);
    setReceiptNote("");
    setReceiptRef(crypto.randomUUID());
    setReceiptImage(null);
    setReceiptOpen(true);
  }
  async function imageReceipt(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2000000
    ) {
      setError("Choose a JPG, PNG or WebP receipt under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setReceiptImage({
        data: String(reader.result).split(",")[1],
        mime: file.type,
      });
    reader.readAsDataURL(file);
  }
  async function parseReceipt() {
    await act(async () => {
      const data = await api<{ lines: ReceiptLine[]; note: string }>(
        "/assist/receipt",
        "POST",
        {
          text: receiptText,
          image_base64: receiptImage?.data || "",
          mime_type: receiptImage?.mime || "image/jpeg",
        },
      );
      setReceiptLines(data.lines.map((x) => ({ ...x, selected: true })));
      setReceiptNote(data.note);
    });
  }
  async function saveReceipt() {
    await act(async () => {
      await api("/receipts/import", "POST", {
        reference: receiptRef,
        purchased: receiptDay,
        location: receiptLocation,
        lines: receiptLines
          .filter((x) => x.selected)
          .map(({ selected, ...line }) => line),
      });
      setReceiptOpen(false);
      await refresh();
      toast("Receipt saved. Add each batch’s expiry date from its label.");
    });
  }
  async function importCsv(file?: File) {
    if (!file) return;
    await act(async () => {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines[0].trim() !== "item_id,day,quantity,unit,complete_day")
        throw Error(
          "Use the CSV template headers: item_id,day,quantity,unit,complete_day",
        );
      const rows = lines
        .slice(1)
        .filter((x) => x.trim())
        .map((line) => {
          const [item_id, d, q, u, c] = line.split(",");
          return {
            item_id,
            day: d,
            quantity: Number(q),
            unit: u,
            complete_day: c?.trim().toLowerCase() === "true",
          };
        });
      const result = await api<{ inserted: number; skipped: number }>(
        "/history/import",
        "POST",
        { rows },
      );
      await refresh();
      toast(
        `Imported ${result.inserted} daily totals; skipped ${result.skipped} duplicates.`,
      );
    });
    if (csvInput.current) csvInput.current.value = "";
  }
  if (checking)
    return (
      <div className="boot">
        <Brand />
        <Loader2 className="spin" size={25} />
        <p>Opening your kitchen…</p>
      </div>
    );
  if (!me)
    return (
      <div className="auth-shell">
        <section className="auth-story">
          <Brand />
          <div className="auth-illustration">
            <div className="basket-illustration">
              <Basket size={130} strokeWidth={1} />
              <span className="leaf-one">
                <Leaf size={50} />
              </span>
              <span className="leaf-two">
                <Apple size={48} />
              </span>
            </div>
          </div>
          <div className="eyebrow">
            A LITTLE LESS WASTE. A LITTLE MORE ORGANISED.
          </div>
          <h1>
            A kitchen that
            <br />
            plans <em>with you.</em>
          </h1>
          <p>
            Know what you have, learn what you use, and make next month’s
            grocery run a little smarter.
          </p>
          <div className="auth-points">
            <span>
              <CheckCircle2 size={16} />
              Your data stays on this computer
            </span>
            <span>
              <CheckCircle2 size={16} />
              Forecasts work without an API key
            </span>
          </div>
        </section>
        <section className="auth-form">
          <div className="local-badge">
            <ShieldCheck size={15} /> LOCAL-FIRST WORKSPACE
          </div>
          <h2>
            {authMode === "register"
              ? "Make room for a smarter kitchen."
              : "Welcome back to your kitchen."}
          </h2>
          <p>
            {authMode === "register"
              ? "Create a local account to keep your household organised."
              : "Sign in to your local household account."}
          </p>
          <form onSubmit={auth}>
            {authMode === "register" && (
              <>
                <Input label="Your name">
                  <input
                    required
                    maxLength={80}
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="What should we call you?"
                  />
                </Input>
                <Input label="Kitchen name">
                  <input
                    required
                    maxLength={80}
                    value={authKitchen}
                    onChange={(e) => setAuthKitchen(e.target.value)}
                  />
                </Input>
              </>
            )}
            <Input label="Email">
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="username"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Input>
            <Input label="Password">
              <input
                type="password"
                required
                minLength={authMode === "register" ? 10 : 1}
                maxLength={128}
                autoComplete={
                  authMode === "register" ? "new-password" : "current-password"
                }
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder={
                  authMode === "register"
                    ? "At least 10 characters"
                    : "Your password"
                }
              />
            </Input>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary wide" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : authMode === "register" ? (
                "Create my kitchen"
              ) : (
                "Sign in"
              )}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {authMode === "register" ? "Already have a kitchen?" : "New here?"}{" "}
            <button
              onClick={() => {
                setAuthMode(authMode === "register" ? "login" : "register");
                setError("");
              }}
            >
              {authMode === "register" ? "Sign in" : "Create an account"}
            </button>
          </p>
          <div className="or">
            <span />
            or get a feel for it
            <span />
          </div>
          <button
            className="btn secondary wide"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await api("/auth/demo", "POST");
                await refresh();
              })
            }
          >
            <Sparkles size={16} />
            Explore a sample kitchen
          </button>
          <small className="auth-note">
            No email verification service. Accounts and data are stored locally.
            The sample uses illustrative consumption data.
          </small>
        </section>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="kitchen-switch">
          <span className="avatar">
            <Leaf size={16} />
          </span>
          <div>
            <strong>{me.household.name}</strong>
            <small>{me.household.city || "Your local kitchen"}</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-caption">YOUR KITCHEN</div>
        <nav>
          {sections.map((s) => (
            <button
              key={s.key}
              title={s.label}
              className={section === s.key ? "nav active" : "nav"}
              onClick={() => {
                setSection(s.key as Section);
                setSearch("");
                setError("");
              }}
            >
              <s.icon size={18} />
              {s.label}
              {s.key === "shopping" &&
                currentShopping.filter((x) => !x.checked).length > 0 && (
                  <span className="nav-count">
                    {currentShopping.filter((x) => !x.checked).length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <Leaf size={21} />
          <h3>
            Good for your kitchen.
            <br />
            Better for the planet.
          </h3>
          <p>
            Use the oldest eligible batch first. A small habit, a little less
            waste.
          </p>
        </div>
        <div className="profile">
          <span className="profile-avatar">
            {me.user.name[0]?.toUpperCase()}
          </span>
          <div>
            <strong>{me.user.name}</strong>
            <small>{me.user.demo ? "Sample explorer" : "Local account"}</small>
          </div>
          <button
            className="icon-btn"
            aria-label="Sign out"
            onClick={() =>
              act(async () => {
                await api("/auth/logout", "POST");
                setMe(null);
                setItems([]);
                setError("");
              })
            }
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={13} />
            <strong>{sections.find((s) => s.key === section)?.label}</strong>
          </div>
          <div className="header-right">
            <span>
              <MapPin size={13} />
              {me.household.city || "Location not set"}
            </span>
            <span className="local-tag">
              <span />
              Data stored locally
            </span>
          </div>
        </header>
        <main>
          {me.user.demo && (
            <div className="demo-banner">
              <Sparkles size={15} />
              <span>
                Sample kitchen · Illustrative data, isolated from real accounts.
                No AI requests are made.
              </span>
            </div>
          )}
          {error && (
            <div className="alert" role="alert">
              {error}
              <button
                className="icon-btn"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <CheckCircle2 size={17} />
              {notice}
            </div>
          )}
          {section === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">A FRESH LOOK AT YOUR KITCHEN</div>
                  <h1>
                    Hello, {me.user.name.split(" ")[0]}{" "}
                    <span className="greeting-leaf">
                      <Leaf size={25} />
                    </span>
                  </h1>
                  <p>Here’s what’s in your kitchen, and what’s coming next.</p>
                </div>
                <button
                  className="btn primary"
                  onClick={() => setModal({ kind: "item" })}
                >
                  <Plus size={17} />
                  Add groceries
                </button>
              </div>
              <div className="stats-grid">
                <Stat
                  icon={<Basket size={21} />}
                  title="Groceries tracked"
                  value={String(dashboard?.items_count || 0)}
                  note="Across your storage locations"
                />
                <Stat
                  icon={<Clock3 size={21} />}
                  title="Use soon"
                  value={String(dashboard?.expiring.length || 0)}
                  note="Batches expiring within 7 days"
                  tone="amber"
                />
                <Stat
                  icon={<TrendingUp size={21} />}
                  title="Next month’s budget"
                  value={money(dashboard?.next_month_cost || 0)}
                  note="Estimate based on recorded prices"
                />
                <Stat
                  icon={<Leaf size={21} />}
                  title="Waste recorded"
                  value={money(dashboard?.waste_value || 0)}
                  note="Value this calendar month"
                  tone="lilac"
                />
              </div>
              <div className="dashboard-grid">
                <section className="card forecast-highlight">
                  <div className="card-heading">
                    <span className="section-caption">
                      <Sparkles size={16} />
                      LOOKING AHEAD
                    </span>
                    <span className="pill">{forecast?.month}</span>
                  </div>
                  <h2>
                    A little planning.
                    <br />
                    <span>A smoother grocery run.</span>
                  </h2>
                  <p>
                    Your next month’s needs, based on confirmed consumption and
                    stock expected to remain.
                  </p>
                  <div className="forecast-preview">
                    {forecast?.rows
                      .filter((r) => r.recommended_purchase > 0)
                      .slice(0, 3)
                      .map((r) => (
                        <div key={r.item_id}>
                          <span>{r.name}</span>
                          <strong>
                            {qty(r.recommended_purchase)} {r.unit}
                          </strong>
                        </div>
                      ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setSection("forecast")}
                  >
                    Explore your forecast
                    <ArrowRight size={16} />
                  </button>
                  <Leaf
                    className="highlight-leaf"
                    size={145}
                    strokeWidth={0.7}
                  />
                </section>
                <section className="card use-soon">
                  <div className="card-heading">
                    <h2>
                      <Clock3 size={18} />
                      Use these first
                    </h2>
                    <button
                      className="text-button"
                      onClick={() => setSection("inventory")}
                    >
                      View all
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                  {dashboard?.expiring.length ? (
                    dashboard.expiring.slice(0, 4).map((b) => (
                      <div className="soon-row" key={b.id}>
                        <span className="food-icon">
                          <Apple size={18} />
                        </span>
                        <div>
                          <strong>{b.name}</strong>
                          <small>
                            {qty(b.quantity)} {b.unit} · {b.location}
                          </small>
                        </div>
                        <span
                          className={b.expired ? "badge danger" : "badge amber"}
                        >
                          {b.expired
                            ? "Expired"
                            : b.expiry === day()
                              ? "Today"
                              : b.expiry}
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty
                      title="No expiry alerts"
                      text="Add expiry dates from your labels to see which batches need attention."
                    />
                  )}
                  <p className="fineprint">
                    Expiry alerts use dates you enter. They are not food-safety
                    advice.
                  </p>
                </section>
              </div>
              <div className="dashboard-grid lower">
                <section className="card chart-card">
                  <div className="card-heading">
                    <div>
                      <h2>Your consumption, day by day</h2>
                      <p className="caption">
                        Last 14 days ·{" "}
                        {items.find((i) => i.id === selectedTrend)?.unit ||
                          "Choose an item"}
                      </p>
                    </div>
                    <select
                      aria-label="Consumption chart item"
                      value={selectedTrend}
                      onChange={(e) => setSelectedTrend(e.target.value)}
                    >
                      {items.map((i) => (
                        <option value={i.id} key={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {items.length ? (
                    <>
                      <div className="chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trend}>
                            <defs>
                              <linearGradient
                                id="usage-fill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#83a58d"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#83a58d"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#edf0e9"
                            />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 10, fill: "#98a090" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#98a090" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip />
                            <Area
                              type="monotone"
                              dataKey="quantity"
                              stroke="#739781"
                              fill="url(#usage-fill)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="fineprint">
                        This chart shows recorded amounts. Unconfirmed days are
                        not used as zero-consumption observations in forecasts.
                      </p>
                    </>
                  ) : (
                    <Empty
                      title="A clearer picture starts with a log"
                      text="Add your first grocery, then record what you use."
                    />
                  )}
                </section>
                <section className="card low-card">
                  <div className="card-heading">
                    <h2>
                      <Package size={18} />
                      Running low
                    </h2>
                    <span className="badge">
                      {dashboard?.low_stock.length || 0} items
                    </span>
                  </div>
                  {dashboard?.low_stock.length ? (
                    dashboard.low_stock.slice(0, 4).map((r) => (
                      <div className="low-row" key={r.item_id}>
                        <div>
                          <strong>{r.name}</strong>
                          <small>
                            {r.basis === "estimate"
                              ? "Based on your estimate"
                              : "Based on confirmed history"}
                          </small>
                        </div>
                        <span>
                          {r.days_left === 0
                            ? "Out of stock"
                            : `${r.days_left} days`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty
                      title="Nothing running low yet"
                      text="Set a weekly-use estimate or confirm usage history to see stock coverage."
                    />
                  )}
                  <button
                    className="text-button"
                    onClick={() => setSection("shopping")}
                  >
                    Open shopping list
                    <ArrowRight size={16} />
                  </button>
                </section>
              </div>
            </>
          )}
          {section === "inventory" && (
            <>
              <PageHeading
                eyebrow="KNOW WHAT YOU HAVE"
                title="Your kitchen, organised."
                text="Track every batch, from the pantry shelf to the fridge door."
                action={
                  <button
                    className="btn primary"
                    onClick={() => setModal({ kind: "item" })}
                  >
                    <Plus size={17} />
                    Add groceries
                  </button>
                }
              />
              <div className="toolbar">
                <div className="search-input">
                  <Search size={16} />
                  <input
                    aria-label="Search inventory"
                    placeholder="Search your groceries…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter storage location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  {locations.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <button
                  className="btn secondary"
                  onClick={() =>
                    exportText(
                      "name,stock,unit,location,weekly_use\n" +
                        items
                          .map(
                            (i) =>
                              `"${i.name.replaceAll('"', '""')}",${i.stock},${i.unit},"${i.location.replaceAll('"', '""')}",${i.weekly_use}`,
                          )
                          .join("\n"),
                      "kitchen-inventory.csv",
                    )
                  }
                >
                  <Download size={15} />
                  Export
                </button>
              </div>
              {filtered.length ? (
                <div className="inventory-grid">
                  {filtered.map((i) => (
                    <article className="card inventory-card" key={i.id}>
                      <div className="inventory-top">
                        <span
                          className={
                            "food-icon category-" + i.category.toLowerCase()
                          }
                        >
                          <Apple size={24} />
                        </span>
                        <span className="badge">{i.category}</span>
                        <button
                          className="icon-btn edit-btn"
                          aria-label={`Edit ${i.name}`}
                          onClick={() => setModal({ kind: "item", item: i })}
                        >
                          <Settings2 size={16} />
                        </button>
                      </div>
                      <h3>{i.name}</h3>
                      <div className="stock-quantity">
                        {qty(i.usable_stock)}
                        <span>{i.unit}</span>
                      </div>
                      <p className="storage">
                        <MapPin size={12} />
                        {[...new Set(i.batches.map((b) => b.location))].join(
                          " · ",
                        ) || i.location}
                      </p>
                      <div className="stock-meta">
                        <span>
                          {i.weekly_use
                            ? `${qty(i.weekly_use)} ${i.unit}/week estimate`
                            : "Weekly estimate not set"}
                        </span>
                        {i.expired_stock > 0 && (
                          <span className="danger-text">
                            {qty(i.expired_stock)} {i.unit} expired
                          </span>
                        )}
                      </div>
                      <div className="inventory-actions">
                        <button
                          className="btn secondary"
                          onClick={() => setModal({ kind: "usage", item: i })}
                        >
                          Log use
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => setModal({ kind: "stock", item: i })}
                        >
                          <Plus size={14} />
                          Restock
                        </button>
                      </div>
                      <button
                        className="batch-toggle"
                        onClick={() =>
                          setExpanded(expanded === i.id ? "" : i.id)
                        }
                      >
                        {i.batches.length} active batches
                        <ChevronDown size={13} />
                      </button>
                      {expanded === i.id && (
                        <div className="batch-list">
                          {i.batches.map((b) => (
                            <div key={b.id}>
                              <div>
                                <strong>
                                  {qty(b.quantity)} {i.unit} · {b.location}
                                </strong>
                                <small>
                                  Expiry: {b.expiry || "unknown"} · Bought{" "}
                                  {b.purchased}
                                </small>
                              </div>
                              <button
                                className="icon-btn"
                                aria-label={`Edit batch of ${i.name}`}
                                onClick={() =>
                                  setModal({ kind: "batch", item: i, batch: b })
                                }
                              >
                                <Settings2 size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            className="text-button"
                            onClick={() => setModal({ kind: "count", item: i })}
                          >
                            Reconcile stock count
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="card">
                  <Empty
                    title={
                      items.length
                        ? "No matching groceries"
                        : "A fresh start for your kitchen"
                    }
                    text={
                      items.length
                        ? "Try another search or storage location."
                        : "Add your first grocery manually, or choose an item from the food catalogue."
                    }
                    action={
                      <button
                        className="btn primary"
                        onClick={() => setSection("catalog")}
                      >
                        Browse foods
                        <ArrowRight size={16} />
                      </button>
                    }
                  />
                </div>
              )}
              {archived.length > 0 && (
                <details className="card archived">
                  <summary>Archived groceries ({archived.length})</summary>
                  {archived.map((i) => (
                    <div className="simple-row" key={i.id}>
                      {i.name}
                      <button
                        className="btn secondary"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await api(`/items/${i.id}/restore`, "POST");
                            await refresh();
                          })
                        }
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </details>
              )}
            </>
          )}
          {section === "forecast" && (
            <>
              <PageHeading
                eyebrow="BUY WHAT YOU NEED. WHEN YOU NEED IT."
                title={`A plan for ${forecast?.month || "next month"}.`}
                text="Consumption estimates meet your actual stock, expiry dates and pack sizes."
                action={
                  <button
                    className="btn primary"
                    disabled={busy || !forecast?.rows.length}
                    onClick={() =>
                      act(async () => {
                        await api("/shopping/generate", "POST");
                        await refresh();
                        setSection("shopping");
                        toast(
                          "Forecast added. Existing list edits were preserved.",
                        );
                      })
                    }
                  >
                    <Plus size={17} />
                    Build shopping list
                  </button>
                }
              />
              <div className="forecast-summary card">
                <div>
                  <small>Estimated grocery budget</small>
                  <strong>{money(forecast?.estimated_cost || 0)}</strong>
                  <span>
                    {forecast?.missing_prices
                      ? `${forecast.missing_prices} items have no recorded price`
                      : "Uses your recorded unit prices"}
                  </span>
                </div>
                <div>
                  <small>Safety buffer</small>
                  <strong>{me.household.buffer_percent}%</strong>
                  <span>Adjust in Household settings</span>
                </div>
                <div>
                  <small>Demand adjustment</small>
                  <strong>{me.household.demand_multiplier}×</strong>
                  <span>For travel, guests or changed routines</span>
                </div>
              </div>
              <div className="info-banner">
                <ShieldCheck size={18} />
                <p>
                  Fresh foods are split into smaller purchases. Monthly demand
                  is not a recommendation to buy everything today. Predictions
                  remain estimates.
                </p>
              </div>
              {forecast?.rows.length ? (
                <div className="card table-card">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Grocery</th>
                          <th>Expected use</th>
                          <th>Opening stock</th>
                          <th>Buy next month</th>
                          <th>Purchase rhythm</th>
                          <th>Data basis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.rows.map((r) => (
                          <FragmentRow
                            key={r.item_id}
                            row={r}
                            expanded={expanded === r.item_id}
                            toggle={() =>
                              setExpanded(
                                expanded === r.item_id ? "" : r.item_id,
                              )
                            }
                            money={money}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <Empty
                    title="Your forecast needs a starting point"
                    text="Add groceries with estimated weekly use. The app will learn from confirmed daily records as you log them."
                    action={
                      <button
                        className="btn primary"
                        onClick={() => setModal({ kind: "item" })}
                      >
                        Add a grocery
                        <Plus size={16} />
                      </button>
                    }
                  />
                </div>
              )}
            </>
          )}
          {section === "shopping" && (
            <>
              <PageHeading
                eyebrow="A LIST WITH A LITTLE FORESIGHT"
                title="Your next grocery run."
                text={`Plan for ${forecast?.month || "next month"}. Check items off as you shop; record purchases separately to update stock.`}
                action={
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        await api("/shopping/generate", "POST");
                        await refresh();
                        toast(
                          "New recommendations added; your edits were kept.",
                        );
                      })
                    }
                  >
                    <Sparkles size={16} />
                    Add forecast items
                  </button>
                }
              />
              <div className="shopping-layout">
                <section className="card shopping-card">
                  <div className="card-heading">
                    <h2>
                      <ShoppingBasket size={19} />
                      Your list
                    </h2>
                    <span className="badge">
                      {currentShopping.filter((s) => s.checked).length} /{" "}
                      {currentShopping.length} checked
                    </span>
                  </div>
                  {currentShopping.length ? (
                    currentShopping.map((s) => (
                      <div
                        className={
                          "shopping-row " + (s.checked ? "checked" : "")
                        }
                        key={s.id}
                      >
                        <input
                          aria-label={`Mark ${s.name} purchased`}
                          type="checkbox"
                          checked={s.checked}
                          disabled={busy}
                          onChange={(e) =>
                            act(async () => {
                              await api(`/shopping/${s.id}`, "PATCH", {
                                quantity: s.quantity,
                                checked: e.target.checked,
                              });
                              await refresh();
                            })
                          }
                        />
                        <div className="shopping-name">
                          <strong>{s.name}</strong>
                          <small>
                            {s.shelf_days < 14
                              ? "Buy in smaller batches"
                              : "Suitable for a planned restock"}{" "}
                            · {s.unit}
                          </small>
                        </div>
                        <input
                          className="quantity-input"
                          aria-label={`Quantity for ${s.name}`}
                          type="number"
                          min="0"
                          step="0.001"
                          defaultValue={s.quantity}
                          key={s.id + ":" + s.quantity}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (
                              Number.isFinite(v) &&
                              v >= 0 &&
                              v !== s.quantity
                            )
                              act(async () => {
                                await api(`/shopping/${s.id}`, "PATCH", {
                                  quantity: v,
                                  checked: s.checked,
                                });
                                await refresh();
                              });
                          }}
                        />
                        <span className="shopping-price">
                          {s.cost_known
                            ? money(s.estimated_cost)
                            : "Price unknown"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty
                      title="One less thing to remember"
                      text="Build a shopping list from your next-month forecast."
                    />
                  )}
                </section>
                <aside className="card list-summary">
                  <ShoppingBasket size={27} />
                  <h3>A smarter basket</h3>
                  <div>
                    <span>Estimated total</span>
                    <strong>
                      {money(
                        currentShopping.reduce(
                          (sum, s) => sum + s.estimated_cost,
                          0,
                        ),
                      )}
                    </strong>
                  </div>
                  <p>
                    Prices come from your purchases, not live store pricing.
                    Items without prices are excluded from this estimate.
                  </p>
                  <button
                    className="btn secondary wide"
                    onClick={() =>
                      exportText(
                        "name,quantity,unit,estimated_cost,checked\n" +
                          currentShopping
                            .map(
                              (s) =>
                                `"${s.name.replaceAll('"', '""')}",${s.quantity},${s.unit},${s.estimated_cost},${s.checked}`,
                            )
                            .join("\n"),
                        "grocery-shopping-list.csv",
                      )
                    }
                  >
                    <Download size={16} />
                    Download list
                  </button>
                  <div className="tip">
                    <Leaf size={17} />
                    <p>
                      Checking a box does not add stock. Use Restock in your
                      inventory once the groceries arrive.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {section === "history" && (
            <>
              <PageHeading
                eyebrow="SMALL LOGS. BETTER PREDICTIONS."
                title="Learn your kitchen’s rhythm."
                text="Record usage, track waste, and confirm completed days to improve forecasts."
                action={
                  <button
                    className="btn secondary"
                    onClick={() =>
                      exportText(
                        "item_id,day,quantity,unit,complete_day\n" +
                          (items[0]
                            ? `${items[0].id},${day(-1)},0,${items[0].unit},true\n`
                            : ""),
                        "consumption-import-template.csv",
                      )
                    }
                  >
                    <Download size={15} />
                    CSV template
                  </button>
                }
              />
              <div className="card tracking-confirm">
                <div>
                  <h3>
                    <CheckCircle2 size={18} />
                    Mark a day completely logged
                  </h3>
                  <p>
                    Confirm only after every consumed quantity for that day is
                    recorded. Unlogged items will count as zero for that
                    confirmed day.
                  </p>
                </div>
                <input
                  aria-label="Completed tracking date"
                  type="date"
                  max={day(-1)}
                  value={confirmDate}
                  onChange={(e) => setConfirmDate(e.target.value)}
                />
                <button
                  className="btn primary"
                  disabled={busy || !items.length}
                  onClick={() =>
                    act(async () => {
                      await api("/tracking/confirm", "POST", {
                        day: confirmDate,
                      });
                      await refresh();
                      toast("Complete day confirmed. Forecast updated.");
                    })
                  }
                >
                  Confirm day
                  <Check size={16} />
                </button>
              </div>
              <div className="history-tools">
                <span>
                  {history.confirmed_days.length} household dates with
                  confirmations
                </span>
                <button
                  className="text-button"
                  onClick={() => csvInput.current?.click()}
                >
                  <Upload size={15} />
                  Import daily totals
                </button>
                <input
                  ref={csvInput}
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) => importCsv(e.target.files?.[0])}
                />
              </div>
              <p className="fineprint">
                History imports do not change current stock. Use the template
                and one row per grocery per date. Complete-day flags are
                explicit; duplicate daily imports are skipped.
              </p>
              <div className="card table-card">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Grocery</th>
                        <th>Movement</th>
                        <th>Quantity</th>
                        <th>Date</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.movements.slice(0, 150).map((x) => (
                        <tr key={x.id}>
                          <td>
                            <strong>{x.name}</strong>
                          </td>
                          <td>
                            <span
                              className={
                                "badge " + (x.kind === "waste" ? "amber" : "")
                              }
                            >
                              {x.kind}
                            </span>
                          </td>
                          <td>
                            {qty(x.quantity)} {x.unit}
                          </td>
                          <td>{x.day}</td>
                          <td className="note-cell">{x.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!history.movements.length && (
                  <Empty
                    title="A blank page, full of potential"
                    text="Purchases, consumption, waste and corrections will appear here."
                  />
                )}
              </div>
              <section className="card chart-card spending-chart">
                <h2>Recorded purchases · last 14 days</h2>
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spending}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#edf0e9"
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip formatter={(v) => money(Number(v))} />
                      <Bar
                        dataKey="cost"
                        fill="#85a28c"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
          {section === "catalog" && (
            <>
              <PageHeading
                eyebrow="GOOD INGREDIENTS. A GOOD START."
                title="Find your everyday essentials."
                text="An offline Indian grocery catalogue, with optional online barcode and food lookups."
                action={
                  <button className="btn secondary" onClick={openReceipt}>
                    <FileText size={16} />
                    Import receipt
                  </button>
                }
              />
              <div className="catalog-tools">
                <div className="search-input">
                  <Search size={16} />
                  <input
                    aria-label="Search offline food catalogue"
                    placeholder="Search rice, atta, milk, palak…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="barcode-input">
                  <input
                    aria-label="Product barcode"
                    placeholder="Enter a product barcode"
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    maxLength={14}
                  />
                  <button
                    className="btn secondary"
                    disabled={busy || !lookup}
                    onClick={() =>
                      act(async () => {
                        const food = await api<CatalogFood>(
                          "/catalog/barcode/" + encodeURIComponent(lookup),
                        );
                        setModal({ kind: "item", food });
                      })
                    }
                  >
                    Look up
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              <div className="info-banner">
                <ShieldCheck size={17} />
                <p>
                  The built-in catalogue works offline. Barcode lookup sends
                  only the barcode to Open Food Facts. Verify names, package
                  sizes and units before saving.
                </p>
              </div>
              <div className="catalog-grid">
                {catalog
                  .filter(
                    (c) =>
                      !query ||
                      c.name.toLowerCase().includes(query.toLowerCase()) ||
                      c.aliases?.some((a) => a.includes(query.toLowerCase())),
                  )
                  .map((c) => (
                    <button
                      className="card catalog-tile"
                      key={c.name}
                      onClick={() => setModal({ kind: "item", food: c })}
                    >
                      <span className="food-icon">
                        <Apple size={23} />
                      </span>
                      <div>
                        <strong>{c.name}</strong>
                        <small>
                          {c.category} · {c.unit}
                        </small>
                      </div>
                      <Plus size={17} />
                    </button>
                  ))}
              </div>
              <div className="catalog-footer">
                <p>
                  Catalogue defaults are editable planning suggestions, not
                  expiry dates.
                </p>
                <button
                  className="text-button"
                  disabled={busy || query.trim().length < 2}
                  onClick={() =>
                    act(async () => {
                      const result = await api<CatalogFood[]>(
                        "/catalog/usda?q=" + encodeURIComponent(query),
                      );
                      if (!result.length)
                        throw Error("No matching USDA food was found.");
                      setUsdaResults(result);
                    })
                  }
                >
                  Optional USDA search
                  <ArrowUpRight size={14} />
                </button>
              </div>
              {usdaResults.length > 0 && (
                <div className="card" style={{ padding: 20, marginTop: 20 }}>
                  <h3>Choose a USDA food reference</h3>
                  {usdaResults.map((c) => (
                    <div className="simple-row" key={c.source_id}>
                      <span>{c.name}</span>
                      <button
                        className="text-button"
                        onClick={() => setModal({ kind: "item", food: c })}
                      >
                        Review
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="fineprint">
                Online product data: Open Food Facts contributors (ODbL), and
                optional USDA FoodData Central (CC0). USDA requires its own
                server API key. Imported references remain separate from
                household usage records.
              </p>
            </>
          )}
          {section === "settings" && (
            <>
              <PageHeading
                eyebrow="YOUR HOUSEHOLD. YOUR HABITS."
                title="Make this kitchen yours."
                text="Adjust your household details and planning preferences."
              />
              <div className="settings-grid">
                <section className="card settings-card">
                  <h2>
                    <Users size={19} />
                    Household preferences
                  </h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      act(async () => {
                        await api("/household", "PATCH", {
                          name: f.get("name"),
                          city: f.get("city"),
                          size: Number(f.get("size")),
                          currency: f.get("currency"),
                          buffer_percent: Number(f.get("buffer")),
                          demand_multiplier: Number(f.get("multiplier")),
                        });
                        await refresh();
                        toast("Household preferences saved.");
                      });
                    }}
                  >
                    <div className="form-grid">
                      <Input label="Kitchen name">
                        <input
                          name="name"
                          required
                          defaultValue={me.household.name}
                          maxLength={80}
                          disabled={!me.owner}
                        />
                      </Input>
                      <Input label="City (optional)">
                        <input
                          name="city"
                          defaultValue={me.household.city}
                          maxLength={80}
                          disabled={!me.owner}
                        />
                      </Input>
                      <Input label="Household members">
                        <input
                          name="size"
                          type="number"
                          required
                          min="1"
                          max="30"
                          defaultValue={me.household.size}
                          disabled={!me.owner}
                        />
                      </Input>
                      <Input label="Currency label">
                        <select
                          name="currency"
                          defaultValue={me.household.currency}
                          disabled={!me.owner}
                        >
                          {["INR", "USD", "EUR", "GBP"].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </Input>
                      <Input label="Safety buffer (%)">
                        <input
                          name="buffer"
                          type="number"
                          required
                          min="0"
                          max="50"
                          step="1"
                          defaultValue={me.household.buffer_percent}
                          disabled={!me.owner}
                        />
                      </Input>
                      <Input label="Demand multiplier">
                        <input
                          name="multiplier"
                          type="number"
                          required
                          min="0"
                          max="3"
                          step="0.1"
                          defaultValue={me.household.demand_multiplier}
                          disabled={!me.owner}
                        />
                      </Input>
                    </div>
                    <p className="fineprint">
                      Set 0.5× for lower demand or 1.5× for guests. Member count
                      is descriptive; adjust demand explicitly to avoid
                      double-counting changes. Currency changes relabel amounts
                      and do not convert past prices.
                    </p>
                    <button
                      className="btn primary"
                      disabled={busy || !me.owner}
                    >
                      Save preferences
                      <Check size={16} />
                    </button>
                  </form>
                </section>
                <section className="card settings-card">
                  <h2>
                    <ShieldCheck size={19} />A local place for your data
                  </h2>
                  <p className="settings-copy">
                    Inventory, accounts and consumption records are stored in a
                    SQLite file on the computer running this app. No cloud
                    database is connected. Keep a copy of the database file to
                    back up your kitchen.
                  </p>
                  <div className="member-list">
                    {me.members.map((member, i) => (
                      <div className="simple-row" key={i}>
                        <span>{member.name}</span>
                        <span className="badge">
                          {member.owner ? "Owner" : "Member"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="fineprint">
                    Household invitations work between accounts on the same
                    running app. Remote access requires deliberate network
                    configuration.
                  </p>
                  <button
                    className="btn secondary"
                    disabled={busy || !me.owner || me.user.demo}
                    onClick={() =>
                      act(async () => {
                        const result = await api<{ code: string }>(
                          "/household/invite",
                          "POST",
                        );
                        setInvite(result.code);
                      })
                    }
                  >
                    Create one-time invitation
                    <Plus size={14} />
                  </button>
                  {invite && (
                    <div className="invite-code">
                      <code>{invite}</code>
                      <small>
                        Valid for 24 hours, one use. Share only with your
                        intended household member.
                      </small>
                    </div>
                  )}
                  <Input label="Join a household with an invitation">
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Paste invitation code"
                      maxLength={200}
                    />
                  </Input>
                  <button
                    className="btn secondary"
                    disabled={busy || !joinCode || me.user.demo}
                    onClick={() =>
                      act(async () => {
                        await api("/household/join", "POST", {
                          code: joinCode,
                        });
                        setJoinCode("");
                        await refresh();
                        toast("Joined the household.");
                      })
                    }
                  >
                    Join household
                    <ArrowRight size={14} />
                  </button>
                  {spaces.length > 1 && (
                    <Input label="Switch household">
                      <select
                        value={me.household.id}
                        onChange={(e) =>
                          act(async () => {
                            await api("/households/switch", "POST", {
                              id: e.target.value,
                            });
                            await refresh();
                          })
                        }
                      >
                        {spaces.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </Input>
                  )}
                </section>
              </div>
            </>
          )}
        </main>
        <footer>
          <span>
            <Leaf size={13} />
            Kitchenly · A little less waste, a little more care.
          </span>
          <span>Local storage · Explainable forecasts</span>
        </footer>
      </div>
      {modal && (
        <GroceryModal
          modal={modal}
          busy={busy}
          error={error}
          close={() => {
            setModal(null);
            setError("");
          }}
          submit={async (fn) =>
            act(async () => {
              await fn();
              setModal(null);
              await refresh();
              toast("Your kitchen has been updated.");
            })
          }
        />
      )}
      {receiptOpen && (
        <ModalShell
          title="Import a grocery receipt"
          close={() => {
            setReceiptOpen(false);
            setError("");
          }}
        >
          <div className="info-banner">
            <ShieldCheck size={17} />
            <p>
              Optional AI sends the selected receipt to Google Gemini. It
              returns a draft; nothing is added until you review and confirm.
              Core tracking works without it.
            </p>
          </div>
          {!me.ai_available && (
            <p className="alert">
              Receipt AI is not configured. You can enter receipt items manually
              below.
            </p>
          )}
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <Input label="Receipt text">
            <textarea
              placeholder="Paste the receipt’s grocery lines here…"
              maxLength={12000}
              value={receiptText}
              onChange={(e) => setReceiptText(e.target.value)}
            />
          </Input>
          <div className="receipt-buttons">
            <button
              className="btn secondary"
              onClick={() => receiptInput.current?.click()}
            >
              <Upload size={15} />
              {receiptImage ? "Image selected" : "Choose receipt image"}
            </button>
            <input
              ref={receiptInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => imageReceipt(e.target.files?.[0])}
            />
            <button
              className="btn primary"
              disabled={
                busy ||
                !me.ai_available ||
                me.user.demo ||
                (!receiptText && !receiptImage)
              }
              onClick={parseReceipt}
            >
              <Sparkles size={16} />
              Read with AI
            </button>
          </div>
          <div className="receipt-draft">
            <h3>Review your line items</h3>
            {receiptNote && <p className="fineprint">{receiptNote}</p>}
            {receiptLines.map((line, index) => (
              <div className="receipt-line" key={index}>
                <input
                  aria-label={`Include receipt line ${index + 1}`}
                  type="checkbox"
                  checked={line.selected}
                  onChange={(e) =>
                    setReceiptLines(
                      receiptLines.map((x, i) =>
                        i === index ? { ...x, selected: e.target.checked } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Receipt item ${index + 1}`}
                  value={line.name}
                  maxLength={100}
                  placeholder="Grocery name"
                  onChange={(e) =>
                    setReceiptLines(
                      receiptLines.map((x, i) =>
                        i === index ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Receipt quantity ${index + 1}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={line.quantity}
                  onChange={(e) =>
                    setReceiptLines(
                      receiptLines.map((x, i) =>
                        i === index
                          ? { ...x, quantity: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
                <select
                  aria-label={`Receipt unit ${index + 1}`}
                  value={line.unit}
                  onChange={(e) =>
                    setReceiptLines(
                      receiptLines.map((x, i) =>
                        i === index
                          ? { ...x, unit: e.target.value as Unit }
                          : x,
                      ),
                    )
                  }
                >
                  {units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
                <input
                  aria-label={`Receipt total price ${index + 1}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.total_price}
                  onChange={(e) =>
                    setReceiptLines(
                      receiptLines.map((x, i) =>
                        i === index
                          ? { ...x, total_price: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <button
              className="text-button"
              onClick={() =>
                setReceiptLines([
                  ...receiptLines,
                  {
                    name: "",
                    quantity: 1,
                    unit: "kg",
                    total_price: 0,
                    selected: true,
                  },
                ])
              }
            >
              <Plus size={15} />
              Add a line manually
            </button>
          </div>
          <div className="form-grid">
            <Input label="Purchase date">
              <input
                type="date"
                max={day()}
                value={receiptDay}
                onChange={(e) => setReceiptDay(e.target.value)}
              />
            </Input>
            <Input label="Storage location">
              <input
                value={receiptLocation}
                onChange={(e) => setReceiptLocation(e.target.value)}
                maxLength={100}
              />
            </Input>
          </div>
          <p className="fineprint">
            Use actual quantities, not unknown pack counts. Matching grocery
            names reuse the existing item; new items start without a weekly-use
            estimate. Expiry dates must be added from labels afterwards.
          </p>
          <div className="modal-footer">
            <button
              className="btn secondary"
              onClick={() => setReceiptOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={
                busy ||
                !receiptLines.some((x) => x.selected) ||
                receiptLines.some(
                  (x) =>
                    x.selected &&
                    (!x.name.trim() || x.quantity <= 0 || x.total_price < 0),
                )
              }
              onClick={saveReceipt}
            >
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Check size={16} />
              )}
              Confirm and save
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({
  icon,
  title,
  value,
  note,
  tone = "green",
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="card stat-card">
      <span className={"stat-icon " + tone}>{icon}</span>
      <span className="stat-label">{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function FragmentRow({
  row: r,
  expanded,
  toggle,
  money,
}: {
  row: Forecast;
  expanded: boolean;
  toggle: () => void;
  money: (n: number) => string;
}) {
  return (
    <>
      <tr className="forecast-row">
        <td>
          <button className="row-expand" onClick={toggle}>
            <strong>{r.name}</strong>
            <ChevronDown size={13} />
          </button>
          <small>
            {r.unit} · {r.category}
          </small>
        </td>
        <td>
          {qty(r.predicted_consumption)} {r.unit}
        </td>
        <td>
          {qty(r.opening_stock)} {r.unit}
        </td>
        <td>
          <strong className="buy-quantity">
            {qty(r.recommended_purchase)} {r.unit}
          </strong>
          <small>
            {r.cost_known ? money(r.estimated_cost) : "Price not recorded"}
          </small>
        </td>
        <td>
          {r.recommended_purchase > 0
            ? r.purchase_interval_days >= r.days
              ? "Monthly restock"
              : `Every ${r.purchase_interval_days} days`
            : "No purchase forecast"}
          {r.recommended_purchase > 0 && r.purchase_interval_days < r.days && (
            <small>
              Up to {qty(r.suggested_per_visit)} {r.unit} per visit
            </small>
          )}
        </td>
        <td>
          <span
            className={"badge " + (r.basis === "history" ? "green" : "amber")}
          >
            {r.confirmed_days
              ? `${r.confirmed_days} confirmed days`
              : "Initial estimate"}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="forecast-detail">
            <p>
              <Sparkles size={15} />
              {r.explanation}
            </p>
            <small>
              Usable stock offset: {qty(r.stock_offset)} {r.unit} · Model:{" "}
              {r.model} · Complete-day coverage: {r.coverage}% of the last 56
              days.
            </small>
          </td>
        </tr>
      )}
    </>
  );
}
function GroceryModal({
  modal,
  busy,
  error,
  close,
  submit,
}: {
  modal: NonNullable<Modal>;
  busy: boolean;
  error: string;
  close: () => void;
  submit: (fn: () => Promise<void>) => Promise<void>;
}) {
  const { kind, item, food, batch } = modal;
  const [name, setName] = useState(item?.name || food?.name || ""),
    [category, setCategory] = useState(
      item?.category || food?.category || "Other",
    ),
    [unit, setUnit] = useState<Unit>(item?.unit || food?.unit || "kg"),
    [loc, setLoc] = useState(
      batch?.location || item?.location || food?.location || "Pantry",
    ),
    [weekly, setWeekly] = useState(item?.weekly_use || 0),
    [pack, setPack] = useState(item?.pack_size || food?.pack_size || 1),
    [price, setPrice] = useState(item?.price_per_unit || 0),
    [shelf, setShelf] = useState(item?.shelf_days || food?.shelf_days || 7),
    [quantity, setQuantity] = useState(kind === "count" ? item?.stock || 0 : 0),
    [cost, setCost] = useState(0),
    [purchased, setPurchased] = useState(day()),
    [expiry, setExpiry] = useState(batch?.expiry || ""),
    [usageKind, setUsageKind] = useState("consume"),
    [reason, setReason] = useState("correction"),
    [note, setNote] = useState("");
  const title =
    kind === "item"
      ? item
        ? "Edit grocery"
        : "Add a grocery"
      : kind === "stock"
        ? `Restock ${item?.name}`
        : kind === "usage"
          ? `Log ${item?.name}`
          : kind === "count"
            ? `Count ${item?.name}`
            : `Edit ${item?.name} batch`;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await submit(async () => {
      if (kind === "item") {
        const data = {
          name,
          category,
          unit,
          location: loc,
          weekly_use: weekly,
          pack_size: pack,
          price_per_unit: price,
          shelf_days: shelf,
          barcode: item?.barcode || food?.barcode || "",
          source: item?.source || food?.source || "manual",
          source_id: item?.source_id || food?.source_id || "",
          source_url: item?.source_url || food?.source_url || "",
        };
        await api<Item>(
          item ? `/items/${item.id}` : "/items",
          item ? "PATCH" : "POST",
          item
            ? data
            : {
                ...data,
                opening_stock:
                  quantity > 0
                    ? {
                        quantity,
                        unit,
                        purchased,
                        expiry: expiry || null,
                        location: loc,
                        cost,
                      }
                    : null,
              },
        );
      } else if (kind === "stock")
        await api(`/items/${item!.id}/batches`, "POST", {
          quantity,
          unit,
          purchased,
          expiry: expiry || null,
          location: loc,
          cost,
        });
      else if (kind === "usage")
        await api(`/items/${item!.id}/usage`, "POST", {
          quantity,
          unit,
          kind: usageKind,
          day: purchased,
          note,
        });
      else if (kind === "count")
        await api(`/items/${item!.id}/count`, "POST", {
          quantity,
          unit,
          reason,
        });
      else
        await api(`/batches/${batch!.id}`, "PATCH", {
          location: loc,
          expiry: expiry || null,
        });
    });
  }
  return (
    <ModalShell title={title} close={close}>
      <form onSubmit={save}>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        {food?.attribution && (
          <div className="info-banner">
            <Apple size={17} />
            <p>
              {food.attribution}{" "}
              {food.package_label && `Package label: ${food.package_label}`}
            </p>
          </div>
        )}
        {kind === "item" && (
          <>
            <Input label="Grocery name">
              <input
                required
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rice"
              />
            </Input>
            <div className="form-grid">
              <Input label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Input>
              <Input label="Tracking unit">
                <select
                  value={unit}
                  disabled={!!item}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                >
                  {units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Input>
              <Input label="Estimated weekly use">
                <input
                  type="number"
                  required
                  min="0"
                  max="100000"
                  step="0.001"
                  value={weekly}
                  onChange={(e) => setWeekly(Number(e.target.value))}
                />
              </Input>
              <Input label="Purchase pack size">
                <input
                  type="number"
                  required
                  min="0.001"
                  max="100000"
                  step="0.001"
                  value={pack}
                  onChange={(e) => setPack(Number(e.target.value))}
                />
              </Input>
              <Input label="Price per tracking unit (optional)">
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </Input>
              <Input label="Planned maximum days between fresh purchases">
                <input
                  type="number"
                  required
                  min="1"
                  max="730"
                  value={shelf}
                  onChange={(e) => setShelf(Number(e.target.value))}
                />
              </Input>
            </div>
            <p className="fineprint">
              Weekly use is an initial estimate, not a learned prediction.
              Purchase interval is a planning preference, not a safety
              guarantee.
            </p>
          </>
        )}
        {["item", "stock", "batch"].includes(kind) && (
          <Input label="Storage location">
            <input
              required
              value={loc}
              maxLength={100}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="e.g. Fridge → middle shelf"
            />
          </Input>
        )}
        {((kind === "item" && !item) ||
          ["stock", "usage", "count"].includes(kind)) && (
          <div className="form-grid">
            <Input
              label={
                kind === "count"
                  ? "Actual quantity remaining"
                  : kind === "item"
                    ? "Opening stock (optional)"
                    : "Quantity"
              }
            >
              <input
                type="number"
                required
                min={kind === "item" || kind === "count" ? "0" : "0.001"}
                max="1000000"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Input>
            <Input label="Quantity unit">
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                disabled={kind === "item"}
              >
                {units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Input>
          </div>
        )}
        {((kind === "item" && !item) || kind === "stock") && (
          <>
            <div className="form-grid">
              <Input label="Purchase date">
                <input
                  required
                  type="date"
                  max={day()}
                  value={purchased}
                  onChange={(e) => setPurchased(e.target.value)}
                />
              </Input>
              <Input label="Expiry date from label (optional)">
                <input
                  type="date"
                  min={purchased}
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </Input>
            </div>
            <Input label="Total amount paid for this stock (optional)">
              <input
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
              />
            </Input>
          </>
        )}
        {kind === "usage" && (
          <>
            <div className="form-grid">
              <Input label="Movement type">
                <select
                  value={usageKind}
                  onChange={(e) => setUsageKind(e.target.value)}
                >
                  <option value="consume">Consumed</option>
                  <option value="waste">Discarded / waste</option>
                </select>
              </Input>
              <Input label="Date">
                <input
                  required
                  type="date"
                  max={day()}
                  value={purchased}
                  onChange={(e) => setPurchased(e.target.value)}
                />
              </Input>
            </div>
            <Input label="Note (optional)">
              <input
                value={note}
                maxLength={300}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Used for dinner"
              />
            </Input>
            <p className="fineprint">
              Stock is deducted from the earliest-expiring eligible batch. Waste
              is tracked separately and never counted as consumption.
            </p>
          </>
        )}
        {kind === "count" && (
          <>
            <Input label="Explain the stock difference">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="correction">
                  Stock correction (not consumption)
                </option>
                <option value="consume">Unlogged consumption</option>
                <option value="waste">Unlogged waste</option>
              </select>
            </Input>
            <p className="fineprint">
              Increases are recorded as corrections with unknown expiry. Record
              missing purchases separately if you want them included in
              spending.
            </p>
          </>
        )}
        {kind === "batch" && (
          <Input label="Expiry date">
            <input
              type="date"
              min={batch?.purchased}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </Input>
        )}
        <div className="modal-footer">
          {kind === "item" && item && (
            <button
              type="button"
              className="text-button danger-text"
              disabled={busy}
              onClick={() =>
                submit(async () => {
                  await api(`/items/${item.id}/archive`, "POST");
                })
              }
            >
              Archive grocery
            </button>
          )}
          <button type="button" className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Check size={16} />
            )}
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
