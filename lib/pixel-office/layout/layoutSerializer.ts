import { TileType, FurnitureType, DEFAULT_COLS, DEFAULT_ROWS, TILE_SIZE, Direction } from '../types'
import type { TileType as TileTypeVal, OfficeLayout, PlacedFurniture, Seat, FurnitureInstance, FloorColor } from '../types'
import { getCatalogEntry } from './furnitureCatalog'
import { isWalkable } from './tileMap'
import { getColorizedSprite } from '../colorize'

/** Convert flat tile array from layout into 2D grid */
export function layoutToTileMap(layout: OfficeLayout): TileTypeVal[][] {
  const map: TileTypeVal[][] = []
  for (let r = 0; r < layout.rows; r++) {
    const row: TileTypeVal[] = []
    for (let c = 0; c < layout.cols; c++) {
      row.push(layout.tiles[r * layout.cols + c])
    }
    map.push(row)
  }
  return map
}

/** Convert placed furniture into renderable FurnitureInstance[] */
export function layoutToFurnitureInstances(furniture: PlacedFurniture[]): FurnitureInstance[] {
  // Pre-compute desk zY per tile so surface items can sort in front of desks
  const deskZByTile = new Map<string, number>()
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry || !entry.isDesk) continue
    const deskZY = item.row * TILE_SIZE + entry.sprite.length
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const key = `${item.col + dc},${item.row + dr}`
        const prev = deskZByTile.get(key)
        if (prev === undefined || deskZY > prev) deskZByTile.set(key, deskZY)
      }
    }
  }

  const instances: FurnitureInstance[] = []
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry) continue
    const x = item.col * TILE_SIZE
    const y = item.row * TILE_SIZE
    const spriteH = entry.sprite.length
    let zY = y + spriteH

    // Chair z-sorting: ensure characters sitting on chairs render correctly
    if (entry.category === 'chairs') {
      if (entry.orientation === 'back') {
        // Back-facing chairs render IN FRONT of the seated character
        // (the chair back visually occludes the character behind it)
        zY = (item.row + 1) * TILE_SIZE + 1
      } else {
        // All other chairs: cap zY to first row bottom so characters
        // at any seat tile render in front of the chair
        zY = (item.row + 1) * TILE_SIZE
      }
    }

    // Surface items render in front of the desk they sit on
    if (entry.canPlaceOnSurfaces) {
      for (let dr = 0; dr < entry.footprintH; dr++) {
        for (let dc = 0; dc < entry.footprintW; dc++) {
          const key = `${Math.round(item.col + dc)},${Math.round(item.row + dr)}`
          const deskZ = deskZByTile.get(key)
          if (deskZ !== undefined && deskZ + 0.5 > zY) zY = deskZ + 0.5
        }
      }
    }

    let sprite = entry.sprite
    if (item.color) {
      const { h, s, b: bv, c: cv } = item.color
      sprite = getColorizedSprite(`furn-${item.type}-${h}-${s}-${bv}-${cv}-${item.color.colorize ? 1 : 0}`, entry.sprite, item.color)
    }

    instances.push({
      uid: item.uid,
      sprite,
      x,
      y,
      zY,
      ...(entry.emoji ? { emoji: entry.emoji } : {}),
      ...(item.rotation ? { rotation: item.rotation } : {}),
      ...(entry.emojiScale ? { emojiScale: entry.emojiScale } : {}),
    })
  }
  return instances
}

/** Get all tiles blocked by furniture footprints, optionally excluding a set of tiles.
 *  Skips top backgroundTiles rows so characters can walk through them. */
export function getBlockedTiles(furniture: PlacedFurniture[], excludeTiles?: Set<string>): Set<string> {
  const tiles = new Set<string>()
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry) continue
    const bgRows = entry.backgroundTiles || 0
    for (let dr = 0; dr < entry.footprintH; dr++) {
      if (dr < bgRows) continue // skip background rows — characters can walk through
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const key = `${item.col + dc},${item.row + dr}`
        if (excludeTiles && excludeTiles.has(key)) continue
        tiles.add(key)
      }
    }
  }
  return tiles
}

