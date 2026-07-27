export type TerraceShape =
  | 'rectangle'
  | 'l-shape'
  | 't-shape'
  | 'u-shape'
  | 'o-shape'
  | 'free-form'
  | 'circle'

export type WoodTextureId = 'natural-oak' | 'smoked-ash' | 'honey-pine'

export type BoardDirection = 'horizontal' | 'vertical' | 'custom'

export type SpecialElementType =
  | 'house-wall'
  | 'rect-cutout'
  | 'circle-cutout'
  | 'stairs'

interface SpecialElementBase<TType extends SpecialElementType> {
  id: string
  type: TType
  position: Point
  /** Clockwise rotation in degrees around `position`. */
  rotation: number
}

export interface HouseWallElement
  extends SpecialElementBase<'house-wall'> {
  dimensions: {
    length: number
    thickness: number
  }
}

export interface RectCutoutElement
  extends SpecialElementBase<'rect-cutout'> {
  dimensions: {
    width: number
    depth: number
  }
}

export interface CircleCutoutElement
  extends SpecialElementBase<'circle-cutout'> {
  dimensions: {
    diameter: number
  }
}

export interface StairsElement extends SpecialElementBase<'stairs'> {
  dimensions: {
    width: number
    depth: number
    steps: number
  }
}

export type SpecialElement =
  | HouseWallElement
  | RectCutoutElement
  | CircleCutoutElement
  | StairsElement

export interface SpecialElementPatch {
  position?: Point
  rotation?: number
  dimensions?: Partial<{
    length: number
    thickness: number
    width: number
    depth: number
    diameter: number
    steps: number
  }>
}

export interface DeckingLayout {
  /** Board axis angle in degrees, clockwise from horizontal. */
  angle: number
  boardWidth: number
  boardGap: number
  offset: number
  startEdgeId: string
}

export interface RectangleDimensions {
  width: number
  depth: number
}

export interface LShapeDimensions {
  width: number
  depth: number
  legWidth: number
  legDepth: number
}

export interface TShapeDimensions {
  width: number
  capDepth: number
  rightOverhang: number
  leftOverhang: number
  stemDepth: number
}

export interface UShapeDimensions {
  width: number
  depth: number
  rightLegWidth: number
  leftLegWidth: number
  recessDepth: number
}

export interface OShapeDimensions {
  width: number
  depth: number
  openingWidth: number
  openingDepth: number
  openingX: number
  openingY: number
}

export interface FreeFormDimensions {
  vertices: Point[]
  closed: boolean
}

export interface CircleDimensions {
  diameter: number
}

export interface ShapeDimensionsMap {
  rectangle: RectangleDimensions
  'l-shape': LShapeDimensions
  't-shape': TShapeDimensions
  'u-shape': UShapeDimensions
  'o-shape': OShapeDimensions
  'free-form': FreeFormDimensions
  circle: CircleDimensions
}

export type TerraceDimensions = ShapeDimensionsMap[TerraceShape]

export type TerraceConfig<
  TShape extends TerraceShape = TerraceShape,
> = {
  [Shape in TShape]: {
    shape: Shape
    dimensions: ShapeDimensionsMap[Shape]
    texture: WoodTextureId
    boardDirection: BoardDirection
    decking: DeckingLayout
    specialElements: SpecialElement[]
  }
}[TShape]

export interface Point {
  x: number
  y: number
}

export interface GeometryBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface DimensionGuide {
  id: string
  value: number
  orientation: 'horizontal' | 'vertical'
  start: Point
  end: Point
  offset: number
}

export interface GeometryVertex {
  /** Stable identifier and display label, e.g. A, B, C. */
  id: string
  label: string
  point: Point
  /** Suggested SVG text anchor outside the terrace boundary. */
  labelPosition: Point
}

export interface EdgeDimensionMetadata {
  measurement: 'linear' | 'arc-length'
  value: number
  unit: 'cm'
  /** Final endpoints of the offset dimension line or arc. */
  guideStart: Point
  guideEnd: Point
  /** SVG path for the offset dimension line, ready to render. */
  guidePath: string
  /** Suggested SVG text anchor and readable text rotation. */
  labelPosition: Point
  labelRotationDegrees: number
}

export interface GeometryEdge {
  /** Stable boundary identifier derived from its vertices, e.g. AB. */
  id: string
  startVertexId: string
  endVertexId: string
  kind: 'line' | 'arc'
  start: Point
  end: Point
  /** SVG path for this individual boundary segment. */
  path: string
  /** Linear or arc length in centimeters. */
  length: number
  dimension: EdgeDimensionMetadata
}

export interface ShapeGeometry {
  path: string
  points: readonly Point[]
  vertices: readonly GeometryVertex[]
  edges: readonly GeometryEdge[]
  bounds: GeometryBounds
  dimensionGuides: readonly DimensionGuide[]
  areaSquareCentimeters: number
}

export interface SpecialElementGeometry {
  path: string
  detailPaths: readonly string[]
  areaSquareCentimeters: number
  subtractsFromTerrace: boolean
}

export interface DimensionFieldDefinition {
  key: string
  label: string
  edgeLabel?: string
  hint: string
  min: number | ((dimensions: Record<string, number>) => number)
  max: number | ((dimensions: Record<string, number>) => number)
  step?: number
  /** Reads a derived measurement that is not stored directly in the config. */
  getValue?: (dimensions: Record<string, number>) => number
  /** Converts an edited derived measurement back to stored dimensions. */
  applyValue?: (
    value: number,
    dimensions: Record<string, number>,
  ) => Record<string, number>
}

export interface ShapeOption {
  id: TerraceShape
  label: string
  shortLabel: string
  description: string
  fields: readonly DimensionFieldDefinition[]
}

export interface WoodTexture {
  id: WoodTextureId
  label: string
  description: string
  baseColor: string
  secondaryColor: string
  grainColor: string
  swatch: string
}
