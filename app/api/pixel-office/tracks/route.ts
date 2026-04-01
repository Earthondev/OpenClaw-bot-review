import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const dir = path.join(process.cwd(), 'public', 'assets', 'pixel-office')
  try {
    const files = fs.readdirSync(dir)
    const mp3s = files
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .sort()
    const preferred = mp3s.filter(f => f.toLowerCase().startsWith('batcave-'))
    const selected = preferred.length > 0 ? preferred : mp3s
    const tracks = selected.map(f => `/assets/pixel-office/${f}`)
    return NextResponse.json({ tracks })
  } catch {
    return NextResponse.json({ tracks: [] })
  }
}
