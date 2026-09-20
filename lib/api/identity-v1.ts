import { api } from "./client";
import type { IdentityV1Me } from "./types";
export const identityV1 = { me: () => api<IdentityV1Me>("/identity/v1/me") };
