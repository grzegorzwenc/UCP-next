"use client";

import { Select } from "@base-ui/react/select";

/**
 * A dropdown that is BDL open as well as closed.
 *
 * A native `<select>` can be styled shut but not open: the list is drawn by the operating system,
 * so it arrives with the platform's rounded corners, blue highlight and system font no matter what
 * the page says. This is the same control built on Base UI's Select — the one already vendored in
 * `components/shadcn/select.tsx` — so the popup is our own markup and takes BDL like everything
 * else: square corners, the `--line-2` hairline, `--surface-3` on the active row.
 *
 * The closed trigger is deliberately not styled here beyond `.bdl-field`: it is the same class the
 * Pages search field and every sidebar input use, so there is one definition of the box and
 * nothing to drift. The caret is `.bdl-select`'s, so open and closed match the plain selects too.
 */

export type BdlOption = { value: string; label: string; hint?: string; disabled?: boolean };
export type BdlGroup = { label: string; options: BdlOption[] };

/** One row of the list. `ItemIndicator` draws the check, which in multiple mode marks every pick. */
const item = (o: BdlOption) => (
  <Select.Item
    key={o.value}
    value={o.value}
    disabled={o.disabled}
    className="grid cursor-default grid-cols-[1fr_auto] items-center gap-2 px-2.5 py-1.5 text-sm text-ink outline-none select-none data-[highlighted]:bg-surface-3 data-[disabled]:opacity-40"
  >
    <Select.ItemText className="min-w-0 truncate">
      {o.label}
      {o.hint && <span className="text-ink-3"> · {o.hint}</span>}
    </Select.ItemText>
    <Select.ItemIndicator className="flex-none text-brand">
      <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </Select.ItemIndicator>
  </Select.Item>
);

/** The popup, shared by both variants. */
const popup = (children: React.ReactNode) => (
  <Select.Portal>
    {/* Above every surface this can open on top of: dialogs sit at z-50 and the builder's floating
        panels at z-70, and at z-50 the list opened *behind* a panel -- it looked like a dead control. */}
    <Select.Positioner sideOffset={2} alignItemWithTrigger={false} className="z-[100]">
      <Select.Popup className="max-h-(--available-height) w-(--anchor-width) overflow-y-auto border border-line-2 bg-surface py-1 shadow-lg">
        {children}
      </Select.Popup>
    </Select.Positioner>
  </Select.Portal>
);

export function BdlSelect({
  value, onValueChange, placeholder, options, groups, disabled, id, ariaLabel, autoFocus, className = "",
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  /** Flat list, or `groups` for an `<optgroup>`-style list. Give one or the other. */
  options?: BdlOption[];
  groups?: BdlGroup[];
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const flat = options ?? groups?.flatMap((g) => g.options) ?? [];
  const current = flat.find((o) => o.value === value);

  return (
    <Select.Root value={value} onValueChange={(v) => onValueChange(String(v ?? ""))} disabled={disabled}>
      {/* `.bdl-select` supplies the caret and the end padding; `.bdl-field` supplies the box. */}
      <span className={`bdl-select ${className}`}>
        <Select.Trigger
          id={id}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          className="bdl-field flex items-center text-left disabled:cursor-not-allowed"
        >
          <Select.Value className={`min-w-0 flex-1 truncate ${current ? "" : "text-ink-3"}`}>
            {current ? current.label : placeholder}
          </Select.Value>
        </Select.Trigger>
      </span>
      {popup(
        groups
          ? groups.map((g) => (
              <Select.Group key={g.label}>
                <Select.GroupLabel className="px-2.5 pt-2 pb-1 text-xs font-medium tracking-[.06em] text-ink-3 uppercase">
                  {g.label}
                </Select.GroupLabel>
                {g.options.map(item)}
              </Select.Group>
            ))
          : flat.map(item),
      )}
    </Select.Root>
  );
}

/**
 * The same control picking several things at once: a check against each pick inside the list, and a
 * count on the closed trigger.
 *
 * The alternative — a chip per pick under the field — grows the surface it sits on by a row for
 * every choice, which a 320px side panel cannot afford. Base UI keeps the list open in `multiple`
 * mode and an item press toggles, so picking four groups is four clicks without reopening.
 */
export function BdlMultiSelect({
  value, onValueChange, placeholder, summary, options, disabled, id, ariaLabel, className = "",
}: {
  value: string[];
  onValueChange: (v: string[]) => void;
  placeholder: string;
  /** Trigger text once something is picked; the default is "n selected". */
  summary?: (n: number) => string;
  options: BdlOption[];
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const n = value.length;
  return (
    <Select.Root multiple value={value} onValueChange={(v) => onValueChange((v as string[]) ?? [])} disabled={disabled}>
      <span className={`bdl-select ${className}`}>
        {/* Not `Select.Value`: in multiple mode it renders the raw array. */}
        <Select.Trigger id={id} aria-label={ariaLabel} className="bdl-field flex items-center text-left disabled:cursor-not-allowed">
          <span className={`min-w-0 flex-1 truncate ${n ? "" : "text-ink-3"}`}>{n ? (summary ?? ((k: number) => `${k} selected`))(n) : placeholder}</span>
        </Select.Trigger>
      </span>
      {popup(options.map(item))}
    </Select.Root>
  );
}
