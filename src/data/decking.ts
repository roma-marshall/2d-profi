import type { DeckingLayout } from '@/types/terrace'

export const DECKING_LIMITS = {
  angle: { min: 0, max: 359 },
  boardWidth: { min: 8, max: 30 },
  boardGap: { min: 0.2, max: 2 },
  offset: { min: 0, max: 1200 },
} as const

export const DEFAULT_DECKING_LAYOUT: DeckingLayout = {
  angle: 0,
  boardWidth: 14.5,
  boardGap: 0.6,
  offset: 0,
  startEdgeId: 'AB',
}
