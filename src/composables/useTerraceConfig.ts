import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import {
  cloneDefaultDimensions,
  isTerraceShape,
  normalizeDimensions,
  resolveFieldLimit,
  shapeOptionById,
} from '@/data/shapes'
import {
  DECKING_LIMITS,
  DEFAULT_DECKING_LAYOUT,
} from '@/data/decking'
import { isWoodTextureId } from '@/data/textures'
import {
  FREE_FORM_MAX_VERTICES,
  calculatePolygonArea,
  isSimplePolygon,
  resizePolygonEdge,
} from '@/geometry/freeForm'
import { createTerraceGeometry } from '@/geometry/registry'
import type {
  BoardDirection,
  DeckingLayout,
  FreeFormDimensions,
  Point,
  TerraceConfig,
  TerraceDimensions,
  TerraceShape,
  WoodTextureId,
} from '@/types/terrace'

export const TERRACE_CONFIG_STORAGE_KEY =
  '2d-terrace-configurator:config:v2'
const LEGACY_TERRACE_CONFIG_STORAGE_KEY =
  '2d-terrace-configurator:config:v1'

const DEFAULT_TEXTURE: WoodTextureId = 'natural-oak'
const DEFAULT_BOARD_DIRECTION: BoardDirection = 'horizontal'
const DEFAULT_SHAPE: TerraceShape = 'rectangle'
const HISTORY_LIMIT = 50

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isBoardDirection = (value: unknown): value is BoardDirection =>
  value === 'horizontal' || value === 'vertical' || value === 'custom'

const asNumberRecord = (
  dimensions: TerraceDimensions,
): Record<string, number> => dimensions as unknown as Record<string, number>

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum)

const normalizeNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.round(clamp(value, minimum, maximum) * 10) / 10
}

const directionFromAngle = (angle: number): BoardDirection => {
  if (angle === 0) {
    return 'horizontal'
  }

  if (angle === 90) {
    return 'vertical'
  }

  return 'custom'
}

const normalizeDeckingLayout = (
  value: unknown,
  legacyDirection: BoardDirection = DEFAULT_BOARD_DIRECTION,
): DeckingLayout => {
  const record = isRecord(value) ? value : {}
  const fallbackAngle = legacyDirection === 'vertical' ? 90 : 0
  const angle = normalizeNumber(
    record.angle,
    fallbackAngle,
    DECKING_LIMITS.angle.min,
    DECKING_LIMITS.angle.max,
  )

  return {
    angle,
    boardWidth: normalizeNumber(
      record.boardWidth,
      DEFAULT_DECKING_LAYOUT.boardWidth,
      DECKING_LIMITS.boardWidth.min,
      DECKING_LIMITS.boardWidth.max,
    ),
    boardGap: normalizeNumber(
      record.boardGap,
      DEFAULT_DECKING_LAYOUT.boardGap,
      DECKING_LIMITS.boardGap.min,
      DECKING_LIMITS.boardGap.max,
    ),
    offset: normalizeNumber(
      record.offset,
      DEFAULT_DECKING_LAYOUT.offset,
      DECKING_LIMITS.offset.min,
      DECKING_LIMITS.offset.max,
    ),
    startEdgeId:
      typeof record.startEdgeId === 'string' &&
      /^[A-Z]{2}$/.test(record.startEdgeId)
        ? record.startEdgeId
        : DEFAULT_DECKING_LAYOUT.startEdgeId,
  }
}

const createConfig = <TShape extends TerraceShape>(
  shape: TShape,
  dimensions: unknown,
  texture: WoodTextureId,
  boardDirection: BoardDirection,
  decking: unknown,
): TerraceConfig<TShape> => {
  const normalizedDecking = normalizeDeckingLayout(decking, boardDirection)

  return {
    shape,
    dimensions: normalizeDimensions(shape, dimensions),
    texture,
    boardDirection: directionFromAngle(normalizedDecking.angle),
    decking: normalizedDecking,
  }
}

