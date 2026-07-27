import type {
  ShapeDimensionsMap,
  ShapeGeometry,
  TerraceShape,
} from '@/types/terrace'

import { createCircleGeometry } from './circle'
import { createLShapeGeometry } from './lShape'
import { createRectangleGeometry } from './rectangle'
import { createTShapeGeometry } from './tShape'

export type GeometryGenerator<TShape extends TerraceShape> = (
  dimensions: ShapeDimensionsMap[TShape],
) => ShapeGeometry

export const geometryGenerators: {
  readonly [TShape in TerraceShape]: GeometryGenerator<TShape>
} = {
  rectangle: createRectangleGeometry,
  'l-shape': createLShapeGeometry,
  't-shape': createTShapeGeometry,
  circle: createCircleGeometry,
}

/**
 * Resolves shape geometry without requiring consumers (especially the preview)
 * to branch on shape type.
 */
export function createTerraceGeometry<TShape extends TerraceShape>(
  shape: TShape,
  dimensions: ShapeDimensionsMap[TShape],
): ShapeGeometry {
  const generator = geometryGenerators[shape] as GeometryGenerator<TShape>
  return generator(dimensions)
}
