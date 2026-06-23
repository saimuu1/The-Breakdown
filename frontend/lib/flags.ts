/** Master switch for the Pro paywall.

   While `false`: every sport is free for all logged-in users and the upgrade UI
   (Go Pro pill, upsell, plan badge, pricing CTAs) is hidden. All billing code —
   checkout, webhook, portal — stays in place and functional.

   To re-enable monetization later:
     1. set BILLING_ENABLED = true
     2. restore predictions.tier ('pro' for ufc/nba) + sports.tier in the DB
        (see backend/scripts or run an UPDATE joining leagues -> sports)
     3. ensure a production Stripe webhook endpoint is configured

   We keep the paywall off because Stripe is in test mode (can't take real money
   yet), so a live checkout would dead-end any real visitor. */
export const BILLING_ENABLED = false;
