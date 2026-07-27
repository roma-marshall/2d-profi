import type {
  DimensionGuide,
  GeometryEdge,
  GeometryBounds,
  GeometryVertex,
  Point,
} from '@/types/terrace'

/**
 * Dimension lines are expressed in the same coordinate system as the shape.
 * Their `start` and `end` stay on the measured edge; the renderer moves both
 * points by `offset` on the perpendicular axis.
 */
export const DIMENSION_GUIDE_OFFSET = 40
export const VERTEX_LABEL_OFFSET = 24
export const EDGE_DIMENSION_LABEL_GAP = 18

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

export function createLinePath(start: Point, end: Point): string {
  return `M ${toSvgNumber(start.x)} ${toSvgNumber(start.y)} L ${toSvgNumber(
    end.x,
  )} ${toSvgNumber(end.y)}`
}

const vectorLength = (vector: Point): number =>
  Math.hypot(vector.x, vector.y)

const normalizeVector = (vector: Point): Point => {
  const length = vectorLength(vector)
  if (length === 0) {
    return { x: 0, y: 0 }
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

const outwardNormal = (
  start: Point,
  end: Point,
  winding: 1 | -1 = 1,
): Point => {
  const direction = normalizeVector({
    x: end.x - start.x,
    y: end.y - start.y,
  })

  // Positive shoelace area is clockwise in the SVG coordinate system (+y down).
  return {
    x: direction.y * winding,
    y: -direction.x * winding,
  }
}

const offsetPoint = (point: Point, direction: Point, distance: number): Point => ({
  x: point.x + direction.x * distance,
  y: point.y + direction.y * distance,
})

const readableRotation = (degrees: number): number => {
  let rotation = degrees
  while (rotation > 90) {
    rotation -= 180
  }
  while (rotation < -90) {
    rotation += 180
  }
  return Object.is(rotation, -0) ? 0 : rotation
}

export function createVertexLabel(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError('Vertex index must be a non-negative integer')
  }

  let value = index + 1
  let label = ''
  while (value > 0) {
    value -= 1
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26)
  }
  return label
}

export function createPolygonTopology(
  points: readonly Point[],
  labelStartIndex = 0,
): {
  vertices: readonly GeometryVertex[]
  edges: readonly GeometryEdge[]
} {
  if (points.length < 3) {
    throw new RangeError('A polygon topology requires at least three points')
  }

  const labels = points.map((_, index) =>
    createVertexLabel(labelStartIndex + index),
  )
  const signedDoubleArea = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!
    return sum + point.x * next.y - next.x * point.y
  }, 0)
  const winding: 1 | -1 = signedDoubleArea >= 0 ? 1 : -1
  const vertices = points.map((point, index): GeometryVertex => {
    const previous = points[(index - 1 + points.length) % points.length]!
    const next = points[(index + 1) % points.length]!
    const incomingNormal = outwardNormal(previous, point, winding)
    const outgoingNormal = outwardNormal(point, next, winding)
    const bisector = normalizeVector({
      x: incomingNormal.x + outgoingNormal.x,
      y: incomingNormal.y + outgoingNormal.y,
    })
    const labelDirection =
      vectorLength(bisector) === 0 ? outgoingNormal : bisector
    const label = labels[index]!

    return {
      id: label,
      label,
      point,
      labelPosition: offsetPoint(
        point,
        labelDirection,
        VERTEX_LABEL_OFFSET,
      ),
    }
  })

  const edges = points.map((start, index): GeometryEdge => {
    const nextIndex = (index + 1) % points.length
    const end = points[nextIndex]!
    const startVertexId = labels[index]!
    const endVertexId = labels[nextIndex]!
    const normal = outwardNormal(start, end, winding)
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    const guideStart = offsetPoint(start, normal, DIMENSION_GUIDE_OFFSET)
    const guideEnd = offsetPoint(end, normal, DIMENSION_GUIDE_OFFSET)
    const guideMidpoint = {
      x: (guideStart.x + guideEnd.x) / 2,
      y: (guideStart.y + guideEnd.y) / 2,
    }

    return {
      id: `${startVertexId}${endVertexId}`,
      startVertexId,
      endVertexId,
      kind: 'line',
      start,
      end,
      path: createLinePath(start, end),
      length,
      dimension: {
        measurement: 'linear',
        value: length,
        unit: 'cm',
        guideStart,
        guideEnd,
        guidePath: createLinePath(guideStart, guideEnd),
        labelPosition: offsetPoint(
          guideMidpoint,
          normal,
          EDGE_DIMENSION_LABEL_GAP,
        ),
        labelRotationDegrees: readableRotation(
          (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
        ),
      },
    }
  })

  return { vertices, edges }
}

const cleanCoordinate = (value: number): number => {
  const rounded = Number(value.toFixed(12))
  return Object.is(rounded, -0) ? 0 : rounded
}

const pointAtAngle = (
  center: Point,
  radius: number,
  degrees: number,
): Point => {
  const radians = (degrees * Math.PI) / 180
  return {
    x: cleanCoordinate(center.x + Math.cos(radians) * radius),
    y: cleanCoordinate(center.y + Math.sin(radians) * radius),
  }
}

const createArcPath = (
  start: Point,
  end: Point,
  radius: number,
): string =>
  `M ${toSvgNumber(start.x)} ${toSvgNumber(start.y)} A ${toSvgNumber(
    radius,
  )} ${toSvgNumber(radius)} 0 0 1 ${toSvgNumber(end.x)} ${toSvgNumber(end.y)}`

export function createCircleTopology(
  radius: number,
): {
  points: readonly Point[]
  vertices: readonly GeometryVertex[]
  edges: readonly GeometryEdge[]
} {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('Circle radius must be greater than zero')
  }

  const center = { x: radius, y: radius }
  const angles = [-90, 0, 90, 180] as const
  const points = angles.map((angle) => pointAtAngle(center, radius, angle))
  const labels = points.map((_, index) => createVertexLabel(index))
  const vertices = points.map((point, index): GeometryVertex => {
    const angle = angles[index]!
    const label = labels[index]!
    return {
      id: label,
      label,
      point,
      labelPosition: pointAtAngle(
        center,
        radius + VERTEX_LABEL_OFFSET,
        angle,
      ),
    }
  })
  const guideRadius = radius + DIMENSION_GUIDE_OFFSET

  const edges = points.map((start, index): GeometryEdge => {
    const nextIndex = (index + 1) % points.length
    const end = points[nextIndex]!
    const startAngle = angles[index]!
    const endAngle = startAngle + 90
    const middleAngle = startAngle + 45
    const startVertexId = labels[index]!
    const endVertexId = labels[nextIndex]!
    const guideStart = pointAtAngle(center, guideRadius, startAngle)
    const guideEnd = pointAtAngle(center, guideRadius, endAngle)
    const arcLength = (Math.PI * radius) / 2

    return {
      id: `${startVertexId}${endVertexId}`,
      startVertexId,
      endVertexId,
      kind: 'arc',
      start,
      end,
      path: createArcPath(start, end, radius),
      length: arcLength,
      dimension: {
        measurement: 'arc-length',
        value: arcLength,
        unit: 'cm',
        guideStart,
        guideEnd,
        guidePath: createArcPath(guideStart, guideEnd, guideRadius),
        labelPosition: pointAtAngle(
          center,
          guideRadius + EDGE_DIMENSION_LABEL_GAP,
          middleAngle,
        ),
        labelRotationDegrees: readableRotation(middleAngle + 90),
      },
    }
  })

  return { points, vertices, edges }
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