/** Get tiles blocked for placement purposes — skips top backgroundTiles rows per item */
export function getPlacementBlockedTiles(furniture: PlacedFurniture[], excludeUid?: string): Set<string> {
  const tiles = new Set<string>()
  for (const item of furniture) {
    if (item.uid === excludeUid) continue
    const entry = getCatalogEntry(item.type)
    if (!entry) continue
    const bgRows = entry.backgroundTiles || 0
    for (let dr = 0; dr < entry.footprintH; dr++) {
      if (dr < bgRows) continue // skip background rows
      for (let dc = 0; dc < entry.footprintW; dc++) {
        tiles.add(`${item.col + dc},${item.row + dr}`)
      }
    }
  }
  return tiles
}

/** Map chair orientation to character facing direction */
function orientationToFacing(orientation: string): Direction {
  switch (orientation) {
    case 'front': return Direction.DOWN
    case 'back': return Direction.UP
    case 'left': return Direction.LEFT
    case 'right': return Direction.RIGHT
    default: return Direction.DOWN
  }
}

/** Generate seats from chair furniture.
 *  Facing priority: 1) chair orientation, 2) adjacent desk, 3) forward (DOWN). */
export function layoutToSeats(furniture: PlacedFurniture[]): Map<string, Seat> {
  const seats = new Map<string, Seat>()

  // Build set of all desk tiles
  const deskTiles = new Set<string>()
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry || !entry.isDesk) continue
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        deskTiles.add(`${item.col + dc},${item.row + dr}`)
      }
    }
  }

  const dirs: Array<{ dc: number; dr: number; facing: Direction }> = [
    { dc: 0, dr: -1, facing: Direction.UP },    // desk is above chair → face UP
    { dc: 0, dr: 1, facing: Direction.DOWN },   // desk is below chair → face DOWN
    { dc: -1, dr: 0, facing: Direction.LEFT },   // desk is left of chair → face LEFT
    { dc: 1, dr: 0, facing: Direction.RIGHT },   // desk is right of chair → face RIGHT
  ]

  // For each chair, every footprint tile becomes a seat.
  // Multi-tile chairs (e.g. 2-tile couches) produce multiple seats.
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry || entry.category !== 'chairs') continue

    let seatCount = 0
    for (let dr = 0; dr < entry.footprintH; dr++) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const tileCol = item.col + dc
        const tileRow = item.row + dr

        // Determine facing direction:
        // 1) Chair orientation takes priority
        // 2) Adjacent desk direction (use rounded coords for grid lookup)
        // 3) Default forward (DOWN)
        let facingDir: Direction = Direction.DOWN
        const roundedCol = Math.round(tileCol)
        const roundedRow = Math.round(tileRow)
        if (item.uid.startsWith('stool-r')) {
          facingDir = Direction.LEFT
        } else if (entry.orientation) {
          facingDir = orientationToFacing(entry.orientation)
        } else {
          for (const d of dirs) {
            if (deskTiles.has(`${roundedCol + d.dc},${roundedRow + d.dr}`)) {
              facingDir = d.facing
              break
            }
          }
        }

        // First seat uses chair uid (backward compat), subsequent use uid:N
        const seatUid = seatCount === 0 ? item.uid : `${item.uid}:${seatCount}`
        seats.set(seatUid, {
          uid: seatUid,
          seatCol: tileCol,
          seatRow: tileRow,
          facingDir,
          assigned: false,
        })
        seatCount++
      }
    }
  }

  return seats
}

/** Get the set of tiles occupied by seats (so they can be excluded from blocked tiles) */
export function getSeatTiles(seats: Map<string, Seat>): Set<string> {
  const tiles = new Set<string>()
  for (const seat of seats.values()) {
    tiles.add(`${Math.round(seat.seatCol)},${Math.round(seat.seatRow)}`)
  }
  return tiles
}

