import type {
  DimensionGuide,
  GeometryBounds,
  Point,
} from '@/types/terrace'

/**
 * Dimension lines are expressed in the same coordinate system as the shape.
 * Their `start` and `end` stay on the measured edge; the renderer moves both
 * points by `offset` on the perpendicular axis.
 */
export const DIMENSION_GUIDE_OFFSET = 40

export function assertPositiveDimensions<TDimensions extends object>(
  dimensions: TDimensions,
): void {
  for (const [name, value] of Object.entries(dimensions)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a finite number greater than zero`)
    }
  }
}

export function assertNotGreaterThan(
  value: number,
  upperBound: number,
  valueName: string,
  upperBoundName: string,
): void {
  if (value > upperBound) {
    throw new RangeError(`${valueName} cannot be greater than ${upperBoundName}`)
  }
}

export function toSvgNumber(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value
  return Number.isInteger(normalized)
    ? String(normalized)
    : String(Number(normalized.toFixed(6)))
}

export function createPolygonPath(points: readonly Point[]): string {
  if (points.length < 3) {
    throw new RangeError('A closed polygon requires at least three points')
  }

  return points
    .map(({ x, y }, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${command} ${toSvgNumber(x)} ${toSvgNumber(y)}`
    })
    .concat('Z')
    .join(' ')
}

export function createBounds(width: number, height: number): GeometryBounds {
  return {
    x: 0,
    y: 0,
    width,
    height,
  }
}

export function createHorizontalGuide(
  id: string,
  value: number,
  start: Point,
  end: Point,
  offset: number,
): DimensionGuide {
  return {
    id,
    value,
    orientation: 'horizontal',
    start,
    end,
    offset,
  }
}

export function createVerticalGuide(
  id: string,
  value: number,
  start: Point,
  end: Point,
  offset: number,
): DimensionGuide {
  return {
    id,
    value,
    orientation: 'vertical',
    start,
    end,
    offset,
  }
}
