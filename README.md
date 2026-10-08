# Kitchenly — AI Grocery Management System

A complete local household grocery app: know what is in your fridge, freezer and pantry, record what you consume, and plan how much to buy next month from your own history.

**No Supabase or cloud database.** Inventory, accounts, receipts, consumption history, shopping lists and lookup caches stay in a SQLite database on the computer running the app. Forecasts run locally with StatsForecast. No Gemini key is required to use the project.

## Run locally

Install **Python 3.12 or 3.13**, **Node.js 22+**, and Git. An internet connection is required once to install dependencies.

```bash
git clone https://github.com/omparekh54-lgtm/ai_grocery_management_system.git
cd ai_grocery_management_system
```

**Windows:** double-click `setup.bat` once, then `start.bat`. Both server windows need to stay open. Close both to stop.

**macOS / Linux:**

```bash
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

Open **http://localhost:3000**. Create a local account, or explore a sample kitchen with clearly labelled illustrative data. An email is only your local sign-in identifier; no email service is used.

Alternative with Docker Desktop:

```bash
docker compose up --build -d
```

Open the same URL. `docker compose down` stops it and preserves the database in the project’s `data` folder. Docker has not been required for the normal startup path.

## What it does

- Inventory by grocery and stock batch: quantity, compatible tracking units, purchase date, actual expiry date, cost, and storage location such as **Fridge → middle shelf**.
- Restock, log consumption, record waste separately, reconcile a physical stock count, move batches, archive groceries, and restore them without losing history.
- Deduct eligible stock with earliest expiry first. Expired batches cannot be logged as consumed; record disposal as waste.
- Explainable **next calendar month** forecasts: confirmed usage history, remaining stock, expiry, safety buffer, pack rounding, planned purchase frequency and estimated cost.
- Editable shopping lists that preserve quantities and checked state when generating new recommendations. Checking an item does not silently add inventory; log the actual purchase separately.
- Consumption charts per item, recorded spending and waste value, low-stock coverage, and expiry alerts.
- Offline searchable Indian grocery catalogue with 28 everyday foods and aliases. All defaults are editable planning suggestions, not expiry or food-safety guarantees.
- Optional **Open Food Facts barcode lookup**, and optional **USDA FoodData Central** search. A draft always opens for review before saving.
- CSV daily-consumption import with compatible-unit conversion, duplicate-day protection and explicit completed-day confirmation. Historical imports do not subtract from today’s stock.
- Receipt entry by hand; optional Gemini receipt reading for typed text or images, with editable confirmation before stock changes. Multi-line imports are transactional.
- Password hashing, local session cookies, household isolation, and one-time household invitation codes for accounts using the same running app.
- Responsive desktop and mobile interface.

## How the forecast learns

A newly added grocery uses your **estimated weekly use ÷ 7**. Record actual consumption and confirm a day only when its logs are complete. On an explicitly confirmed day, a missing usage entry counts as zero. Unconfirmed days never count as zero.

Fewer than seven confirmed days are labelled limited history and blended with your initial estimate. With enough data, the app uses a recent confirmed-day average. With at least 21 contiguous complete days, it compares exponential smoothing or Croston SBA for intermittent demand against the average using a held-out final week. It selects the model with lower mean absolute error rather than assuming an advanced model is better. Waste, purchases and stock corrections are excluded from consumption learning.

The app simulates current batches day by day until and through next month. Expired quantities cannot offset future needs. It adds the household buffer and rounds to purchase packs, while avoiding additional purchases when eligible stock already covers demand and the buffer. Perishable items get a suggested purchase interval rather than an instruction to buy an entire month of fresh food at once.

Location means the **storage position of your groceries**. Household city is descriptive; no GPS tracking or automatic location collection is used. Household member count is descriptive too. Change the demand multiplier explicitly for guests, travel or changed habits; it does not automatically multiply learned household use a second time.

Predictions need reliable logs and are estimates, not a guarantee. Costs use recorded unit prices; missing prices are disclosed. Currency changes relabel stored amounts and do not perform exchange-rate conversions.

## Local data and backup

Normal startup stores everything in **`backend/data/grocery.db`**. Docker stores it in **`data/grocery.db`**. Stop both app services before copying the SQLite file to a safe backup. Restore by stopping the app and replacing the database file with the backup. Keep the same code/schema version when restoring; this first release creates the schema automatically and has no cross-version migration system yet.

Database files, environment files and API keys are excluded from Git. Accounts persist across app restarts. There is no password-reset email service in this local release, so keep your local password safely.

The normal startup binds both servers to this computer. The Docker web port binds to localhost. Do not publish the SQLite app to Vercel: its local files are not a durable personal computer database there. No cloud deployment or external database was created for this project.

## Optional online features

All core inventory and forecast features work without online services once dependencies are installed. Copy `backend/.env.example` to `backend/.env` only if you want to change defaults or enable optional services. Keep secrets there, never in frontend files or Git.

- `GEMINI_API_KEY`: optional Google Gemini key, used server-side only for a receipt you explicitly submit. Three receipt requests per account per day, twenty globally by default, one provider call per click, no automatic retries. Sample accounts cannot use it. Images are validated and limited to 2 MB. Receipt data is not sent until you choose **Read with AI**. The key previously shared in chat is not embedded in this repository.
- `GEMINI_MODEL`: configurable supported Gemini model, default `gemini-3.5-flash-lite`. Provider availability and quota depend on your account.
- `USDA_API_KEY`: optional key for FoodData Central. Search queries are sent only when you click its search button.
- Open Food Facts requires no key. Explicit barcode lookup sends the barcode to its API, with 14-day local caching. Network errors leave manual entry available.
- `TIMEZONE`: defaults to `Asia/Kolkata` for calendar-day boundaries. Set your IANA timezone if needed; use the browser in the same timezone for date inputs.

Food source attribution: [Open Food Facts](https://world.openfoodfacts.org/data), licensed ODbL; [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide), CC0. Lookup metadata is stored as provenance alongside user-verified groceries and never treated as household usage history. The offline starter list was authored for this project.

## Development and verification

Backend: FastAPI + SQLAlchemy + SQLite + StatsForecast. Frontend: Next.js + React + TypeScript + Recharts + Lucide. A same-origin Next.js API proxy keeps backend URLs and optional keys out of browser code.

For development, run these in separate terminals from the project root:

```bash
cd backend
# Windows: .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm run dev
```

API docs: http://127.0.0.1:8000/docs. Optional frontend configuration: `frontend/.env.local`, based on `.env.example`.

Checks:

```bash
cd backend
.venv/bin/python -m pytest tests -q
# Windows: .venv\Scripts\python.exe -m pytest tests -q
```

```bash
cd frontend
npm run typecheck
npm run build
```

Tests cover household access isolation, session login, FEFO deduction, expired stock, unit validation, rollback of failed inventory and receipt transactions, duplicate imports, historical data, archive/restore, shopping-list preservation and forecasting across month lengths and leap years.

A browser smoke test is included too. With the local app running, run `npx playwright install chromium` once from `frontend`, then `npm run test:browser`. It creates an isolated sample kitchen, checks every section on desktop and mobile, creates a grocery and generates the shopping list. Screenshot output goes to the ignored `frontend/test-results` folder. This does not contact Gemini.