/** Batcave palette */
const BATCAVE_WALL_COLOR: FloorColor = { h: 220, s: 20, b: -42, c: 18, colorize: true }
const COMMAND_PLATFORM_COLOR: FloorColor = { h: 218, s: 28, b: -16, c: 18, colorize: true }
const ARMORY_FLOOR_COLOR: FloorColor = { h: 30, s: 22, b: -18, c: 14, colorize: true }
const TACTICAL_PLATFORM_COLOR: FloorColor = { h: 46, s: 58, b: -8, c: 8, colorize: true }
const CATWALK_COLOR: FloorColor = { h: 218, s: 12, b: -6, c: 10, colorize: true }
const CAVE_FLOOR_COLOR: FloorColor = { h: 210, s: 26, b: -10, c: 18, colorize: true }
const DATA_CORE_COLOR: FloorColor = { h: 196, s: 44, b: -6, c: 12, colorize: true }
const CONSOLE_TINT: FloorColor = { h: 220, s: 24, b: -18, c: 16 }
const STORAGE_TINT: FloorColor = { h: 212, s: 10, b: -4, c: 12 }
const ORACLE_GLOW_TINT: FloorColor = { h: 258, s: 42, b: -10, c: 18 }
const LUCIUS_BENCH_TINT: FloorColor = { h: 202, s: 18, b: -14, c: 16 }

function shouldRemoveRightOfficeLegacyItems(item: PlacedFurniture): boolean {
  if (item.uid.startsWith('stool-r')) return true
  if (item.uid === 'plant-r1' || item.uid === 'lamp-r' || item.uid === 'cooler-r') return true
  if (item.type === FurnitureType.PLANT && item.col === 19 && item.row === 3) return true
  if (item.type === FurnitureType.LAMP && item.col === 19 && item.row === 7) return true
  if (item.type === FurnitureType.COOLER && item.col === 18 && item.row === 7) return true
  return false
}

function normalizeRightOfficeFurniture(furniture: PlacedFurniture[]): PlacedFurniture[] {
  return furniture.filter((item) => !shouldRemoveRightOfficeLegacyItems(item))
}

