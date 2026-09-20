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
