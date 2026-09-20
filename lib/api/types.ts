export type { PageStatus, PageView, PageSummary, ComponentNode, CreatePageInput, PageContentPatch, Identity } from "@/lib/repo/types";
export type Block = { id: string; type: string; props: Record<string, unknown> };
export type Problem = { type: string; title: string; status: number; detail?: string };
export class ApiError extends Error { constructor(public problem: Problem, public requestId?: string) { super(problem.title || `HTTP ${problem.status}`); } }
