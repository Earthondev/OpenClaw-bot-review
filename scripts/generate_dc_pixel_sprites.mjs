#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const FRAME_W = 16
const FRAME_H = 32
const SPRITE_W = 16
const SPRITE_H = 24
const SPRITE_Y_OFFSET = 8
const SHEET_W = FRAME_W * 7
const SHEET_H = FRAME_H * 3
const PREVIEW_SCALE = 5

const projectRoot = path.resolve(import.meta.dirname, '..')
const characterDir = path.join(projectRoot, 'public/assets/pixel-office/characters')
const backupDir = path.join(characterDir, '_originals')
const previewDir = path.join(projectRoot, '.generated-previews')

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c >>> 0
  }
  return table
})()

const DIRECTIONS = ['down', 'up', 'right']
const POSES = ['walk1', 'walk2', 'walk3', 'type1', 'type2', 'read1', 'read2']

const variants = [
  {
    key: 'batman',
    file: 'char_0.png',
    title: 'Batman',
    style: 'batman',
    skin: '#D9B18A',
    skinShade: '#AA7A55',
    outfit: '#1D325F',
    outfitDark: '#0B1223',
    accent: '#8EA9FF',
    belt: '#C79E2B',
    cape: '#0B101A',
    capeShade: '#1C2940',
    boots: '#05070C',
    hair: '#0B101A',
    hairShade: '#1C2940',
  },
  {
    key: 'alfred',
    file: 'char_1.png',
    title: 'Alfred',
    style: 'alfred',
    skin: '#E6C7A7',
    skinShade: '#BB9670',
    outfit: '#2A2F3B',
    outfitDark: '#171B22',
    accent: '#EDF2FA',
    accent2: '#315D9C',
    boots: '#0E1117',
    hair: '#D6D9E1',
    hairShade: '#A8AEB9',
  },
  {
    key: 'oracle',
    file: 'char_2.png',
    title: 'Oracle',
    style: 'oracle',
    skin: '#E5BA94',
    skinShade: '#B9865D',
    outfit: '#5A367C',
    outfitDark: '#2C1A3C',
    accent: '#4CC7AE',
    accent2: '#D4EFFF',
    boots: '#1A1424',
    hair: '#C6572E',
    hairShade: '#7D2F17',
  },
  {
    key: 'nightwing',
    file: 'char_3.png',
    title: 'Nightwing',
    style: 'nightwing',
    skin: '#D8AF8A',
    skinShade: '#A87956',
    outfit: '#10141C',
    outfitDark: '#05080E',
    accent: '#2A8CFF',
    accent2: '#92C8FF',
    boots: '#04060A',
    hair: '#17181C',
    hairShade: '#2F3540',
  },
  {
    key: 'robin',
    file: 'char_4.png',
    title: 'Robin',
    style: 'robin',
    skin: '#E4BA92',
    skinShade: '#B78359',
    outfit: '#C93231',
    outfitDark: '#691B1A',
    accent: '#208A4E',
    accent2: '#E3C23F',
    belt: '#D8B338',
    cape: '#E3C23F',
    capeShade: '#B18921',
    boots: '#0F1218',
    hair: '#141518',
    hairShade: '#262931',
  },
  {
    key: 'lucius',
    file: 'char_5.png',
    title: 'Lucius',
    style: 'lucius',
    skin: '#7A4D34',
    skinShade: '#543320',
    outfit: '#636D7F',
    outfitDark: '#333A47',
    accent: '#F2F6FB',
    accent2: '#8F2134',
    boots: '#171A20',
    hair: '#1D1C1B',
    hairShade: '#3B3734',
  },
]

function createSheet() {
  return Array.from({ length: SHEET_H }, () => Array.from({ length: SHEET_W }, () => null))
}

function setPixel(sheet, x, y, color) {
  if (!color) return
  if (x < 0 || y < 0 || x >= SHEET_W || y >= SHEET_H) return
  sheet[y][x] = color
}

function fillRect(sheet, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPixel(sheet, xx, yy, color)
}

function hLine(sheet, x, y, w, color) {
  fillRect(sheet, x, y, w, 1, color)
}

function vLine(sheet, x, y, h, color) {
  fillRect(sheet, x, y, 1, h, color)
}

function drawCellPixel(sheet, frameIndex, dirIndex, x, y, color) {
  setPixel(sheet, frameIndex * FRAME_W + x, dirIndex * FRAME_H + SPRITE_Y_OFFSET + y, color)
}

function fillCellRect(sheet, frameIndex, dirIndex, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) drawCellPixel(sheet, frameIndex, dirIndex, xx, yy, color)
}

