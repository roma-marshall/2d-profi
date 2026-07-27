import type { ShapeGeometry, UShapeDimensions } from '@/types/terrace'

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
 * Produces a U with an opening cut downwards from the top edge.
 * Both side legs are independently adjustable.
 */
export function createUShapeGeometry(
  dimensions: UShapeDimensions,
): ShapeGeometry {
  assertPositiveDimensions(dimensions)

  const {
    width,
    depth,
    rightLegWidth,
    leftLegWidth,
    recessDepth,
  } = dimensions
  assertNotGreaterThan(
    leftLegWidth + rightLegWidth,
    width,
    'combined leg widths',
    'width',
  )
  assertNotGreaterThan(recessDepth, depth, 'recessDepth', 'depth')

  const openingWidth = width - leftLegWidth - rightLegWidth
  const recessBottom = recessDepth
  if (openingWidth <= 0 || recessBottom >= depth) {
    throw new RangeError('U-shape opening and top bar must be greater than 0')
  }

  const points = [
    { x: 0, y: 0 },
    { x: leftLegWidth, y: 0 },
    { x: leftLegWidth, y: recessBottom },
    { x: width - rightLegWidth, y: recessBottom },
    { x: width - rightLegWidth, y: 0 },
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
        points[7],
        points[6],
        DIMENSION_GUIDE_OFFSET,
      ),
      createVerticalGuide(
        'depth',
        depth,
        points[5],
        points[6],
        DIMENSION_GUIDE_OFFSET,
      ),
      createHorizontalGuide(
        'rightLegWidth',
        rightLegWidth,
        points[4],
        points[5],
        -DIMENSION_GUIDE_OFFSET,
      ),
      createVerticalGuide(
        'recessDepth',
        recessDepth,
        points[3],
        points[4],
        DIMENSION_GUIDE_OFFSET,
      ),
      createHorizontalGuide(
        'openingWidth',
        openingWidth,
        points[2],
        points[3],
        DIMENSION_GUIDE_OFFSET,
      ),
      createHorizontalGuide(
        'leftLegWidth',
        leftLegWidth,
        points[0],
        points[1],
        -DIMENSION_GUIDE_OFFSET,
      ),
    ],
    areaSquareCentimeters:
      width * depth - openingWidth * recessDepth,
  }
}
