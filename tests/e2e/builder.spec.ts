import { test, expect } from "@playwright/test";
import { login, BASE } from "./helpers";
import type { Locator } from "@playwright/test";

/** Double-click selects a word; move the caret to the end of the editable text before typing. */
const caretToEnd = (el: Locator) => el.evaluate((node) => { const r = document.createRange(); r.selectNodeContents(node); r.collapse(false); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); });

test.describe("builder", () => {
  test("select a block, edit a heading inline and save", async ({ page }) => {
    await login(page, "jordan.mensah");
    // A draft page: pages in review / published are read-only until someone clicks Edit.
    await page.goto(`${BASE}/page/banking/savings/fixed-rate-bonds`);
    const blocks = page.locator(".cblk");
    await expect(blocks.nth(1)).toBeVisible();
    // Clicking a text edits it straight away, so select the block by clicking next to its texts (bottom-right corner).
    const box = (await blocks.nth(1).boundingBox())!;
    await blocks.nth(1).click({ position: { x: box.width - 8, y: box.height - 6 } });
    const bar = page.getByRole("toolbar");
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: "✎ Edit" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "⚙ Configure" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "✨ AI" })).toBeVisible();

    // The mast heading is the first inline-editable text of the first block.
    const heading = blocks.first().locator(".ie").first();
    const before = (await heading.innerText()).trim();
    await heading.click(); // one click is enough to edit a text
    await expect(heading).toHaveClass(/editing/);
    await caretToEnd(heading);
    await page.keyboard.type(" ✓");
    await page.keyboard.press("Enter");
    await expect(heading).not.toHaveClass(/editing/);
    await expect(heading).toHaveText(`${before} ✓`);

    const save = page.getByRole("button", { name: "Save", exact: true });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText("Saved just now")).toBeVisible();

    // Put the heading back so the seed stays tidy for other tests.
    await heading.dblclick();
    await expect(heading).toHaveClass(/editing/);
    await caretToEnd(heading);
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Enter");
    await expect(heading).toHaveText(before);
    await save.click();
    await expect(page.getByText("Saved just now")).toBeVisible();
  });
});
