import { describe, expect, it } from 'vitest'

import {
  createDefaultTerraceConfig,
  parseTerraceConfig,
  useTerraceConfig,
} from '@/composables/useTerraceConfig'
import { DEFAULT_DECKING_LAYOUT } from '@/data/decking'
import { createTerraceGeometry } from '@/geometry/registry'
import type { TerraceDimensions } from '@/types/terrace'

describe('terrace configuration migration', () => {
  it('adds default decking data to a legacy horizontal configuration', () => {
    const parsed = parseTerraceConfig({
      shape: 'rectangle',
      dimensions: { width: 500, depth: 350 },
      texture: 'natural-oak',
      boardDirection: 'horizontal',
    })

    expect(parsed).toEqual(createDefaultTerraceConfig())
    expect(parsed?.decking).toEqual(DEFAULT_DECKING_LAYOUT)
  })

  it('migrates a legacy vertical direction to a 90 degree layout', () => {
    const parsed = parseTerraceConfig({
      shape: 'circle',
      dimensions: { diameter: 420 },
      texture: 'smoked-ash',
      boardDirection: 'vertical',
    })

    expect(parsed).toMatchObject({
      shape: 'circle',
      boardDirection: 'vertical',
      decking: {
        angle: 90,
        boardWidth: 14.5,
        boardGap: 0.6,
        offset: 0,
        startEdgeId: 'AB',
      },
    })
  })

  it('normalizes imported decking values and derives custom direction', () => {
    const parsed = parseTerraceConfig({
      shape: 'rectangle',
      dimensions: { width: 500, depth: 350 },
      texture: 'honey-pine',
      boardDirection: 'horizontal',
      decking: {
        angle: 125,
        boardWidth: 99,
        boardGap: -4,
        offset: 50,
        startEdgeId: 'BC',
      },
    })

    expect(parsed).toMatchObject({
      boardDirection: 'custom',
      decking: {
        angle: 125,
        boardWidth: 30,
        boardGap: 0.2,
        offset: 50,
        startEdgeId: 'BC',
      },
    })
  })

  it('falls back to the first real boundary when an imported edge is invalid', () => {
    const parsed = parseTerraceConfig({
      shape: 'rectangle',
      dimensions: { width: 500, depth: 350 },
      texture: 'natural-oak',
      boardDirection: 'horizontal',
      decking: {
        ...DEFAULT_DECKING_LAYOUT,
        startEdgeId: 'GH',
      },
    })

    expect(parsed?.decking.startEdgeId).toBe('AB')
  })

  it('rejects a self-intersecting imported free-form outline', () => {
    const parsed = parseTerraceConfig({
      shape: 'free-form',
      dimensions: {
        vertices: [
          { x: 0, y: 0 },
          { x: 300, y: 300 },
          { x: 0, y: 300 },
          { x: 300, y: 0 },
        ],
        closed: true,
      },
      texture: 'natural-oak',
      boardDirection: 'horizontal',
    })

    expect(parsed).toBeNull()
  })

  it('migrates a legacy centered T stem to two independent overhangs', () => {
    const parsed = parseTerraceConfig({
      shape: 't-shape',
      dimensions: {
        width: 900,
        capDepth: 200,
        stemWidth: 350,
        stemDepth: 500,
      },
      texture: 'natural-oak',
      boardDirection: 'horizontal',
    })

    expect(parsed?.dimensions).toEqual({
      width: 900,
      capDepth: 200,
      rightOverhang: 275,
      leftOverhang: 275,
      stemDepth: 500,
    })
  })
})

describe('configuration history', () => {
  it('undoes and redoes layout changes without losing the typed model', () => {
    const terrace = useTerraceConfig()

    terrace.setBoardAngle(37)
    terrace.setBoardWidth(18)

    expect(terrace.config.value).toMatchObject({
      boardDirection: 'custom',
      decking: {
        angle: 37,
        boardWidth: 18,
      },
    })
    expect(terrace.canUndo.value).toBe(true)

    terrace.undo()
    expect(terrace.config.value.decking.boardWidth).toBe(14.5)
    expect(terrace.config.value.decking.angle).toBe(37)

    terrace.undo()
    expect(terrace.config.value.decking.angle).toBe(0)
    expect(terrace.canUndo.value).toBe(false)
    expect(terrace.canRedo.value).toBe(true)

    terrace.redo()
    expect(terrace.config.value.decking.angle).toBe(37)
  })

  it('loads a valid file into history and rejects unrelated JSON', () => {
    const terrace = useTerraceConfig()

    expect(
      terrace.replaceConfig({
        shape: 'circle',
        dimensions: { diameter: 600 },
        texture: 'smoked-ash',
        boardDirection: 'vertical',
      }),
    ).toBe(true)
    expect(terrace.config.value).toMatchObject({
      shape: 'circle',
      dimensions: { diameter: 600 },
      boardDirection: 'vertical',
    })

    expect(terrace.replaceConfig({ hello: 'world' })).toBe(false)

    terrace.undo()
    expect(terrace.config.value.shape).toBe('rectangle')
  })
})

