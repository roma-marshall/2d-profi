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
  SPECIAL_ELEMENT_LIMITS,
  createDefaultSpecialElement,
  isSpecialElementType,
  normalizeSpecialElements,
} from '@/data/specialElements'
import {
  FREE_FORM_MAX_VERTICES,
  calculatePolygonArea,
  isSimplePolygon,
  resizePolygonEdge,
} from '@/geometry/freeForm'
import { createTerraceGeometry } from '@/geometry/registry'
import {
  calculateSpecialElementArea,
  findSpecialElementPlacement,
  isSpecialElementPlacementValid,
} from '@/geometry/specialElements'
import type {
  BoardDirection,
  DeckingLayout,
  FreeFormDimensions,
  Point,
  SpecialElement,
  SpecialElementPatch,
  SpecialElementType,
  TerraceArea,
  TerraceAreaSummary,
  TerraceConfig,
  TerraceDimensions,
  TerraceShape,
  TerraceWorkspace,
  WoodTextureId,
} from '@/types/terrace'

export const TERRACE_WORKSPACE_STORAGE_KEY =
  '2d-profi:workspace:v3'
export const TERRACE_CONFIG_STORAGE_KEY =
  '2d-profi:config:v2'
const LEGACY_TERRACE_CONFIG_STORAGE_KEY =
  '2d-terrace-configurator:config:v2'
const OLDEST_TERRACE_CONFIG_STORAGE_KEY =
  '2d-terrace-configurator:config:v1'

const DEFAULT_TEXTURE: WoodTextureId = 'natural-oak'
const DEFAULT_BOARD_DIRECTION: BoardDirection = 'horizontal'
const DEFAULT_SHAPE: TerraceShape = 'rectangle'
const HISTORY_LIMIT = 50
let specialElementIdSequence = 0

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
  specialElements: unknown = [],
): TerraceConfig<TShape> => {
  const normalizedDecking = normalizeDeckingLayout(decking, boardDirection)

  return {
    shape,
    dimensions: normalizeDimensions(shape, dimensions),
    texture,
    boardDirection: directionFromAngle(normalizedDecking.angle),
    decking: normalizedDecking,
    specialElements: normalizeSpecialElements(specialElements),
  }
}

const serializeConfig = (config: TerraceConfig): string =>
  JSON.stringify(config)

const cloneConfig = (config: TerraceConfig): TerraceConfig =>
  JSON.parse(serializeConfig(config)) as TerraceConfig

const serializeWorkspace = (workspace: TerraceWorkspace): string =>
  JSON.stringify(workspace)

const cloneWorkspace = (workspace: TerraceWorkspace): TerraceWorkspace =>
  JSON.parse(serializeWorkspace(workspace)) as TerraceWorkspace

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
    value.specialElements,
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
  const validSpecialElements: SpecialElement[] = []
  for (const element of config.specialElements) {
    if (
      isSpecialElementPlacementValid(
        config,
        element,
        validSpecialElements,
      )
    ) {
      validSpecialElements.push(element)
    }
  }
  config.specialElements = validSpecialElements

  if (
    !geometry.edges.some((edge) => edge.id === config.decking.startEdgeId)
  ) {
    config.decking.startEdgeId =
      geometry.edges[0]?.id ?? DEFAULT_DECKING_LAYOUT.startEdgeId
  }

  return config
}

const createSingleAreaWorkspace = (
  config: TerraceConfig,
): TerraceWorkspace => ({
  version: 3,
  activeAreaId: 'area-1',
  areas: [
    {
      id: 'area-1',
      name: 'Area 1',
      config,
    },
  ],
})

export const createDefaultTerraceWorkspace = (): TerraceWorkspace =>
  createSingleAreaWorkspace(createDefaultTerraceConfig())

const normalizeAreaName = (
  value: unknown,
  fallback: string,
): string => {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim().slice(0, 40)
  return normalized.length > 0 ? normalized : fallback
}

const createAvailableAreaId = (
  preferredId: unknown,
  index: number,
  usedIds: ReadonlySet<string>,
): string => {
  if (
    typeof preferredId === 'string' &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(preferredId) &&
    !usedIds.has(preferredId)
  ) {
    return preferredId
  }

  let suffix = index + 1
  while (usedIds.has(`area-${suffix}`)) {
    suffix += 1
  }
  return `area-${suffix}`
}

