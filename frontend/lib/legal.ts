// Shared legal/brand constants. Keep the product name, contact, and the
// "last updated" dates for the legal docs in one place so they stay in sync.
//
// NOTE: the Terms and Privacy copy in app/terms and app/privacy are STARTER
// TEMPLATES, not legal advice. Have a lawyer review them before charging money —
// this product is gambling-adjacent and that review is worth it.

export const COMPANY_NAME = "The Breakdown";
export const SUPPORT_EMAIL = "smural61@asu.edu";

// Support links open a Gmail compose window pre-addressed to support, with a
// subject filled in. (Falls back to the browser's default mail app for non-Gmail
// users via the standard mailto if you ever prefer SUPPORT_MAILTO instead.)
export const SUPPORT_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${encodeURIComponent(
  "The Breakdown — Support",
)}`;
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

// Minimum age to use a paid sports-prediction product. 18 is the common floor;
// some jurisdictions require 21 for anything gambling-adjacent.
export const MIN_AGE = 18;

// Bump these when you materially change a document.
export const TERMS_UPDATED = "June 24, 2026";
export const PRIVACY_UPDATED = "June 24, 2026";
