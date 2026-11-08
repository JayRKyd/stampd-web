// Islands a shop can belong to. Must match the check constraint on
// merchants.island and users.island, and lib/island.ts in the app.
export const ISLANDS = [
  { id: 'grand-bahama', name: 'Grand Bahama' },
  { id: 'nassau', name: 'Nassau' },
] as const

export type IslandId = (typeof ISLANDS)[number]['id']

export function islandName(id: string | null | undefined): string {
  return ISLANDS.find(i => i.id === id)?.name ?? 'Grand Bahama'
}
