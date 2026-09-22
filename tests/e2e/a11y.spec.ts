import { test, expect } from "@playwright/test";
import { login, BASE } from "./helpers";

test.describe("keyboard and shell", () => {
  test.beforeEach(async ({ page }) => { await login(page, "jordan.mensah"); });

  test("command palette: combobox semantics, arrows, Escape restores focus", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    const opener = page.getByRole("link", { name: "Edit a page" });
    await opener.focus();
    await page.keyboard.press("Control+k");
    const box = page.getByRole("combobox", { name: "Command" });
    await expect(box).toBeFocused();
    const first = await box.getAttribute("aria-activedescendant");
    expect(first).toBeTruthy();
    await page.keyboard.press("ArrowDown");
    const second = await box.getAttribute("aria-activedescendant");
    expect(second).not.toBe(first);
    await expect(page.locator(`[id="${second}"]`)).toHaveAttribute("aria-selected", "true");
    // Tab stays inside the dialog
    await page.keyboard.press("Tab");
    await expect(page.getByRole("dialog", { name: "Command palette" }).locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("side nav toggle exposes aria-expanded and collapses on tablet widths", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    const nav = page.getByRole("navigation", { name: "Main" });
    const toggle = nav.getByRole("button", { name: /Collapse menu|Expand menu/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(nav).toHaveClass(/w-16/);
    await toggle.click();
    await expect(nav).toHaveClass(/w-\[264px\]/);
    await page.setViewportSize({ width: 1000, height: 800 });
    await expect(nav).toHaveClass(/w-16/);
    await expect(toggle).toHaveCount(0);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(nav).toHaveClass(/w-\[264px\]/);
  });

  test("repository row menu is a keyboard-operable ARIA menu", async ({ page }) => {
    await page.goto(`${BASE}/repo`);
    const trigger = page.getByRole("button", { name: /More actions for/ }).first();
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("menuitem", { name: "Copy path" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(menu.getByRole("menuitem", { name: "Open in builder" })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(menu.getByRole("menuitem", { name: "Copy path" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
});
