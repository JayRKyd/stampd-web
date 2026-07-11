# Merchant Isolation Security Audit

**Project:** `ydffxgnuljyvtbpexkkv`  
**Date:** 2026-07-08  
**Scope:** Web merchant dashboard + mobile consumer app

## Executive summary

| Area | Verdict |
|------|---------|
| Table RLS (merchant tenant isolation) | **PASS** — all tenant tables have RLS enabled with owner/customer-scoped policies |
| RPC merchant scoping (`get_merchant_customers`, `lookup_by_personal_pin`, `issue_stamp_*`) | **PASS** — resolve merchant from `auth.uid()` |
| Admin RPCs | **PASS** (data) / **WARN** (grants) — internal `app_admins` check; `anon` should not have EXECUTE |
| `redeem_generated_pin` | **FAIL** — accepts arbitrary `p_user_id`; fixed in `rls_security_hardening.sql` |
| `queue_consumer_push` | **FAIL** — callable without auth; fixed in `rls_security_hardening.sql` |
| Mobile `history.tsx` global stamp query | **WARN** — RLS protects today; client filter added (defense in depth) |
| Mobile `card/[id].tsx` membership by id | **WARN** — RLS protects today; `user_id` filter added (defense in depth) |

---

## Supabase security advisors (highlights)

| Lint | Level | Detail |
|------|-------|--------|
| `rls_enabled_no_policy` | INFO | `app_internal_config` — RLS on, no policies (intentional; service-only) |
| `public_bucket_allows_listing` | WARN | `merchant-assets` public SELECT allows listing |
| `anon_security_definer_function_executable` | WARN | `admin_*`, `notify_*`, `queue_consumer_push`, `redeem_customer_reward` callable by `anon` |
| `auth_leaked_password_protection` | WARN | HIBP check disabled in Auth settings |

Full advisor output captured during audit run.

---

## RLS inventory (public tables)

All 15 public tables have **RLS enabled**.

| Table | Merchant isolation | Consumer isolation |
|-------|-------------------|-------------------|
| `merchants` | `owner_id = auth.uid()` (ALL) | Active merchants public SELECT |
| `loyalty_cards` | Owner manages own cards (ALL) | Active cards public SELECT |
| `reward_tiers` | Owner manages via card join (ALL) | Active card tiers public SELECT |
| `memberships` | Merchant SELECT/INSERT by owned `merchant_id` | `user_id = auth.uid()` SELECT |
| `stamp_events` | Merchant SELECT/INSERT by owned `merchant_id` | `user_id = auth.uid()` SELECT |
| `rewards` | Merchant ALL by owned `merchant_id` | `user_id = auth.uid()` SELECT |
| `staff` | Owner ALL by owned `merchant_id` | — |
| `merchant_customer_notes` | Owner + `is_active` (ALL) | — |
| `generated_pins` | Owner SELECT | — |
| `users` | Scoped customer SELECT (added in hardening) | Own row only |
| `notifications` | — | `user_id = auth.uid()` SELECT |
| `push_tokens` | — | `user_id = auth.uid()` ALL |

---

## Adversarial test matrix

Tests evaluated against live policies + RPC definitions.  
(*MCP `execute_sql` runs as superuser and bypasses RLS; results inferred from policy logic.*)

### Merchant isolation (A must not access B)

| # | Test | Result | Evidence |
|---|------|--------|----------|
| M1 | Read B's memberships | **PASS** | `merchant_id IN (owned merchants)` |
| M2 | Read B's stamp_events / rewards | **PASS** | Same merchant_id subquery |
| M3 | `get_merchant_customers` as A | **PASS** | `where owner_id = auth.uid() limit 1` |
| M4 | `lookup_by_personal_pin` with B's id | **PASS** | `owner_id is distinct from auth.uid()` → unauthorized |
| M5 | UPDATE B's loyalty_card by id | **PASS** | `Merchants can manage own cards` |
| M6 | UPDATE B's staff by id | **PASS** | `Owners manage their staff` |
| M7 | UPSERT note with B's merchant_id | **PASS** | `merchant_customer_notes` owner + active check |
| M8 | users join on B's stamp_events | **PASS** | No blanket users SELECT; scoped customer policy only |

### Consumer isolation (C1 must not access C2)

| # | Test | Result | Evidence |
|---|------|--------|----------|
| C1 | Read C2 membership by UUID | **PASS** | `auth.uid() = user_id` on memberships |
| C2 | `stamp_events LIMIT 50` as C1 | **PASS** | `auth.uid() = user_id`; client filter added anyway |
| C3 | Read C2 rewards by membership_id | **PASS** | Membership + rewards user policies |
| C4 | Read C2 user profile | **PASS** | `auth.uid() = id` on users |
| C5 | `redeem_generated_pin` as C1 for C2 | **FAIL → FIXED** | Was missing `p_user_id = auth.uid()` |

### Admin boundary

| # | Test | Result | Evidence |
|---|------|--------|----------|
| A1 | Non-admin `admin_list_merchants` | **PASS** | `RAISE EXCEPTION 'Not authorized'` |
| A2 | Non-admin `admin_set_merchant_active` | **PASS** | Returns `not_authorized` |

---

## Client query cross-reference

### Web — relies on RLS for indirect-ID writes

- [`Card.tsx`](../vite-react/src/pages/dashboard/Card.tsx) — `loyalty_cards` UPDATE by `id` only
- [`Settings.tsx`](../vite-react/src/pages/dashboard/Settings.tsx) — `staff` UPDATE by `id` only
- [`CustomerDrawer.tsx`](../vite-react/src/components/CustomerDrawer.tsx) — notes UPSERT

All covered by merchant-ownership policies on those tables.

### Mobile — defense in depth added

- [`history.tsx`](../../coral-mobile/app/history.tsx) — now `.eq('user_id', user.id)` on `stamp_events`
- [`card/[id].tsx`](../../coral-mobile/app/card/[id].tsx) — now `.eq('user_id', user.id)` on `memberships`

---

## Re-run checklist

```bash
# 1. Supabase advisors (security)
# Via MCP: get_advisors project_id=ydffxgnuljyvtbpexkkv type=security

# 2. Policy count per table
# SELECT tablename, count(*) FROM pg_policies WHERE schemaname='public' GROUP BY tablename;

# 3. Confirm redeem_generated_pin guard
# \df+ redeem_generated_pin  — body must contain auth.uid() check
```

---

## Migrations applied

- [`rls_security_hardening.sql`](../supabase/migrations/rls_security_hardening.sql) — RPC fixes + grant hardening + merchant customer users policy
- [`rls_baseline_export.sql`](../supabase/migrations/rls_baseline_export.sql) — full policy baseline for git review
