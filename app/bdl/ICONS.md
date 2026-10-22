# Adding Phosphor Icons

Icons are CSS-only using `mask-image` with inline SVG data URIs. No icon font, no external requests at runtime.

## How to use an icon in a component

```svelte
<span class="icon--ph icon--ph--gear size-4"></span>
```

- `icon--ph` — base class (sets `display`, `mask-size`, `background-color: currentColor`)
- `icon--ph--{name}` — sets the `--svg` variable for this specific icon
- Size is controlled by `font-size` or Tailwind `size-*` / `w-*` / `h-*` utilities

## How to add a new icon

### 1. Find the Phosphor icon name

Browse [phosphoricons.com](https://phosphoricons.com) and note the kebab-case name (e.g. `address-book`).

### 2. Fetch the SVG from Iconify

```bash
curl "https://api.iconify.design/ph/{name}.svg?width=256&height=256"
```

Example:
```bash
curl "https://api.iconify.design/ph/address-book.svg?width=256&height=256"
```

### 3. Prepare the CSS rule

Take the SVG and:
1. Replace `fill='currentColor'` with `fill='black'`
2. URL-encode the whole SVG string:
   - `<` → `%3C`
   - `>` → `%3E`
   - `#` → `%23`
   - `"` → `'` (use single quotes inside the SVG to avoid encoding `"`)
   - Spaces in attribute values are fine inside single-quoted attrs

The quickest approach is to use the Iconify API — it returns the SVG already sized at 256×256. Then manually replace `currentColor` with `black` and URL-encode the angle brackets.

### 4. Add the CSS rule to `icons.css`

Rules must be in **alphabetical order** by class name. Insert the new block after the alphabetically preceding icon:

```css
.icon--ph--{name} {
  --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'%3E%3Cpath fill='black' d='...'/%3E%3C/svg%3E");
}
```

### 5. Verify

Restart the dev server if needed and check the icon renders at the expected size/colour.

## URL-encoding reference

| Character | Encoded |
|-----------|---------|
| `<`       | `%3C`   |
| `>`       | `%3E`   |
| `#`       | `%23`   |
| `&`       | `%26`   |
| `"`       | `%22` (avoid — use `'` inside SVG instead) |

## Icons currently in icons.css

Run this to list all defined icons:

```bash
grep -o 'icon--ph--[a-z-]*' website/src/bdl/icons.css | sort -u
```
