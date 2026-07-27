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
const MIN_T_OVERHANG = MIN_DIMENSION / 2
const MIN_O_BORDER = MIN_DIMENSION / 2

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
    rightOverhang: 175,
    leftOverhang: 175,
    stemDepth: 350,
  },
  'u-shape': {
    width: 700,
    depth: 550,
    rightLegWidth: 200,
    leftLegWidth: 200,
    recessDepth: 300,
  },
  'o-shape': {
    width: 700,
    depth: 550,
    openingWidth: 350,
    openingDepth: 250,
    openingX: 175,
    openingY: 150,
  },
  'free-form': {
    vertices: [],
    closed: false,
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
    description: 'A wide cap with independently adjustable side overhangs.',
    fields: [
      {
        ...commonWidthField,
        edgeLabel: 'A–B',
        min: (dimensions: Record<string, number>) =>
          contextualMinimum(
            readContextValue(
              dimensions,
              'leftOverhang',
              defaultDimensions['t-shape'].leftOverhang,
            ) +
              readContextValue(
                dimensions,
                'rightOverhang',
                defaultDimensions['t-shape'].rightOverhang,
              ) +
              MIN_DIMENSION,
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
        hint: 'Distance from the right cap edge to the stem.',
        min: MIN_T_OVERHANG,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['t-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'leftOverhang',
            defaultDimensions['t-shape'].leftOverhang,
          ) -
          MIN_DIMENSION,
        step: 10,
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
        hint: 'Width between the two independently positioned sides.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['t-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'leftOverhang',
            defaultDimensions['t-shape'].leftOverhang,
          ) -
          MIN_T_OVERHANG,
        step: 10,
        getValue: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['t-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'leftOverhang',
            defaultDimensions['t-shape'].leftOverhang,
          ) -
          readContextValue(
            dimensions,
            'rightOverhang',
            defaultDimensions['t-shape'].rightOverhang,
          ),
        applyValue: (
          value: number,
          dimensions: Record<string, number>,
        ) => ({
          ...dimensions,
          rightOverhang:
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['t-shape'].width,
            ) -
            readContextValue(
              dimensions,
              'leftOverhang',
              defaultDimensions['t-shape'].leftOverhang,
            ) -
            value,
        }),
      },
      {
        key: 'leftOverhang',
        label: 'Left overhang',
        edgeLabel: 'H–G',
        hint: 'Distance from the left cap edge to the stem.',
        min: MIN_T_OVERHANG,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['t-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'rightOverhang',
            defaultDimensions['t-shape'].rightOverhang,
          ) -
          MIN_DIMENSION,
        step: 10,
      },
    ],
  },
  {
    id: 'u-shape',
    label: 'U-shaped',
    shortLabel: 'U-form',
    description:
      'A terrace with an open central recess and independent side legs.',
    fields: [
      {
        ...commonWidthField,
        edgeLabel: 'H–G',
        min: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'leftLegWidth',
            defaultDimensions['u-shape'].leftLegWidth,
          ) +
          readContextValue(
            dimensions,
            'rightLegWidth',
            defaultDimensions['u-shape'].rightLegWidth,
          ) +
          MIN_DIMENSION,
      },
      {
        ...commonDepthField,
        edgeLabel: 'F–G',
        min: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'recessDepth',
            defaultDimensions['u-shape'].recessDepth,
          ) + MIN_DIMENSION,
      },
      {
        key: 'rightLegWidth',
        label: 'Right leg width',
        edgeLabel: 'E–F',
        hint: 'Width of the right-hand leg.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['u-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'leftLegWidth',
            defaultDimensions['u-shape'].leftLegWidth,
          ) -
          MIN_DIMENSION,
        step: 10,
      },
      {
        key: 'recessDepth',
        label: 'Recess depth',
        edgeLabel: 'D–E',
        hint: 'Depth of the opening measured from the upper edge.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'depth',
            defaultDimensions['u-shape'].depth,
          ) - MIN_DIMENSION,
        step: 10,
      },
      {
        key: 'openingWidth',
        label: 'Opening width',
        edgeLabel: 'C–D',
        hint: 'Clear width between the two side legs.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['u-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'leftLegWidth',
            defaultDimensions['u-shape'].leftLegWidth,
          ) -
          MIN_DIMENSION,
        step: 10,
        getValue: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['u-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'leftLegWidth',
            defaultDimensions['u-shape'].leftLegWidth,
          ) -
          readContextValue(
            dimensions,
            'rightLegWidth',
            defaultDimensions['u-shape'].rightLegWidth,
          ),
        applyValue: (
          value: number,
          dimensions: Record<string, number>,
        ) => ({
          ...dimensions,
          rightLegWidth:
            readContextValue(
              dimensions,
              'width',
              defaultDimensions['u-shape'].width,
            ) -
            readContextValue(
              dimensions,
              'leftLegWidth',
              defaultDimensions['u-shape'].leftLegWidth,
            ) -
            value,
        }),
      },
      {
        key: 'leftLegWidth',
        label: 'Left leg width',
        edgeLabel: 'A–B',
        hint: 'Width of the left-hand leg.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['u-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'rightLegWidth',
            defaultDimensions['u-shape'].rightLegWidth,
          ) -
          MIN_DIMENSION,
        step: 10,
      },
    ],
  },
  {
    id: 'o-shape',
    label: 'O-shaped',
    shortLabel: 'O-form',
    description:
      'A rectangular terrace ring with a freely positioned inner opening.',
    fields: [
      {
        ...commonWidthField,
        edgeLabel: 'A–B',
        min: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'openingX',
            defaultDimensions['o-shape'].openingX,
          ) +
          readContextValue(
            dimensions,
            'openingWidth',
            defaultDimensions['o-shape'].openingWidth,
          ) +
          MIN_O_BORDER,
      },
      {
        ...commonDepthField,
        edgeLabel: 'B–C',
        min: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'openingY',
            defaultDimensions['o-shape'].openingY,
          ) +
          readContextValue(
            dimensions,
            'openingDepth',
            defaultDimensions['o-shape'].openingDepth,
          ) +
          MIN_O_BORDER,
      },
      {
        key: 'openingDepth',
        label: 'Opening depth',
        edgeLabel: 'E–F',
        hint: 'Vertical size of the inner opening.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'depth',
            defaultDimensions['o-shape'].depth,
          ) -
          readContextValue(
            dimensions,
            'openingY',
            defaultDimensions['o-shape'].openingY,
          ) -
          MIN_O_BORDER,
        step: 10,
      },
      {
        key: 'openingWidth',
        label: 'Opening width',
        edgeLabel: 'F–G',
        hint: 'Horizontal size of the inner opening.',
        min: MIN_DIMENSION,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['o-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'openingX',
            defaultDimensions['o-shape'].openingX,
          ) -
          MIN_O_BORDER,
        step: 10,
      },
      {
        key: 'openingX',
        label: 'Opening from left',
        hint: 'Distance from the outer left edge to the opening.',
        min: MIN_O_BORDER,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'width',
            defaultDimensions['o-shape'].width,
          ) -
          readContextValue(
            dimensions,
            'openingWidth',
            defaultDimensions['o-shape'].openingWidth,
          ) -
          MIN_O_BORDER,
        step: 10,
      },
      {
        key: 'openingY',
        label: 'Opening from top',
        hint: 'Distance from the outer top edge to the opening.',
        min: MIN_O_BORDER,
        max: (dimensions: Record<string, number>) =>
          readContextValue(
            dimensions,
            'depth',
            defaultDimensions['o-shape'].depth,
          ) -
          readContextValue(
            dimensions,
            'openingDepth',
            defaultDimensions['o-shape'].openingDepth,
          ) -
          MIN_O_BORDER,
        step: 10,
      },
    ],
  },
  {
    id: 'free-form',
    label: 'Free form',
    shortLabel: 'Free form',
    description:
      'Draw an arbitrary polygon by placing and moving points on the grid.',
    fields: [],
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
  'u-shape': shapeOptions[3],
  'o-shape': shapeOptions[4],
  'free-form': shapeOptions[5],
  circle: shapeOptions[6],
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
  const defaultStemWidth =
    defaultDimensions['t-shape'].width -
    defaultDimensions['t-shape'].leftOverhang -
    defaultDimensions['t-shape'].rightOverhang
  const legacyStemWidth = clamp(
    safeNumber(input.stemWidth, defaultStemWidth),
    MIN_DIMENSION,
    width - MIN_T_OVERHANG * 2,
  )
  const legacyOverhang = (width - legacyStemWidth) / 2
  const leftOverhang = clamp(
    safeNumber(input.leftOverhang, legacyOverhang),
    MIN_T_OVERHANG,
    width - MIN_DIMENSION - MIN_T_OVERHANG,
  )
  const rightOverhang = clamp(
    safeNumber(input.rightOverhang, legacyOverhang),
    MIN_T_OVERHANG,
    width - leftOverhang - MIN_DIMENSION,
  )

  return {
    width,
    capDepth,
    rightOverhang,
    leftOverhang,
    stemDepth: clamp(
      safeNumber(input.stemDepth, defaultDimensions['t-shape'].stemDepth),
      MIN_DIMENSION,
      MAX_DIMENSION - capDepth,
    ),
  }
}

