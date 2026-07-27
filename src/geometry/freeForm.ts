import type {
  FreeFormDimensions,
  GeometryVertex,
  Point,
  ShapeGeometry,
} from '@/types/terrace'

import {
  VERTEX_LABEL_OFFSET,
  createPolygonTopology,
  createVertexLabel,
  toSvgNumber,
} from './shared'

export const FREE_FORM_GRID_SIZE = 10
export const FREE_FORM_MIN_EDGE = 20
export const FREE_FORM_MAX_EDGE = 3000
export const FREE_FORM_MAX_VERTICES = 24
const INTERSECTION_EPSILON = 1e-8

const draftBounds = {
  x: 0,
  y: 0,
  width: 600,
  height: 450,
} as const

const pointDistance = (first: Point, second: Point): number =>
  Math.hypot(second.x - first.x, second.y - first.y)

const crossProduct = (first: Point, second: Point, third: Point): number =>
  (second.x - first.x) * (third.y - first.y) -
  (second.y - first.y) * (third.x - first.x)

const pointOnSegment = (point: Point, start: Point, end: Point): boolean =>
  Math.min(start.x, end.x) - INTERSECTION_EPSILON <= point.x &&
  point.x <= Math.max(start.x, end.x) + INTERSECTION_EPSILON &&
  Math.min(start.y, end.y) - INTERSECTION_EPSILON <= point.y &&
  point.y <= Math.max(start.y, end.y) + INTERSECTION_EPSILON

const segmentsIntersect = (
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): boolean => {
  const firstSideStart = crossProduct(firstStart, firstEnd, secondStart)
  const firstSideEnd = crossProduct(firstStart, firstEnd, secondEnd)
  const secondSideStart = crossProduct(secondStart, secondEnd, firstStart)
  const secondSideEnd = crossProduct(secondStart, secondEnd, firstEnd)

  if (
    ((firstSideStart > 0 && firstSideEnd < 0) ||
      (firstSideStart < 0 && firstSideEnd > 0)) &&
    ((secondSideStart > 0 && secondSideEnd < 0) ||
      (secondSideStart < 0 && secondSideEnd > 0))
  ) {
    return true
  }

  return (
    (Math.abs(firstSideStart) <= INTERSECTION_EPSILON &&
      pointOnSegment(secondStart, firstStart, firstEnd)) ||
    (Math.abs(firstSideEnd) <= INTERSECTION_EPSILON &&
      pointOnSegment(secondEnd, firstStart, firstEnd)) ||
    (Math.abs(secondSideStart) <= INTERSECTION_EPSILON &&
      pointOnSegment(firstStart, secondStart, secondEnd)) ||
    (Math.abs(secondSideEnd) <= INTERSECTION_EPSILON &&
      pointOnSegment(firstEnd, secondStart, secondEnd))
  )
}

const calculateSignedDoubleArea = (points: readonly Point[]): number =>
  points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!
    return sum + point.x * next.y - next.x * point.y
  }, 0)

export function calculatePolygonArea(points: readonly Point[]): number {
  if (points.length < 3) {
    return 0
  }

  return Math.abs(calculateSignedDoubleArea(points)) / 2
}

export function isSimplePolygon(points: readonly Point[]): boolean {
  if (points.length < 3) {
    return false
  }

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]!
    const end = points[(index + 1) % points.length]!
    const edgeLength = pointDistance(start, end)
    if (
      edgeLength < FREE_FORM_MIN_EDGE ||
      edgeLength > FREE_FORM_MAX_EDGE
    ) {
      return false
    }

    for (let otherIndex = index + 1; otherIndex < points.length; otherIndex += 1) {
      const sharesVertex =
        otherIndex === index ||
        otherIndex === index + 1 ||
        (index === 0 && otherIndex === points.length - 1)
      if (sharesVertex) {
        continue
      }

      const otherStart = points[otherIndex]!
      const otherEnd = points[(otherIndex + 1) % points.length]!
      if (segmentsIntersect(start, end, otherStart, otherEnd)) {
        return false
      }
    }
  }

  return calculatePolygonArea(points) > 0
}

