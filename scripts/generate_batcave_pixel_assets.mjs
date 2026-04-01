#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const rootDir = path.resolve(__dirname, '..')
const assetDir = path.join(rootDir, 'public', 'assets', 'pixel-office')
const previewDir = path.join(rootDir, '.generated-previews')

const wallPath = path.join(assetDir, 'walls.png')
const wallBackupPath = path.join(assetDir, 'walls-original.png')
const photoPath = path.join(assetDir, 'photograph.png')
const legacyPhotoPath = path.join(assetDir, 'photograph.webp')
const photoBackupPath = path.join(assetDir, 'photograph-original.webp')
const wallPreviewPath = path.join(previewDir, 'batcave-wall-sheet.png')
const photoPreviewPath = path.join(previewDir, 'batcave-blueprint-preview.png')

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function backupOnce(sourcePath, backupPath) {
  if (fs.existsSync(sourcePath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(sourcePath, backupPath)
  }
}

function makeCanvas(width, height) {
  return {
    width,
    height,
    data: Buffer.alloc(width * height * 4, 0),
  }
}

function hexToRgba(hex, alpha = 255) {
  const normalized = hex.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    a: alpha,
  }
}

function setPixel(canvas, x, y, hex, alpha = 255) {
  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return
  const { r, g, b, a } = hexToRgba(hex, alpha)
  const offset = (y * canvas.width + x) * 4
  canvas.data[offset] = r
  canvas.data[offset + 1] = g
  canvas.data[offset + 2] = b
  canvas.data[offset + 3] = a
}

function fillRect(canvas, x, y, width, height, hex, alpha = 255) {
  for (let yy = y; yy < y + height; yy++) {
    for (let xx = x; xx < x + width; xx++) {
      setPixel(canvas, xx, yy, hex, alpha)
    }
  }
}

function drawLine(canvas, x1, y1, x2, y2, hex, alpha = 255) {
  const dx = Math.abs(x2 - x1)
  const dy = -Math.abs(y2 - y1)
  const sx = x1 < x2 ? 1 : -1
  const sy = y1 < y2 ? 1 : -1
  let err = dx + dy
  let cx = x1
  let cy = y1
  while (true) {
    setPixel(canvas, cx, cy, hex, alpha)
    if (cx === x2 && cy === y2) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      cx += sx
    }
    if (e2 <= dx) {
      err += dx
      cy += sy
    }
  }
}

function writeRgbaImage(canvas, outputPath, codec = 'png') {
  const tempRawPath = path.join(os.tmpdir(), `batcave-${Date.now()}-${Math.random().toString(36).slice(2)}.rgba`)
  fs.writeFileSync(tempRawPath, canvas.data)
  const args = [
    '-y',
    '-f', 'rawvideo',
    '-pixel_format', 'rgba',
    '-video_size', `${canvas.width}x${canvas.height}`,
    '-i', tempRawPath,
    '-frames:v', '1',
  ]

  if (codec === 'webp') {
    args.push('-c:v', 'libwebp', '-lossless', '1')
  }

  args.push(outputPath)
  execFileSync('ffmpeg', args, { stdio: 'ignore' })
  fs.rmSync(tempRawPath, { force: true })
}

function shadeColor(x, y, mask) {
  const stratum = (y + mask) % 6
  const noise = (x * 11 + y * 7 + mask * 13) % 9
  if (stratum === 0) return '#1f2530'
  if (noise === 0) return '#454b57'
  if (noise === 1 || noise === 2) return '#343943'
  return '#2a3039'
}

function drawRockPiece(canvas, originX, originY, mask) {
  const hasNorth = (mask & 1) !== 0
  const hasEast = (mask & 2) !== 0
  const hasSouth = (mask & 4) !== 0
  const hasWest = (mask & 8) !== 0
  const topProfile = Array.from({ length: 16 }, (_, index) => {
    if (hasNorth) return 0
    const ridge = 7 + ((index * 5 + mask * 3) % 4)
    if (index === 0 || index === 15) return ridge + 1
    if (index % 5 === 0) return ridge - 1
    return ridge
  })

  for (let localX = 0; localX < 16; localX++) {
    const topY = topProfile[localX]
    for (let localY = topY; localY < 32; localY++) {
      setPixel(canvas, originX + localX, originY + localY, shadeColor(localX, localY, mask))
    }

    if (!hasNorth) {
      setPixel(canvas, originX + localX, originY + topY, '#717784')
      if ((localX + mask) % 4 !== 0) {
        setPixel(canvas, originX + localX, originY + topY + 1, '#5a606d')
      }
    } else {
      setPixel(canvas, originX + localX, originY, '#20262f')
      if (localX % 3 === 0) setPixel(canvas, originX + localX, originY + 1, '#4c535f')
    }
  }

  if (!hasWest) {
    for (let localY = topProfile[0]; localY < 32; localY++) {
      setPixel(canvas, originX, originY + localY, '#5e6672')
      if (localY % 3 === 0) setPixel(canvas, originX + 1, originY + localY, '#444b57')
    }
  } else {
    for (let localY = 0; localY < 32; localY++) setPixel(canvas, originX, originY + localY, '#20262f')
  }

  if (!hasEast) {
    for (let localY = topProfile[15]; localY < 32; localY++) {
      setPixel(canvas, originX + 15, originY + localY, '#171c24')
      if (localY % 4 === 0) setPixel(canvas, originX + 14, originY + localY, '#282f39')
    }
  } else {
    for (let localY = 0; localY < 32; localY++) setPixel(canvas, originX + 15, originY + localY, '#20262f')
  }

  for (let crack = 0; crack < 3; crack++) {
    const startX = originX + 2 + ((mask * 3 + crack * 5) % 11)
    const startY = originY + 9 + ((mask * 7 + crack * 4) % 16)
    drawLine(
      canvas,
      startX,
      startY,
      Math.min(originX + 14, startX + (crack % 2 === 0 ? 2 : -2)),
      Math.min(originY + 30, startY + 3 + crack),
      crack === 1 ? '#171c24' : '#4b535e',
    )
  }

  const lightY = hasSouth ? 27 : 29
  for (const lightX of [3, 7, 11]) {
    setPixel(canvas, originX + lightX, originY + lightY, '#d2a440')
    if ((mask + lightX) % 2 === 0) setPixel(canvas, originX + lightX + 1, originY + lightY, '#2fd3ff')
  }

  if (!hasNorth) {
    const center = originX + 7
    setPixel(canvas, center, originY + topProfile[7] - 1, '#d8b04a')
    setPixel(canvas, center + 1, originY + topProfile[8] - 1, '#d8b04a')
  }
}

