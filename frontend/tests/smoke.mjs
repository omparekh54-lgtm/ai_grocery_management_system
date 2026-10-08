import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: process.env.CHROMIUM_PATH
    ? [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--no-zygote",
        "--single-process",
      ]
    : [],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.APP_URL || "http://localhost:3000");
const authResponse = page.waitForResponse((r) =>
  r.url().includes("/api/auth/demo"),
);
await page.getByRole("button", { name: "Explore a sample kitchen" }).click();
const auth = await authResponse;
if (!auth.ok()) throw Error("Sample login failed: " + (await auth.text()));
await page.getByRole("heading", { name: /Hello/ }).waitFor();
await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
for (const name of [
  "My inventory",
  "Next month",
  "Shopping list",
  "Consumption log",
  "Food catalogue",
  "Household",
]) {
  await page.getByRole("button", { name, exact: true }).click();
  await page.waitForTimeout(200);
}
await page.getByRole("button", { name: "My inventory", exact: true }).click();
await page.getByRole("button", { name: "Add groceries", exact: true }).click();
await page.getByLabel("Grocery name", { exact: true }).fill("Browser Rice");
await page.getByLabel("Opening stock (optional)").fill("2");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
await page
  .getByRole("heading", { name: "Browser Rice", exact: true })
  .waitFor();
await page.getByRole("button", { name: "Next month", exact: true }).click();
await page
  .getByRole("button", {
    name: /Generate shopping list|Build shopping list|Create shopping list/,
  })
  .click();
await page.getByRole("button", { name: "Shopping list", exact: true }).click();
await page.screenshot({ path: "test-results/shopping.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page
  .getByRole("button", { name: "Kitchen overview", exact: true })
  .click();
await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
for (const name of [
  "My inventory",
  "Next month",
  "Shopping list",
  "Consumption log",
  "Food catalogue",
  "Household",
]) {
  await page.getByRole("button", { name, exact: true }).click();
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
  )
    throw Error("Mobile overflow: " + name);
}
if (
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
)
  throw Error("Mobile horizontal overflow");
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "PASS: sample login, all sections, atomic grocery creation, forecast, shopping list, mobile layout; no browser errors.",
);
await browser.close();
