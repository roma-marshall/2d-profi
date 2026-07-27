import type { ShapeGeometry, TShapeDimensions } from '@/types/terrace'

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
 * Produces a top-aligned cap with independently positioned stem sides.
 * `stemDepth` excludes the cap, so the overall height is their sum.
 */
export function createTShapeGeometry(
  dimensions: TShapeDimensions,
): ShapeGeometry {
  assertPositiveDimensions(dimensions)

  const {
    width,
    capDepth,
    rightOverhang,
    leftOverhang,
    stemDepth,
  } = dimensions
  assertNotGreaterThan(
    leftOverhang + rightOverhang,
    width,
    'combined overhangs',
    'width',
  )

  const stemWidth = width - leftOverhang - rightOverhang
  if (stemWidth <= 0) {
    throw new RangeError('stemWidth must be greater than 0')
  }

  const stemLeft = leftOverhang
  const stemRight = width - rightOverhang
  const totalDepth = capDepth + stemDepth

  const points = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: capDepth },
    { x: stemRight, y: capDepth },
    { x: stemRight, y: totalDepth },
    { x: stemLeft, y: totalDepth },
    { x: stemLeft, y: capDepth },
    { x: 0, y: capDepth },
  ] as const
  const topology = createPolygonTopology(points)

  return {
    path: createPolygonPath(points),
    points,
    ...topology,
    bounds: createBounds(width, totalDepth),
    dimensionGuides: [
      createHorizontalGuide(
        'width',
        width,
        points[0],
        points[1],
        -DIMENSION_GUIDE_OFFSET,
      ),
      createVerticalGuide(
        'capDepth',
        capDepth,
        points[1],
        points[2],
        DIMENSION_GUIDE_OFFSET,
      ),
      createHorizontalGuide(
        'stemWidth',
        stemWidth,
        points[5],
        points[4],
        DIMENSION_GUIDE_OFFSET,
      ),
      createVerticalGuide(
        'stemDepth',
        stemDepth,
        points[3],
        points[4],
        DIMENSION_GUIDE_OFFSET,
      ),
    ],
    areaSquareCentimeters: width * capDepth + stemWidth * stemDepth,
  }
}
