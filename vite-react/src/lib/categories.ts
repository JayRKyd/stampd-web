// Single source of truth for merchant categories so Onboarding, Settings and
// the consumer app all store the same values.

export const BUSINESS_CATEGORIES = [
  'Food & Dining', 'Coffee & Drinks', 'Health & Wellness',
  'Retail', 'Beauty & Salon', 'Barbershop',
  'Automotive', 'Entertainment', 'Pharmacy', 'Other',
]

export const INDIVIDUAL_TRADES = [
  'Barber', 'Hairstylist', 'Nail Tech', 'Personal Trainer',
  'Massage Therapist', 'Photographer', 'Makeup Artist',
  'Tutor', 'Other',
]

// Settings historically saved snake_case values; map them to display labels.
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  food_beverage: 'Food & Dining',
  retail: 'Retail',
  services: 'Other',
  health_beauty: 'Beauty & Salon',
  entertainment: 'Entertainment',
  other: 'Other',
}

export function normalizeCategory(value: string | null | undefined): string {
  if (!value) return ''
  return LEGACY_CATEGORY_MAP[value] ?? value
}
