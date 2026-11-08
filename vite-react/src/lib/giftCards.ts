// Gift card helpers shared by the merchant pages and the admin panel.

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export function toCents(input: string): number | null {
  const n = Number(String(input).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

const ERRORS: Record<string, string> = {
  unauthorized: "You don't have access to this shop.",
  merchant_not_active: 'This shop is not approved yet.',
  gift_cards_off: 'Gift cards are not switched on for this shop yet. Message Stampd to turn them on.',
  bad_amount: 'The amount has to be between $5 and $500.',
  invalid_staff: 'That staff member is no longer active.',
  buyer_pin_not_found: 'No customer has that PIN. Leave it blank if the buyer is not on Stampd.',
  bad_code: "Type the six digits on the customer's screen.",
  bad_email: "That doesn't look like an email address.",
  already_claimed: 'This card has already been added to someone\'s Stampd, so there\'s nothing to resend.',
  code_not_found: 'No gift card at this shop matches that code. Ask them to tap Show code again and read it fresh.',
  expired: 'This gift card has expired.',
  insufficient: "That's more than what's left on the card.",
  not_voidable: 'This card can no longer be cancelled.',
  too_many_tries: 'Too many wrong codes in the last hour. Wait a bit, then ask the customer to show the code again.',
}

export const explainGiftError = (code?: string | null) =>
  ERRORS[code ?? ''] ?? 'Something went wrong. Check your connection and try again.'

export function giftShareMessage(opts: { businessName: string; amountCents: number; claimCode: string; fromName?: string | null }) {
  const who = opts.fromName ? `${opts.fromName} sent you` : "You've got"
  return (
    `${who} a ${money(opts.amountCents)} gift card for ${opts.businessName} on Stampd.\n\n` +
    `Your code: ${opts.claimCode}\n\n` +
    `Tap this link to add it: https://www.stampdbahamas.com/g/${opts.claimCode.replace('-', '')}\n\n` +
    `Or open Stampd, go to Rewards, tap "Have a gift card code?" and type it in.`
  )
}
