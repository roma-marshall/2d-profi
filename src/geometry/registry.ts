import type {
  ShapeDimensionsMap,
  ShapeGeometry,
  TerraceShape,
} from '@/types/terrace'

import { createCircleGeometry } from './circle'
import { createFreeFormGeometry } from './freeForm'
import { createLShapeGeometry } from './lShape'
import { createOShapeGeometry } from './oShape'
import { createRectangleGeometry } from './rectangle'
import { createTShapeGeometry } from './tShape'
import { createUShapeGeometry } from './uShape'

export type GeometryGenerator<TShape extends TerraceShape> = (
  dimensions: ShapeDimensionsMap[TShape],
) => ShapeGeometry

export const geometryGenerators: {
  readonly [TShape in TerraceShape]: GeometryGenerator<TShape>
} = {
  rectangle: createRectangleGeometry,
  'l-shape': createLShapeGeometry,
  't-shape': createTShapeGeometry,
  'u-shape': createUShapeGeometry,
  'o-shape': createOShapeGeometry,
  'free-form': createFreeFormGeometry,
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
