import type { WoodTexture, WoodTextureId } from '@/types/terrace'

export const woodTextures = [
  {
    id: 'natural-oak',
    label: 'Natural oak',
    description: 'Warm, balanced oak with a subtle grain.',
    baseColor: '#B87943',
    secondaryColor: '#D39A62',
    grainColor: '#754526',
    swatch:
      'linear-gradient(135deg, #d39a62 0%, #b87943 45%, #9d6135 48%, #c98a51 54%, #b87943 100%)',
  },
  {
    id: 'smoked-ash',
    label: 'Smoked ash',
    description: 'Deep neutral brown with cool charcoal notes.',
    baseColor: '#66564B',
    secondaryColor: '#857468',
    grainColor: '#3C322C',
    swatch:
      'linear-gradient(135deg, #857468 0%, #66564b 43%, #413730 47%, #756459 53%, #594a40 100%)',
  },
  {
    id: 'honey-pine',
    label: 'Honey pine',
    description: 'Light golden timber with lively natural contrast.',
    baseColor: '#D69A46',
    secondaryColor: '#EDBB6B',
    grainColor: '#9C6025',
    swatch:
      'linear-gradient(135deg, #edbb6b 0%, #d69a46 42%, #b7772f 47%, #e2aa59 55%, #cc8b39 100%)',
  },
] as const satisfies readonly WoodTexture[]

export const woodTextureById: Record<WoodTextureId, WoodTexture> = {
  'natural-oak': woodTextures[0],
  'smoked-ash': woodTextures[1],
  'honey-pine': woodTextures[2],
}

const woodTextureIds = new Set<WoodTextureId>(
  woodTextures.map((texture) => texture.id),
)

export const isWoodTextureId = (value: unknown): value is WoodTextureId =>
  typeof value === 'string' && woodTextureIds.has(value as WoodTextureId)
