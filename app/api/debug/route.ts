import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.GITHUB_TOKEN
  if (!token) return NextResponse.json({ error: 'GITHUB_TOKEN 없음' })

  // GitHub API 토큰 유효성 확인
  const res = await fetch('https://api.github.com/repos/owuwan/mungtaegi/contents/app/page.tsx', {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  })
  const data = await res.json()

  return NextResponse.json({
    status: res.status,
    hasContent: !!data.content,
    hasSha: !!data.sha,
    message: data.message || 'ok',
    tokenPrefix: token.slice(0, 8) + '...',
  })
}