const serializeConfig = (config: TerraceConfig): string =>
  JSON.stringify(config)

const cloneConfig = (config: TerraceConfig): TerraceConfig =>
  JSON.parse(serializeConfig(config)) as TerraceConfig

export const createDefaultTerraceConfig = (): TerraceConfig =>
  createConfig(
    DEFAULT_SHAPE,
    cloneDefaultDimensions(DEFAULT_SHAPE),
    DEFAULT_TEXTURE,
    DEFAULT_BOARD_DIRECTION,
    DEFAULT_DECKING_LAYOUT,
  )

export const parseTerraceConfig = (value: unknown): TerraceConfig | null => {
  if (!isRecord(value) || !isTerraceShape(value.shape)) {
    return null
  }

  const texture = isWoodTextureId(value.texture)
    ? value.texture
    : DEFAULT_TEXTURE
  const boardDirection = isBoardDirection(value.boardDirection)
    ? value.boardDirection
    : DEFAULT_BOARD_DIRECTION

  const config = createConfig(
    value.shape,
    value.dimensions,
    texture,
    boardDirection,
    value.decking,
  )
  if (
    config.shape === 'free-form' &&
    config.dimensions.closed &&
    !isSimplePolygon(config.dimensions.vertices)
  ) {
    return null
  }

  const geometry = createTerraceGeometry(
    config.shape,
    config.dimensions as TerraceDimensions,
  )

  if (
    !geometry.edges.some((edge) => edge.id === config.decking.startEdgeId)
  ) {
    config.decking.startEdgeId =
      geometry.edges[0]?.id ?? DEFAULT_DECKING_LAYOUT.startEdgeId
  }

  return config
}

const readStoredConfig = (storage: Storage | null): TerraceConfig => {
  if (storage === null) {
    return createDefaultTerraceConfig()
  }

  try {
    const serialized =
      storage.getItem(TERRACE_CONFIG_STORAGE_KEY) ??
      storage.getItem(LEGACY_TERRACE_CONFIG_STORAGE_KEY)
    if (serialized === null) {
      return createDefaultTerraceConfig()
    }

    const parsed = parseTerraceConfig(JSON.parse(serialized) as unknown)
    return parsed ?? createDefaultTerraceConfig()
  } catch {
    return createDefaultTerraceConfig()
  }
}

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const calculateAreaSquareCentimeters = (
  config: TerraceConfig,
): number => {
  switch (config.shape) {
    case 'rectangle': {
      const dimensions = normalizeDimensions(
        'rectangle',
        config.dimensions,
      )
      return dimensions.width * dimensions.depth
    }
    case 'l-shape': {
      const dimensions = normalizeDimensions('l-shape', config.dimensions)
      const recessedWidth = dimensions.width - dimensions.legWidth
      const recessedDepth = dimensions.depth - dimensions.legDepth
      return (
        dimensions.width * dimensions.depth -
        recessedWidth * recessedDepth
      )
    }
    case 't-shape': {
      const dimensions = normalizeDimensions('t-shape', config.dimensions)
      const stemWidth =
        dimensions.width -
        dimensions.leftOverhang -
        dimensions.rightOverhang
      return (
        dimensions.width * dimensions.capDepth +
        stemWidth * dimensions.stemDepth
      )
    }
    case 'u-shape': {
      const dimensions = normalizeDimensions('u-shape', config.dimensions)
      const openingWidth =
        dimensions.width -
        dimensions.leftLegWidth -
        dimensions.rightLegWidth
      return (
        dimensions.width * dimensions.depth -
        openingWidth * dimensions.recessDepth
      )
    }
    case 'o-shape': {
      const dimensions = normalizeDimensions('o-shape', config.dimensions)
      return (
        dimensions.width * dimensions.depth -
        dimensions.openingWidth * dimensions.openingDepth
      )
    }
    case 'free-form': {
      const dimensions = normalizeDimensions('free-form', config.dimensions)
      return dimensions.closed
        ? calculatePolygonArea(dimensions.vertices)
        : 0
    }
    case 'circle': {
      const dimensions = normalizeDimensions('circle', config.dimensions)
      const radius = dimensions.diameter / 2
      return Math.PI * radius * radius
    }
  }
}

