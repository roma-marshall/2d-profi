import type {
  DimensionFieldDefinition,
  ShapeDimensionsMap,
  ShapeOption,
  TerraceShape,
} from '@/types/terrace'

export const DIMENSION_LIMITS = {
  min: 100,
  max: 1200,
} as const

const MIN_DIMENSION = DIMENSION_LIMITS.min
const MAX_DIMENSION = DIMENSION_LIMITS.max

export const defaultDimensions: ShapeDimensionsMap = {
  rectangle: {
    width: 500,
    depth: 350,
  },
  'l-shape': {
    width: 600,
    depth: 500,
    legWidth: 250,
    legDepth: 250,
  },
  't-shape': {
    width: 600,
    capDepth: 200,
    stemWidth: 250,
    stemDepth: 350,
  },
  circle: {
    diameter: 450,
  },
}

const readContextValue = (
  dimensions: Record<string, number>,
  key: string,
  fallback: number,
): number => {
  const value = dimensions[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const contextualMinimum = (value: number): number =>
  clamp(value, MIN_DIMENSION, MAX_DIMENSION)

const contextualMaximum = (value: number): number =>
  clamp(value, MIN_DIMENSION, MAX_DIMENSION)

const commonWidthField: DimensionFieldDefinition = {
  key: 'width',
  label: 'Overall width',
  hint: 'The widest horizontal span.',
  min: MIN_DIMENSION,
  max: MAX_DIMENSION,
  step: 10,
}

const commonDepthField: DimensionFieldDefinition = {
  key: 'depth',
  label: 'Overall depth',
  hint: 'The deepest vertical span.',
  min: MIN_DIMENSION,
  max: MAX_DIMENSION,
  step: 10,
}

export const shapeOptions = [
  {
    id: 'rectangle',
    label: 'Rectangle',
    shortLabel: 'Rectangle',
    description: 'A simple four-sided terrace.',
    fields: [
      {
        ...commonWidthField,
        edgeLabel: 'A–B',
      },
      {
        ...commonDepthField,
        edgeLabel: 'B–C',
      },
    ],
  },
  {
    id: 'l-shape',
    label: 'L-shaped',
    shortLabel: 'L-shape',
    description: 'An outer rectangle with one recessed corner.',
    fields: [
      {
        ...commonWidthField,
        edgeLabel: 'A–B',
        min: (dimensions: Record<string, number>) =>
          contextualMinimum(
            readContextValue(
              dimensions,
              'legWidth',
              defaultDimensions['l-shape'].legWidth,
            ) + MIN_DIMENSION,
          ),
      },
      {
        key: 'legDepth',
        label: 'Top leg depth',
        edgeLabel: 'B–C',
        hint: 'Depth of the horizontal leg.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          contextualMaximum(
            readContextValue(
              dimensions,
              'depth',
              defaultDimensions['l-shape'].depth,
            ) - MIN_DIMENSION,
          ),
        step: 10,
      },
      {
        key: 'recessWidth',
        label: 'Recess width',
        edgeLabel: 'D–C',
        hint: 'Horizontal span of the recessed corner.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          contextualMaximum(
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['l-shape'].width,
            ) - MIN_DIMENSION,
          ),
        step: 10,
        getValue: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['l-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'legWidth',
            defaultDimensions['l-shape'].legWidth,
          ),
        applyValue: (
          value: number,
          dimensions: Record<string, number>,
        ) => ({
          ...dimensions,
          legWidth:
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['l-shape'].width,
            ) - value,
        }),
      },
      {
        key: 'recessDepth',
        label: 'Recess depth',
        edgeLabel: 'D–E',
        hint: 'Vertical span of the recessed corner.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          contextualMaximum(
            readContextValue(
              dimensions,
              'depth',
              defaultDimensions['l-shape'].depth,
            ) - MIN_DIMENSION,
          ),
        step: 10,
        getValue: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'depth',
            defaultDimensions['l-shape'].depth,
          ) -
          readContextValue(
            dimensions,
            'legDepth',
            defaultDimensions['l-shape'].legDepth,
          ),
        applyValue: (
          value: number,
          dimensions: Record<string, number>,
        ) => ({
          ...dimensions,
          legDepth:
            readContextValue(
              dimensions,
              'depth',
              defaultDimensions['l-shape'].depth,
            ) - value,
        }),
      },
      {
        key: 'legWidth',
        label: 'Left leg width',
        edgeLabel: 'E–F',
        hint: 'Width of the vertical leg.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          contextualMaximum(
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['l-shape'].width,
            ) - MIN_DIMENSION,
          ),
        step: 10,
      },
      {
        ...commonDepthField,
        edgeLabel: 'F–A',
        min: (dimensions: Record<string, number>) =>
          contextualMinimum(
            readContextValue(
              dimensions,
              'legDepth',
              defaultDimensions['l-shape'].legDepth,
            ) + MIN_DIMENSION,
          ),
      },
    ],
  },
  {
    id: 't-shape',
    label: 'T-shaped',
    shortLabel: 'T-shape',
    description: 'A wide cap with a centered stem.',
    fields: [
      {
        ...commonWidthField,
        edgeLabel: 'A–B',
        min: (dimensions: Record<string, number>) =>
          contextualMinimum(
            readContextValue(
              dimensions,
              'stemWidth',
              defaultDimensions['t-shape'].stemWidth,
            ) + MIN_DIMENSION,
          ),
      },
      {
        key: 'capDepth',
        label: 'Cap depth',
        edgeLabel: 'B–C',
        hint: 'Depth of the horizontal top section.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          contextualMaximum(
            MAX_DIMENSION -
              readContextValue(
                dimensions,
                'stemDepth',
                defaultDimensions['t-shape'].stemDepth,
              ),
          ),
        step: 10,
      },
      {
        key: 'rightOverhang',
        label: 'Right overhang',
        edgeLabel: 'D–C',
        hint: 'Distance from the right cap edge to the centered stem.',
        min: MIN_DIMENSION / 2,
        max: (dimensions: Record<string, number>) =>
          (
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['t-shape'].width,
            ) - MIN_DIMENSION
          ) / 2,
        step: 10,
        getValue: (dimensions: Record<string, number>) =>
          (readContextValue(
            dimensions,
            'width',
            defaultDimensions['t-shape'].width,
          ) -
            readContextValue(
              dimensions,
              'stemWidth',
              defaultDimensions['t-shape'].stemWidth,
            )) /
          2,
        applyValue: (
          value: number,
          dimensions: Record<string, number>,
        ) => ({
          ...dimensions,
          stemWidth:
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['t-shape'].width,
            ) -
            value * 2,
        }),
      },
      {
        key: 'stemDepth',
        label: 'Stem depth',
        edgeLabel: 'D–E',
        hint: 'Depth below the horizontal cap.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          contextualMaximum(
            MAX_DIMENSION -
              readContextValue(
                dimensions,
                'capDepth',
                defaultDimensions['t-shape'].capDepth,
              ),
          ),
        step: 10,
      },
      {
        key: 'stemWidth',
        label: 'Stem width',
        edgeLabel: 'E–F',
        hint: 'Width of the centered lower section.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          contextualMaximum(
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['t-shape'].width,
            ) - MIN_DIMENSION,
          ),
        step: 10,
      },
      {
        key: 'leftOverhang',
        label: 'Left overhang',
        edgeLabel: 'H–G',
        hint: 'Distance from the left cap edge to the centered stem.',
        min: MIN_DIMENSION / 2,
        max: (dimensions: Record<string, number>) =>
          (
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['t-shape'].width,
            ) - MIN_DIMENSION
          ) / 2,
        step: 10,
        getValue: (dimensions: Record<string, number>) =>
          (readContextValue(
            dimensions,
            'width',
            defaultDimensions['t-shape'].width,
          ) -
            readContextValue(
              dimensions,
              'stemWidth',
              defaultDimensions['t-shape'].stemWidth,
            )) /
          2,
        applyValue: (
          value: number,
          dimensions: Record<string, number>,
        ) => ({
          ...dimensions,
          stemWidth:
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['t-shape'].width,
            ) -
            value * 2,
        }),
      },
    ],
  },
  {
    id: 'circle',
    label: 'Circle',
    shortLabel: 'Circle',
    description: 'A round terrace defined by its diameter.',
    fields: [
      {
        key: 'diameter',
        label: 'Diameter',
        edgeLabel: 'D–B',
        hint: 'The full width through the center.',
        min: MIN_DIMENSION,
        max: MAX_DIMENSION,
        step: 10,
      },
    ],
  },
] as const satisfies readonly ShapeOption[]

