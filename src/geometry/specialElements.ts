import { createTerraceGeometry } from '@/geometry/registry'
import { toSvgNumber } from '@/geometry/shared'
import type {
  CircleCutoutElement,
  Point,
  SpecialElement,
  SpecialElementGeometry,
  TerraceConfig,
  TerraceDimensions,
} from '@/types/terrace'

const SAMPLE_GRID_SIZE = 8
const CIRCLE_SAMPLE_COUNT = 32
const GEOMETRY_EPSILON = 1e-7
type RectangularSpecialElement = Exclude<
  SpecialElement,
  CircleCutoutElement
>

const rectanglePath = (width: number, height: number): string => {
  const left = toSvgNumber(-width / 2)
  const top = toSvgNumber(-height / 2)
  const right = toSvgNumber(width / 2)
  const bottom = toSvgNumber(height / 2)
  return `M ${left} ${top} L ${right} ${top} L ${right} ${bottom} L ${left} ${bottom} Z`
}

const circlePath = (diameter: number): string => {
  const radius = toSvgNumber(diameter / 2)
  return `M 0 -${radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 -${radius} Z`
}

export function createSpecialElementGeometry(
  element: SpecialElement,
): SpecialElementGeometry {
  switch (element.type) {
    case 'house-wall':
      return {
        path: rectanglePath(
          element.dimensions.length,
          element.dimensions.thickness,
        ),
        detailPaths: [
          `M ${toSvgNumber(-element.dimensions.length / 2)} 0 L ${toSvgNumber(element.dimensions.length / 2)} 0`,
        ],
        areaSquareCentimeters: 0,
        subtractsFromTerrace: false,
      }
    case 'rect-cutout':
      return {
        path: rectanglePath(
          element.dimensions.width,
          element.dimensions.depth,
        ),
        detailPaths: [],
        areaSquareCentimeters:
          element.dimensions.width * element.dimensions.depth,
        subtractsFromTerrace: true,
      }
    case 'circle-cutout': {
      const radius = element.dimensions.diameter / 2
      return {
        path: circlePath(element.dimensions.diameter),
        detailPaths: [],
        areaSquareCentimeters: Math.PI * radius ** 2,
        subtractsFromTerrace: true,
      }
    }
    case 'stairs': {
      const { width, depth, steps } = element.dimensions
      const left = toSvgNumber(-width / 2)
      const right = toSvgNumber(width / 2)
      const detailPaths = Array.from(
        { length: Math.max(steps - 1, 0) },
        (_, index) => {
          const y = -depth / 2 + (depth * (index + 1)) / steps
          return `M ${left} ${toSvgNumber(y)} L ${right} ${toSvgNumber(y)}`
        },
      )

      return {
        path: rectanglePath(width, depth),
        detailPaths,
        areaSquareCentimeters: 0,
        subtractsFromTerrace: false,
      }
    }
  }
}

export const calculateSpecialElementArea = (
  elements: readonly SpecialElement[],
): number =>
  elements.reduce(
    (area, element) =>
      area + createSpecialElementGeometry(element).areaSquareCentimeters,
    0,
  )

const rotatePoint = (point: Point, degrees: number): Point => {
  const radians = (degrees * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  }
}

const toPlanPoint = (element: SpecialElement, localPoint: Point): Point => {
  const rotated = rotatePoint(localPoint, element.rotation)
  return {
    x: element.position.x + rotated.x,
    y: element.position.y + rotated.y,
  }
}

const pointOnSegment = (point: Point, start: Point, end: Point): boolean => {
  const cross =
    (point.x - start.x) * (end.y - start.y) -
    (point.y - start.y) * (end.x - start.x)
  if (Math.abs(cross) > GEOMETRY_EPSILON) {
    return false
  }

  return (
    point.x >= Math.min(start.x, end.x) - GEOMETRY_EPSILON &&
    point.x <= Math.max(start.x, end.x) + GEOMETRY_EPSILON &&
    point.y >= Math.min(start.y, end.y) - GEOMETRY_EPSILON &&
    point.y <= Math.max(start.y, end.y) + GEOMETRY_EPSILON
  )
}

export function isPointInsidePolygon(
  point: Point,
  polygon: readonly Point[],
): boolean {
  if (polygon.length < 3) {
    return false
  }

  let inside = false
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]!
    const end = polygon[(index + 1) % polygon.length]!
    if (pointOnSegment(point, start, end)) {
      return true
    }

    const crossesHorizontalRay =
      (start.y > point.y) !== (end.y > point.y) &&
      point.x <
        ((end.x - start.x) * (point.y - start.y)) /
          (end.y - start.y) +
          start.x
    if (crossesHorizontalRay) {
      inside = !inside
    }
  }

  return inside
}

const insideRectangle = (
  point: Point,
  width: number,
  depth: number,
): boolean =>
  point.x >= -GEOMETRY_EPSILON &&
  point.x <= width + GEOMETRY_EPSILON &&
  point.y >= -GEOMETRY_EPSILON &&
  point.y <= depth + GEOMETRY_EPSILON

