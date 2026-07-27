export type TerraceShape = 'rectangle' | 'l-shape' | 't-shape' | 'circle'

export type WoodTextureId = 'natural-oak' | 'smoked-ash' | 'honey-pine'

export type BoardDirection = 'horizontal' | 'vertical'

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
  stemWidth: number
  stemDepth: number
}

export interface CircleDimensions {
  diameter: number
}

export interface ShapeDimensionsMap {
  rectangle: RectangleDimensions
  'l-shape': LShapeDimensions
  't-shape': TShapeDimensions
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

export interface ShapeGeometry {
  path: string
  points: readonly Point[]
  bounds: GeometryBounds
  dimensionGuides: readonly DimensionGuide[]
  areaSquareCentimeters: number
}

export interface DimensionFieldDefinition {
  key: string
  label: string
  hint: string
  min: number | ((dimensions: Record<string, number>) => number)
  max: number | ((dimensions: Record<string, number>) => number)
  step?: number
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