export const parseTerraceWorkspace = (
  value: unknown,
): TerraceWorkspace | null => {
  const legacyConfig = parseTerraceConfig(value)
  if (legacyConfig !== null) {
    return createSingleAreaWorkspace(legacyConfig)
  }

  if (!isRecord(value) || !Array.isArray(value.areas)) {
    return null
  }

  const areas: TerraceArea[] = []
  const usedIds = new Set<string>()
  for (const [index, candidate] of value.areas.entries()) {
    if (!isRecord(candidate)) {
      return null
    }

    const config = parseTerraceConfig(candidate.config)
    if (config === null) {
      return null
    }

    const id = createAvailableAreaId(candidate.id, index, usedIds)
    usedIds.add(id)
    areas.push({
      id,
      name: normalizeAreaName(candidate.name, `Area ${index + 1}`),
      config,
    })
  }

  if (areas.length === 0) {
    return null
  }

  const activeAreaId =
    typeof value.activeAreaId === 'string' &&
    areas.some((area) => area.id === value.activeAreaId)
      ? value.activeAreaId
      : areas[0]?.id
  if (activeAreaId === undefined) {
    return null
  }

  return {
    version: 3,
    activeAreaId,
    areas,
  }
}

const readStoredWorkspace = (
  storage: Storage | null,
): TerraceWorkspace => {
  if (storage === null) {
    return createDefaultTerraceWorkspace()
  }

  try {
    const serializedWorkspace = storage.getItem(
      TERRACE_WORKSPACE_STORAGE_KEY,
    )
    if (serializedWorkspace !== null) {
      const parsedWorkspace = parseTerraceWorkspace(
        JSON.parse(serializedWorkspace) as unknown,
      )
      if (parsedWorkspace !== null) {
        return parsedWorkspace
      }
    }

    const serializedConfig =
      storage.getItem(TERRACE_CONFIG_STORAGE_KEY) ??
      storage.getItem(LEGACY_TERRACE_CONFIG_STORAGE_KEY) ??
      storage.getItem(OLDEST_TERRACE_CONFIG_STORAGE_KEY)
    if (serializedConfig === null) {
      return createDefaultTerraceWorkspace()
    }

    const parsedConfig = parseTerraceConfig(
      JSON.parse(serializedConfig) as unknown,
    )
    return parsedConfig === null
      ? createDefaultTerraceWorkspace()
      : createSingleAreaWorkspace(parsedConfig)
  } catch {
    return createDefaultTerraceWorkspace()
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

const calculateBaseAreaSquareCentimeters = (
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

export const calculateAreaSquareCentimeters = (
  config: TerraceConfig,
): number =>
  Math.max(
    0,
    calculateBaseAreaSquareCentimeters(config) -
      calculateSpecialElementArea(config.specialElements),
  )

export interface UseTerraceConfigReturn {
  workspace: Ref<TerraceWorkspace>
  areas: ComputedRef<readonly TerraceAreaSummary[]>
  activeAreaId: ComputedRef<string>
  config: ComputedRef<TerraceConfig>
  areaSquareMeters: ComputedRef<number>
  isSaved: Ref<boolean>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  addArea: () => string
  closeArea: (areaId: string) => boolean
  selectArea: (areaId: string) => void
  selectShape: (shape: TerraceShape) => void
  updateDimension: (key: string, value: number) => void
  setFreeForm: (vertices: readonly Point[], closed: boolean) => boolean
  updateFreeFormEdge: (edgeId: string, value: number) => boolean
  addSpecialElement: (type: SpecialElementType) => string | null
  updateSpecialElement: (
    id: string,
    patch: SpecialElementPatch,
  ) => boolean
  removeSpecialElement: (id: string) => void
  setTexture: (texture: WoodTextureId) => void
  setBoardDirection: (direction: BoardDirection) => void
  setBoardAngle: (angle: number) => void
  setBoardWidth: (width: number) => void
  setBoardGap: (gap: number) => void
  setBoardOffset: (offset: number) => void
  setStartEdge: (edgeId: string) => void
  replaceConfig: (value: unknown) => boolean
  replaceWorkspace: (value: unknown) => boolean
  undo: () => void
  redo: () => void
  resetConfig: () => void
}

export const useTerraceConfig = (): UseTerraceConfigReturn => {
  const storage = getLocalStorage()
  const workspace = ref<TerraceWorkspace>(
    readStoredWorkspace(storage),
  ) as Ref<TerraceWorkspace>
  const isSaved = ref(false)
  const undoStacks = ref<Record<string, TerraceConfig[]>>({})
  const redoStacks = ref<Record<string, TerraceConfig[]>>({})

  const activeArea = computed<TerraceArea>(() => {
    const area =
      workspace.value.areas.find(
        (candidate) => candidate.id === workspace.value.activeAreaId,
      ) ?? workspace.value.areas[0]
    if (area === undefined) {
      throw new TypeError('Terrace workspace requires at least one area')
    }
    return area
  })
  const activeAreaId = computed(() => activeArea.value.id)
  const areas = computed<readonly TerraceAreaSummary[]>(() =>
    workspace.value.areas.map(({ id, name }) => ({ id, name })),
  )
  const config = computed(() => activeArea.value.config)

  const ensureHistoryStack = (
    stacks: Ref<Record<string, TerraceConfig[]>>,
    areaId: string,
  ): TerraceConfig[] => {
    if (stacks.value[areaId] === undefined) {
      stacks.value = {
        ...stacks.value,
        [areaId]: [],
      }
    }

    return stacks.value[areaId] ?? []
  }

  const resetHistoryStacks = (): void => {
    undoStacks.value = {}
    redoStacks.value = {}
  }

  const persistWorkspace = (
    nextWorkspace: TerraceWorkspace,
  ): void => {
    if (storage === null) {
      isSaved.value = false
      return
    }

    isSaved.value = false

    try {
      storage.setItem(
        TERRACE_WORKSPACE_STORAGE_KEY,
        serializeWorkspace(nextWorkspace),
      )
      isSaved.value = true
    } catch {
      isSaved.value = false
    }
  }

  watch(workspace, persistWorkspace, {
    deep: true,
    flush: 'sync',
    immediate: true,
  })

  const areaSquareMeters = computed(
    () => calculateAreaSquareCentimeters(config.value) / 10_000,
  )
  const canUndo = computed(
    () => (undoStacks.value[activeAreaId.value]?.length ?? 0) > 0,
  )
  const canRedo = computed(
    () => (redoStacks.value[activeAreaId.value]?.length ?? 0) > 0,
  )

  const applyConfig = (
    nextConfig: TerraceConfig,
    recordHistory = true,
  ): void => {
    if (serializeConfig(nextConfig) === serializeConfig(config.value)) {
      return
    }

    if (recordHistory) {
      const undoStack = ensureHistoryStack(
        undoStacks,
        activeAreaId.value,
      )
      undoStack.push(cloneConfig(config.value))
      if (undoStack.length > HISTORY_LIMIT) {
        undoStack.shift()
      }
      redoStacks.value = {
        ...redoStacks.value,
        [activeAreaId.value]: [],
      }
    }

    workspace.value = {
      ...workspace.value,
      areas: workspace.value.areas.map((area) =>
        area.id === activeAreaId.value
          ? { ...area, config: cloneConfig(nextConfig) }
          : area,
      ),
    }
  }

  const selectArea = (areaId: string): void => {
    if (
      areaId === activeAreaId.value ||
      !workspace.value.areas.some((area) => area.id === areaId)
    ) {
      return
    }

    workspace.value = {
      ...workspace.value,
      activeAreaId: areaId,
    }
  }

  const addArea = (): string => {
    let areaNumber = workspace.value.areas.length + 1
    const usedIds = new Set(
      workspace.value.areas.map((area) => area.id),
    )
    while (usedIds.has(`area-${areaNumber}`)) {
      areaNumber += 1
    }

    const area: TerraceArea = {
      id: `area-${areaNumber}`,
      name: `Area ${areaNumber}`,
      config: createDefaultTerraceConfig(),
    }
    workspace.value = {
      ...workspace.value,
      activeAreaId: area.id,
      areas: [...workspace.value.areas, area],
    }
    ensureHistoryStack(undoStacks, area.id)
    ensureHistoryStack(redoStacks, area.id)
    return area.id
  }

  const closeArea = (areaId: string): boolean => {
    const areaIndex = workspace.value.areas.findIndex(
      (area) => area.id === areaId,
    )
    if (areaIndex < 0 || workspace.value.areas.length === 1) {
      return false
    }

    const remainingAreas = workspace.value.areas.filter(
      (area) => area.id !== areaId,
    )
    const nextActiveAreaId =
      areaId === activeAreaId.value
        ? (
            remainingAreas[areaIndex] ??
            remainingAreas[areaIndex - 1]
          )?.id
        : activeAreaId.value

    if (nextActiveAreaId === undefined) {
      return false
    }

    workspace.value = {
      ...workspace.value,
      activeAreaId: nextActiveAreaId,
      areas: remainingAreas,
    }

    const remainingUndoStacks = { ...undoStacks.value }
    const remainingRedoStacks = { ...redoStacks.value }
    delete remainingUndoStacks[areaId]
    delete remainingRedoStacks[areaId]
    undoStacks.value = remainingUndoStacks
    redoStacks.value = remainingRedoStacks
    return true
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
        [],
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

    const nextConfig = createConfig(
      shape,
      nextDimensions,
      config.value.texture,
      config.value.boardDirection,
      config.value.decking,
      config.value.specialElements,
    )
    if (
      nextConfig.specialElements.some(
        (element, index, elements) =>
          !isSpecialElementPlacementValid(
            nextConfig,
            element,
            elements.slice(0, index),
          ),
      )
    ) {
      return
    }

    applyConfig(nextConfig)
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
    const nextConfig = createConfig(
      'free-form',
      dimensions,
      config.value.texture,
      config.value.boardDirection,
      config.value.decking,
      config.value.specialElements,
    )
    if (
      nextConfig.specialElements.some(
        (element, index, elements) =>
          !isSpecialElementPlacementValid(
            nextConfig,
            element,
            elements.slice(0, index),
          ),
      )
    ) {
      return false
    }
    applyConfig(nextConfig)
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

  const createSpecialElementId = (): string => {
    specialElementIdSequence += 1
    return `special-${Date.now().toString(36)}-${specialElementIdSequence}`
  }

  const addSpecialElement = (
    type: SpecialElementType,
  ): string | null => {
    if (
      !isSpecialElementType(type) ||
      config.value.specialElements.length >= SPECIAL_ELEMENT_LIMITS.count
    ) {
      return null
    }

    const element = createDefaultSpecialElement(
      type,
      createSpecialElementId(),
      { x: 0, y: 0 },
    )
    const position = findSpecialElementPlacement(config.value, element)
    if (position === null) {
      return null
    }

    const nextElement = { ...element, position } as SpecialElement
    applyConfig({
      ...config.value,
      specialElements: [...config.value.specialElements, nextElement],
    })
    return nextElement.id
  }

  const updateSpecialElement = (
    id: string,
    patch: SpecialElementPatch,
  ): boolean => {
    const current = config.value.specialElements.find(
      (element) => element.id === id,
    )
    if (current === undefined) {
      return false
    }

    const normalized = normalizeSpecialElements([
      {
        ...current,
        position: patch.position ?? current.position,
        rotation: patch.rotation ?? current.rotation,
        dimensions: {
          ...current.dimensions,
          ...patch.dimensions,
        },
      },
    ])[0]
    if (
      normalized === undefined ||
      !isSpecialElementPlacementValid(
        config.value,
        normalized,
        config.value.specialElements,
      )
    ) {
      return false
    }

    applyConfig({
      ...config.value,
      specialElements: config.value.specialElements.map((element) =>
        element.id === id ? normalized : element,
      ),
    })
    return true
  }

  const removeSpecialElement = (id: string): void => {
    if (!config.value.specialElements.some((element) => element.id === id)) {
      return
    }

    applyConfig({
      ...config.value,
      specialElements: config.value.specialElements.filter(
        (element) => element.id !== id,
      ),
    })
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

  const replaceWorkspace = (value: unknown): boolean => {
    const parsed = parseTerraceWorkspace(value)
    if (parsed === null) {
      return false
    }

    workspace.value = cloneWorkspace(parsed)
    resetHistoryStacks()
    return true
  }

  const undo = (): void => {
    const undoStack = ensureHistoryStack(
      undoStacks,
      activeAreaId.value,
    )
    const previous = undoStack.pop()
    if (previous === undefined) {
      return
    }

    ensureHistoryStack(redoStacks, activeAreaId.value).push(
      cloneConfig(config.value),
    )
    applyConfig(previous, false)
  }

  const redo = (): void => {
    const redoStack = ensureHistoryStack(
      redoStacks,
      activeAreaId.value,
    )
    const next = redoStack.pop()
    if (next === undefined) {
      return
    }

    ensureHistoryStack(undoStacks, activeAreaId.value).push(
      cloneConfig(config.value),
    )
    applyConfig(next, false)
  }

  const resetConfig = (): void => {
    applyConfig(createDefaultTerraceConfig())
  }

  return {
    workspace,
    areas,
    activeAreaId,
    config,
    areaSquareMeters,
    isSaved,
    canUndo,
    canRedo,
    addArea,
    closeArea,
    selectArea,
    selectShape,
    updateDimension,
    setFreeForm,
    updateFreeFormEdge,
    addSpecialElement,
    updateSpecialElement,
    removeSpecialElement,
    setTexture,
    setBoardDirection,
    setBoardAngle,
    setBoardWidth,
    setBoardGap,
    setBoardOffset,
    setStartEdge,
    replaceConfig,
    replaceWorkspace,
    undo,
    redo,
    resetConfig,
  }
}
