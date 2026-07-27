import { describe, expect, it } from 'vitest'

import {
  calculateAreaSquareCentimeters,
  createDefaultTerraceConfig,
  parseTerraceConfig,
  useTerraceConfig,
} from '@/composables/useTerraceConfig'
import { createDefaultSpecialElement } from '@/data/specialElements'
import {
  createSpecialElementGeometry,
  findSpecialElementPlacement,
  isPointInsideTerrace,
  isSpecialElementPlacementValid,
} from '@/geometry/specialElements'
import type {
  RectCutoutElement,
  SpecialElement,
  TerraceConfig,
} from '@/types/terrace'

const rectangleConfig = (): TerraceConfig =>
  createDefaultTerraceConfig()

describe('special-element geometry', () => {
  it('creates local SVG geometry and subtractive areas per element type', () => {
    const wall = createDefaultSpecialElement(
      'house-wall',
      'wall-1',
      { x: 100, y: 100 },
    )
    const wallGeometry = createSpecialElementGeometry(wall)
    expect(wallGeometry.path).toBe(
      'M -50 -5 L 50 -5 L 50 5 L -50 5 Z',
    )
    expect(wallGeometry.detailPaths).toHaveLength(1)
    expect(wallGeometry.subtractsFromTerrace).toBe(false)
    expect(wallGeometry.areaSquareCentimeters).toBe(0)

    const circle = createDefaultSpecialElement(
      'circle-cutout',
      'circle-1',
      { x: 100, y: 100 },
    )
    const circleGeometry = createSpecialElementGeometry(circle)
    expect(circleGeometry.path).toContain('A 20 20')
    expect(circleGeometry.subtractsFromTerrace).toBe(true)
    expect(circleGeometry.areaSquareCentimeters).toBeCloseTo(
      Math.PI * 20 ** 2,
    )

    const stairs = createDefaultSpecialElement(
      'stairs',
      'stairs-1',
      { x: 100, y: 100 },
    )
    expect(createSpecialElementGeometry(stairs).detailPaths).toHaveLength(2)
  })

  it('recognises valid points for concave and circular terraces', () => {
    const lShape: TerraceConfig<'l-shape'> = {
      ...rectangleConfig(),
      shape: 'l-shape',
      dimensions: {
        width: 600,
        depth: 500,
        legWidth: 250,
        legDepth: 300,
      },
    }
    expect(isPointInsideTerrace(lShape, { x: 100, y: 450 })).toBe(true)
    expect(isPointInsideTerrace(lShape, { x: 500, y: 450 })).toBe(false)

    const circle: TerraceConfig<'circle'> = {
      ...rectangleConfig(),
      shape: 'circle',
      dimensions: { diameter: 400 },
    }
    expect(isPointInsideTerrace(circle, { x: 200, y: 200 })).toBe(true)
    expect(isPointInsideTerrace(circle, { x: 0, y: 0 })).toBe(false)
  })

  it('keeps elements inside the terrace and prevents cutout overlap', () => {
    const config = rectangleConfig()
    const first = {
      ...createDefaultSpecialElement(
        'rect-cutout',
        'cutout-1',
        { x: 250, y: 175 },
      ),
      dimensions: { width: 100, depth: 80 },
    } as RectCutoutElement
    expect(isSpecialElementPlacementValid(config, first, [])).toBe(true)

    const outside = {
      ...first,
      id: 'cutout-outside',
      position: { x: 490, y: 340 },
    }
    expect(isSpecialElementPlacementValid(config, outside, [])).toBe(false)

    const overlapping = {
      ...first,
      id: 'cutout-2',
      position: { x: 290, y: 175 },
      rotation: 35,
    }
    expect(
      isSpecialElementPlacementValid(config, overlapping, [first]),
    ).toBe(false)

    const touching = {
      ...first,
      id: 'cutout-3',
      position: { x: 350, y: 175 },
    }
    expect(
      isSpecialElementPlacementValid(config, touching, [first]),
    ).toBe(true)

    const overlappingWall = createDefaultSpecialElement(
      'house-wall',
      'wall-1',
      first.position,
    )
    expect(
      isSpecialElementPlacementValid(config, overlappingWall, [first]),
    ).toBe(false)
  })

  it('finds a valid initial position around existing cutouts', () => {
    const config = rectangleConfig()
    const existing = createDefaultSpecialElement(
      'rect-cutout',
      'cutout-1',
      { x: 250, y: 175 },
    )
    config.specialElements = [existing]
    const candidate = createDefaultSpecialElement(
      'circle-cutout',
      'cutout-2',
      { x: 0, y: 0 },
    )

    const position = findSpecialElementPlacement(config, candidate)
    expect(position).not.toBeNull()
    expect(
      isSpecialElementPlacementValid(
        config,
        { ...candidate, position } as SpecialElement,
      ),
    ).toBe(true)
  })
})

