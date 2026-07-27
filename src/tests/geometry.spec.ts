import { describe, expect, it } from 'vitest'

import { createCircleGeometry } from '@/geometry/circle'
import { createLShapeGeometry } from '@/geometry/lShape'
import { createRectangleGeometry } from '@/geometry/rectangle'
import {
  createTerraceGeometry,
  geometryGenerators,
} from '@/geometry/registry'
import { DIMENSION_GUIDE_OFFSET } from '@/geometry/shared'
import { createTShapeGeometry } from '@/geometry/tShape'
import type { ShapeGeometry } from '@/types/terrace'

describe('createRectangleGeometry', () => {
  it('returns a proportional closed polygon, bounds, area, and edge guides', () => {
    const geometry = createRectangleGeometry({ width: 600, depth: 400 })

    expect(geometry.path).toBe('M 0 0 L 600 0 L 600 400 L 0 400 Z')
    expect(geometry.points).toEqual([
      { x: 0, y: 0 },
      { x: 600, y: 0 },
      { x: 600, y: 400 },
      { x: 0, y: 400 },
    ])
    expect(geometry.bounds).toEqual({ x: 0, y: 0, width: 600, height: 400 })
    expect(geometry.areaSquareCentimeters).toBe(240_000)
    expect(geometry.dimensionGuides).toEqual([
      {
        id: 'width',
        value: 600,
        orientation: 'horizontal',
        start: { x: 0, y: 0 },
        end: { x: 600, y: 0 },
        offset: -DIMENSION_GUIDE_OFFSET,
      },
      {
        id: 'depth',
        value: 400,
        orientation: 'vertical',
        start: { x: 600, y: 0 },
        end: { x: 600, y: 400 },
        offset: DIMENSION_GUIDE_OFFSET,
      },
    ])
  })

  it('updates coordinates and area directly from decimal dimensions', () => {
    const geometry = createRectangleGeometry({ width: 225.5, depth: 100.25 })

    expect(geometry.path).toBe(
      'M 0 0 L 225.5 0 L 225.5 100.25 L 0 100.25 Z',
    )
    expect(geometry.points[2]).toEqual({ x: 225.5, y: 100.25 })
    expect(geometry.areaSquareCentimeters).toBeCloseTo(22_606.375)
  })
})

describe('createLShapeGeometry', () => {
  it('subtracts the bottom-right cutout and describes every dimension', () => {
    const geometry = createLShapeGeometry({
      width: 800,
      depth: 600,
      legWidth: 300,
      legDepth: 250,
    })

    expect(geometry.path).toBe(
      'M 0 0 L 800 0 L 800 250 L 300 250 L 300 600 L 0 600 Z',
    )
    expect(geometry.points).toEqual([
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 800, y: 250 },
      { x: 300, y: 250 },
      { x: 300, y: 600 },
      { x: 0, y: 600 },
    ])
    expect(geometry.bounds).toEqual({ x: 0, y: 0, width: 800, height: 600 })
    expect(geometry.areaSquareCentimeters).toBe(305_000)
    expect(geometry.dimensionGuides).toEqual([
      {
        id: 'width',
        value: 800,
        orientation: 'horizontal',
        start: { x: 0, y: 0 },
        end: { x: 800, y: 0 },
        offset: -DIMENSION_GUIDE_OFFSET,
      },
      {
        id: 'depth',
        value: 600,
        orientation: 'vertical',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 600 },
        offset: -DIMENSION_GUIDE_OFFSET,
      },
      {
        id: 'legWidth',
        value: 300,
        orientation: 'horizontal',
        start: { x: 0, y: 600 },
        end: { x: 300, y: 600 },
        offset: DIMENSION_GUIDE_OFFSET,
      },
      {
        id: 'legDepth',
        value: 250,
        orientation: 'vertical',
        start: { x: 800, y: 0 },
        end: { x: 800, y: 250 },
        offset: DIMENSION_GUIDE_OFFSET,
      },
    ])
  })
})