function drawShadow(sheet, frameIndex, dirIndex, variant) {
  const shadow = variant.outfitDark
  hLineProxy(sheet, frameIndex, dirIndex, 5, 22, 6, shadow)
  hLineProxy(sheet, frameIndex, dirIndex, 4, 23, 8, shadow)
}

function hLineProxy(sheet, frameIndex, dirIndex, x, y, w, color) {
  for (let xx = x; xx < x + w; xx++) drawCellPixel(sheet, frameIndex, dirIndex, xx, y, color)
}

function vLineProxy(sheet, frameIndex, dirIndex, x, y, h, color) {
  for (let yy = y; yy < y + h; yy++) drawCellPixel(sheet, frameIndex, dirIndex, x, yy, color)
}

function armPose(pose) {
  const map = {
    walk1: { left: { y: 9, h: 8, x: 3 }, right: { y: 10, h: 7, x: 11 } },
    walk2: { left: { y: 10, h: 7, x: 3 }, right: { y: 10, h: 7, x: 11 } },
    walk3: { left: { y: 10, h: 7, x: 3 }, right: { y: 9, h: 8, x: 11 } },
    type1: { left: { y: 9, h: 6, x: 4 }, right: { y: 9, h: 6, x: 10 } },
    type2: { left: { y: 10, h: 5, x: 4 }, right: { y: 9, h: 6, x: 10 } },
    read1: { left: { y: 10, h: 5, x: 4 }, right: { y: 10, h: 5, x: 10 } },
    read2: { left: { y: 10, h: 5, x: 4 }, right: { y: 10, h: 5, x: 10 } },
  }
  return map[pose]
}

function legPose(pose) {
  const map = {
    walk1: { leftX: 5, leftH: 7, rightX: 9, rightH: 6 },
    walk2: { leftX: 6, leftH: 7, rightX: 8, rightH: 7 },
    walk3: { leftX: 6, leftH: 6, rightX: 8, rightH: 7 },
    type1: { leftX: 6, leftH: 7, rightX: 8, rightH: 7 },
    type2: { leftX: 6, leftH: 7, rightX: 8, rightH: 7 },
    read1: { leftX: 6, leftH: 7, rightX: 8, rightH: 7 },
    read2: { leftX: 6, leftH: 7, rightX: 8, rightH: 7 },
  }
  return map[pose]
}

function drawHeadFront(sheet, frameIndex, variant) {
  const y = 1
  if (variant.style === 'batman') {
    hLineProxy(sheet, frameIndex, 0, 5, y, 2, variant.hair)
    hLineProxy(sheet, frameIndex, 0, 9, y, 2, variant.hair)
    fillCellRect(sheet, frameIndex, 0, 4, y + 1, 8, 3, variant.hair)
    fillCellRect(sheet, frameIndex, 0, 5, y + 4, 6, 2, variant.hair)
    fillCellRect(sheet, frameIndex, 0, 6, y + 4, 4, 2, variant.skin)
    drawCellPixel(sheet, frameIndex, 0, 6, y + 3, '#F5F8FF')
    drawCellPixel(sheet, frameIndex, 0, 9, y + 3, '#F5F8FF')
    return
  }

  fillCellRect(sheet, frameIndex, 0, 5, y + 1, 6, 5, variant.skin)
  fillCellRect(sheet, frameIndex, 0, 5, y, 6, 3, variant.hair)
  drawCellPixel(sheet, frameIndex, 0, 5, y + 3, variant.hairShade)
  drawCellPixel(sheet, frameIndex, 0, 10, y + 3, variant.hairShade)

  if (variant.style === 'alfred') {
    fillCellRect(sheet, frameIndex, 0, 6, y, 4, 2, variant.skin)
    drawCellPixel(sheet, frameIndex, 0, 5, y + 1, variant.hair)
    drawCellPixel(sheet, frameIndex, 0, 10, y + 1, variant.hair)
    drawCellPixel(sheet, frameIndex, 0, 7, y + 5, variant.outfitDark)
    drawCellPixel(sheet, frameIndex, 0, 8, y + 5, variant.outfitDark)
  }

  if (variant.style === 'oracle') {
    fillCellRect(sheet, frameIndex, 0, 4, y + 2, 1, 4, variant.hair)
    fillCellRect(sheet, frameIndex, 0, 11, y + 2, 1, 4, variant.hair)
  }

  if (variant.style === 'robin') {
    hLineProxy(sheet, frameIndex, 0, 6, y + 3, 4, variant.accent)
  }

  if (variant.style === 'lucius') {
    hLineProxy(sheet, frameIndex, 0, 6, y + 3, 4, variant.outfitDark)
  }
}

