import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.GITHUB_TOKEN
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  // Anthropic API 직접 테스트
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: '부산 동래구 고깃집 방문 후기 1개만 2문장으로 써줘' }],
    }),
  })
  const data = await res.json()
  const text = data.content?.map((c: {text?: string}) => c.text || '').join('') || ''

  return NextResponse.json({
    hasGithubToken: !!token,
    hasAnthropicKey: !!anthropicKey,
    generatedText: text,
    rawResponse: data.content?.[0],
  })
}
