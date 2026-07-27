import type {
  Point,
  SpecialElement,
  SpecialElementType,
} from '@/types/terrace'

export const SPECIAL_ELEMENT_LIMITS = {
  count: 20,
  coordinate: { min: -3000, max: 3000 },
  rotation: { min: 0, max: 359 },
  length: { min: 20, max: 3000 },
  thickness: { min: 5, max: 100 },
  width: { min: 20, max: 3000 },
  depth: { min: 20, max: 3000 },
  diameter: { min: 20, max: 3000 },
  steps: { min: 2, max: 20 },
} as const

export const specialElementOptions = [
  {
    id: 'house-wall',
    label: 'House wall',
    shortLabel: 'Wall',
    description: 'A fixed wall or façade reference.',
    affectsArea: false,
  },
  {
    id: 'rect-cutout',
    label: 'Rectangular cutout',
    shortLabel: 'Rectangle',
    description: 'A pool, flower bed, hatch, or foundation opening.',
    affectsArea: true,
  },
  {
    id: 'circle-cutout',
    label: 'Circular cutout',
    shortLabel: 'Circle',
    description: 'An opening for a tree, column, or round flower bed.',
    affectsArea: true,
  },
  {
    id: 'stairs',
    label: 'Stairs',
    shortLabel: 'Stairs',
    description: 'A stair footprint with a configurable step count.',
    affectsArea: false,
  },
] as const satisfies readonly {
  id: SpecialElementType
  label: string
  shortLabel: string
  description: string
  affectsArea: boolean
}[]

export const specialElementOptionById = Object.fromEntries(
  specialElementOptions.map((option) => [option.id, option]),
) as Record<SpecialElementType, (typeof specialElementOptions)[number]>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum)

const normalizeNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  const number =
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.round(clamp(number, minimum, maximum) * 10) / 10
}

const normalizeRotation = (value: unknown): number => {
  const rotation =
    typeof value === 'number' && Number.isFinite(value) ? value : 0
  return ((Math.round(rotation) % 360) + 360) % 360
}

export const isSpecialElementType = (
  value: unknown,
): value is SpecialElementType =>
  specialElementOptions.some((option) => option.id === value)

export function createDefaultSpecialElement(
  type: SpecialElementType,
  id: string,
  position: Point,
): SpecialElement {
  const base = {
    id,
    position: { ...position },
    rotation: 0,
  }

  switch (type) {
    case 'house-wall':
      return {
        ...base,
        type,
        dimensions: { length: 100, thickness: 10 },
      }
    case 'rect-cutout':
      return {
        ...base,
        type,
        dimensions: { width: 40, depth: 40 },
      }
    case 'circle-cutout':
      return {
        ...base,
        type,
        dimensions: { diameter: 40 },
      }
    case 'stairs':
      return {
        ...base,
        type,
        dimensions: { width: 80, depth: 50, steps: 3 },
      }
  }
}

const normalizePosition = (value: unknown): Point => {
  const record = isRecord(value) ? value : {}
  return {
    x: normalizeNumber(
      record.x,
      0,
      SPECIAL_ELEMENT_LIMITS.coordinate.min,
      SPECIAL_ELEMENT_LIMITS.coordinate.max,
    ),
    y: normalizeNumber(
      record.y,
      0,
      SPECIAL_ELEMENT_LIMITS.coordinate.min,
      SPECIAL_ELEMENT_LIMITS.coordinate.max,
    ),
  }
}

const normalizeElement = (
  value: unknown,
  index: number,
): SpecialElement | null => {
  if (!isRecord(value) || !isSpecialElementType(value.type)) {
    return null
  }

  const dimensions = isRecord(value.dimensions) ? value.dimensions : {}
  const id =
    typeof value.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value.id)
      ? value.id
      : `special-${index + 1}`
  const base = {
    id,
    position: normalizePosition(value.position),
    rotation: normalizeRotation(value.rotation),
  }

  switch (value.type) {
    case 'house-wall':
      return {
        ...base,
        type: value.type,
        dimensions: {
          length: normalizeNumber(
            dimensions.length,
            100,
            SPECIAL_ELEMENT_LIMITS.length.min,
            SPECIAL_ELEMENT_LIMITS.length.max,
          ),
          thickness: normalizeNumber(
            dimensions.thickness,
            10,
            SPECIAL_ELEMENT_LIMITS.thickness.min,
            SPECIAL_ELEMENT_LIMITS.thickness.max,
          ),
        },
      }
    case 'rect-cutout':
      return {
        ...base,
        type: value.type,
        dimensions: {
          width: normalizeNumber(
            dimensions.width,
            40,
            SPECIAL_ELEMENT_LIMITS.width.min,
            SPECIAL_ELEMENT_LIMITS.width.max,
          ),
          depth: normalizeNumber(
            dimensions.depth,
            40,
            SPECIAL_ELEMENT_LIMITS.depth.min,
            SPECIAL_ELEMENT_LIMITS.depth.max,
          ),
        },
      }
    case 'circle-cutout':
      return {
        ...base,
        type: value.type,
        dimensions: {
          diameter: normalizeNumber(
            dimensions.diameter,
            40,
            SPECIAL_ELEMENT_LIMITS.diameter.min,
            SPECIAL_ELEMENT_LIMITS.diameter.max,
          ),
        },
      }
    case 'stairs':
      return {
        ...base,
        type: value.type,
        dimensions: {
          width: normalizeNumber(
            dimensions.width,
            80,
            SPECIAL_ELEMENT_LIMITS.width.min,
            SPECIAL_ELEMENT_LIMITS.width.max,
          ),
          depth: normalizeNumber(
            dimensions.depth,
            50,
            SPECIAL_ELEMENT_LIMITS.depth.min,
            SPECIAL_ELEMENT_LIMITS.depth.max,
          ),
          steps: Math.round(
            normalizeNumber(
              dimensions.steps,
              3,
              SPECIAL_ELEMENT_LIMITS.steps.min,
              SPECIAL_ELEMENT_LIMITS.steps.max,
            ),
          ),
        },
      }
  }
}

export function normalizeSpecialElements(value: unknown): SpecialElement[] {
  if (!Array.isArray(value)) {
    return []
  }

  const ids = new Set<string>()
  return value
    .slice(0, SPECIAL_ELEMENT_LIMITS.count)
    .flatMap((item, index) => {
      const element = normalizeElement(item, index)
      if (element === null || ids.has(element.id)) {
        return []
      }

      ids.add(element.id)
      return [element]
    })
}