describe('createTShapeGeometry', () => {
  it('positions both stem sides independently and uses the combined depth for its bounds', () => {
    const geometry = createTShapeGeometry({
      width: 900,
      capDepth: 200,
      rightOverhang: 200,
      leftOverhang: 350,
      stemDepth: 500,
    })

    expect(geometry.path).toBe(
      'M 0 0 L 900 0 L 900 200 L 700 200 L 700 700 L 350 700 L 350 200 L 0 200 Z',
    )
    expect(geometry.points).toEqual([
      { x: 0, y: 0 },
      { x: 900, y: 0 },
      { x: 900, y: 200 },
      { x: 700, y: 200 },
      { x: 700, y: 700 },
      { x: 350, y: 700 },
      { x: 350, y: 200 },
      { x: 0, y: 200 },
    ])
    expect(geometry.bounds).toEqual({ x: 0, y: 0, width: 900, height: 700 })
    expect(geometry.areaSquareCentimeters).toBe(355_000)
    expect(geometry.dimensionGuides).toEqual([
      {
        id: 'width',
        value: 900,
        orientation: 'horizontal',
        start: { x: 0, y: 0 },
        end: { x: 900, y: 0 },
        offset: -DIMENSION_GUIDE_OFFSET,
      },
      {
        id: 'capDepth',
        value: 200,
        orientation: 'vertical',
        start: { x: 900, y: 0 },
        end: { x: 900, y: 200 },
        offset: DIMENSION_GUIDE_OFFSET,
      },
      {
        id: 'stemWidth',
        value: 350,
        orientation: 'horizontal',
        start: { x: 350, y: 700 },
        end: { x: 700, y: 700 },
        offset: DIMENSION_GUIDE_OFFSET,
      },
      {
        id: 'stemDepth',
        value: 500,
        orientation: 'vertical',
        start: { x: 700, y: 200 },
        end: { x: 700, y: 700 },
        offset: DIMENSION_GUIDE_OFFSET,
      },
    ])
  })

  it('keeps a fractional stem centered without losing precision', () => {
    const geometry = createTShapeGeometry({
      width: 801,
      capDepth: 125,
      rightOverhang: 250.5,
      leftOverhang: 250.5,
      stemDepth: 450,
    })

    expect(geometry.points[3]).toEqual({ x: 550.5, y: 125 })
    expect(geometry.points[5]).toEqual({ x: 250.5, y: 575 })
    expect(geometry.areaSquareCentimeters).toBe(235_125)
  })
})

describe('createCircleGeometry', () => {
  it('returns a two-arc path, cardinal points, circular bounds, and area', () => {
    const geometry = createCircleGeometry({ diameter: 500 })

    expect(geometry.path).toBe(
      'M 250 0 A 250 250 0 1 1 250 500 A 250 250 0 1 1 250 0 Z',
    )
    expect(geometry.points).toEqual([
      { x: 250, y: 0 },
      { x: 500, y: 250 },
      { x: 250, y: 500 },
      { x: 0, y: 250 },
    ])
    expect(geometry.bounds).toEqual({ x: 0, y: 0, width: 500, height: 500 })
    expect(geometry.areaSquareCentimeters).toBeCloseTo(Math.PI * 250 ** 2)
    expect(geometry.dimensionGuides).toEqual([
      {
        id: 'diameter',
        value: 500,
        orientation: 'horizontal',
        start: { x: 0, y: 250 },
        end: { x: 500, y: 250 },
        offset: -(250 + DIMENSION_GUIDE_OFFSET),
      },
    ])
  })

  it('supports odd diameters exactly', () => {
    const geometry = createCircleGeometry({ diameter: 375 })

    expect(geometry.path).toContain('M 187.5 0')
    expect(geometry.points[1]).toEqual({ x: 375, y: 187.5 })
    expect(geometry.areaSquareCentimeters).toBeCloseTo(Math.PI * 187.5 ** 2)
  })
})

describe('geometry validation', () => {
  it.each([
    ['rectangle', () => createRectangleGeometry({ width: 0, depth: 400 })],
    ['L shape', () =>
      createLShapeGeometry({
        width: 800,
        depth: 600,
        legWidth: 900,
        legDepth: 250,
      })],
    ['T shape', () =>
      createTShapeGeometry({
        width: 900,
        capDepth: 200,
        rightOverhang: 500,
        leftOverhang: 500,
        stemDepth: 500,
      })],
    ['circle', () => createCircleGeometry({ diameter: Number.NaN })],
  ])('rejects invalid %s dimensions', (_shape, generate) => {
    expect(generate).toThrow(RangeError)
  })
})

describe('geometry registry', () => {
  it('contains a generator for every supported shape', () => {
    expect(Object.keys(geometryGenerators)).toEqual([
      'rectangle',
      'l-shape',
      't-shape',
      'circle',
    ])
  })

  it('delegates each typed shape/dimensions pair to its generator', () => {
    const rectangleDimensions = { width: 420, depth: 280 }
    const lShapeDimensions = {
      width: 700,
      depth: 500,
      legWidth: 260,
      legDepth: 180,
    }
    const tShapeDimensions = {
      width: 760,
      capDepth: 190,
      rightOverhang: 230,
      leftOverhang: 230,
      stemDepth: 410,
    }
    const circleDimensions = { diameter: 475 }

    expect(createTerraceGeometry('rectangle', rectangleDimensions)).toEqual(
      createRectangleGeometry(rectangleDimensions),
    )
    expect(createTerraceGeometry('l-shape', lShapeDimensions)).toEqual(
      createLShapeGeometry(lShapeDimensions),
    )
    expect(createTerraceGeometry('t-shape', tShapeDimensions)).toEqual(
      createTShapeGeometry(tShapeDimensions),
    )
    expect(createTerraceGeometry('circle', circleDimensions)).toEqual(
      createCircleGeometry(circleDimensions),
    )
  })
})

