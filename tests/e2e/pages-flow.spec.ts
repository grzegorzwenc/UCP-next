import { test, expect } from "@playwright/test";
import { login, deletePage, BASE, ROOT } from "./helpers";

test.describe("page lifecycle", () => {
  test("create in the explorer, edit and publish through the API, then delete", async ({ page }) => {
    await login(page, "jordan.mensah");
    const title = `E2E page ${Date.now()}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const path = `${ROOT}/${slug}`;
    try {
      await page.goto(`${BASE}/pages`);
      await page.getByRole("button", { name: "＋ New page" }).click();
      await expect(page.getByRole("dialog", { name: "New page" })).toBeVisible();
      await page.getByPlaceholder("e.g. Regular saver").fill(title);
      await page.getByRole("button", { name: "Create and open" }).click();
      await expect(page).toHaveURL(new RegExp(`${BASE}/page/${slug}$`));

      // Edit + workflow through the BFF (same cookie as the browser).
      const r = page.request;
      const put = await r.put(`/api/repo/components?path=${encodeURIComponent(path)}`, { data: [{ name: "mast", resourceType: "hsbc/components/mast", props: { heading: "Hello", intro: "From the e2e suite" } }] });
      expect(put.status(), await put.text()).toBe(200);
      for (const status of ["review", "inreview", "reviewed", "bizreview", "approved", "published"] as const) {
        // four eyes: the author never takes their own page from the Backlog, and the business sign-off (→ approved) comes from someone other than the author's reviewer
        if (status === "inreview") await login(page, "rachel.hughes"); else if (status === "bizreview") await login(page, "jordan.mensah");
        else if (status === "approved") await login(page, "michael.osei"); else if (status === "published") await login(page, "jordan.mensah");
        const res = await r.patch(`/api/repo/page?path=${encodeURIComponent(path)}`, { data: { status } });
        expect(res.status(), `${status}: ${await res.text()}`).toBe(200);
        expect((await res.json()).status).toBe(status);
      }

      await page.goto(`${BASE}/pages`);
      const row = page.getByRole("row").filter({ hasText: title });
      await expect(row).toBeVisible();
      await expect(row.getByText("Published")).toBeVisible();

      await page.goto(`${BASE}/audit`);
      await expect(page.getByText(`published ${title}`).first()).toBeVisible();
    } finally {
      await deletePage(page.request, path);
    }
    const gone = await page.request.get(`/api/repo/page?path=${encodeURIComponent(path)}`);
    expect(gone.status()).toBe(404);
  });
});
