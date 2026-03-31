'use client'
import { useState, useEffect } from 'react'

const MONTHLY_PLAN = [
  { month: 1, title: "1개월차 — 기반 다지기", tasks: [
    { id: "review", label: "후기 2개 추가", desc: "최신 날짜 후기 자동 생성", type: "review" },
    { id: "faq", label: "FAQ 1개 추가", desc: "AI 질문 패턴 대응형", type: "faq" },
    { id: "sitemap", label: "sitemap 날짜 갱신", desc: "lastModified 업데이트", type: "sitemap" },
    { id: "rating", label: "평점·리뷰수 업데이트", desc: "aggregateRating 갱신", type: "rating" },
  ]},
  { month: 2, title: "2개월차 — 콘텐츠 확장", tasks: [
    { id: "review", label: "후기 2개 추가", desc: "방문 상황별 후기 생성", type: "review" },
    { id: "content", label: "GEO 콘텐츠 2개 추가", desc: "지역+업종 키워드 콘텐츠", type: "content" },
    { id: "sitemap", label: "sitemap 날짜 갱신", desc: "lastModified 업데이트", type: "sitemap" },
  ]},
  { month: 3, title: "3개월차 — 신뢰도 강화", tasks: [
    { id: "review", label: "후기 2개 추가", desc: "외부 플랫폼 인용 형식", type: "review" },
    { id: "faq", label: "FAQ 1개 추가", desc: "신규 AI 질문 패턴", type: "faq" },
    { id: "content", label: "GEO 콘텐츠 2개 추가", desc: "시즌 키워드 포함", type: "content" },
    { id: "rating", label: "평점·리뷰수 업데이트", desc: "수치 현행화", type: "rating" },
  ]},
  { month: 4, title: "4개월차 — 계절 키워드", tasks: [
    { id: "review", label: "후기 2개 추가", desc: "계절·시즌 방문 후기", type: "review" },
    { id: "content", label: "GEO 콘텐츠 2개 추가", desc: "계절 특화 콘텐츠", type: "content" },
    { id: "sitemap", label: "sitemap 날짜 갱신", desc: "lastModified 업데이트", type: "sitemap" },
  ]},
  { month: 5, title: "5개월차 — 외부 신뢰 강화", tasks: [
    { id: "review", label: "후기 2개 추가", desc: "다양한 방문 상황 커버", type: "review" },
    { id: "faq", label: "FAQ 2개 추가", desc: "누적 AI 질문 패턴 대응", type: "faq" },
    { id: "content", label: "GEO 콘텐츠 2개 추가", desc: "외부 언급 강화 콘텐츠", type: "content" },
    { id: "rating", label: "평점·리뷰수 업데이트", desc: "최종 수치 현행화", type: "rating" },
  ]},
  { month: 6, title: "6개월차 — 완성 & 리포트", tasks: [
    { id: "review", label: "후기 2개 추가", desc: "6개월 마무리 후기", type: "review" },
    { id: "content", label: "GEO 콘텐츠 2개 추가", desc: "최종 콘텐츠 보강", type: "content" },
    { id: "sitemap", label: "sitemap 날짜 갱신", desc: "최종 갱신", type: "sitemap" },
    { id: "report", label: "6개월 최종 리포트 생성", desc: "납품용 GEO 평가 리포트", type: "report" },
  ]},
]

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
  taskLog: { key: string; label: string; month: number; date: string }[]
}

