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
  it('centers the stem and uses the combined depth for its bounds', () => {
    const geometry = createTShapeGeometry({
      width: 900,
      capDepth: 200,
      stemWidth: 350,
      stemDepth: 500,
    })

    expect(geometry.path).toBe(
      'M 0 0 L 900 0 L 900 200 L 625 200 L 625 700 L 275 700 L 275 200 L 0 200 Z',
    )
    expect(geometry.points).toEqual([
      { x: 0, y: 0 },
      { x: 900, y: 0 },
      { x: 900, y: 200 },
      { x: 625, y: 200 },
      { x: 625, y: 700 },
      { x: 275, y: 700 },
      { x: 275, y: 200 },
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
        start: { x: 275, y: 700 },
        end: { x: 625, y: 700 },
        offset: DIMENSION_GUIDE_OFFSET,
      },
      {
        id: 'stemDepth',
        value: 500,
        orientation: 'vertical',
        start: { x: 625, y: 200 },
        end: { x: 625, y: 700 },
        offset: DIMENSION_GUIDE_OFFSET,
      },
    ])
  })

  it('keeps a fractional stem centered without losing precision', () => {
    const geometry = createTShapeGeometry({
      width: 801,
      capDepth: 125,
      stemWidth: 300,
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
        stemWidth: 901,
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
      stemWidth: 300,
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
        stemWidth: 350,
        stemDepth: 500,
      }),
      ['width', 'capDepth', 'stemWidth', 'stemDepth'],
    ],
    [createCircleGeometry({ diameter: 500 }), ['diameter']],
  ])('returns exactly one guide for each dimension field', (geometry, ids) => {
    expect(geometry.dimensionGuides.map(({ id }) => id)).toEqual(ids)
  })
})
