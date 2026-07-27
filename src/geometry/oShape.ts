import type { OShapeDimensions, ShapeGeometry } from '@/types/terrace'

import {
  DIMENSION_GUIDE_OFFSET,
  assertNotGreaterThan,
  assertPositiveDimensions,
  createBounds,
  createHorizontalGuide,
  createPolygonPath,
  createPolygonTopology,
  createVerticalGuide,
} from './shared'

/**
 * Produces a rectangular terrace ring with a freely positioned rectangular
 * opening. The inner contour runs counter-clockwise so it is rendered as a
 * hole by SVG fill rules.
 */
export function createOShapeGeometry(
  dimensions: OShapeDimensions,
): ShapeGeometry {
  assertPositiveDimensions(dimensions)

  const {
    width,
    depth,
    openingWidth,
    openingDepth,
    openingX,
    openingY,
  } = dimensions
  assertNotGreaterThan(
    openingX + openingWidth,
    width,
    'opening right edge',
    'width',
  )
  assertNotGreaterThan(
    openingY + openingDepth,
    depth,
    'opening bottom edge',
    'depth',
  )

  if (
    openingX + openingWidth >= width ||
    openingY + openingDepth >= depth
  ) {
    throw new RangeError('O-shape opening must stay inside the outer boundary')
  }

  const outerPoints = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: depth },
    { x: 0, y: depth },
  ] as const
  const innerPoints = [
    { x: openingX, y: openingY },
    { x: openingX, y: openingY + openingDepth },
    { x: openingX + openingWidth, y: openingY + openingDepth },
    { x: openingX + openingWidth, y: openingY },
  ] as const
  const outerTopology = createPolygonTopology(outerPoints)
  const innerTopology = createPolygonTopology(innerPoints, 4)

  return {
    path: `${createPolygonPath(outerPoints)} ${createPolygonPath(innerPoints)}`,
    points: [...outerPoints, ...innerPoints],
    vertices: [...outerTopology.vertices, ...innerTopology.vertices],
    edges: [...outerTopology.edges, ...innerTopology.edges],
    bounds: createBounds(width, depth),
    dimensionGuides: [
      createHorizontalGuide(
        'width',
        width,
        outerPoints[0],
        outerPoints[1],
        -DIMENSION_GUIDE_OFFSET,
      ),
      createVerticalGuide(
        'depth',
        depth,
        outerPoints[1],
        outerPoints[2],
        DIMENSION_GUIDE_OFFSET,
      ),
      createVerticalGuide(
        'openingDepth',
        openingDepth,
        innerPoints[0],
        innerPoints[1],
        DIMENSION_GUIDE_OFFSET,
      ),
      createHorizontalGuide(
        'openingWidth',
        openingWidth,
        innerPoints[1],
        innerPoints[2],
        DIMENSION_GUIDE_OFFSET,
      ),
    ],
    areaSquareCentimeters:
      width * depth - openingWidth * openingDepth,
  }
}