function drawHeadBack(sheet, frameIndex, variant) {
  const y = 1
  if (variant.style === 'batman') {
    hLineProxy(sheet, frameIndex, 1, 5, y, 2, variant.hair)
    hLineProxy(sheet, frameIndex, 1, 9, y, 2, variant.hair)
    fillCellRect(sheet, frameIndex, 1, 4, y + 1, 8, 5, variant.hair)
    return
  }
  fillCellRect(sheet, frameIndex, 1, 5, y + 1, 6, 5, variant.hair)
  drawCellPixel(sheet, frameIndex, 1, 6, y + 2, variant.hairShade)
  drawCellPixel(sheet, frameIndex, 1, 9, y + 2, variant.hairShade)
  if (variant.style === 'alfred') {
    fillCellRect(sheet, frameIndex, 1, 6, y + 1, 4, 2, variant.skin)
    drawCellPixel(sheet, frameIndex, 1, 5, y + 2, variant.hair)
    drawCellPixel(sheet, frameIndex, 1, 10, y + 2, variant.hair)
  }
  if (variant.style === 'oracle') {
    fillCellRect(sheet, frameIndex, 1, 4, y + 3, 1, 3, variant.hair)
    fillCellRect(sheet, frameIndex, 1, 11, y + 3, 1, 3, variant.hair)
  }
}

function drawHeadSide(sheet, frameIndex, variant) {
  const y = 1
  if (variant.style === 'batman') {
    drawCellPixel(sheet, frameIndex, 2, 7, y, variant.hair)
    drawCellPixel(sheet, frameIndex, 2, 8, y + 1, variant.hair)
    fillCellRect(sheet, frameIndex, 2, 6, y + 1, 4, 4, variant.hair)
    fillCellRect(sheet, frameIndex, 2, 8, y + 3, 2, 2, variant.skin)
    drawCellPixel(sheet, frameIndex, 2, 9, y + 3, '#F5F8FF')
    return
  }
  fillCellRect(sheet, frameIndex, 2, 6, y + 1, 4, 5, variant.skin)
  fillCellRect(sheet, frameIndex, 2, 5, y + 1, 4, 3, variant.hair)
  fillCellRect(sheet, frameIndex, 2, 6, y, 3, 1, variant.hair)
  if (variant.style === 'oracle') fillCellRect(sheet, frameIndex, 2, 5, y + 4, 1, 2, variant.hair)
  if (variant.style === 'alfred') fillCellRect(sheet, frameIndex, 2, 6, y, 2, 1, variant.skin)
  if (variant.style === 'robin') hLineProxy(sheet, frameIndex, 2, 7, y + 3, 2, variant.accent)
  if (variant.style === 'lucius') hLineProxy(sheet, frameIndex, 2, 7, y + 3, 2, variant.outfitDark)
}

function drawTorsoFront(sheet, frameIndex, variant, pose) {
  if (variant.cape) {
    const flare = pose === 'walk1' ? 1 : pose === 'walk3' ? -1 : 0
    fillCellRect(sheet, frameIndex, 0, 3, 8, 10, 8, variant.cape)
    fillCellRect(sheet, frameIndex, 0, 4 + flare, 15, 8, 4, variant.capeShade)
  }

  fillCellRect(sheet, frameIndex, 0, 5, 8, 6, 7, variant.outfit)
  fillCellRect(sheet, frameIndex, 0, 5, 14, 6, 1, variant.outfitDark)

  if (variant.style === 'batman') {
    hLineProxy(sheet, frameIndex, 0, 6, 13, 4, variant.belt)
    drawCellPixel(sheet, frameIndex, 0, 7, 10, variant.accent)
    drawCellPixel(sheet, frameIndex, 0, 8, 9, variant.accent)
    drawCellPixel(sheet, frameIndex, 0, 9, 10, variant.accent)
  } else if (variant.style === 'nightwing') {
    drawCellPixel(sheet, frameIndex, 0, 5, 9, variant.accent)
    drawCellPixel(sheet, frameIndex, 0, 6, 10, variant.accent)
    drawCellPixel(sheet, frameIndex, 0, 7, 11, variant.accent)
    drawCellPixel(sheet, frameIndex, 0, 10, 9, variant.accent)
    drawCellPixel(sheet, frameIndex, 0, 9, 10, variant.accent)
    drawCellPixel(sheet, frameIndex, 0, 8, 11, variant.accent)
  } else if (variant.style === 'robin') {
    fillCellRect(sheet, frameIndex, 0, 5, 8, 6, 1, variant.accent2)
    fillCellRect(sheet, frameIndex, 0, 5, 9, 6, 5, variant.outfit)
    hLineProxy(sheet, frameIndex, 0, 6, 13, 4, variant.belt)
  } else if (variant.style === 'alfred') {
    fillCellRect(sheet, frameIndex, 0, 7, 8, 2, 6, variant.accent)
    fillCellRect(sheet, frameIndex, 0, 8, 9, 1, 4, variant.accent2)
  } else if (variant.style === 'oracle') {
    hLineProxy(sheet, frameIndex, 0, 6, 10, 4, variant.accent)
    hLineProxy(sheet, frameIndex, 0, 6, 13, 4, variant.accent2)
  } else if (variant.style === 'lucius') {
    fillCellRect(sheet, frameIndex, 0, 7, 8, 2, 6, variant.accent)
    fillCellRect(sheet, frameIndex, 0, 8, 9, 1, 4, variant.accent2)
  }
}