/** Create the default batcave layout — 21×17 command center */
export function createDefaultLayout(): OfficeLayout {
  const W = TileType.WALL
  const F1 = TileType.FLOOR_1
  const F2 = TileType.FLOOR_2
  const F3 = TileType.FLOOR_3
  const F4 = TileType.FLOOR_4

  const cols = DEFAULT_COLS
  const rows = DEFAULT_ROWS
  const tiles: TileTypeVal[] = []
  const tileColors: Array<FloorColor | null> = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        tiles.push(W); tileColors.push(BATCAVE_WALL_COLOR); continue
      }
      if (c === 10 && r <= 9) {
        if (r >= 4 && r <= 6) {
          tiles.push(F4); tileColors.push(CATWALK_COLOR)
        } else {
          tiles.push(W); tileColors.push(BATCAVE_WALL_COLOR)
        }
        continue
      }
      if (r === 10) {
        if ((c >= 4 && c <= 6) || (c >= 14 && c <= 16)) {
          tiles.push(F4); tileColors.push(CATWALK_COLOR)
        } else {
          tiles.push(W); tileColors.push(BATCAVE_WALL_COLOR)
        }
        continue
      }
      if (r < 10) {
        if (c < 10) {
          tiles.push(F1); tileColors.push(COMMAND_PLATFORM_COLOR)
        } else if (c >= 12 && c <= 16 && r >= 3 && r <= 6) {
          tiles.push(F3); tileColors.push(TACTICAL_PLATFORM_COLOR)
        } else {
          tiles.push(F2); tileColors.push(ARMORY_FLOOR_COLOR)
        }
        continue
      }
      if (c >= 7 && c <= 13 && r >= 12 && r <= 15) {
        tiles.push(F3); tileColors.push(DATA_CORE_COLOR)
      } else {
        tiles.push(F1); tileColors.push(CAVE_FLOOR_COLOR)
      }
    }
  }

  const furniture: PlacedFurniture[] = [
    // Left command deck
    { uid: 'cmd-panel-left', type: FurnitureType.BATSIGNAL_PANEL, col: 3, row: 0 },
    { uid: 'cmd-console-1', type: FurnitureType.COMMAND_CONSOLE, col: 2, row: 3, color: CONSOLE_TINT },
    { uid: 'cmd-seat-1', type: FurnitureType.BENCH, col: 2.5, row: 2 },
    { uid: 'cmd-console-2', type: FurnitureType.COMMAND_CONSOLE, col: 5, row: 3, color: CONSOLE_TINT },
    { uid: 'cmd-seat-2', type: FurnitureType.BENCH, col: 5.5, row: 2 },
    { uid: 'cmd-console-3', type: FurnitureType.COMMAND_CONSOLE, col: 2, row: 6, color: CONSOLE_TINT },
    { uid: 'cmd-seat-3', type: FurnitureType.BENCH, col: 2.5, row: 7 },
    { uid: 'cmd-console-4', type: FurnitureType.COMMAND_CONSOLE, col: 5, row: 6, color: CONSOLE_TINT },
    { uid: 'cmd-seat-4', type: FurnitureType.BENCH, col: 5.5, row: 7 },
    { uid: 'oracle-terminal', type: FurnitureType.ORACLE_TERMINAL, col: 7, row: 3, color: ORACLE_GLOW_TINT },
    { uid: 'oracle-seat', type: FurnitureType.CHAIR, col: 7, row: 2 },
    { uid: 'cmd-pc-1', type: FurnitureType.PC, col: 2.5, row: 2.75, rotation: 180 },
    { uid: 'cmd-pc-2', type: FurnitureType.PC, col: 5.5, row: 2.75, rotation: 180 },
    { uid: 'cmd-pc-3', type: FurnitureType.PC, col: 2.5, row: 5.5 },
    { uid: 'cmd-pc-4', type: FurnitureType.PC, col: 5.5, row: 5.5 },
    { uid: 'oracle-pc-left', type: FurnitureType.PC, col: 7.25, row: 2.75, rotation: 180 },
    { uid: 'oracle-pc-right', type: FurnitureType.PC, col: 8.1, row: 2.75, rotation: 180 },
    { uid: 'cmd-phone', type: FurnitureType.PHONE, col: 6.2, row: 5.75 },
    { uid: 'cmd-coffee', type: FurnitureType.COFFEE, col: 3.2, row: 5.75 },

    // Armory + strategy bay
    { uid: 'suit-left', type: FurnitureType.BATSUIT_DISPLAY, col: 12, row: 0 },
    { uid: 'signal-panel-right', type: FurnitureType.BATSIGNAL_PANEL, col: 14, row: 0 },
    { uid: 'trophy-top', type: FurnitureType.TROPHY_CASE, col: 17, row: 0 },
    { uid: 'suit-right', type: FurnitureType.BATSUIT_DISPLAY, col: 19, row: 0 },
    { uid: 'holo-table', type: FurnitureType.HOLO_TABLE, col: 13, row: 3 },
    { uid: 'holo-seat-top', type: FurnitureType.CHAIR, col: 13, row: 2 },
    { uid: 'holo-seat-bottom', type: FurnitureType.CHAIR, col: 14, row: 5 },
    { uid: 'holo-seat-left', type: FurnitureType.CHAIR, col: 12, row: 4 },
    { uid: 'holo-seat-right', type: FurnitureType.CHAIR, col: 15, row: 3 },
    { uid: 'training-dummy', type: FurnitureType.TRAINING_DUMMY, col: 18, row: 4 },
    { uid: 'armory-shelf', type: FurnitureType.BOOKSHELF, col: 18, row: 7, color: STORAGE_TINT },
    { uid: 'armory-lamp', type: FurnitureType.LAMP, col: 17, row: 8 },
    { uid: 'armory-bench', type: FurnitureType.BENCH, col: 16, row: 9 },

    // Lower cave floor
    { uid: 'server-b-left', type: FurnitureType.SERVER_RACK, col: 1, row: 12 },
    { uid: 'server-b-right', type: FurnitureType.SERVER_RACK, col: 3, row: 12 },
    { uid: 'batcomputer-main', type: FurnitureType.BATCOMPUTER, col: 8, row: 12 },
    { uid: 'bat-seat-left', type: FurnitureType.BENCH, col: 8.5, row: 15 },
    { uid: 'bat-seat-right', type: FurnitureType.BENCH, col: 10.5, row: 15 },
    { uid: 'bat-lamp-left', type: FurnitureType.LAMP, col: 7, row: 14 },
    { uid: 'bat-lamp-right', type: FurnitureType.LAMP, col: 13, row: 14 },
    { uid: 'trophy-lower', type: FurnitureType.TROPHY_CASE, col: 14, row: 11 },
    { uid: 'lower-signal', type: FurnitureType.BATSIGNAL_PANEL, col: 14, row: 10 },
    { uid: 'vault-lower', type: FurnitureType.BATSUIT_DISPLAY, col: 19, row: 10 },
    { uid: 'lucius-bench', type: FurnitureType.GADGET_BENCH, col: 13, row: 14, color: LUCIUS_BENCH_TINT },
    { uid: 'lucius-seat', type: FurnitureType.CHAIR, col: 13, row: 15 },
    { uid: 'alfred-station', type: FurnitureType.ALFRED_STATION, col: 16, row: 13 },
    { uid: 'gear-shelf-lower', type: FurnitureType.BOOKSHELF, col: 18, row: 12, color: STORAGE_TINT },
    { uid: 'small-plant', type: FurnitureType.PLANT_SMALL, col: 19, row: 14 },
  ]

  return { version: 1, cols, rows, tiles, tileColors, furniture }
}

