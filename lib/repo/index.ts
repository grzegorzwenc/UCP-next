import "server-only";
import type { ContentRepository } from "./types";
import { mockRepo } from "./adapters/mock";
import { contentLibreRepo } from "./adapters/contentlibre";
import { slingRepo } from "./adapters/sling";
export * from "./types";
export * from "./mapping";

/** UCP_BACKEND selects the adapter: mock (default) | contentlibre | sling. Everything above this line is backend-agnostic. */
export function repo(): ContentRepository {
  const backend = process.env.UCP_BACKEND ?? (process.env.CONTENTLIBRE_MODE === "live" ? "contentlibre" : "mock");
  switch (backend) {
    case "contentlibre": return contentLibreRepo;
    case "sling": return slingRepo;
    default: return mockRepo;
  }
}