export interface UseTerraceConfigReturn {
  config: Ref<TerraceConfig>
  areaSquareMeters: ComputedRef<number>
  isSaved: Ref<boolean>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  selectShape: (shape: TerraceShape) => void
  updateDimension: (key: string, value: number) => void
  setFreeForm: (vertices: readonly Point[], closed: boolean) => boolean
  updateFreeFormEdge: (edgeId: string, value: number) => boolean
  setTexture: (texture: WoodTextureId) => void
  setBoardDirection: (direction: BoardDirection) => void
  setBoardAngle: (angle: number) => void
  setBoardWidth: (width: number) => void
  setBoardGap: (gap: number) => void
  setBoardOffset: (offset: number) => void
  setStartEdge: (edgeId: string) => void
  replaceConfig: (value: unknown) => boolean
  undo: () => void
  redo: () => void
  resetConfig: () => void
}

export const useTerraceConfig = (): UseTerraceConfigReturn => {
  const storage = getLocalStorage()
  const config = ref<TerraceConfig>(
    readStoredConfig(storage),
  ) as Ref<TerraceConfig>
  const isSaved = ref(false)
  const undoStack = ref<TerraceConfig[]>([])
  const redoStack = ref<TerraceConfig[]>([])

  const persistConfig = (nextConfig: TerraceConfig): void => {
    if (storage === null) {
      isSaved.value = false
      return
    }

    isSaved.value = false

    try {
      storage.setItem(TERRACE_CONFIG_STORAGE_KEY, serializeConfig(nextConfig))
      isSaved.value = true
    } catch {
      isSaved.value = false
    }
  }

  watch(config, persistConfig, {
    deep: true,
    flush: 'sync',
    immediate: true,
  })

  const areaSquareMeters = computed(
    () => calculateAreaSquareCentimeters(config.value) / 10_000,
  )
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  const applyConfig = (
    nextConfig: TerraceConfig,
    recordHistory = true,
  ): void => {
    if (serializeConfig(nextConfig) === serializeConfig(config.value)) {
      return
    }

    if (recordHistory) {
      undoStack.value.push(cloneConfig(config.value))
      if (undoStack.value.length > HISTORY_LIMIT) {
        undoStack.value.shift()
      }
      redoStack.value = []
    }

    config.value = cloneConfig(nextConfig)
  }

  const updateDecking = (patch: Partial<DeckingLayout>): void => {
    const decking = normalizeDeckingLayout(
      {
        ...config.value.decking,
        ...patch,
      },
      config.value.boardDirection,
    )

    applyConfig({
      ...config.value,
      boardDirection: directionFromAngle(decking.angle),
      decking,
    })
  }

  const selectShape = (shape: TerraceShape): void => {
    if (!isTerraceShape(shape) || shape === config.value.shape) {
      return
    }

    applyConfig(
      createConfig(
        shape,
        cloneDefaultDimensions(shape),
        config.value.texture,
        config.value.boardDirection,
        {
          ...config.value.decking,
          startEdgeId: DEFAULT_DECKING_LAYOUT.startEdgeId,
        },
      ),
    )
  }

  const updateDimension = (key: string, value: number): void => {
    const shape = config.value.shape
    const field = shapeOptionById[shape].fields.find(
      (candidate) => candidate.key === key,
    )

    if (field === undefined) {
      return
    }

    const currentDimensions = asNumberRecord(config.value.dimensions)
    const currentValue =
      field.getValue?.(currentDimensions) ?? currentDimensions[key]
    const minimum = resolveFieldLimit(field.min, currentDimensions)
    const maximum = resolveFieldLimit(field.max, currentDimensions)
    const lowerBound = Math.min(minimum, maximum)
    const upperBound = Math.max(minimum, maximum)
    const nextValue =
      Number.isFinite(value) && typeof value === 'number'
        ? Math.min(Math.max(value, lowerBound), upperBound)
        : currentValue

    if (nextValue === undefined) {
      return
    }

    const nextDimensions =
      field.applyValue?.(nextValue, currentDimensions) ?? {
        ...currentDimensions,
        [key]: nextValue,
      }

    applyConfig(
      createConfig(
        shape,
        nextDimensions,
        config.value.texture,
        config.value.boardDirection,
        config.value.decking,
      ),
    )
  }

  const setFreeForm = (
    vertices: readonly Point[],
    closed: boolean,
  ): boolean => {
    if (
      config.value.shape !== 'free-form' ||
      vertices.length > FREE_FORM_MAX_VERTICES ||
      vertices.some(
        (point) =>
          !Number.isFinite(point.x) || !Number.isFinite(point.y),
      ) ||
      (closed && !isSimplePolygon(vertices))
    ) {
      return false
    }

    const dimensions: FreeFormDimensions = {
      vertices: vertices.map((point) => ({ ...point })),
      closed: closed && vertices.length >= 3,
    }
    applyConfig(
      createConfig(
        'free-form',
        dimensions,
        config.value.texture,
        config.value.boardDirection,
        config.value.decking,
      ),
    )
    return true
  }

  const updateFreeFormEdge = (
    edgeId: string,
    value: number,
  ): boolean => {
    if (config.value.shape !== 'free-form') {
      return false
    }

    const geometry = createTerraceGeometry(
      'free-form',
      config.value.dimensions,
    )
    const edgeIndex = geometry.edges.findIndex((edge) => edge.id === edgeId)
    if (edgeIndex < 0) {
      return false
    }

    const vertices = resizePolygonEdge(
      config.value.dimensions.vertices,
      edgeIndex,
      value,
    )
    return setFreeForm(vertices, true)
  }

  const setTexture = (texture: WoodTextureId): void => {
    if (!isWoodTextureId(texture) || texture === config.value.texture) {
      return
    }

    applyConfig({
      ...config.value,
      texture,
    })
  }

  const setBoardDirection = (direction: BoardDirection): void => {
    if (!isBoardDirection(direction) || direction === 'custom') {
      return
    }

    updateDecking({
      angle: direction === 'horizontal' ? 0 : 90,
    })
  }

  const setBoardAngle = (angle: number): void => {
    updateDecking({ angle })
  }

  const setBoardWidth = (width: number): void => {
    updateDecking({ boardWidth: width })
  }

  const setBoardGap = (gap: number): void => {
    updateDecking({ boardGap: gap })
  }

  const setBoardOffset = (offset: number): void => {
    updateDecking({ offset })
  }

  const setStartEdge = (edgeId: string): void => {
    if (!/^[A-Z]{2}$/.test(edgeId)) {
      return
    }

    updateDecking({ startEdgeId: edgeId })
  }

  const replaceConfig = (value: unknown): boolean => {
    const parsed = parseTerraceConfig(value)
    if (parsed === null) {
      return false
    }

    applyConfig(parsed)
    return true
  }

  const undo = (): void => {
    const previous = undoStack.value.pop()
    if (previous === undefined) {
      return
    }

    redoStack.value.push(cloneConfig(config.value))
    applyConfig(previous, false)
  }

  const redo = (): void => {
    const next = redoStack.value.pop()
    if (next === undefined) {
      return
    }

    undoStack.value.push(cloneConfig(config.value))
    applyConfig(next, false)
  }

  const resetConfig = (): void => {
    applyConfig(createDefaultTerraceConfig())
  }

  return {
    config,
    areaSquareMeters,
    isSaved,
    canUndo,
    canRedo,
    selectShape,
    updateDimension,
    setFreeForm,
    updateFreeFormEdge,
    setTexture,
    setBoardDirection,
    setBoardAngle,
    setBoardWidth,
    setBoardGap,
    setBoardOffset,
    setStartEdge,
    replaceConfig,
    undo,
    redo,
    resetConfig,
  }
}