/** Serialize layout to JSON string */
export function serializeLayout(layout: OfficeLayout): string {
  return JSON.stringify(layout)
}

/** Deserialize layout from JSON string, migrating old tile types if needed */
export function deserializeLayout(json: string): OfficeLayout | null {
  try {
    const obj = JSON.parse(json)
    if (obj && obj.version === 1 && Array.isArray(obj.tiles) && Array.isArray(obj.furniture)) {
      return migrateLayout(obj as OfficeLayout)
    }
  } catch { /* ignore parse errors */ }
  return null
}

/**
 * Ensure layout has tileColors. If missing, generate defaults based on tile types.
 * Exported for use by message handlers that receive layouts over the wire.
 */
export function migrateLayoutColors(layout: OfficeLayout): OfficeLayout {
  return migrateLayout(layout)
}

/**
 * Migrate old layouts that use legacy tile types (TILE_FLOOR=1, WOOD_FLOOR=2, CARPET=3, DOORWAY=4)
 * to the new pattern-based system. If tileColors is already present, no migration needed.
 */
function migrateLayout(layout: OfficeLayout): OfficeLayout {
  if (layout.tileColors && layout.tileColors.length === layout.tiles.length) {
    const furniture = normalizeRightOfficeFurniture(layout.furniture)
    const furnitureChanged =
      furniture.length !== layout.furniture.length ||
      furniture.some((item, index) => item !== layout.furniture[index])
    if (!furnitureChanged) return layout
    return { ...layout, furniture }
  }

  // Check if any tiles use old values (1-4) — these map directly to FLOOR_1-4
  // but need color assignments
  const tileColors: Array<FloorColor | null> = []
  for (const tile of layout.tiles) {
    switch (tile) {
      case 0: // WALL
        tileColors.push(BATCAVE_WALL_COLOR)
        break
      case 1:
        tileColors.push(COMMAND_PLATFORM_COLOR)
        break
      case 2:
        tileColors.push(ARMORY_FLOOR_COLOR)
        break
      case 3:
        tileColors.push(TACTICAL_PLATFORM_COLOR)
        break
      case 4:
        tileColors.push(CATWALK_COLOR)
        break
      default:
        tileColors.push(tile > 0 ? CAVE_FLOOR_COLOR : BATCAVE_WALL_COLOR)
    }
  }

  const furniture = normalizeRightOfficeFurniture(layout.furniture)
  return { ...layout, tileColors, furniture }
}

