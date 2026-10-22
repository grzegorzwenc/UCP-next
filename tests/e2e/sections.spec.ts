import { test, expect } from "@playwright/test";
import { login, BASE } from "./helpers";

const SECTIONS: [string, RegExp][] = [
  ["dashboard", /^Welcome/], // the market box was removed; the h1 is the welcome
  ["pages", /HSBC UK/],
  ["assets", /assets/i],
  ["models", /Content models/],
  ["templates", /templates/i],
  ["tasks", /My tasks/],
  ["api", /API & delivery/],
  ["users", /Users/],
  ["audit", /My activity/], // jordan.mensah is not a site admin: only their own actions
];

test.describe("sections", () => {
  test.beforeEach(async ({ page }) => { await login(page, "jordan.mensah"); });
  for (const [seg, h1] of SECTIONS) {
    test(`/${seg} responds 200 with its heading`, async ({ page }) => {
      const res = await page.goto(`${BASE}/${seg}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(h1);
    });
  }
});

test("audit log: site admins see everyone, others only themselves", async ({ page }) => {
  await login(page, "super.admin");
  const all = await (await page.request.get("/api/ucp/log?market=uk")).json() as { who: string }[];
  expect(new Set(all.map((e) => e.who)).size).toBeGreaterThan(1);
  await page.goto(`${BASE}/audit`); await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(/Audit log/);
  await login(page, "jordan.mensah");
  const own = await (await page.request.get("/api/ucp/log?market=uk")).json() as { who: string }[];
  expect(own.every((e) => e.who === "jordan.mensah")).toBe(true);
});
