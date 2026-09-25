import type { Model } from "@/lib/ucp/types";
import { TEMPLATES } from "@/lib/blocks/registry";

/** Pure, client-safe: JSON Schema served at /v1/models/<id>. */
export function modelSchema(md: Model) {
  const typeMap: Record<string, object> = { Text: { type: "string" }, "Rich text": { type: "string", format: "html" }, Number: { type: "integer" }, Decimal: { type: "number" }, Boolean: { type: "boolean" }, Date: { type: "string", format: "date-time" }, Enum: { type: "string", enum: ["…"] }, "Multi-select": { type: "array", items: { type: "string" } }, Asset: { $ref: "#/$defs/assetRef" }, Reference: { $ref: "#/$defs/contentRef" }, Group: { type: "object" }, List: { type: "array", items: { type: "array", items: { type: "string" } } }, "Form reference": { $ref: "#/$defs/formRef" }, Blocks: { type: "array", items: { $ref: "#/$defs/block" } } };
  const properties: Record<string, object> = {}; md.fields.forEach((f) => { properties[f.k] = { title: f.l, ...(typeMap[f.t] ?? { type: "string" }), ...(f.loc ? { "x-localised": true } : {}) }; });
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `/v1/models/${md.id}`, title: md.name, version: md.version, type: "object", required: md.fields.filter((f) => f.req).map((f) => f.k), properties, $defs: { assetRef: { type: "object", properties: { id: { type: "string" }, url: { type: "string" }, renditions: { type: "object" } } }, contentRef: { type: "object", properties: { id: { type: "string" }, model: { type: "string" } } }, formRef: { type: "object", properties: { id: { type: "string" }, version: { type: "integer" } } }, block: { type: "object", properties: { type: { type: "string" }, props: { type: "object" } } } } };
}

/** Pure, client-safe: the UCP configuration object shown on the model's Config tab. */
export function modelConfig(md: Model, locales: string[]) {
  if (md.id.startsWith("block-")) { const t = md.id.slice(6); return { component: t, source: { dialog: `/apps/hsbc/components/${t}/cq:dialog`, format: "dialog XML (D2 pending)" }, translation: "automatic", placement: { allowedIn: TEMPLATES.filter((x) => x.blocks.includes(t)).map((x) => x.id), policy: "template placement policy (replaces parsys)" }, fields: md.fields.map((f) => ({ key: f.k, dialogProperty: "./" + f.k, type: f.t, required: !!f.req, localised: !!f.loc })), render: `sling:resourceType=hsbc/components/${t}`, api: `/v1/components/${t}/schema` }; }
  return { model: md.id, version: md.version, tenant: { scope: "market", note: "tenant model to be confirmed (D1)" }, storage: `JCR · /conf/hsbc/models/${md.id}`, api: { list: `/v1/content/${md.id}`, item: `/v1/content/${md.id}/{id}`, schema: `/v1/models/${md.id}` }, workflow: "Draft → Review → Publish", localisation: { locales, fallback: locales[0] }, fields: md.fields.map((f) => ({ key: f.k, type: f.t, required: !!f.req, localised: !!f.loc })) };
}

import type { ModelField, ModelDiff } from "./types";
/** What changes between two schemas; "breaking" = things that can invalidate existing content or API clients. */
export function diffFields(before: ModelField[], after: ModelField[]): ModelDiff {
  const b = new Map(before.map((f) => [f.k, f])); const a = new Map(after.map((f) => [f.k, f]));
  const added = after.filter((f) => !b.has(f.k)); const removed = before.filter((f) => !a.has(f.k));
  const changed: ModelDiff["changed"] = [];
  for (const f of after) { const o = b.get(f.k); if (!o) continue; const what: string[] = [];
    if (o.t !== f.t) what.push(`type ${o.t} → ${f.t}`); if (o.l !== f.l) what.push(`label “${o.l}” → “${f.l}”`); if (!!o.req !== !!f.req) what.push(f.req ? "now required" : "no longer required"); if (!!o.loc !== !!f.loc) what.push(f.loc ? "now localised" : "no longer localised"); if ((o.desc ?? "") !== (f.desc ?? "")) what.push("description"); if ((o.default ?? "") !== (f.default ?? "")) what.push("default value"); if (JSON.stringify(o.validation ?? {}) !== JSON.stringify(f.validation ?? {})) what.push("validation"); if (!!o.hidden !== !!f.hidden) what.push(f.hidden ? "hidden" : "visible");
    if (what.length) changed.push({ before: o, after: f, what }); }
  const breaking: string[] = [];
  removed.forEach((f) => breaking.push(`Field “${f.l}” (${f.k}) is removed: existing content loses this value and API clients reading it will break.`));
  changed.forEach((c) => { if (c.before.t !== c.after.t) breaking.push(`“${c.after.l}” changes type from ${c.before.t} to ${c.after.t}: existing values may not convert.`); if (!c.before.req && c.after.req) breaking.push(`“${c.after.l}” becomes required: existing items without it will fail validation.`); const v = c.after.validation; if (v && (v.maxLength !== undefined || v.max !== undefined || v.pattern)) breaking.push(`“${c.after.l}” gets stricter validation: existing values may no longer pass.`); });
  return { added, removed, changed, breaking };
}

/** Tree position: items with an explicit order come first in that order, the rest alphabetically. */
export const byOrder = <T extends { order?: number; title?: string; name?: string }>(a: T, b: T) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.title ?? a.name ?? "").localeCompare(String(b.title ?? b.name ?? ""));

/** Fields two models have in common (same key and same type). Models can only be connected when they share at least one. */
export const sharedFields = (a: Pick<Model, "fields">, b: Pick<Model, "fields">): string[] => a.fields.filter((f) => f.t !== "Reference" && b.fields.some((g) => g.k === f.k && g.t === f.t)).map((f) => f.k);