// ── Interaction Points ──────────────────────────────────────────

export interface InteractionPoint {
  col: number
  row: number
  facingDir: Direction
  furnitureType: string
}

/** Furniture types that idle characters can interact with */
const INTERACTABLE_TYPES = new Set([
  FurnitureType.COOLER, FurnitureType.WATER_COOLER,
  FurnitureType.BOOKSHELF, FurnitureType.LIBRARY_GRAY_FULL,
  FurnitureType.WHITEBOARD, FurnitureType.FRIDGE,
  FurnitureType.DECO_3,
  FurnitureType.TROPHY_CASE, FurnitureType.BATSUIT_DISPLAY,
  FurnitureType.BATSIGNAL_PANEL, FurnitureType.BATCOMPUTER,
  FurnitureType.HOLO_TABLE,
  FurnitureType.ORACLE_TERMINAL, FurnitureType.ALFRED_STATION,
  FurnitureType.TRAINING_DUMMY, FurnitureType.GADGET_BENCH,
])

/** Get interaction points adjacent to interactable furniture */
export function getInteractionPoints(
  furniture: PlacedFurniture[], tileMap: TileTypeVal[][], blockedTiles: Set<string>,
): InteractionPoint[] {
  const points: InteractionPoint[] = []
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type)
    if (!entry || !INTERACTABLE_TYPES.has(item.type as any)) continue
    // Check tiles along the bottom edge + 1 row below the furniture
    for (let dc = 0; dc < entry.footprintW; dc++) {
      const belowCol = Math.round(item.col + dc)
      const belowRow = Math.round(item.row + entry.footprintH)
      if (isWalkable(belowCol, belowRow, tileMap, blockedTiles)) {
        points.push({ col: belowCol, row: belowRow, facingDir: Direction.UP, furnitureType: item.type })
      }
    }
    // Check tiles along the left edge
    for (let dr = 0; dr < entry.footprintH; dr++) {
      const leftCol = Math.round(item.col - 1)
      const leftRow = Math.round(item.row + dr)
      if (isWalkable(leftCol, leftRow, tileMap, blockedTiles)) {
        points.push({ col: leftCol, row: leftRow, facingDir: Direction.RIGHT, furnitureType: item.type })
      }
    }
    // Check tiles along the right edge
    for (let dr = 0; dr < entry.footprintH; dr++) {
      const rightCol = Math.round(item.col + entry.footprintW)
      const rightRow = Math.round(item.row + dr)
      if (isWalkable(rightCol, rightRow, tileMap, blockedTiles)) {
        points.push({ col: rightCol, row: rightRow, facingDir: Direction.LEFT, furnitureType: item.type })
      }
    }
  }

  // Photograph interaction points — idle characters can stop to admire it (row 1, facing up)
  // Avoid cols 15-16 which overlap with whiteboard-r interaction points
  // Duplicate points to increase weight in the random selection pool
  for (let c = 12; c <= 14; c++) {
    if (isWalkable(c, 1, tileMap, blockedTiles)) {
      points.push({ col: c, row: 1, facingDir: Direction.UP, furnitureType: 'photograph' })
      points.push({ col: c, row: 1, facingDir: Direction.UP, furnitureType: 'photograph' })
    }
  }

  return points
}

// ── Doorway Tiles ───────────────────────────────────────────────

/** Find all doorway (FLOOR_4) tiles in the layout */
export function getDoorwayTiles(layout: OfficeLayout): Array<{ col: number; row: number }> {
  const tiles: Array<{ col: number; row: number }> = []
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      if (layout.tiles[r * layout.cols + c] === TileType.FLOOR_4) {
        tiles.push({ col: c, row: r })
      }
    }
  }
  return tiles
}
