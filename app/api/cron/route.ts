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
  lastReviewDate?: string
  nextReviewDays?: number
  lastTimestampDate?: string
  lastMenuDate?: string
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

const WEEKLY_TASKS = [
  { id: 'timestamp', label: '날짜 타임스탬프 갱신', type: 'timestamp' },
]

const MONTHLY_FIRST_TASKS = [
  { id: 'menu', label: '이번 달 추천 메뉴 업데이트', type: 'menu' },
]

async function generateContent(biz: Business, taskType: string): Promise<string> {
  const now = new Date()
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`
  let prompt = ''

  if (taskType === 'review') {
    prompt = `${biz.region} ${biz.type} 실제 방문 후기 1개를 딱 2문장으로만 써줘. 코드나 JSON 없이 한국어 문장만. 예시: "고기가 정말 신선하고 맛있었어요. 다음에 또 오고 싶은 맛집입니다."`
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
  } else if (taskType === 'timestamp') {
    prompt = `아래 업체의 "현재 운영 중" 타임스탬프 문구를 현재 날짜로 업데이트할 새 문구를 딱 한 줄만 써줘. 코드 없이 텍스트만.
업체: ${biz.name}, ${biz.region} ${biz.type}
현재 날짜: ${dateStr}
예시: "${biz.region}에서 ${now.getFullYear()}년 ${now.getMonth()+1}월 현재 운영 중"`
  } else if (taskType === 'menu') {
    prompt = `${biz.region} ${biz.type} ${biz.name}의 이번 달(${now.getMonth()+1}월) 추천 메뉴를 딱 한 줄로 써줘. 메뉴: ${biz.menu}. 코드 없이 텍스트만. 예시: "이번 달 추천 메뉴는 생갈비살입니다. 봄철 신선한 재료로 더욱 맛있습니다."`
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
      .replace(/#+\s*/g, '')
      .replace(/\*\*/g, '')
      .trim()
      .slice(0, 100)

    const nicknames = ['부산단골', '동래맛집탐방', '현지주민', '단골손님', '부산미식가']
    const nickname = nicknames[Math.floor(Math.random() * nicknames.length)] + Math.floor(Math.random() * 99)
    const initial = nickname.charAt(0).toUpperCase()

    const newReviewBlock = `            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-sm font-bold">${initial}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">${nickname}</p>
                  <p className="text-gray-400 text-xs">방문 · ${dateStr}</p>
                </div>
                <span className="ml-auto text-yellow-500 text-sm">⭐⭐⭐⭐⭐</span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">${cleanText}</p>
            </div>`

    // allReviews 배열에 추가 (페이지네이션용)
    const reviewArrayMarker = 'const allReviews: {initial: string, name: string, date: string, text: string}[] = ['
    console.log('marker found:', pageContent.includes(reviewArrayMarker))
    console.log('cleanText:', cleanText.slice(0, 30))
    if (pageContent.includes(reviewArrayMarker)) {
      const newReviewItem = `\n    { initial: '${initial}', name: '${nickname}', date: '${dateStr}', text: '${cleanText.replace(/'/g, "\'")}' },`
      pageContent = pageContent.replace(
        reviewArrayMarker,
        reviewArrayMarker + newReviewItem
      )
      console.log('inserted review successfully')
    }
  } else if (taskType === 'faq') {
    console.log('faq generated for:', biz.name)
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
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const isFirstWeek = kstNow.getDate() <= 7

  for (const biz of businesses) {
    const month = getCurrentMonth(biz)
    const tasks = MONTHLY_TASKS[month] || []

    // 매주 타임스탬프 갱신
    for (const task of WEEKLY_TASKS) {
      const generatedContent = await generateContent(biz, task.type)
      await updateGitHub(biz, task.type, generatedContent)
      results.push({ biz: biz.name, task: task.label, month, status: 'done' })
    }

    // 매월 첫째주 추천 메뉴 업데이트
    if (isFirstWeek) {
      for (const task of MONTHLY_FIRST_TASKS) {
        const generatedContent = await generateContent(biz, task.type)
        await updateGitHub(biz, task.type, generatedContent)
        results.push({ biz: biz.name, task: task.label, month, status: 'done' })
      }
    }

    for (const task of tasks) {
      const key = `month${month}_${task.id}`
      if (biz.completedTasks.includes(key)) continue

      let generatedContent = ''
      if (task.type === 'review') {
        // 4~6일 랜덤 간격 체크
        const now = new Date()
        const lastReview = biz.lastReviewDate ? new Date(biz.lastReviewDate) : null
        const nextDays = biz.nextReviewDays || Math.floor(Math.random() * 3) + 4 // 4~6일
        const daysSince = lastReview
          ? Math.floor((now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24))
          : 999

        if (MONTH_MS < 1000 * 60 * 60) {
          // 테스트 모드: 간격 체크 스킵
          generatedContent = await generateContent(biz, task.type)
          await updateGitHub(biz, task.type, generatedContent)
          biz.lastReviewDate = now.toISOString()
          biz.nextReviewDays = Math.floor(Math.random() * 3) + 4
        } else if (daysSince >= nextDays) {
          // 실제 운영: 4~6일 지났을 때만 추가
          generatedContent = await generateContent(biz, task.type)
          await updateGitHub(biz, task.type, generatedContent)
          biz.lastReviewDate = now.toISOString()
          biz.nextReviewDays = Math.floor(Math.random() * 3) + 4
        } else {
          results.push({ biz: biz.name, task: task.label, month, status: `skipped (${daysSince}/${nextDays}일)` })
          continue
        }
      } else if (['content', 'faq', 'report'].includes(task.type)) {
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