function drawTorsoBack(sheet, frameIndex, variant, pose) {
  if (variant.cape) fillCellRect(sheet, frameIndex, 1, 3, 8, 10, 12, variant.cape)
  fillCellRect(sheet, frameIndex, 1, 5, 8, 6, 7, variant.outfit)
  if (variant.style === 'nightwing') hLineProxy(sheet, frameIndex, 1, 6, 10, 4, variant.accent)
  if (variant.style === 'oracle') hLineProxy(sheet, frameIndex, 1, 6, 11, 4, variant.accent)
  if (variant.style === 'robin') fillCellRect(sheet, frameIndex, 1, 4, 8, 8, 2, variant.capeShade)
  if (variant.style === 'batman') fillCellRect(sheet, frameIndex, 1, 4, 8, 8, 3, variant.capeShade)
}

function drawTorsoSide(sheet, frameIndex, variant, pose) {
  if (variant.cape) fillCellRect(sheet, frameIndex, 2, 5, 8, 4, 11, variant.cape)
  fillCellRect(sheet, frameIndex, 2, 7, 8, 4, 7, variant.outfit)
  if (variant.style === 'nightwing') vLineProxy(sheet, frameIndex, 2, 8, 9, 4, variant.accent)
  if (variant.style === 'robin') fillCellRect(sheet, frameIndex, 2, 7, 8, 4, 1, variant.accent2)
  if (variant.style === 'alfred') fillCellRect(sheet, frameIndex, 2, 9, 8, 1, 6, variant.accent)
  if (variant.style === 'oracle') fillCellRect(sheet, frameIndex, 2, 9, 10, 1, 3, variant.accent)
  if (variant.style === 'lucius') fillCellRect(sheet, frameIndex, 2, 9, 8, 1, 6, variant.accent)
}

function drawLimbsFront(sheet, frameIndex, variant, pose) {
  const arms = armPose(pose)
  const legs = legPose(pose)
  const sleeve = variant.style === 'robin' ? variant.accent : variant.outfit
  fillCellRect(sheet, frameIndex, 0, arms.left.x, arms.left.y, 2, arms.left.h, sleeve)
  fillCellRect(sheet, frameIndex, 0, arms.right.x, arms.right.y, 2, arms.right.h, sleeve)
  fillCellRect(sheet, frameIndex, 0, arms.left.x, arms.left.y + arms.left.h - 2, 2, 2, variant.skin)
  fillCellRect(sheet, frameIndex, 0, arms.right.x, arms.right.y + arms.right.h - 2, 2, 2, variant.skin)

  fillCellRect(sheet, frameIndex, 0, legs.leftX, 15, 2, legs.leftH, variant.style === 'robin' ? variant.accent : variant.outfit)
  fillCellRect(sheet, frameIndex, 0, legs.rightX, 15, 2, legs.rightH, variant.style === 'robin' ? variant.accent : variant.outfit)
  fillCellRect(sheet, frameIndex, 0, legs.leftX, 15 + legs.leftH, 2, 2, variant.boots)
  fillCellRect(sheet, frameIndex, 0, legs.rightX, 15 + legs.rightH, 2, 2, variant.boots)

  if (pose.startsWith('read')) fillCellRect(sheet, frameIndex, 0, 6, 13, 4, 3, variant.accent2 ?? '#DCEBFF')
}

