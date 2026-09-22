import { test, expect } from "@playwright/test";
import { login, BASE } from "./helpers";

const SECTIONS: [string, RegExp][] = [
  ["dashboard", /HSBC UK/],
  ["pages", /HSBC UK/],
  ["assets", /assets/i],
  ["models", /Content models/],
  ["templates", /templates/i],
  ["tasks", /My tasks/],
  ["api", /API & delivery/],
  ["users", /Users/],
  ["audit", /Audit log/],
  ["repo", /Repository \(JCR\)/],
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
