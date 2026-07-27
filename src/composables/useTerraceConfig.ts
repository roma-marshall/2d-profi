import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import {
  cloneDefaultDimensions,
  isTerraceShape,
  normalizeDimensions,
  resolveFieldLimit,
  shapeOptionById,
} from '@/data/shapes'
import { isWoodTextureId } from '@/data/textures'
import type {
  BoardDirection,
  TerraceConfig,
  TerraceDimensions,
  TerraceShape,
  WoodTextureId,
} from '@/types/terrace'

export const TERRACE_CONFIG_STORAGE_KEY =
  '2d-terrace-configurator:config:v1'

const DEFAULT_TEXTURE: WoodTextureId = 'natural-oak'
const DEFAULT_BOARD_DIRECTION: BoardDirection = 'horizontal'
const DEFAULT_SHAPE: TerraceShape = 'rectangle'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isBoardDirection = (value: unknown): value is BoardDirection =>
  value === 'horizontal' || value === 'vertical'

const asNumberRecord = (
  dimensions: TerraceDimensions,
): Record<string, number> => dimensions as unknown as Record<string, number>

const createConfig = <TShape extends TerraceShape>(
  shape: TShape,
  dimensions: unknown,
  texture: WoodTextureId,
  boardDirection: BoardDirection,
): TerraceConfig<TShape> => ({
  shape,
  dimensions: normalizeDimensions(shape, dimensions),
  texture,
  boardDirection,
})

export const createDefaultTerraceConfig = (): TerraceConfig =>
  createConfig(
    DEFAULT_SHAPE,
    cloneDefaultDimensions(DEFAULT_SHAPE),
    DEFAULT_TEXTURE,
    DEFAULT_BOARD_DIRECTION,
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

  return createConfig(
    value.shape,
    value.dimensions,
    texture,
    boardDirection,
  )
}

const readStoredConfig = (storage: Storage | null): TerraceConfig => {
  if (storage === null) {
    return createDefaultTerraceConfig()
  }

  try {
    const serialized = storage.getItem(TERRACE_CONFIG_STORAGE_KEY)
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
      return (
        dimensions.width * dimensions.capDepth +
        dimensions.stemWidth * dimensions.stemDepth
      )
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
  selectShape: (shape: TerraceShape) => void
  updateDimension: (key: string, value: number) => void
  setTexture: (texture: WoodTextureId) => void
  setBoardDirection: (direction: BoardDirection) => void
  resetConfig: () => void
}

export const useTerraceConfig = (): UseTerraceConfigReturn => {
  const storage = getLocalStorage()
  const config = ref<TerraceConfig>(
    readStoredConfig(storage),
  ) as Ref<TerraceConfig>
  const isSaved = ref(false)

  const persistConfig = (nextConfig: TerraceConfig): void => {
    if (storage === null) {
      isSaved.value = false
      return
    }

    isSaved.value = false

    try {
      storage.setItem(
        TERRACE_CONFIG_STORAGE_KEY,
        JSON.stringify(nextConfig),
      )
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

  const selectShape = (shape: TerraceShape): void => {
    if (!isTerraceShape(shape) || shape === config.value.shape) {
      return
    }

    config.value = createConfig(
      shape,
      cloneDefaultDimensions(shape),
      config.value.texture,
      config.value.boardDirection,
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
    const currentValue = currentDimensions[key]
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

    config.value = createConfig(
      shape,
      {
        ...currentDimensions,
        [key]: nextValue,
      },
      config.value.texture,
      config.value.boardDirection,
    )
  }

  const setTexture = (texture: WoodTextureId): void => {
    if (!isWoodTextureId(texture) || texture === config.value.texture) {
      return
    }

    config.value = {
      ...config.value,
      texture,
    }
  }

  const setBoardDirection = (direction: BoardDirection): void => {
    if (
      !isBoardDirection(direction) ||
      direction === config.value.boardDirection
    ) {
      return
    }

    config.value = {
      ...config.value,
      boardDirection: direction,
    }
  }

  const resetConfig = (): void => {
    config.value = createDefaultTerraceConfig()
  }

  return {
    config,
    areaSquareMeters,
    isSaved,
    selectShape,
    updateDimension,
    setTexture,
    setBoardDirection,
    resetConfig,
  }
}
