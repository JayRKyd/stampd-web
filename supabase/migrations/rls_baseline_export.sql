-- Baseline export of public RLS policies (2026-07-08 audit)
-- Reference snapshot for git review. Apply on fresh environments only with care.

-- merchants
DROP POLICY IF EXISTS "Merchants can manage own record" ON public.merchants;
CREATE POLICY "Merchants can manage own record"
  ON public.merchants FOR ALL
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Consumers can view active merchants" ON public.merchants;
CREATE POLICY "Consumers can view active merchants"
  ON public.merchants FOR SELECT
  USING (is_active = true);

-- loyalty_cards
DROP POLICY IF EXISTS "Merchants can manage own cards" ON public.loyalty_cards;
CREATE POLICY "Merchants can manage own cards"
  ON public.loyalty_cards FOR ALL
  USING (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can view active loyalty cards" ON public.loyalty_cards;
CREATE POLICY "Anyone can view active loyalty cards"
  ON public.loyalty_cards FOR SELECT
  USING (is_active = true);

-- reward_tiers
DROP POLICY IF EXISTS "Merchants can manage own reward tiers" ON public.reward_tiers;
CREATE POLICY "Merchants can manage own reward tiers"
  ON public.reward_tiers FOR ALL
  USING (
    loyalty_card_id IN (
      SELECT lc.id FROM loyalty_cards lc
      JOIN merchants m ON m.id = lc.merchant_id
      WHERE m.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view tiers for active cards" ON public.reward_tiers;
CREATE POLICY "Anyone can view tiers for active cards"
  ON public.reward_tiers FOR SELECT
  USING (
    loyalty_card_id IN (
      SELECT id FROM loyalty_cards WHERE is_active = true
    )
  );

-- memberships
DROP POLICY IF EXISTS "Merchants can view their memberships" ON public.memberships;
CREATE POLICY "Merchants can view their memberships"
  ON public.memberships FOR SELECT
  USING (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Merchants can insert memberships for their business" ON public.memberships;
CREATE POLICY "Merchants can insert memberships for their business"
  ON public.memberships FOR INSERT
  WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own memberships" ON public.memberships;
CREATE POLICY "Users can view own memberships"
  ON public.memberships FOR SELECT
  USING (auth.uid() = user_id);

-- stamp_events
DROP POLICY IF EXISTS "Merchants can view stamps they issued" ON public.stamp_events;
CREATE POLICY "Merchants can view stamps they issued"
  ON public.stamp_events FOR SELECT
  USING (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Merchants can insert stamp events" ON public.stamp_events;
CREATE POLICY "Merchants can insert stamp events"
  ON public.stamp_events FOR INSERT
  WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own stamp events" ON public.stamp_events;
CREATE POLICY "Users can view own stamp events"
  ON public.stamp_events FOR SELECT
  USING (auth.uid() = user_id);

-- rewards
DROP POLICY IF EXISTS "Merchants can view and update their rewards" ON public.rewards;
CREATE POLICY "Merchants can view and update their rewards"
  ON public.rewards FOR ALL
  USING (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own rewards" ON public.rewards;
CREATE POLICY "Users can view own rewards"
  ON public.rewards FOR SELECT
  USING (auth.uid() = user_id);

-- staff
DROP POLICY IF EXISTS "Owners manage their staff" ON public.staff;
CREATE POLICY "Owners manage their staff"
  ON public.staff FOR ALL
  TO authenticated
  USING (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

-- merchant_customer_notes
DROP POLICY IF EXISTS "Merchants manage their own customer notes" ON public.merchant_customer_notes;
CREATE POLICY "Merchants manage their own customer notes"
  ON public.merchant_customer_notes FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM merchants
      WHERE owner_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants
      WHERE owner_id = auth.uid() AND is_active = true
    )
  );

-- generated_pins
DROP POLICY IF EXISTS "Merchants can view their generated pins" ON public.generated_pins;
CREATE POLICY "Merchants can view their generated pins"
  ON public.generated_pins FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

-- pins (legacy)
DROP POLICY IF EXISTS "Merchants can manage own pins" ON public.pins;
CREATE POLICY "Merchants can manage own pins"
  ON public.pins FOR ALL
  USING (
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
  );

-- users
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Added by rls_security_hardening.sql
DROP POLICY IF EXISTS "Merchants can view their customers profiles" ON public.users;
CREATE POLICY "Merchants can view their customers profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ms.user_id FROM memberships ms
      WHERE ms.merchant_id IN (
        SELECT m.id FROM merchants m WHERE m.owner_id = auth.uid()
      )
    )
  );

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- push_tokens
DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- app_admins
DROP POLICY IF EXISTS "Admins read own row" ON public.app_admins;
CREATE POLICY "Admins read own row"
  ON public.app_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