const normalizeUShape = (
  input: Record<string, unknown>,
): ShapeDimensionsMap['u-shape'] => {
  const width = clamp(
    safeNumber(input.width, defaultDimensions['u-shape'].width),
    MIN_DIMENSION * 3,
    MAX_DIMENSION,
  )
  const depth = clamp(
    safeNumber(input.depth, defaultDimensions['u-shape'].depth),
    MIN_DIMENSION * 2,
    MAX_DIMENSION,
  )
  const leftLegWidth = clamp(
    safeNumber(
      input.leftLegWidth,
      defaultDimensions['u-shape'].leftLegWidth,
    ),
    MIN_DIMENSION,
    width - MIN_DIMENSION * 2,
  )
  const rightLegWidth = clamp(
    safeNumber(
      input.rightLegWidth,
      defaultDimensions['u-shape'].rightLegWidth,
    ),
    MIN_DIMENSION,
    width - leftLegWidth - MIN_DIMENSION,
  )

  return {
    width,
    depth,
    rightLegWidth,
    leftLegWidth,
    recessDepth: clamp(
      safeNumber(
        input.recessDepth,
        defaultDimensions['u-shape'].recessDepth,
      ),
      MIN_DIMENSION,
      depth - MIN_DIMENSION,
    ),
  }
}