function generateWallsSheet() {
  const canvas = makeCanvas(64, 128)
  for (let mask = 0; mask < 16; mask++) {
    const originX = (mask % 4) * 16
    const originY = Math.floor(mask / 4) * 32
    drawRockPiece(canvas, originX, originY, mask)
  }
  return canvas
}

function generateBlueprintArt() {
  const canvas = makeCanvas(560, 320)
  fillRect(canvas, 0, 0, canvas.width, canvas.height, '#081018')
  fillRect(canvas, 14, 14, canvas.width - 28, canvas.height - 28, '#0d1621')

  for (let x = 28; x < canvas.width - 28; x += 28) {
    drawLine(canvas, x, 28, x, canvas.height - 28, '#143247')
  }
  for (let y = 28; y < canvas.height - 28; y += 28) {
    drawLine(canvas, 28, y, canvas.width - 28, y, '#143247')
  }

  drawLine(canvas, 70, 90, 190, 90, '#d0a440')
  drawLine(canvas, 190, 90, 230, 130, '#d0a440')
  drawLine(canvas, 230, 130, 280, 130, '#d0a440')
  drawLine(canvas, 280, 130, 320, 90, '#d0a440')
  drawLine(canvas, 320, 90, 450, 90, '#d0a440')
  drawLine(canvas, 110, 200, 180, 150, '#26d2ff')
  drawLine(canvas, 180, 150, 280, 150, '#26d2ff')
  drawLine(canvas, 280, 150, 350, 180, '#26d2ff')
  drawLine(canvas, 350, 180, 430, 220, '#26d2ff')
  drawLine(canvas, 430, 220, 500, 220, '#26d2ff')

  fillRect(canvas, 80, 96, 160, 88, '#0f1f2d')
  fillRect(canvas, 92, 108, 136, 64, '#17354a')
  fillRect(canvas, 320, 112, 144, 84, '#0f1f2d')
  fillRect(canvas, 332, 124, 120, 60, '#17354a')

  for (let i = 0; i < 6; i++) {
    fillRect(canvas, 110 + i * 18, 124, 10, 34, '#26d2ff')
    fillRect(canvas, 352 + i * 16, 138, 8, 30, i % 2 === 0 ? '#d0a440' : '#26d2ff')
  }

  const centerX = 280
  const centerY = 110
  for (let x = -64; x <= 64; x++) {
    const abs = Math.abs(x)
    const y = Math.round((abs * abs) / 64)
    setPixel(canvas, centerX + x, centerY + y, '#d0a440')
    setPixel(canvas, centerX + x, centerY + y + 1, '#d0a440')
  }
  drawLine(canvas, centerX - 60, centerY + 20, centerX - 12, centerY - 6, '#d0a440')
  drawLine(canvas, centerX + 60, centerY + 20, centerX + 12, centerY - 6, '#d0a440')
  drawLine(canvas, centerX - 16, centerY - 4, centerX + 16, centerY - 4, '#d0a440')

  fillRect(canvas, 58, 242, 180, 38, '#102432')
  fillRect(canvas, 322, 232, 170, 48, '#102432')
  drawLine(canvas, 70, 256, 220, 256, '#d0a440')
  drawLine(canvas, 334, 246, 478, 246, '#26d2ff')
  drawLine(canvas, 334, 258, 478, 258, '#26d2ff')

  return canvas
}

function main() {
  ensureDir(assetDir)
  ensureDir(previewDir)
  backupOnce(wallPath, wallBackupPath)
  backupOnce(legacyPhotoPath, photoBackupPath)

  const walls = generateWallsSheet()
  writeRgbaImage(walls, wallPath)
  writeRgbaImage(walls, wallPreviewPath)

  const blueprint = generateBlueprintArt()
  writeRgbaImage(blueprint, photoPath)
  writeRgbaImage(blueprint, photoPreviewPath)

  console.log(`Generated ${wallPath}`)
  console.log(`Generated ${photoPath}`)
}

main()
