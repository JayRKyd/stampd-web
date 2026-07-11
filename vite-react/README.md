# Stampd — Merchant Web Dashboard

The merchant-facing web app for Stampd Bahamas. Merchants sign up, configure their
loyalty card, issue stamps, and manage customers. Built with React + Vite +
TypeScript + Tailwind, backed by Supabase (Auth, Postgres, Storage).

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

The app runs at http://localhost:5173.

## Environment variables

See [`.env.example`](.env.example). Required:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key |

Optional (links are hidden / show "Coming soon" when unset):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPPORT_EMAIL` | "Contact Us" mailto target |
| `VITE_SUPPORT_WHATSAPP` | WhatsApp help number (digits only, incl. country code) |
| `VITE_APP_STORE_URL` | iOS app listing |
| `VITE_PLAY_STORE_URL` | Android app listing |

## Build

```bash
npm run build     # type-checks then builds to dist/
npm run preview   # preview the production build locally
```

## Deployment

This is a single-page app, so the host must rewrite all unknown paths to
`index.html` (otherwise deep links like `/reset-password` 404 on refresh).
Config for the two common hosts is included:

- **Vercel** — [`vercel.json`](vercel.json) (rewrites all routes to `/index.html`).
- **Netlify** — [`public/_redirects`](public/_redirects) (`/* /index.html 200`).

Set the environment variables above in your host's dashboard, then deploy the
`dist/` output (build command `npm run build`, output dir `dist`).

## Supabase configuration (manual, one-time)

A few things can't be set from code and must be configured in the Supabase
dashboard before a real beta:

1. **Email confirmation** — Auth → Providers → Email: enable "Confirm email" so
   new merchant signups verify their address. The signup screen already handles
   the "check your email" state.
2. **Production SMTP** — Auth → Emails → SMTP Settings. Supabase's built-in email
   is rate-limited and not deliverable at scale. Configure a provider (Resend,
   Postmark, SendGrid, Amazon SES, etc.) once a sending domain is available, and
   authenticate the domain (SPF / DKIM / DMARC).
3. **Redirect URLs** — Auth → URL Configuration: add your production origin and
   the reset/confirm redirect paths (`/login`, `/reset-password`).
4. **Leaked-password protection** — Auth → Policies/Passwords: enable checking
   against HaveIBeenPwned. (Flagged by the security advisor; no API to toggle it.)

## Data model notes

- The loyalty card is stored two ways that are kept in sync: normalized
  `reward_tiers` rows (used by the mobile app and PIN-lookup RPCs) and the flat
  `loyalty_cards.stamp_count_required` / `reward_title` columns (used by the web
  Stamp/Customers/Card screens). Onboarding writes both.
- New merchant rows are created server-side by the `handle_new_merchant_user`
  trigger when a user signs up with `role: 'merchant'` metadata. Onboarding
  self-heals by creating the row if the trigger ever fails to fire.