export function isPointInsideTerrace(
  config: TerraceConfig,
  point: Point,
): boolean {
  switch (config.shape) {
    case 'rectangle':
      return insideRectangle(
        point,
        config.dimensions.width,
        config.dimensions.depth,
      )
    case 'l-shape':
      return (
        insideRectangle(
          point,
          config.dimensions.width,
          config.dimensions.depth,
        ) &&
        (point.x <= config.dimensions.legWidth + GEOMETRY_EPSILON ||
          point.y <= config.dimensions.legDepth + GEOMETRY_EPSILON)
      )
    case 't-shape': {
      const totalDepth =
        config.dimensions.capDepth + config.dimensions.stemDepth
      return (
        insideRectangle(point, config.dimensions.width, totalDepth) &&
        (point.y <= config.dimensions.capDepth + GEOMETRY_EPSILON ||
          (point.x >=
            config.dimensions.leftOverhang - GEOMETRY_EPSILON &&
            point.x <=
              config.dimensions.width -
                config.dimensions.rightOverhang +
                GEOMETRY_EPSILON))
      )
    }
    case 'u-shape': {
      const openingLeft = config.dimensions.leftLegWidth
      const openingRight =
        config.dimensions.width - config.dimensions.rightLegWidth
      const insideOpening =
        point.x > openingLeft + GEOMETRY_EPSILON &&
        point.x < openingRight - GEOMETRY_EPSILON &&
        point.y < config.dimensions.recessDepth - GEOMETRY_EPSILON
      return (
        insideRectangle(
          point,
          config.dimensions.width,
          config.dimensions.depth,
        ) && !insideOpening
      )
    }
    case 'o-shape': {
      const insideOpening =
        point.x >= config.dimensions.openingX - GEOMETRY_EPSILON &&
        point.x <=
          config.dimensions.openingX +
            config.dimensions.openingWidth +
            GEOMETRY_EPSILON &&
        point.y >= config.dimensions.openingY - GEOMETRY_EPSILON &&
        point.y <=
          config.dimensions.openingY +
            config.dimensions.openingDepth +
            GEOMETRY_EPSILON
      return (
        insideRectangle(
          point,
          config.dimensions.width,
          config.dimensions.depth,
        ) && !insideOpening
      )
    }
    case 'free-form':
      return (
        config.dimensions.closed &&
        isPointInsidePolygon(point, config.dimensions.vertices)
      )
    case 'circle': {
      const radius = config.dimensions.diameter / 2
      return (
        Math.hypot(point.x - radius, point.y - radius) <=
        radius + GEOMETRY_EPSILON
      )
    }
  }
}

const rectangularSize = (
  element: RectangularSpecialElement,
): { width: number; depth: number } => {
  switch (element.type) {
    case 'house-wall':
      return {
        width: element.dimensions.length,
        depth: element.dimensions.thickness,
      }
    case 'rect-cutout':
      return element.dimensions
    case 'stairs':
      return element.dimensions
  }
}

const rectangleCorners = (
  element: RectangularSpecialElement,
): Point[] => {
  const { width, depth } = rectangularSize(element)
  return [
    { x: -width / 2, y: -depth / 2 },
    { x: width / 2, y: -depth / 2 },
    { x: width / 2, y: depth / 2 },
    { x: -width / 2, y: depth / 2 },
  ].map((point) => toPlanPoint(element, point))
}

const elementSamplePoints = (element: SpecialElement): Point[] => {
  if (element.type === 'circle-cutout') {
    const radius = element.dimensions.diameter / 2
    const boundary = Array.from(
      { length: CIRCLE_SAMPLE_COUNT },
      (_, index) => {
        const radians = (index / CIRCLE_SAMPLE_COUNT) * Math.PI * 2
        return toPlanPoint(element, {
          x: Math.cos(radians) * radius,
          y: Math.sin(radians) * radius,
        })
      },
    )
    const interior: Point[] = []
    for (let xIndex = -SAMPLE_GRID_SIZE; xIndex <= SAMPLE_GRID_SIZE; xIndex += 1) {
      for (
        let yIndex = -SAMPLE_GRID_SIZE;
        yIndex <= SAMPLE_GRID_SIZE;
        yIndex += 1
      ) {
        const x = (xIndex / SAMPLE_GRID_SIZE) * radius
        const y = (yIndex / SAMPLE_GRID_SIZE) * radius
        if (Math.hypot(x, y) <= radius) {
          interior.push(toPlanPoint(element, { x, y }))
        }
      }
    }
    return [...boundary, ...interior]
  }

  const { width, depth } = rectangularSize(element)
  const samples: Point[] = []
  for (let xIndex = 0; xIndex <= SAMPLE_GRID_SIZE; xIndex += 1) {
    for (let yIndex = 0; yIndex <= SAMPLE_GRID_SIZE; yIndex += 1) {
      samples.push(
        toPlanPoint(element, {
          x: -width / 2 + (width * xIndex) / SAMPLE_GRID_SIZE,
          y: -depth / 2 + (depth * yIndex) / SAMPLE_GRID_SIZE,
        }),
      )
    }
  }
  return samples
}

