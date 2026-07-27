import type { RectangleDimensions, ShapeGeometry } from '@/types/terrace'

import {
  DIMENSION_GUIDE_OFFSET,
  assertPositiveDimensions,
  createBounds,
  createHorizontalGuide,
  createPolygonPath,
  createPolygonTopology,
  createVerticalGuide,
} from './shared'

export function createRectangleGeometry(
  dimensions: RectangleDimensions,
): ShapeGeometry {
  assertPositiveDimensions(dimensions)

  const { width, depth } = dimensions
  const points = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: depth },
    { x: 0, y: depth },
  ] as const
  const topology = createPolygonTopology(points)

  return {
    path: createPolygonPath(points),
    points,
    ...topology,
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
        points[1],
        points[2],
        DIMENSION_GUIDE_OFFSET,
      ),
    ],
    areaSquareCentimeters: width * depth,
  }
}
