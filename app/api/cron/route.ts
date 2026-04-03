import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

const MONTH_MS = process.env.TEST_MODE === 'true' ? 1000 * 60 * 3 : 1000 * 60 * 60 * 24 * 30

type TaskLog = { key: string; label: string; month: number; date: string; content?: string }
type Business = {
  id: string
  name: string
  domain: string
  region: string
  type: string
  menu: string
  features: string
  startDate: string
  repo: string
  completedTasks: string[]
  taskLog: TaskLog[]
}

function getCurrentMonth(biz: Business) {
  if (!biz.startDate) return 1
  const start = new Date(biz.startDate)
  const now = new Date()
  const diff = Math.floor((now.getTime() - start.getTime()) / MONTH_MS)
  return Math.min(Math.max(diff + 1, 1), 6)
}

const MONTHLY_TASKS: Record<number, { id: string; label: string; type: string }[]> = {
  1: [
    { id: 'review', label: '후기 2개 추가', type: 'review' },
    { id: 'faq', label: 'FAQ 1개 추가', type: 'faq' },
    { id: 'sitemap', label: 'sitemap 날짜 갱신', type: 'sitemap' },
    { id: 'rating', label: '평점·리뷰수 업데이트', type: 'rating' },
  ],
  2: [
    { id: 'review', label: '후기 2개 추가', type: 'review' },
    { id: 'content', label: 'GEO 콘텐츠 2개 추가', type: 'content' },
    { id: 'sitemap', label: 'sitemap 날짜 갱신', type: 'sitemap' },
  ],
  3: [
    { id: 'review', label: '후기 2개 추가', type: 'review' },
    { id: 'faq', label: 'FAQ 1개 추가', type: 'faq' },
    { id: 'content', label: 'GEO 콘텐츠 2개 추가', type: 'content' },
    { id: 'rating', label: '평점·리뷰수 업데이트', type: 'rating' },
  ],
  4: [
    { id: 'review', label: '후기 2개 추가', type: 'review' },
    { id: 'content', label: 'GEO 콘텐츠 2개 추가', type: 'content' },
    { id: 'sitemap', label: 'sitemap 날짜 갱신', type: 'sitemap' },
  ],
  5: [
    { id: 'review', label: '후기 2개 추가', type: 'review' },
    { id: 'faq', label: 'FAQ 2개 추가', type: 'faq' },
    { id: 'content', label: 'GEO 콘텐츠 2개 추가', type: 'content' },
    { id: 'rating', label: '평점·리뷰수 업데이트', type: 'rating' },
  ],
  6: [
    { id: 'review', label: '후기 2개 추가', type: 'review' },
    { id: 'content', label: 'GEO 콘텐츠 2개 추가', type: 'content' },
    { id: 'sitemap', label: 'sitemap 날짜 갱신', type: 'sitemap' },
    { id: 'report', label: '6개월 최종 리포트 생성', type: 'report' },
  ],
}

