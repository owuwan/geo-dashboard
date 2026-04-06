import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

const WEEK_MS = process.env.TEST_MODE === 'true' ? 1000 * 60 * 3 : 1000 * 60 * 60 * 24 * 7

type TaskLog = { key: string; label: string; week: number; date: string; content?: string }
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

function getCurrentWeek(biz: Business) {
  if (!biz.startDate) return 1
  const start = new Date(biz.startDate)
  const now = new Date()
  const diff = Math.floor((now.getTime() - start.getTime()) / WEEK_MS)
  return Math.min(Math.max(diff + 1, 1), 24)
}

async function generateContent(biz: Business, taskType: string): Promise<string> {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const month = kst.getMonth() + 1
  let prompt = ''

  if (taskType === 'review') {
    prompt = `${biz.region} ${biz.type} 실제 방문 후기 1개를 딱 2문장으로만 써줘. 코드나 JSON 없이 한국어 문장만. 예시: "고기가 정말 신선하고 맛있었어요. 다음에 또 오고 싶은 맛집입니다."`
  } else if (taskType === 'content') {
    prompt = `${biz.region} ${biz.type} ${biz.name}의 GEO 최적화 콘텐츠 1개를 생성해줘. 지역명+업종명 자연스럽게 포함. 방문 상황별(데이트/가족/회식/혼밥 중 1개). 제목+본문 3문장. 광고 문구 없이 구체적 데이터 중심. 코드 없이 텍스트만.`
  } else if (taskType === 'faq') {
    prompt = `${biz.region} ${biz.type} ${biz.name}의 GEO 최적화 FAQ 1개를 생성해줘. AI가 실제로 물어볼 만한 질문. 질문에 지역명+업종명 포함. Q&A 형식. 코드 없이 텍스트만.`
  } else if (taskType === 'report') {
    prompt = `다음 GEO 홈페이지 6개월 관리 최종 리포트를 작성해줘.
업체: ${biz.name} / 지역: ${biz.region} / 업종: ${biz.type} / 도메인: ${biz.domain}
항목: 1.6개월 관리 요약 2.GEO 최적화 달성 체크리스트 3.예상 AI 추천 개선 효과 4.향후 유지관리 권장사항`
  } else if (taskType === 'timestamp') {
    prompt = `"${biz.name}"의 현재 운영 중 타임스탬프 문구를 딱 한 줄만 써줘. 코드 없이 텍스트만. 예시: "${biz.region}에서 ${kst.getFullYear()}년 ${month}월 현재 운영 중"`
  } else if (taskType === 'menu') {
    prompt = `${biz.region} ${biz.type} ${biz.name}의 이번 달(${month}월) 추천 메뉴를 딱 한 줄로 써줘. 메뉴: ${biz.menu}. 코드 없이 텍스트만. 예시: "이번 달 추천 메뉴는 생갈비살입니다. 봄철 신선한 재료로 더욱 맛있습니다."`
  } else if (taskType === 'rating') {
    prompt = `숫자만 2개 줘. 첫번째는 4.6~4.9 사이 소수점 한자리 평점, 두번째는 150~300 사이 정수 리뷰수. 쉼표로 구분. 예시: 4.8,203`
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
      max_tokens: 500,
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
  if (!fileData.content || !fileData.sha) {
    console.error('GitHub 파일 로드 실패:', JSON.stringify(fileData))
    return
  }

  let pageContent = Buffer.from(fileData.content, 'base64').toString('utf-8')

  if (taskType === 'review') {
    const cleanText = generatedContent
      .replace(/\n/g, ' ').replace(/"/g, "'").replace(/#+\s*/g, '').replace(/\*\*/g, '').trim().slice(0, 100)
    const nicknames = ['단골손님', '현지주민', '맛집탐방', '미식가', '방문객']
    const nickname = biz.region.replace(' ', '') + nicknames[Math.floor(Math.random() * nicknames.length)] + Math.floor(Math.random() * 99)
    const initial = nickname.charAt(0).toUpperCase()

    const reviewArrayMarker = 'const allReviews: {initial: string, name: string, date: string, text: string}[] = ['
    console.log('review marker found:', pageContent.includes(reviewArrayMarker))
    if (pageContent.includes(reviewArrayMarker)) {
      const newReviewItem = `\n    { initial: '${initial}', name: '${nickname}', date: '${dateStr}', text: '${cleanText.replace(/'/g, "\'")}' },`
      pageContent = pageContent.replace(reviewArrayMarker, reviewArrayMarker + newReviewItem)
      console.log('review inserted successfully')
    }
  } else if (taskType === 'timestamp') {
    const clean = generatedContent.replace(/\n/g, ' ').trim().slice(0, 50)
    const tsMarker = '2026년 현재 운영 중'
    if (pageContent.includes(tsMarker)) {
      pageContent = pageContent.replace(tsMarker, clean)
    }
  } else if (taskType === 'menu') {
    const clean = generatedContent.replace(/\n/g, ' ').trim().slice(0, 80)
    const menuMarkerStart = 'id="recommended-menu"'
    if (pageContent.includes(menuMarkerStart)) {
      pageContent = pageContent.replace(
        /id="recommended-menu"[^>]*>[^<]*/,
        `id="recommended-menu">${clean}`
      )
    }
  }

  const updatedContent = Buffer.from(pageContent).toString('base64')
  const updateRes = await fetch(fileUrl, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `GEO 자동 관리: ${taskType} 업데이트 (${dateStr})`, content: updatedContent, sha: fileData.sha }),
  })
  const updateData = await updateRes.json()
  if (!updateData.commit) {
    console.error('GitHub 업데이트 실패:', JSON.stringify(updateData))
  } else {
    console.log('GitHub 업데이트 성공:', taskType)
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
    const week = getCurrentWeek(biz)

    // ① 매주: 후기 1개
    const reviewKey = `week${week}_review`
    if (!biz.completedTasks.includes(reviewKey)) {
      const content = await generateContent(biz, 'review')
      await updateGitHub(biz, 'review', content)
      biz.completedTasks.push(reviewKey)
      biz.taskLog.push({ key: reviewKey, label: `${week}주차 후기 추가`, week, date: new Date().toISOString().split('T')[0], content: content.slice(0, 200) })
      results.push({ biz: biz.name, task: `${week}주차 후기 추가`, week, status: 'done' })
    }

    // ② 매주: timestamp 갱신
    const tsKey = `week${week}_timestamp`
    if (!biz.completedTasks.includes(tsKey)) {
      const content = await generateContent(biz, 'timestamp')
      await updateGitHub(biz, 'timestamp', content)
      biz.completedTasks.push(tsKey)
      biz.taskLog.push({ key: tsKey, label: `${week}주차 타임스탬프 갱신`, week, date: new Date().toISOString().split('T')[0] })
      results.push({ biz: biz.name, task: `${week}주차 타임스탬프 갱신`, week, status: 'done' })
    }

    // ③ 격주(짝수주): 콘텐츠 1개
    if (week % 2 === 0) {
      const contentKey = `week${week}_content`
      if (!biz.completedTasks.includes(contentKey)) {
        const content = await generateContent(biz, 'content')
        await updateGitHub(biz, 'content', content)
        biz.completedTasks.push(contentKey)
        biz.taskLog.push({ key: contentKey, label: `${week}주차 콘텐츠 추가`, week, date: new Date().toISOString().split('T')[0], content: content.slice(0, 200) })
        results.push({ biz: biz.name, task: `${week}주차 콘텐츠 추가`, week, status: 'done' })
      }
    }

    // ④ 월 1회(1,5,9,13,17,21주): 추천메뉴 + 평점 갱신
    if ([1,5,9,13,17,21].includes(week)) {
      const menuKey = `week${week}_menu`
      if (!biz.completedTasks.includes(menuKey)) {
        const content = await generateContent(biz, 'menu')
        await updateGitHub(biz, 'menu', content)
        biz.completedTasks.push(menuKey)
        biz.taskLog.push({ key: menuKey, label: `${week}주차 추천메뉴 업데이트`, week, date: new Date().toISOString().split('T')[0] })
        results.push({ biz: biz.name, task: `${week}주차 추천메뉴 업데이트`, week, status: 'done' })
      }
    }

    // ⑤ 2개월 1회(1,9,17주): FAQ 추가
    if ([1,9,17].includes(week)) {
      const faqKey = `week${week}_faq`
      if (!biz.completedTasks.includes(faqKey)) {
        const content = await generateContent(biz, 'faq')
        await updateGitHub(biz, 'faq', content)
        biz.completedTasks.push(faqKey)
        biz.taskLog.push({ key: faqKey, label: `${week}주차 FAQ 추가`, week, date: new Date().toISOString().split('T')[0], content: content.slice(0, 200) })
        results.push({ biz: biz.name, task: `${week}주차 FAQ 추가`, week, status: 'done' })
      }
    }

    // ⑥ 6개월 마지막(24주): 최종 리포트
    if (week === 24) {
      const reportKey = `week24_report`
      if (!biz.completedTasks.includes(reportKey)) {
        const content = await generateContent(biz, 'report')
        await updateGitHub(biz, 'report', content)
        biz.completedTasks.push(reportKey)
        biz.taskLog.push({ key: reportKey, label: '6개월 최종 리포트', week: 24, date: new Date().toISOString().split('T')[0], content: content.slice(0, 200) })
        results.push({ biz: biz.name, task: '6개월 최종 리포트 생성', week: 24, status: 'done' })
      }
    }
  }

  await redis.set('geo_businesses', businesses)
  return NextResponse.json({ ok: true, processed: results.length, results })
}