describe('dimension guide completeness', () => {
  it.each([
    [
      createRectangleGeometry({ width: 600, depth: 400 }),
      ['width', 'depth'],
    ],
    [
      createLShapeGeometry({
        width: 800,
        depth: 600,
        legWidth: 300,
        legDepth: 250,
      }),
      ['width', 'depth', 'legWidth', 'legDepth'],
    ],
    [
      createTShapeGeometry({
        width: 900,
        capDepth: 200,
        rightOverhang: 275,
        leftOverhang: 275,
        stemDepth: 500,
      }),
      ['width', 'capDepth', 'stemWidth', 'stemDepth'],
    ],
    [createCircleGeometry({ diameter: 500 }), ['diameter']],
  ])('returns exactly one guide for each dimension field', (geometry, ids) => {
    expect(geometry.dimensionGuides.map(({ id }) => id)).toEqual(ids)
  })
})

describe('stable labeled vertices', () => {
  it('labels rectangle vertices clockwise and keeps labels stable as it resizes', () => {
    const initial = createRectangleGeometry({ width: 600, depth: 400 })
    const resized = createRectangleGeometry({ width: 900, depth: 250 })

    expect(initial.vertices.map(({ id, label, point }) => ({ id, label, point })))
      .toEqual([
        { id: 'A', label: 'A', point: { x: 0, y: 0 } },
        { id: 'B', label: 'B', point: { x: 600, y: 0 } },
        { id: 'C', label: 'C', point: { x: 600, y: 400 } },
        { id: 'D', label: 'D', point: { x: 0, y: 400 } },
      ])
    expect(resized.vertices.map(({ label }) => label)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ])
    expect(resized.vertices[2]?.point).toEqual({ x: 900, y: 250 })
  })

  it('uses one stable label for every L and T boundary corner', () => {
    const lShape = createLShapeGeometry({
      width: 800,
      depth: 600,
      legWidth: 300,
      legDepth: 250,
    })
    const tShape = createTShapeGeometry({
      width: 900,
      capDepth: 200,
      rightOverhang: 275,
      leftOverhang: 275,
      stemDepth: 500,
    })

    expect(lShape.vertices.map(({ label }) => label)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
    ])
    expect(tShape.vertices.map(({ label }) => label)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
    ])
    expect(lShape.vertices[3]).toMatchObject({
      id: 'D',
      point: { x: 300, y: 250 },
    })
    expect(tShape.vertices[6]).toMatchObject({
      id: 'G',
      point: { x: 275, y: 200 },
    })
  })

  it('labels a circle at its four cardinal points', () => {
    const circle = createCircleGeometry({ diameter: 500 })

    expect(circle.vertices.map(({ id, point }) => ({ id, point }))).toEqual([
      { id: 'A', point: { x: 250, y: 0 } },
      { id: 'B', point: { x: 500, y: 250 } },
      { id: 'C', point: { x: 250, y: 500 } },
      { id: 'D', point: { x: 0, y: 250 } },
    ])
    expect(circle.vertices[0]?.labelPosition).toEqual({ x: 250, y: -24 })
    expect(circle.vertices[1]?.labelPosition).toEqual({ x: 524, y: 250 })
  })
})

