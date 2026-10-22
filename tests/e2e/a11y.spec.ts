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
    // the list re-renders asynchronously: wait for the active option to move instead of reading it straight away
    await expect(box).not.toHaveAttribute("aria-activedescendant", first!);
    const second = await box.getAttribute("aria-activedescendant");
    await expect(page.locator(`[id="${second}"]`)).toHaveAttribute("aria-selected", "true");
    // Tab stays inside the dialog
    await page.keyboard.press("Tab");
    await expect(page.getByRole("dialog", { name: "Command palette" }).locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("sidebar collapses from the trigger and from the keyboard shortcut", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    const sidebar = page.locator('[data-slot="sidebar"]');
    // The trigger and the drag rail both expose "Toggle Sidebar" as their accessible name, so
    // click the trigger by its slot and assert the pair separately.
    await expect(page.getByRole("button", { name: "Toggle Sidebar" })).toHaveCount(2);
    const toggle = page.locator('[data-slot="sidebar-trigger"]');
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await toggle.click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await toggle.click();
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    // the shadcn Sidebar owns Cmd/Ctrl+B
    await page.keyboard.press(process.platform === "darwin" ? "Meta+b" : "Control+b");
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  });

  test("action menu is a keyboard-operable ARIA menu", async ({ page }) => {
    await login(page, "super.admin");
    await page.goto(`${BASE}/models?model=product&edit=1`);
    const trigger = page.getByRole("button", { name: "More actions" });
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(menu.getByRole("menuitem", { name: "Duplicate" })).not.toBeFocused();
    await page.keyboard.press("Home");
    await expect(menu.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
});