const projection = (
  polygon: readonly Point[],
  axis: Point,
): { minimum: number; maximum: number } => {
  const values = polygon.map((point) => point.x * axis.x + point.y * axis.y)
  return { minimum: Math.min(...values), maximum: Math.max(...values) }
}

const rectanglesOverlap = (
  first: RectangularSpecialElement,
  second: RectangularSpecialElement,
): boolean => {
  const firstCorners = rectangleCorners(first)
  const secondCorners = rectangleCorners(second)
  const axes = [firstCorners, secondCorners].flatMap((corners) =>
    corners.slice(0, 2).map((point, index) => {
      const next = corners[index + 1]!
      const edge = { x: next.x - point.x, y: next.y - point.y }
      const length = Math.hypot(edge.x, edge.y) || 1
      return { x: -edge.y / length, y: edge.x / length }
    }),
  )

  return axes.every((axis) => {
    const firstProjection = projection(firstCorners, axis)
    const secondProjection = projection(secondCorners, axis)
    return !(
      firstProjection.maximum <=
        secondProjection.minimum + GEOMETRY_EPSILON ||
      secondProjection.maximum <=
        firstProjection.minimum + GEOMETRY_EPSILON
    )
  })
}

const pointToSegmentDistance = (
  point: Point,
  start: Point,
  end: Point,
): number => {
  const delta = { x: end.x - start.x, y: end.y - start.y }
  const lengthSquared = delta.x ** 2 + delta.y ** 2
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const ratio = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * delta.x +
        (point.y - start.y) * delta.y) /
        lengthSquared,
    ),
  )
  return Math.hypot(
    point.x - (start.x + ratio * delta.x),
    point.y - (start.y + ratio * delta.y),
  )
}

const circleAndRectangleOverlap = (
  circle: CircleCutoutElement,
  rectangle: RectangularSpecialElement,
): boolean => {
  const corners = rectangleCorners(rectangle)
  const center = circle.position
  const radius = circle.dimensions.diameter / 2
  return (
    isPointInsidePolygon(center, corners) ||
    corners.some(
      (corner) =>
        Math.hypot(corner.x - center.x, corner.y - center.y) <
        radius - GEOMETRY_EPSILON,
    ) ||
    corners.some((corner, index) => {
      const next = corners[(index + 1) % corners.length]!
      return (
        pointToSegmentDistance(center, corner, next) <
        radius - GEOMETRY_EPSILON
      )
    })
  )
}

const specialElementsOverlap = (
  first: SpecialElement,
  second: SpecialElement,
): boolean => {
  if (first.type === 'circle-cutout' && second.type === 'circle-cutout') {
    return (
      Math.hypot(
        first.position.x - second.position.x,
        first.position.y - second.position.y,
      ) <
      first.dimensions.diameter / 2 +
        second.dimensions.diameter / 2 -
        GEOMETRY_EPSILON
    )
  }
  if (first.type !== 'circle-cutout' && second.type !== 'circle-cutout') {
    return rectanglesOverlap(first, second)
  }
  return first.type === 'circle-cutout'
    ? circleAndRectangleOverlap(
        first,
        second as RectangularSpecialElement,
      )
    : circleAndRectangleOverlap(
        second as CircleCutoutElement,
        first,
      )
}

export function isSpecialElementPlacementValid(
  config: TerraceConfig,
  candidate: SpecialElement,
  elements: readonly SpecialElement[] = config.specialElements,
): boolean {
  if (
    !elementSamplePoints(candidate).every((point) =>
      isPointInsideTerrace(config, point),
    )
  ) {
    return false
  }

  return !elements.some(
    (element) =>
      element.id !== candidate.id &&
      specialElementsOverlap(candidate, element),
  )
}

export function findSpecialElementPlacement(
  config: TerraceConfig,
  element: SpecialElement,
): Point | null {
  const geometry = createTerraceGeometry(
    config.shape,
    config.dimensions as TerraceDimensions,
  )
  const center = {
    x: geometry.bounds.x + geometry.bounds.width / 2,
    y: geometry.bounds.y + geometry.bounds.height / 2,
  }
  const centered = { ...element, position: center } as SpecialElement
  if (isSpecialElementPlacementValid(config, centered)) {
    return center
  }

  const step = 20
  for (
    let y = geometry.bounds.y;
    y <= geometry.bounds.y + geometry.bounds.height;
    y += step
  ) {
    for (
      let x = geometry.bounds.x;
      x <= geometry.bounds.x + geometry.bounds.width;
      x += step
    ) {
      const candidate = { ...element, position: { x, y } } as SpecialElement
      if (isSpecialElementPlacementValid(config, candidate)) {
        return { x, y }
      }
    }
  }

  return null
}