describe('special elements in terrace state', () => {
  it('adds cutouts, subtracts their area, and supports undo and redo', () => {
    const terrace = useTerraceConfig()
    const id = terrace.addSpecialElement('rect-cutout')

    expect(id).not.toBeNull()
    expect(terrace.config.value.specialElements).toHaveLength(1)
    expect(terrace.areaSquareMeters.value).toBeCloseTo(17.34)
    expect(
      calculateAreaSquareCentimeters(terrace.config.value),
    ).toBeCloseTo(173_400)

    terrace.undo()
    expect(terrace.config.value.specialElements).toEqual([])
    expect(terrace.areaSquareMeters.value).toBe(17.5)

    terrace.redo()
    expect(terrace.config.value.specialElements).toHaveLength(1)
    expect(terrace.areaSquareMeters.value).toBeCloseTo(17.34)
  })

  it('updates valid positions and rejects invalid dimensions', () => {
    const terrace = useTerraceConfig()
    const id = terrace.addSpecialElement('rect-cutout')
    expect(id).not.toBeNull()
    if (id === null) {
      return
    }

    expect(
      terrace.updateSpecialElement(id, {
        position: { x: 100, y: 100 },
        rotation: 25,
      }),
    ).toBe(true)
    expect(terrace.config.value.specialElements[0]).toMatchObject({
      position: { x: 100, y: 100 },
      rotation: 25,
    })

    expect(
      terrace.updateSpecialElement(id, {
        dimensions: { width: 1000 },
      }),
    ).toBe(false)
    expect(terrace.config.value.specialElements[0]).toMatchObject({
      dimensions: { width: 40, depth: 40 },
    })
  })

  it('does not subtract reference walls or stairs from the surface', () => {
    const terrace = useTerraceConfig()
    terrace.addSpecialElement('house-wall')
    terrace.addSpecialElement('stairs')

    expect(terrace.config.value.specialElements).toHaveLength(2)
    expect(terrace.areaSquareMeters.value).toBe(17.5)
  })

  it('normalizes imported elements and drops invalid placements', () => {
    const parsed = parseTerraceConfig({
      shape: 'rectangle',
      dimensions: { width: 500, depth: 350 },
      texture: 'natural-oak',
      boardDirection: 'horizontal',
      specialElements: [
        {
          id: 'valid-cutout',
          type: 'circle-cutout',
          position: { x: 100, y: 100 },
          rotation: 721,
          dimensions: { diameter: 50 },
        },
        {
          id: 'outside-cutout',
          type: 'rect-cutout',
          position: { x: 499, y: 349 },
          rotation: 0,
          dimensions: { width: 100, depth: 100 },
        },
      ],
    })

    expect(parsed?.specialElements).toHaveLength(1)
    expect(parsed?.specialElements[0]).toMatchObject({
      id: 'valid-cutout',
      rotation: 1,
      dimensions: { diameter: 50 },
    })
  })
})