export const shapeOptionById: Record<TerraceShape, ShapeOption> = {
  rectangle: shapeOptions[0],
  'l-shape': shapeOptions[1],
  't-shape': shapeOptions[2],
  circle: shapeOptions[3],
}

const terraceShapes = new Set<TerraceShape>(
  shapeOptions.map((option) => option.id),
)

export const isTerraceShape = (value: unknown): value is TerraceShape =>
  typeof value === 'string' && terraceShapes.has(value as TerraceShape)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const safeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const normalizeRectangle = (
  input: Record<string, unknown>,
): ShapeDimensionsMap['rectangle'] => ({
  width: clamp(
    safeNumber(input.width, defaultDimensions.rectangle.width),
    MIN_DIMENSION,
    MAX_DIMENSION,
  ),
  depth: clamp(
    safeNumber(input.depth, defaultDimensions.rectangle.depth),
    MIN_DIMENSION,
    MAX_DIMENSION,
  ),
})

const normalizeLShape = (
  input: Record<string, unknown>,
): ShapeDimensionsMap['l-shape'] => {
  const width = clamp(
    safeNumber(input.width, defaultDimensions['l-shape'].width),
    MIN_DIMENSION * 2,
    MAX_DIMENSION,
  )
  const depth = clamp(
    safeNumber(input.depth, defaultDimensions['l-shape'].depth),
    MIN_DIMENSION * 2,
    MAX_DIMENSION,
  )

  return {
    width,
    depth,
    legWidth: clamp(
      safeNumber(input.legWidth, defaultDimensions['l-shape'].legWidth),
      MIN_DIMENSION,
      width - MIN_DIMENSION,
    ),
    legDepth: clamp(
      safeNumber(input.legDepth, defaultDimensions['l-shape'].legDepth),
      MIN_DIMENSION,
      depth - MIN_DIMENSION,
    ),
  }
}

