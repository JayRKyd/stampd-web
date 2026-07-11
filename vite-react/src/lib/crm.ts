// Shared types + segment rules for the Customers mini-CRM.

export interface CrmCustomer {
  user_id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  phone_masked: string | null
  current_stamps: number
  total_stamps_earned: number
  total_rewards_earned: number
  cycles_completed: number
  member_since: string
  last_stamp_at: string | null
  pending_rewards: number
  note: string
  last_nudged_at: string | null
}

export type SegmentId = 'all' | 'new' | 'reward_ready' | 'slipping' | 'vip'

const DAY = 86400000
const NEW_WINDOW_DAYS = 30
const SLIPPING_AFTER_DAYS = 21
// Must match the server-side cooldown in send_customer_nudge
const NUDGE_COOLDOWN_DAYS = 14

export function nextNudgeAt(c: CrmCustomer): Date | null {
  if (!c.last_nudged_at) return null
  return new Date(new Date(c.last_nudged_at).getTime() + NUDGE_COOLDOWN_DAYS * DAY)
}

export function canNudge(c: CrmCustomer): boolean {
  const next = nextNudgeAt(c)
  return !next || next.getTime() <= Date.now()
}

// First visit only: one lifetime stamp and joined within the welcome window.
export function isNew(c: CrmCustomer): boolean {
  if (c.total_stamps_earned >= 2) return false
  return Date.now() - new Date(c.member_since).getTime() < NEW_WINDOW_DAYS * DAY
}

export function isRewardReady(c: CrmCustomer, stampGoal: number): boolean {
  return c.pending_rewards > 0 || c.current_stamps >= Math.max(1, stampGoal - 2)
}

export function isSlipping(c: CrmCustomer): boolean {
  if (c.total_stamps_earned < 2 || !c.last_stamp_at) return false
  return Date.now() - new Date(c.last_stamp_at).getTime() > SLIPPING_AFTER_DAYS * DAY
}

export function isVip(c: CrmCustomer): boolean {
  return c.cycles_completed >= 1
}

export function inSegment(c: CrmCustomer, segment: SegmentId, stampGoal: number): boolean {
  switch (segment) {
    case 'all': return true
    case 'new': return isNew(c)
    case 'reward_ready': return isRewardReady(c, stampGoal)
    case 'slipping': return isSlipping(c)
    case 'vip': return isVip(c)
  }
}

// The single most useful label for a customer, in priority order
export function primarySegment(c: CrmCustomer, stampGoal: number): { label: string; tone: 'gold' | 'amber' | 'green' | 'gray' } {
  if (isVip(c)) return { label: 'VIP', tone: 'gold' }
  if (isRewardReady(c, stampGoal)) return { label: 'Reward ready', tone: 'amber' }
  if (isNew(c)) return { label: 'New member', tone: 'green' }
  if (isSlipping(c)) return { label: 'Slipping away', tone: 'gray' }
  return { label: 'Member', tone: 'gray' }
}

export function displayName(c: CrmCustomer): string {
  return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Customer'
}

export function initials(c: CrmCustomer): string {
  return `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase() || '?'
}