describe('per-edge SVG dimension metadata', () => {
  it('describes all rectangle boundary edges and their outward guides', () => {
    const geometry = createRectangleGeometry({ width: 600, depth: 400 })

    expect(geometry.edges.map(({ id, length }) => ({ id, length }))).toEqual([
      { id: 'AB', length: 600 },
      { id: 'BC', length: 400 },
      { id: 'CD', length: 600 },
      { id: 'DA', length: 400 },
    ])
    expect(geometry.edges[0]).toMatchObject({
      id: 'AB',
      startVertexId: 'A',
      endVertexId: 'B',
      kind: 'line',
      path: 'M 0 0 L 600 0',
      dimension: {
        measurement: 'linear',
        value: 600,
        unit: 'cm',
        guideStart: { x: 0, y: -40 },
        guideEnd: { x: 600, y: -40 },
        guidePath: 'M 0 -40 L 600 -40',
        labelPosition: { x: 300, y: -58 },
        labelRotationDegrees: 0,
      },
    })
    expect(geometry.edges[1]?.dimension).toMatchObject({
      guideStart: { x: 640, y: 0 },
      guideEnd: { x: 640, y: 400 },
      labelPosition: { x: 658, y: 200 },
      labelRotationDegrees: 90,
    })
  })

  it('reports every derived L-shape edge length and offsets concave guides into the recess', () => {
    const geometry = createLShapeGeometry({
      width: 800,
      depth: 600,
      legWidth: 300,
      legDepth: 250,
    })

    expect(geometry.edges.map(({ id, length }) => ({ id, length }))).toEqual([
      { id: 'AB', length: 800 },
      { id: 'BC', length: 250 },
      { id: 'CD', length: 500 },
      { id: 'DE', length: 350 },
      { id: 'EF', length: 300 },
      { id: 'FA', length: 600 },
    ])
    expect(geometry.edges[2]).toMatchObject({
      path: 'M 800 250 L 300 250',
      dimension: {
        value: 500,
        guidePath: 'M 800 290 L 300 290',
        labelPosition: { x: 550, y: 308 },
      },
    })
    expect(geometry.edges[3]?.dimension.guidePath).toBe(
      'M 340 250 L 340 600',
    )
  })

  it('reports cap overhangs, stem sides, and base for every T edge', () => {
    const geometry = createTShapeGeometry({
      width: 900,
      capDepth: 200,
      rightOverhang: 200,
      leftOverhang: 350,
      stemDepth: 500,
    })

    expect(geometry.edges.map(({ id, length }) => ({ id, length }))).toEqual([
      { id: 'AB', length: 900 },
      { id: 'BC', length: 200 },
      { id: 'CD', length: 200 },
      { id: 'DE', length: 500 },
      { id: 'EF', length: 350 },
      { id: 'FG', length: 500 },
      { id: 'GH', length: 350 },
      { id: 'HA', length: 200 },
    ])
    expect(geometry.edges[2]?.dimension.guidePath).toBe(
      'M 900 240 L 700 240',
    )
    expect(geometry.edges[6]?.dimension.guidePath).toBe(
      'M 350 240 L 0 240',
    )
  })

  it('represents a circle as four renderable quarter arcs with arc-length dimensions', () => {
    const geometry = createCircleGeometry({ diameter: 500 })
    const quarterCircumference = (Math.PI * 250) / 2

    expect(geometry.edges.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: 'AB', kind: 'arc' },
      { id: 'BC', kind: 'arc' },
      { id: 'CD', kind: 'arc' },
      { id: 'DA', kind: 'arc' },
    ])
    expect(geometry.edges[0]).toMatchObject({
      path: 'M 250 0 A 250 250 0 0 1 500 250',
      start: { x: 250, y: 0 },
      end: { x: 500, y: 250 },
      dimension: {
        measurement: 'arc-length',
        unit: 'cm',
        guideStart: { x: 250, y: -40 },
        guideEnd: { x: 540, y: 250 },
        guidePath: 'M 250 -40 A 290 290 0 0 1 540 250',
        labelRotationDegrees: 45,
      },
    })
    for (const edge of geometry.edges) {
      expect(edge.length).toBeCloseTo(quarterCircumference)
      expect(edge.dimension.value).toBeCloseTo(quarterCircumference)
    }
  })

  it.each([
    createRectangleGeometry({ width: 600, depth: 400 }),
    createLShapeGeometry({
      width: 800,
      depth: 600,
      legWidth: 300,
      legDepth: 250,
    }),
    createTShapeGeometry({
      width: 900,
      capDepth: 200,
      rightOverhang: 275,
      leftOverhang: 275,
      stemDepth: 500,
    }),
    createCircleGeometry({ diameter: 500 }),
  ])('keeps every edge linked to labeled vertices', (geometry: ShapeGeometry) => {
    const vertices = new Map(
      geometry.vertices.map((vertex) => [vertex.id, vertex]),
    )

    expect(geometry.edges).toHaveLength(geometry.vertices.length)
    for (const edge of geometry.edges) {
      expect(edge.start).toEqual(vertices.get(edge.startVertexId)?.point)
      expect(edge.end).toEqual(vertices.get(edge.endVertexId)?.point)
      expect(Number.isFinite(edge.dimension.labelPosition.x)).toBe(true)
      expect(Number.isFinite(edge.dimension.labelPosition.y)).toBe(true)
      expect(edge.dimension.guidePath).toMatch(/^M /)
    }
  })
})
