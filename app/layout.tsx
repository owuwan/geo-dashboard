import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "GEO Studio 관리 대시보드",
  description: "GEO 홈페이지 6개월 자동 관리 시스템",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
