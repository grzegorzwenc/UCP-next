import { test, expect } from "@playwright/test";
import { login, BASE } from "./helpers";

test.describe("session gate", () => {
  test("without a cookie the dashboard redirects to /login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login\?next=/);
    expect(new URL(page.url()).searchParams.get("next")).toBe(`${BASE}/dashboard`);
  });

  test("after login the dashboard shows the market", async ({ page }) => {
    await login(page, "jordan.mensah");
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(new RegExp(`${BASE}/dashboard$`));
    await expect(page.getByRole("heading", { level: 1, name: "HSBC UK" })).toBeVisible();
  });
});
