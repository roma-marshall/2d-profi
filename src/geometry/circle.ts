import type { CircleDimensions, ShapeGeometry } from '@/types/terrace'

import {
  DIMENSION_GUIDE_OFFSET,
  assertPositiveDimensions,
  createBounds,
  createHorizontalGuide,
  toSvgNumber,
} from './shared'

export function createCircleGeometry(
  dimensions: CircleDimensions,
): ShapeGeometry {
  assertPositiveDimensions(dimensions)

  const { diameter } = dimensions
  const radius = diameter / 2
  const points = [
    { x: radius, y: 0 },
    { x: diameter, y: radius },
    { x: radius, y: diameter },
    { x: 0, y: radius },
  ] as const
  const radiusSvg = toSvgNumber(radius)
  const diameterSvg = toSvgNumber(diameter)
  const path = [
    `M ${radiusSvg} 0`,
    `A ${radiusSvg} ${radiusSvg} 0 1 1 ${radiusSvg} ${diameterSvg}`,
    `A ${radiusSvg} ${radiusSvg} 0 1 1 ${radiusSvg} 0`,
    'Z',
  ].join(' ')

  return {
    path,
    points,
    bounds: createBounds(diameter, diameter),
    dimensionGuides: [
      createHorizontalGuide(
        'diameter',
        diameter,
        points[3],
        points[1],
        -(radius + DIMENSION_GUIDE_OFFSET),
      ),
    ],
    areaSquareCentimeters: Math.PI * radius ** 2,
  }
}