const normalizeTShape = (
  input: Record<string, unknown>,
): ShapeDimensionsMap['t-shape'] => {
  const width = clamp(
    safeNumber(input.width, defaultDimensions['t-shape'].width),
    MIN_DIMENSION * 2,
    MAX_DIMENSION,
  )
  const capDepth = clamp(
    safeNumber(input.capDepth, defaultDimensions['t-shape'].capDepth),
    MIN_DIMENSION,
    MAX_DIMENSION - MIN_DIMENSION,
  )

  return {
    width,
    capDepth,
    stemWidth: clamp(
      safeNumber(input.stemWidth, defaultDimensions['t-shape'].stemWidth),
      MIN_DIMENSION,
      width - MIN_DIMENSION,
    ),
    stemDepth: clamp(
      safeNumber(input.stemDepth, defaultDimensions['t-shape'].stemDepth),
      MIN_DIMENSION,
      MAX_DIMENSION - capDepth,
    ),
  }
}

const normalizeCircle = (
  input: Record<string, unknown>,
): ShapeDimensionsMap['circle'] => ({
  diameter: clamp(
    safeNumber(input.diameter, defaultDimensions.circle.diameter),
    MIN_DIMENSION,
    MAX_DIMENSION,
  ),
})

export function normalizeDimensions<TShape extends TerraceShape>(
  shape: TShape,
  input: unknown,
): ShapeDimensionsMap[TShape] {
  const dimensions = isRecord(input) ? input : {}

  switch (shape) {
    case 'rectangle':
      return normalizeRectangle(dimensions) as ShapeDimensionsMap[TShape]
    case 'l-shape':
      return normalizeLShape(dimensions) as ShapeDimensionsMap[TShape]
    case 't-shape':
      return normalizeTShape(dimensions) as ShapeDimensionsMap[TShape]
    case 'circle':
      return normalizeCircle(dimensions) as ShapeDimensionsMap[TShape]
  }
}

export const cloneDefaultDimensions = <TShape extends TerraceShape>(
  shape: TShape,
): ShapeDimensionsMap[TShape] =>
  normalizeDimensions(shape, defaultDimensions[shape])

export const resolveFieldLimit = (
  limit: DimensionFieldDefinition['min'] | DimensionFieldDefinition['max'],
  dimensions: Record<string, number>,
): number => (typeof limit === 'function' ? limit(dimensions) : limit)