const normalizeOShape = (
  input: Record<string, unknown>,
): ShapeDimensionsMap['o-shape'] => {
  const width = clamp(
    safeNumber(input.width, defaultDimensions['o-shape'].width),
    MIN_DIMENSION + MIN_O_BORDER * 2,
    MAX_DIMENSION,
  )
  const depth = clamp(
    safeNumber(input.depth, defaultDimensions['o-shape'].depth),
    MIN_DIMENSION + MIN_O_BORDER * 2,
    MAX_DIMENSION,
  )
  const openingX = clamp(
    safeNumber(input.openingX, defaultDimensions['o-shape'].openingX),
    MIN_O_BORDER,
    width - MIN_DIMENSION - MIN_O_BORDER,
  )
  const openingY = clamp(
    safeNumber(input.openingY, defaultDimensions['o-shape'].openingY),
    MIN_O_BORDER,
    depth - MIN_DIMENSION - MIN_O_BORDER,
  )

  return {
    width,
    depth,
    openingWidth: clamp(
      safeNumber(
        input.openingWidth,
        defaultDimensions['o-shape'].openingWidth,
      ),
      MIN_DIMENSION,
      width - openingX - MIN_O_BORDER,
    ),
    openingDepth: clamp(
      safeNumber(
        input.openingDepth,
        defaultDimensions['o-shape'].openingDepth,
      ),
      MIN_DIMENSION,
      depth - openingY - MIN_O_BORDER,
    ),
    openingX,
    openingY,
  }
}

const normalizeFreeForm = (
  input: Record<string, unknown>,
): ShapeDimensionsMap['free-form'] => {
  const vertices = (
    Array.isArray(input.vertices) ? input.vertices : []
  )
    .flatMap((value) => {
      if (!isRecord(value)) {
        return []
      }

      const x = safeNumber(value.x, Number.NaN)
      const y = safeNumber(value.y, Number.NaN)
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : []
    })
    .slice(0, 24)

  return {
    vertices,
    closed: input.closed === true && vertices.length >= 3,
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
    case 'u-shape':
      return normalizeUShape(dimensions) as ShapeDimensionsMap[TShape]
    case 'o-shape':
      return normalizeOShape(dimensions) as ShapeDimensionsMap[TShape]
    case 'free-form':
      return normalizeFreeForm(dimensions) as ShapeDimensionsMap[TShape]
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
