import type { LShapeDimensions, ShapeGeometry } from '@/types/terrace'

import {
  DIMENSION_GUIDE_OFFSET,
  assertNotGreaterThan,
  assertPositiveDimensions,
  createBounds,
  createHorizontalGuide,
  createPolygonPath,
  createVerticalGuide,
} from './shared'

/**
 * Produces an L whose horizontal arm is at the top and whose vertical arm is
 * at the left. `width` and `depth` are the overall extents, while `legWidth`
 * is the width of the vertical arm and `legDepth` is the depth of the top arm.
 */
export function createLShapeGeometry(
  dimensions: LShapeDimensions,
): ShapeGeometry {
  assertPositiveDimensions(dimensions)

  const { width, depth, legWidth, legDepth } = dimensions
  assertNotGreaterThan(legWidth, width, 'legWidth', 'width')
  assertNotGreaterThan(legDepth, depth, 'legDepth', 'depth')

  const points = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: legDepth },
    { x: legWidth, y: legDepth },
    { x: legWidth, y: depth },
    { x: 0, y: depth },
  ] as const

  return {
    path: createPolygonPath(points),
    points,
    bounds: createBounds(width, depth),
    dimensionGuides: [
      createHorizontalGuide(
        'width',
        width,
        points[0],
        points[1],
        -DIMENSION_GUIDE_OFFSET,
      ),
      createVerticalGuide(
        'depth',
        depth,
        points[0],
        points[5],
        -DIMENSION_GUIDE_OFFSET,
      ),
      createHorizontalGuide(
        'legWidth',
        legWidth,
        points[5],
        points[4],
        DIMENSION_GUIDE_OFFSET,
      ),
      createVerticalGuide(
        'legDepth',
        legDepth,
        points[1],
        points[2],
        DIMENSION_GUIDE_OFFSET,
      ),
    ],
    areaSquareCentimeters:
      width * legDepth + legWidth * (depth - legDepth),
  }
}