export function calculateInteriorAngles(
  points: readonly Point[],
): readonly number[] {
  if (points.length < 3) {
    return []
  }

  const winding = Math.sign(calculateSignedDoubleArea(points)) || 1

  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]!
    const next = points[(index + 1) % points.length]!
    const incoming = { x: point.x - previous.x, y: point.y - previous.y }
    const outgoing = { x: next.x - point.x, y: next.y - point.y }
    if (
      Math.hypot(incoming.x, incoming.y) === 0 ||
      Math.hypot(outgoing.x, outgoing.y) === 0
    ) {
      return 0
    }

    const turnDegrees =
      (Math.atan2(
        incoming.x * outgoing.y - incoming.y * outgoing.x,
        incoming.x * outgoing.x + incoming.y * outgoing.y,
      ) *
        180) /
      Math.PI
    const interiorAngle = 180 - turnDegrees * winding
    return Math.min(
      360,
      Math.max(0, Number(interiorAngle.toFixed(6))),
    )
  })
}

export function resizePolygonEdge(
  points: readonly Point[],
  edgeIndex: number,
  length: number,
): Point[] {
  if (
    edgeIndex < 0 ||
    edgeIndex >= points.length ||
    !Number.isFinite(length) ||
    length < FREE_FORM_MIN_EDGE ||
    length > FREE_FORM_MAX_EDGE
  ) {
    return points.map((point) => ({ ...point }))
  }

  const start = points[edgeIndex]!
  const endIndex = (edgeIndex + 1) % points.length
  const end = points[endIndex]!
  const currentLength = pointDistance(start, end)
  if (currentLength === 0) {
    return points.map((point) => ({ ...point }))
  }

  const nextPoints = points.map((point) => ({ ...point }))
  nextPoints[endIndex] = {
    x: start.x + ((end.x - start.x) / currentLength) * length,
    y: start.y + ((end.y - start.y) / currentLength) * length,
  }
  return nextPoints
}

const createDraftVertices = (points: readonly Point[]): GeometryVertex[] =>
  points.map((point, index) => {
    const label = createVertexLabel(index)
    return {
      id: label,
      label,
      point,
      labelPosition: {
        x: point.x,
        y: point.y - VERTEX_LABEL_OFFSET,
      },
    }
  })

const createPath = (points: readonly Point[], closed: boolean): string => {
  if (points.length === 0) {
    return ''
  }

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${toSvgNumber(point.x)} ${toSvgNumber(
          point.y,
        )}`,
    )
    .join(' ')
  return closed && points.length >= 3 ? `${path} Z` : path
}

const createBounds = (points: readonly Point[], closed: boolean) => {
  if (points.length === 0) {
    return draftBounds
  }

  const xValues = points.map(({ x }) => x)
  const yValues = points.map(({ y }) => y)
  const minimumX = Math.min(...xValues)
  const maximumX = Math.max(...xValues)
  const minimumY = Math.min(...yValues)
  const maximumY = Math.max(...yValues)

  if (!closed) {
    return {
      x: Math.min(draftBounds.x, minimumX),
      y: Math.min(draftBounds.y, minimumY),
      width:
        Math.max(draftBounds.x + draftBounds.width, maximumX) -
        Math.min(draftBounds.x, minimumX),
      height:
        Math.max(draftBounds.y + draftBounds.height, maximumY) -
        Math.min(draftBounds.y, minimumY),
    }
  }

  return {
    x: minimumX,
    y: minimumY,
    width: Math.max(maximumX - minimumX, 1),
    height: Math.max(maximumY - minimumY, 1),
  }
}

export function createFreeFormGeometry(
  dimensions: FreeFormDimensions,
): ShapeGeometry {
  const points = dimensions.vertices.map((point) => ({ ...point }))
  const closed = dimensions.closed && points.length >= 3
  const topology = closed
    ? createPolygonTopology(points)
    : { vertices: createDraftVertices(points), edges: [] }

  return {
    path: createPath(points, closed),
    points,
    ...topology,
    bounds: createBounds(points, closed),
    dimensionGuides: [],
    areaSquareCentimeters: closed ? calculatePolygonArea(points) : 0,
  }
}
