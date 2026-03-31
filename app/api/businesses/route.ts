import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const businesses = await redis.get('geo_businesses')
    return NextResponse.json(businesses || [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    await redis.set('geo_businesses', body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
