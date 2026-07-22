// Per-deployment configuration. The base domain is the one value that differs
// between environments (prod = nexis.revsports.ca, staging = stg.nexis.revsports.ca,
// and later studionexis.com). Everything host-related derives from it, so a new
// environment only needs NEXT_PUBLIC_BASE_DOMAIN set in its .env.
//
// NEXT_PUBLIC_ is inlined into the client bundle at build time AND readable on the
// server/edge at runtime, so a single variable covers middleware, server code and
// client components alike. Unset → production default.
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "nexis.revsports.ca";

// Canonical origins for this deployment.
export const APP_ORIGIN = `https://app.${BASE_DOMAIN}`;
export const APEX_ORIGIN = `https://${BASE_DOMAIN}`;