type TaskInfo = {
  bizId: string
  month: number
  taskId: string
  taskType: string
  taskLabel: string
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

const TEST_MODE = true // 테스트 모드: 3분 = 1개월
const MONTH_MS = TEST_MODE ? 1000 * 60 * 3 : 1000 * 60 * 60 * 24 * 30

function getCurrentMonth(biz: Business) {
  if (!biz.startDate) return 1
  const start = new Date(biz.startDate)
  const now = new Date()
  const diff = Math.floor((now.getTime() - start.getTime()) / MONTH_MS)
  return Math.min(Math.max(diff + 1, 1), 6)
}

function getProgress(biz: Business) {
  const total = MONTHLY_PLAN.reduce((a, m) => a + m.tasks.length, 0)
  return { done: biz.completedTasks.length, total }
}

export default function Dashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [page, setPage] = useState('dashboard')
  const [currentBizId, setCurrentBizId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [currentTask, setCurrentTask] = useState<TaskInfo | null>(null)
  const [aiOutput, setAiOutput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('roadmap')
  const [form, setForm] = useState({ name: '', domain: '', region: '', type: '', menu: '', features: '', startDate: getToday(), repo: '' })

  useEffect(() => {
    fetch('/api/businesses').then(r => r.json()).then(data => setBusinesses(data || []))
  }, [])

  // 30초마다 자동 갱신
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1)
      fetch('/api/businesses').then(r => r.json()).then(data => setBusinesses(data || []))
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const saveBiz = async (list: Business[]) => {
    setBusinesses(list)
    await fetch('/api/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(list) })
  }

  const addBusiness = async () => {
    if (!form.name || !form.domain || !form.region || !form.type) { alert('필수 항목을 입력해주세요.'); return }
    const biz: Business = { id: Date.now().toString(), ...form, completedTasks: [], taskLog: [] }
    await saveBiz([...businesses, biz])
    setShowAddModal(false)
    setForm({ name: '', domain: '', region: '', type: '', menu: '', features: '', startDate: getToday(), repo: '' })
  }

  const openTaskModal = (task: TaskInfo) => {
    setCurrentTask(task)
    setAiOutput('')
    setShowTaskModal(true)
  }

  const completeTask = () => {
    if (!currentTask) return
    const key = `month${currentTask.month}_${currentTask.taskId}`
    const updated = businesses.map(b => {
      if (b.id !== currentTask.bizId) return b
      if (b.completedTasks.includes(key)) return b
      return {
        ...b,
        completedTasks: [...b.completedTasks, key],
        taskLog: [...b.taskLog, { key, label: currentTask.taskLabel, month: currentTask.month, date: getToday() }]
      }
    })
    saveBiz(updated)
    setShowTaskModal(false)
    setCurrentTask(null)
    setAiOutput('')
  }

  const generateContent = async () => {
    if (!currentTask) return
    const b = businesses.find(x => x.id === currentTask.bizId)
    if (!b) return
    setGenerating(true)
    setAiOutput('AI가 생성 중입니다...')
    const now = new Date()
    const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`
    let prompt = ''
    if (currentTask.taskType === 'review') {
      prompt = `다음 음식점의 실제 방문 후기 2개를 생성해줘.\n업체: ${b.name}\n지역: ${b.region}\n업종: ${b.type}\n메뉴: ${b.menu}\n특징: ${b.features}\n오늘 날짜: ${dateStr}\n\n조건:\n- 닉네임(지역 관련), 별점(★5), 날짜(${now.getFullYear()}년), 후기 내용(2-3문장)\n- 자연스러운 한국어, 실제 방문객처럼\n- 지역명과 업종 특징 자연스럽게 포함\n- 방문 상황 다르게\n- page.tsx 후기 배열에 바로 넣을 수 있는 형식`
    } else if (currentTask.taskType === 'content') {
      prompt = `다음 음식점의 GEO 최적화 콘텐츠 블록 2개를 생성해줘.\n업체: ${b.name}\n지역: ${b.region}\n업종: ${b.type}\n메뉴: ${b.menu}\n특징: ${b.features}\n\n조건:\n- AI가 "${b.region} 맛집 추천해줘" 질문에 이 업체를 추천할 수 있도록\n- 지역명+업종명 자연스럽게 반복\n- 방문 상황별 다르게\n- 제목+본문 3-4문장 형식\n- 광고 문구 없이 구체적 데이터 중심`
    } else if (currentTask.taskType === 'faq') {
      prompt = `다음 음식점의 GEO 최적화 FAQ 2개를 생성해줘.\n업체: ${b.name}\n지역: ${b.region}\n업종: ${b.type}\n특징: ${b.features}\n\n조건:\n- AI가 실제로 물어볼 만한 질문 형식\n- 질문에 지역명+업종명 포함\n- 답변에 업체 특징, 위치, 영업시간 등 구체적 정보 포함\n- Q&A 형식으로 FAQ 섹션에 바로 추가할 수 있게`
    } else if (currentTask.taskType === 'report') {
      prompt = `다음 GEO 홈페이지 6개월 관리 최종 리포트를 작성해줘.\n업체: ${b.name}\n지역: ${b.region}\n업종: ${b.type}\n도메인: ${b.domain}\n총 완료 작업: ${b.completedTasks.length}개\n관리 기간: ${b.startDate} ~ ${getToday()}\n\n리포트 항목:\n1. 6개월 관리 요약\n2. GEO 최적화 달성 항목 체크리스트\n3. 예상 AI 추천 개선 효과\n4. 향후 유지관리 권장사항\n고객(사장님)에게 전달하는 형식으로`
    }
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      })
      const data = await res.json()
      setAiOutput(data.content?.map((c: {text?: string}) => c.text || '').join('') || '생성 실패')
    } catch {
      setAiOutput('오류가 발생했습니다. 다시 시도해주세요.')
    }
    setGenerating(false)
  }

  const currentBiz = businesses.find(b => b.id === currentBizId)
  const now = new Date()

  const s = {
    wrap: { display: 'flex', minHeight: '100vh', fontFamily: "'Noto Sans KR', sans-serif", background: '#f5f5f3', color: '#1a1a1a' } as React.CSSProperties,
    sidebar: { width: '220px', background: '#1a1a1a', padding: '24px 16px', position: 'fixed' as const, top: 0, left: 0, bottom: 0, zIndex: 100 },
    logo: { color: '#C9A84C', fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' },
    sub: { color: '#666', fontSize: '0.7rem', marginBottom: '32px' },
    main: { marginLeft: '220px', padding: '32px', flex: 1 },
    menuItem: (active: boolean) => ({ display: 'block', padding: '10px 12px', color: active ? '#C9A84C' : '#999', background: active ? '#2a2a2a' : 'transparent', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '4px', border: 'none', width: '100%', textAlign: 'left' as const }),
    pageTitle: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' },
    pageSub: { color: '#888', fontSize: '0.85rem', marginBottom: '32px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { background: '#fff', borderRadius: '12px', border: '1px solid #e8e8e8', padding: '20px' },
    statLabel: { fontSize: '0.75rem', color: '#888', marginBottom: '8px' },
    statValue: { fontSize: '1.8rem', fontWeight: 700 },
    statSub: { fontSize: '0.75rem', color: '#C9A84C', marginTop: '4px' },
    bizGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' },
    bizCard: { background: '#fff', borderRadius: '12px', border: '1px solid #e8e8e8', padding: '20px', cursor: 'pointer' },
    addCard: { background: '#fff', borderRadius: '12px', border: '2px dashed #e8e8e8', padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, gap: '8px', minHeight: '180px', color: '#bbb' },
    card: { background: '#fff', borderRadius: '12px', border: '1px solid #e8e8e8', padding: '24px', marginBottom: '16px' },
    cardTitle: { fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '16px' },
    tag: (type: string) => ({ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '20px', background: type === 'active' ? '#FFF8E8' : type === 'done' ? '#EAF3DE' : '#f5f5f3', color: type === 'active' ? '#B8860B' : type === 'done' ? '#3B6D11' : '#666', border: `1px solid ${type === 'active' ? '#C9A84C' : type === 'done' ? '#97C459' : '#e8e8e8'}` }),
    btn: (type: string) => ({ padding: type === 'sm' ? '6px 14px' : '12px 24px', borderRadius: '8px', fontSize: type === 'sm' ? '0.78rem' : '0.88rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: type === 'secondary' ? '#f5f5f3' : '#C9A84C', color: type === 'secondary' ? '#555' : '#fff' }),
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalBox: { background: '#fff', borderRadius: '16px', padding: '32px', width: '600px', maxHeight: '90vh', overflowY: 'auto' as const },
    formLabel: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px' },
    formInput: { width: '100%', padding: '10px 14px', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', marginBottom: '16px' },
    weekTask: { background: '#fff', borderRadius: '8px', border: '1px solid #e8e8e8', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    tab: (active: boolean) => ({ padding: '10px 20px', fontSize: '0.85rem', cursor: 'pointer', border: 'none', background: 'none', color: active ? '#C9A84C' : '#888', borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent', marginBottom: '-1px', fontWeight: active ? 600 : 400 }),
    roadmapBadge: (status: string) => ({ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, background: status === 'done' ? '#EAF3DE' : status === 'current' ? '#C9A84C' : '#f5f5f3', color: status === 'done' ? '#3B6D11' : status === 'current' ? '#fff' : '#888' }),
    taskItem: (done: boolean) => ({ padding: '12px 14px', borderRadius: '8px', border: `1px solid ${done ? '#97C459' : '#e8e8e8'}`, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: done ? '#EAF3DE' : '#fff', color: done ? '#3B6D11' : '#1a1a1a', marginBottom: '8px' }),
    aiBox: { background: '#f5f5f3', borderRadius: '8px', padding: '16px', fontSize: '0.82rem', lineHeight: 1.8, color: '#444', whiteSpace: 'pre-wrap' as const, marginTop: '12px', maxHeight: '300px', overflowY: 'auto' as const },
    reportStat: { textAlign: 'center' as const, padding: '12px', background: '#f5f5f3', borderRadius: '8px' },
    nextPlan: { background: '#FFF8E8', border: '1px solid #C9A84C', borderRadius: '8px', padding: '14px', marginTop: '16px' },
  }

  const renderBizCard = (b: Business) => {
    const m = getCurrentMonth(b)
    const p = getProgress(b)
    const pct = Math.round((p.done / p.total) * 100)
    return (
      <div key={b.id} style={s.bizCard} onClick={() => { setCurrentBizId(b.id); setActiveTab('roadmap'); setPage('detail') }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{b.name}</div>
        <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '16px' }}>{b.region} · {b.type}</div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
            <div style={{ height: '100%', background: '#C9A84C', width: `${pct}%`, borderRadius: '3px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#888' }}>
            <span>{m}/6개월</span><span>{p.done}/{p.total} 완료</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={s.tag('active')}>{m}개월차</span>
          <span style={s.tag('')}>{b.domain}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo}>GEO Studio</div>
        <div style={s.sub}>관리 대시보드</div>
        {[['dashboard','대시보드'],['businesses','업체 관리'],['weekly','이번 주 작업'],['reports','월간 리포트']].map(([id, label]) => (
          <button key={id} style={s.menuItem(page === id)} onClick={() => setPage(id)}>{label}</button>
        ))}
      </div>

      {/* Main */}
      <div style={s.main}>

        {/* Dashboard */}
        {page === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={s.pageTitle}>대시보드</div>
              {TEST_MODE && <span style={{ background: '#FFF8E8', color: '#B8860B', border: '1px solid #C9A84C', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>🧪 테스트 모드 (3분 = 1개월)</span>}
            </div>
            <div style={s.pageSub}>{now.getFullYear()}년 {now.getMonth()+1}월 기준 {TEST_MODE && `· ${tick >= 0 ? '자동 갱신 중' : ''}`}</div>
            <div style={s.statsGrid}>
              {[
                { label: '관리 중인 업체', value: businesses.length, sub: '등록된 업체' },
                { label: '이번 달 완료', value: businesses.reduce((a,b) => a + b.completedTasks.filter(t => t.includes(`month${getCurrentMonth(b)}`)).length, 0), sub: '작업 완료' },
                { label: '총 후기 추가', value: businesses.reduce((a,b) => a + b.completedTasks.filter(t => t.includes('review')).length * 2, 0), sub: '누적 후기' },
                { label: '총 완료 작업', value: businesses.reduce((a,b) => a + b.completedTasks.length, 0), sub: '전체 누적' },
              ].map(stat => (
                <div key={stat.label} style={s.statCard}>
                  <div style={s.statLabel}>{stat.label}</div>
                  <div style={s.statValue}>{stat.value}</div>
                  <div style={s.statSub}>{stat.sub}</div>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={s.cardTitle}>업체 현황</div>
              <div style={s.bizGrid}>
                {businesses.slice(0,5).map(renderBizCard)}
                <div style={s.addCard} onClick={() => setShowAddModal(true)}>
                  <div style={{ fontSize: '2rem' }}>+</div>
                  <div style={{ fontSize: '0.82rem' }}>업체 추가</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Businesses */}
        {page === 'businesses' && (
          <div>
            <div style={s.pageTitle}>업체 관리</div>
            <div style={s.pageSub}>등록된 GEO 관리 업체 목록</div>
            <div style={s.bizGrid}>
              {businesses.map(renderBizCard)}
              <div style={s.addCard} onClick={() => setShowAddModal(true)}>
                <div style={{ fontSize: '2rem' }}>+</div>
                <div style={{ fontSize: '0.82rem' }}>새 업체 등록</div>
              </div>
            </div>
          </div>
        )}

        {/* Weekly */}
        {page === 'weekly' && (
          <div>
            <div style={s.pageTitle}>이번 주 작업</div>
            <div style={s.pageSub}>{now.getFullYear()}년 {now.getMonth()+1}월</div>
            {businesses.length === 0 ? (
              <div style={{...s.card, textAlign: 'center', color: '#888', padding: '40px'}}>등록된 업체가 없습니다.</div>
            ) : businesses.map(b => {
              const m = getCurrentMonth(b)
              const plan = MONTHLY_PLAN[m-1]
              return (
                <div key={b.id} style={s.card}>
                  <div style={s.cardTitle}>{b.name} — {m}개월차 작업</div>
                  {plan.tasks.map(t => {
                    const isDone = b.completedTasks.some(d => d.includes(`month${m}_${t.id}`))
                    return (
                      <div key={t.id} style={s.weekTask}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '3px' }}>{t.label}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>{t.desc}</div>
                        </div>
                        {isDone ? <span style={s.tag('done')}>완료</span> :
                          <button style={s.btn('sm')} onClick={() => openTaskModal({ bizId: b.id, month: m, taskId: t.id, taskType: t.type, taskLabel: t.label })}>실행</button>
                        }
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Reports */}
        {page === 'reports' && (
          <div>
            <div style={s.pageTitle}>월간 리포트</div>
            <div style={s.pageSub}>매월 1일 자동 생성</div>
            {businesses.length === 0 ? (
              <div style={{...s.card, textAlign: 'center', color: '#888', padding: '40px'}}>등록된 업체가 없습니다.</div>
            ) : businesses.map(b => {
              const m = getCurrentMonth(b)
              const nextPlan = MONTHLY_PLAN[Math.min(m, 5)]
              const reviewsDone = b.completedTasks.filter(t => t.includes('review')).length * 2
              const contentDone = b.completedTasks.filter(t => t.includes('content')).length * 2
              const faqDone = b.completedTasks.filter(t => t.includes('faq')).length
              return (
                <div key={b.id} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{b.name} — {now.getFullYear()}년 {now.getMonth()}월 리포트</div>
                    <span style={s.tag('active')}>{m}/6개월</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
                    {[
                      { val: reviewsDone, lbl: '후기 추가' },
                      { val: contentDone, lbl: '콘텐츠 추가' },
                      { val: faqDone, lbl: 'FAQ 추가' },
                      { val: b.completedTasks.length, lbl: '총 완료 작업' },
                    ].map(stat => (
                      <div key={stat.lbl} style={s.reportStat}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C9A84C' }}>{stat.val}</div>
                        <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>{stat.lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div style={s.nextPlan}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B8860B', marginBottom: '8px' }}>📋 {now.getFullYear()}년 {now.getMonth()+1}월 ({m+1}개월차) 작업 계획</div>
                    {nextPlan ? nextPlan.tasks.map(t => (
                      <div key={t.id} style={{ fontSize: '0.82rem', color: '#8B6914', padding: '2px 0' }}>→ {t.label}</div>
                    )) : <div style={{ fontSize: '0.82rem', color: '#8B6914' }}>→ 6개월 관리 완료</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Detail */}
        {page === 'detail' && currentBiz && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button style={{ padding: '8px 16px', border: '1px solid #e8e8e8', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '0.82rem', color: '#555' }} onClick={() => setPage('businesses')}>← 목록으로</button>
              <div>
                <div style={s.pageTitle}>{currentBiz.name}</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>{currentBiz.region} · {currentBiz.type} · {currentBiz.domain}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #e8e8e8' }}>
              {[['roadmap','6개월 로드맵'],['tasks','작업 실행'],['history','작업 이력']].map(([id, label]) => (
                <button key={id} style={s.tab(activeTab === id)} onClick={() => setActiveTab(id)}>{label}</button>
              ))}
            </div>

            {/* Roadmap */}
            {activeTab === 'roadmap' && (
              <div>
                {MONTHLY_PLAN.map((plan, i) => {
                  const monthNum = i + 1
                  const m = getCurrentMonth(currentBiz)
                  const status = monthNum < m ? 'done' : monthNum === m ? 'current' : 'future'
                  const monthDone = currentBiz.completedTasks.filter(d => d.includes(`month${monthNum}_`))
                  return (
                    <div key={monthNum} style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={s.roadmapBadge(status)}>{monthNum}월</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{plan.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#888' }}>{monthDone.length}/{plan.tasks.length} 완료</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', paddingLeft: '48px' }}>
                        {plan.tasks.map(t => {
                          const isDone = currentBiz.completedTasks.some(d => d.includes(`month${monthNum}_${t.id}`))
                          return (
                            <div key={t.id} style={s.taskItem(isDone)}
                              onClick={() => status === 'current' && !isDone && openTaskModal({ bizId: currentBiz.id, month: monthNum, taskId: t.id, taskType: t.type, taskLabel: t.label })}>
                              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isDone ? '#3B6D11' : '#e8e8e8'}`, background: isDone ? '#3B6D11' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', flexShrink: 0 }}>{isDone ? '✓' : ''}</div>
                              {t.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tasks */}
            {activeTab === 'tasks' && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '16px' }}>{getCurrentMonth(currentBiz)}개월차 이번 달 작업</div>
                {MONTHLY_PLAN[getCurrentMonth(currentBiz)-1].tasks.map(t => {
                  const m = getCurrentMonth(currentBiz)
                  const isDone = currentBiz.completedTasks.some(d => d.includes(`month${m}_${t.id}`))
                  return (
                    <div key={t.id} style={s.weekTask}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '3px' }}>{t.label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{t.desc}</div>
                      </div>
                      {isDone ? <span style={s.tag('done')}>완료</span> :
                        <button style={s.btn('sm')} onClick={() => openTaskModal({ bizId: currentBiz.id, month: m, taskId: t.id, taskType: t.type, taskLabel: t.label })}>AI 실행</button>
                      }
                    </div>
                  )
                })}
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '16px' }}>작업 이력</div>
                {currentBiz.taskLog.length === 0 ? (
                  <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>아직 완료된 작업이 없습니다.</div>
                ) : [...currentBiz.taskLog].reverse().map((l, i) => (
                  <div key={i} style={s.weekTask}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '3px' }}>{l.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{l.date} · {l.month}개월차</div>
                    </div>
                    <span style={s.tag('done')}>완료</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }}>새 업체 등록</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[['name','상호명','예: 해운대분식'],['domain','도메인','예: haeundaebungsik.vercel.app'],['region','지역','예: 부산 해운대구'],['type','업종','예: 분식 전문점'],['repo','GitHub 저장소명','예: haeundaebungsik']].map(([key, label, ph]) => (
                <div key={key}>
                  <label style={s.formLabel}>{label}</label>
                  <input style={s.formInput} placeholder={ph} value={form[key as keyof typeof form]} onChange={e => setForm({...form, [key]: e.target.value})} />
                </div>
              ))}
            </div>
            <label style={s.formLabel}>대표 메뉴</label>
            <input style={s.formInput} placeholder="예: 떡볶이, 순대, 튀김" value={form.menu} onChange={e => setForm({...form, menu: e.target.value})} />
            <label style={s.formLabel}>업체 특징</label>
            <textarea style={{...s.formInput, height: '100px', resize: 'vertical'}} placeholder="예: 매일 직접 양념 제조, 18년 운영" value={form.features} onChange={e => setForm({...form, features: e.target.value})} />
            <label style={s.formLabel}>관리 시작일</label>
            <input style={s.formInput} type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
            <div style={{ background: '#FFF8E8', border: '1px solid #C9A84C', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: '#8B6914', marginBottom: '16px' }}>
              🤖 Cron이 3분마다 자동 실행되어 GitHub 저장소를 직접 업데이트합니다.
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button style={s.btn('secondary')} onClick={() => setShowAddModal(false)}>취소</button>
              <button style={s.btn('primary')} onClick={addBusiness}>🚀 6개월 관리 시작</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && currentTask && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>{currentTask.taskLabel}</div>
            {(() => {
              const b = businesses.find(x => x.id === currentTask.bizId)
              if (!b) return null
              if (currentTask.taskType === 'sitemap' || currentTask.taskType === 'rating') {
                return (
                  <div style={{ color: '#555', fontSize: '0.88rem', lineHeight: 1.8, background: '#f5f5f3', padding: '16px', borderRadius: '8px' }}>
                    <strong>{currentTask.taskType === 'sitemap' ? 'sitemap.ts' : 'layout.tsx'}</strong> 파일에서<br/>
                    {currentTask.taskType === 'sitemap' ? 'lastModified: new Date() 확인' : 'ratingValue 및 reviewCount를 +5~10 증가'}해주세요.<br/><br/>
                    <span style={{ color: '#C9A84C' }}>현재 날짜: {getToday()}</span>
                  </div>
                )
              }
              return (
                <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '12px', background: '#f5f5f3', padding: '14px', borderRadius: '8px' }}>
                  <strong>{b.name}</strong> ({b.region} · {b.type})<br/>
                  <span style={{ color: '#888' }}>메뉴: {b.menu || '미입력'}</span><br/>
                  <span style={{ color: '#888' }}>특징: {b.features || '미입력'}</span>
                </div>
              )
            })()}
            {aiOutput && <div style={s.aiBox}>{aiOutput}</div>}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button style={s.btn('secondary')} onClick={() => { setShowTaskModal(false); setAiOutput('') }}>닫기</button>
              {currentTask.taskType !== 'sitemap' && currentTask.taskType !== 'rating' && (
                <button style={s.btn('primary')} onClick={generateContent} disabled={generating}>
                  {generating ? '생성 중...' : 'AI 자동 생성'}
                </button>
              )}
              <button style={s.btn('primary')} onClick={completeTask}>✓ 완료 처리</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