describe('derived edge measurements', () => {
  it('edits both recessed L-shape edges', () => {
    const terrace = useTerraceConfig()
    terrace.selectShape('l-shape')

    terrace.updateDimension('recessWidth', 300)
    terrace.updateDimension('recessDepth', 150)

    expect(terrace.config.value.dimensions).toEqual({
      width: 600,
      depth: 500,
      legWidth: 300,
      legDepth: 350,
    })

    const geometry = createTerraceGeometry(
      terrace.config.value.shape,
      terrace.config.value.dimensions as TerraceDimensions,
    )
    expect(geometry.edges.find((edge) => edge.id === 'CD')?.length).toBe(300)
    expect(geometry.edges.find((edge) => edge.id === 'DE')?.length).toBe(150)
  })

  it('edits T-shape overhangs independently', () => {
    const terrace = useTerraceConfig()
    terrace.selectShape('t-shape')

    terrace.updateDimension('rightOverhang', 125)
    expect(terrace.config.value.dimensions).toMatchObject({
      width: 600,
      rightOverhang: 125,
      leftOverhang: 175,
    })

    terrace.updateDimension('leftOverhang', 150)
    expect(terrace.config.value.dimensions).toMatchObject({
      width: 600,
      rightOverhang: 125,
      leftOverhang: 150,
    })

    const geometry = createTerraceGeometry(
      terrace.config.value.shape,
      terrace.config.value.dimensions as TerraceDimensions,
    )
    expect(geometry.edges.find((edge) => edge.id === 'CD')?.length).toBe(125)
    expect(geometry.edges.find((edge) => edge.id === 'GH')?.length).toBe(150)
  })

  it('edits the U opening while preserving the opposite leg', () => {
    const terrace = useTerraceConfig()
    terrace.selectShape('u-shape')

    terrace.updateDimension('openingWidth', 350)

    expect(terrace.config.value.dimensions).toEqual({
      width: 700,
      depth: 550,
      rightLegWidth: 150,
      leftLegWidth: 200,
      recessDepth: 300,
    })
    expect(terrace.areaSquareMeters.value).toBe(28)
  })

  it('keeps the O opening inside its outer boundary', () => {
    const terrace = useTerraceConfig()
    terrace.selectShape('o-shape')

    terrace.updateDimension('openingX', 100)
    terrace.updateDimension('openingWidth', 500)

    expect(terrace.config.value.dimensions).toEqual({
      width: 700,
      depth: 550,
      openingWidth: 500,
      openingDepth: 250,
      openingX: 100,
      openingY: 150,
    })
    expect(terrace.areaSquareMeters.value).toBe(26)
  })
})

describe('free-form editing', () => {
  it('draws, closes, measures, and resizes an arbitrary outline', () => {
    const terrace = useTerraceConfig()
    terrace.selectShape('free-form')
    const vertices = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 300 },
      { x: 0, y: 300 },
    ]

    expect(terrace.setFreeForm(vertices, false)).toBe(true)
    expect(terrace.areaSquareMeters.value).toBe(0)
    expect(terrace.setFreeForm(vertices, true)).toBe(true)
    expect(terrace.areaSquareMeters.value).toBe(12)

    expect(terrace.updateFreeFormEdge('AB', 500)).toBe(true)
    expect(terrace.config.value).toMatchObject({
      shape: 'free-form',
      dimensions: {
        closed: true,
        vertices: [
          { x: 0, y: 0 },
          { x: 500, y: 0 },
          { x: 400, y: 300 },
          { x: 0, y: 300 },
        ],
      },
    })
  })

  it('keeps the previous plan when a drag would cross another edge', () => {
    const terrace = useTerraceConfig()
    terrace.selectShape('free-form')
    const rectangle = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 300 },
      { x: 0, y: 300 },
    ]
    terrace.setFreeForm(rectangle, true)

    expect(
      terrace.setFreeForm(
        [
          { x: 0, y: 0 },
          { x: 400, y: 300 },
          { x: 400, y: 0 },
          { x: 0, y: 300 },
        ],
        true,
      ),
    ).toBe(false)
    expect(terrace.config.value.dimensions).toEqual({
      vertices: rectangle,
      closed: true,
    })
  })
})