function drawLimbsBack(sheet, frameIndex, variant, pose) {
  const arms = armPose(pose)
  fillCellRect(sheet, frameIndex, 1, arms.left.x, arms.left.y, 2, arms.left.h, variant.outfit)
  fillCellRect(sheet, frameIndex, 1, arms.right.x, arms.right.y, 2, arms.right.h, variant.outfit)
  fillCellRect(sheet, frameIndex, 1, 6, 15, 2, 7, variant.style === 'robin' ? variant.accent : variant.outfit)
  fillCellRect(sheet, frameIndex, 1, 8, 15, 2, 7, variant.style === 'robin' ? variant.accent : variant.outfit)
  fillCellRect(sheet, frameIndex, 1, 6, 22, 2, 2, variant.boots)
  fillCellRect(sheet, frameIndex, 1, 8, 22, 2, 2, variant.boots)
}

function drawLimbsSide(sheet, frameIndex, variant, pose) {
  fillCellRect(sheet, frameIndex, 2, 6, 9, 1, 6, variant.outfitDark)
  fillCellRect(sheet, frameIndex, 2, 10, 10, 2, 6, variant.style === 'robin' ? variant.accent : variant.outfit)
  fillCellRect(sheet, frameIndex, 2, 10, 14, 2, 2, variant.skin)
  fillCellRect(sheet, frameIndex, 2, 7, 15, 2, 7, variant.style === 'robin' ? variant.accent : variant.outfit)
  fillCellRect(sheet, frameIndex, 2, 9, 16, 2, 6, variant.style === 'robin' ? variant.accent : variant.outfit)
  fillCellRect(sheet, frameIndex, 2, 7, 22, 2, 2, variant.boots)
  fillCellRect(sheet, frameIndex, 2, 9, 22, 2, 2, variant.boots)
  if (pose.startsWith('read')) fillCellRect(sheet, frameIndex, 2, 10, 13, 3, 3, variant.accent2 ?? '#DCEBFF')
}

function drawFrame(sheet, variant, dir, pose, frameIndex) {
  const dirIndex = DIRECTIONS.indexOf(dir)
  drawShadow(sheet, frameIndex, dirIndex, variant)
  if (dir === 'down') {
    drawHeadFront(sheet, frameIndex, variant)
    drawTorsoFront(sheet, frameIndex, variant, pose)
    drawLimbsFront(sheet, frameIndex, variant, pose)
  } else if (dir === 'up') {
    drawHeadBack(sheet, frameIndex, variant)
    drawTorsoBack(sheet, frameIndex, variant, pose)
    drawLimbsBack(sheet, frameIndex, variant, pose)
  } else {
    drawHeadSide(sheet, frameIndex, variant)
    drawTorsoSide(sheet, frameIndex, variant, pose)
    drawLimbsSide(sheet, frameIndex, variant, pose)
  }
}

function rgba(hex) {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    255,
  ]
}

function encodePng(rows, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    for (let x = 0; x < width; x++) {
      const color = rows[y][x]
      const offset = y * (width * 4 + 1) + 1 + x * 4
      if (!color) {
        raw[offset] = 0
        raw[offset + 1] = 0
        raw[offset + 2] = 0
        raw[offset + 3] = 0
      } else {
        const [r, g, b, a] = rgba(color)
        raw[offset] = r
        raw[offset + 1] = g
        raw[offset + 2] = b
        raw[offset + 3] = a
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const idat = zlib.deflateSync(raw)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function scaleRows(rows, scale) {
  const height = rows.length
  const width = rows[0].length
  const out = Array.from({ length: height * scale }, () => Array.from({ length: width * scale }, () => null))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let yy = 0; yy < scale; yy++) {
        for (let xx = 0; xx < scale; xx++) out[y * scale + yy][x * scale + xx] = rows[y][x]
      }
    }
  }
  return out
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function buildVariantSheet(variant) {
  const sheet = createSheet()
  DIRECTIONS.forEach((dir) => {
    POSES.forEach((pose, frameIndex) => {
      drawFrame(sheet, variant, dir, pose, frameIndex)
    })
  })
  return sheet
}

ensureDir(backupDir)
ensureDir(previewDir)

for (const variant of variants) {
  const target = path.join(characterDir, variant.file)
  const backup = path.join(backupDir, variant.file)
  if (fs.existsSync(target) && !fs.existsSync(backup)) fs.copyFileSync(target, backup)

  const sheet = buildVariantSheet(variant)
  fs.writeFileSync(target, encodePng(sheet, SHEET_W, SHEET_H))

  const preview = scaleRows(sheet, PREVIEW_SCALE)
  fs.writeFileSync(
    path.join(previewDir, variant.file.replace('.png', '-preview.png')),
    encodePng(preview, SHEET_W * PREVIEW_SCALE, SHEET_H * PREVIEW_SCALE),
  )
}

console.log(`Generated ${variants.length} DC-themed pixel character sheets in ${characterDir}`)