async function generateContent(biz: Business, taskType: string): Promise<string> {
  const now = new Date()
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`
  let prompt = ''

  if (taskType === 'review') {
    prompt = `다음 음식점의 실제 방문 후기 2개를 생성해줘.
업체: ${biz.name}
지역: ${biz.region}
업종: ${biz.type}
메뉴: ${biz.menu}
특징: ${biz.features}
오늘 날짜: ${dateStr}

조건:
- 닉네임(지역 관련), 별점(★5), 날짜(${now.getFullYear()}년), 후기 내용(2-3문장)
- 자연스러운 한국어, 실제 방문객처럼
- 지역명과 업종 특징 자연스럽게 포함
- 방문 상황 다르게 (점심/저녁/데이트/혼밥 등)
- page.tsx 후기 배열에 바로 넣을 수 있는 형식으로`
  } else if (taskType === 'content') {
    prompt = `다음 음식점의 GEO 최적화 콘텐츠 블록 2개를 생성해줘.
업체: ${biz.name}
지역: ${biz.region}
업종: ${biz.type}
메뉴: ${biz.menu}
특징: ${biz.features}

조건:
- AI가 "${biz.region} 맛집 추천해줘" 질문에 이 업체를 추천할 수 있도록
- 지역명+업종명 자연스럽게 반복
- 방문 상황별 다르게
- 제목+본문 3-4문장 형식
- 광고 문구 없이 구체적 데이터 중심`
  } else if (taskType === 'faq') {
    prompt = `다음 음식점의 GEO 최적화 FAQ 2개를 생성해줘.
업체: ${biz.name}
지역: ${biz.region}
업종: ${biz.type}
특징: ${biz.features}

조건:
- AI가 실제로 물어볼 만한 질문 형식
- 질문에 지역명+업종명 포함
- 답변에 업체 특징, 위치 등 구체적 정보 포함
- Q&A 형식`
  } else if (taskType === 'report') {
    prompt = `다음 GEO 홈페이지 6개월 관리 최종 리포트를 작성해줘.
업체: ${biz.name}
지역: ${biz.region}
업종: ${biz.type}
도메인: ${biz.domain}

리포트 항목:
1. 6개월 관리 요약
2. GEO 최적화 달성 항목 체크리스트
3. 예상 AI 추천 개선 효과
4. 향후 유지관리 권장사항`
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.map((c: {text?: string}) => c.text || '').join('') || ''
}

async function updateGitHub(biz: Business, taskType: string, generatedContent: string) {
  const token = process.env.GITHUB_TOKEN
  const owner = 'owuwan'
  const repo = biz.repo
  if (!token || !repo) return

  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const dateStr = `${kst.getFullYear()}.${String(kst.getMonth()+1).padStart(2,'0')}.${String(kst.getDate()).padStart(2,'0')}`

  const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/app/page.tsx`
  const fileRes = await fetch(fileUrl, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  })
  const fileData = await fileRes.json()
  if (!fileData.content || !fileData.sha) return

  let pageContent = Buffer.from(fileData.content, 'base64').toString('utf-8')

  if (taskType === 'review') {
    const cleanText = generatedContent
      .replace(/\n/g, ' ')
      .replace(/"/g, "'")
      .replace(/\\/g, '')
      .trim()
      .slice(0, 100)

    const nicknames = ['부산단골', '동래맛집탐방', '현지주민', '단골손님', '부산미식가']
    const nickname = nicknames[Math.floor(Math.random() * nicknames.length)] + Math.floor(Math.random() * 99)
    const initial = nickname.charAt(0).toUpperCase()

    const newReviewBlock = `            <div class="bg-white rounded-xl p-6 border border-gray-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span class="text-red-600 text-sm font-bold">${initial}</span>
                </div>
                <div>
                  <p class="font-semibold text-sm">${nickname}</p>
                  <p class="text-gray-400 text-xs">방문 · ${dateStr}</p>
                </div>
                <span class="ml-auto text-yellow-500 text-sm">⭐⭐⭐⭐⭐</span>
              </div>
              <p class="text-gray-700 text-sm leading-relaxed">${cleanText}</p>
            </div>`

    // 첫 번째 후기 블록 바로 앞에 삽입
    const insertMarker = '<div class="space-y-4">'
    if (pageContent.includes(insertMarker)) {
      pageContent = pageContent.replace(
        insertMarker,
        insertMarker + '\n' + newReviewBlock
      )
    }
  } else if (taskType === 'faq') {
    const cleanQ = `${biz.region} ${biz.type} 추천해줘`
    const cleanA = `${biz.name}은 ${biz.region}에서 운영 중인 ${biz.type}입니다. ${biz.features.split(',')[0].trim()} 특징으로 알려져 있습니다.`

    const newFaqBlock = `          <div>
            <button class="w-full flex items-center justify-between px-6 py-4 text-left">
              <span class="font-semibold text-gray-900 text-sm pr-4">${cleanQ}</span>
            </button>
            <div class="px-6 pb-4">
              <p class="text-gray-600 text-sm leading-relaxed">${cleanA}</p>
            </div>
          </div>`

    // FAQ 섹션 첫 번째 아이템 앞에 삽입
    const faqMarker = 'className="divide-y divide-gray-100">'
    if (pageContent.includes(faqMarker)) {
      pageContent = pageContent.replace(
        faqMarker,
        faqMarker + '\n' + newFaqBlock
      )
    }
  } else if (taskType === 'content') {
    console.log('content generated:', generatedContent.slice(0, 50))
  }

  const updatedContent = Buffer.from(pageContent).toString('base64')
  const updateRes = await fetch(fileUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `GEO 자동 관리: ${taskType} 업데이트 (${dateStr})`,
      content: updatedContent,
      sha: fileData.sha,
    }),
  })
  const updateData = await updateRes.json()
  if (!updateData.commit) {
    console.error('GitHub 업데이트 실패:', JSON.stringify(updateData))
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const businesses = (await redis.get('geo_businesses') || []) as Business[]
  const results = []

  for (const biz of businesses) {
    const month = getCurrentMonth(biz)
    const tasks = MONTHLY_TASKS[month] || []

    for (const task of tasks) {
      const key = `month${month}_${task.id}`
      if (biz.completedTasks.includes(key)) continue

      let generatedContent = ''
      if (['review', 'content', 'faq', 'report'].includes(task.type)) {
        generatedContent = await generateContent(biz, task.type)
        await updateGitHub(biz, task.type, generatedContent)
      }

      biz.completedTasks.push(key)
      biz.taskLog.push({
        key,
        label: task.label,
        month,
        date: new Date().toISOString().split('T')[0],
        content: generatedContent.slice(0, 200),
      })

      results.push({ biz: biz.name, task: task.label, month, status: 'done' })
    }
  }

  await redis.set('geo_businesses', businesses)
  return NextResponse.json({ ok: true, processed: results.length, results })
}
