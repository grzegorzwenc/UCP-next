/**
 * Cookie name for a dismissible notice. Shared, so it carries no "use client" —
 * the server reads the cookie to decide whether to render the notice at all, and the
 * client component writes it on dismiss. A value exported from a client module cannot be
 * called on the server, which is why this does not live next to the component.
 */
export const noticeCookie = (id: string) => `ucp-notice-${id}`;
