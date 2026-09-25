/** Repository layout. Change here if the real Sling instance uses different roots. */
export const PATHS = {
  content: (marketId: string) => `/content/${marketId}`,
  dam: (marketId: string) => `/content/dam/${marketId}`,
  users: "/home/users",
  models: "/conf/hsbc/models",
  templates: "/conf/hsbc/settings/wcm/templates",
  forms: "/conf/hsbc/forms",
  audit: (marketId: string) => `/var/audit/ucp/${marketId}`,
  /** Content entities: concrete content items built from a content model, per market. */
  entities: (marketId: string) => `/content/entities/${marketId}`,
};
