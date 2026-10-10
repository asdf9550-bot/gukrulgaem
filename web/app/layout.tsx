import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import SubscribeBox from "@/components/SubscribeBox";   // 주간 메일(2026-10-08 다시 켬) — Vercel에 RESEND_API_KEY 가 있을 때만 보임
import Analytics from "@/components/Analytics";
import "./globals.css";
import { lastUpdated } from "@/lib/data";
import { kstTime } from "@/lib/format";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gukrulgaem.com";
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

// 기종마다 화면 폭에 맞춰 자동으로 맞춰지도록(2026-10-08 모바일): 확대/축소는 사용자가 할 수 있게 두고, 노치 영역까지 씀
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f1115" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "국룰겜",
  title: { default: "국룰겜 — 스팀 구매 가이드", template: "%s | 국룰겜" },
  description: "국룰겜: 한국 스팀 가격 기록과 한국 게이머 평가로 '지금 사도 되는 게임인지' 판정하는 스팀 구매 가이드.",
  openGraph: { siteName: "국룰겜", locale: "ko_KR", type: "website", url: SITE_URL },
  alternates: { canonical: "/" },
  // 2026-10-11 (사용자 "구글 검색 아이콘을 호랑이로"): 구글 파비콘 수집기가 읽는 고정 주소(해시 없는 /favicon.ico, 48px 포함)를 먼저 둔다.
  // 구글은 홈을 다시 긁을 때 아이콘을 갱신하므로 반영까지 며칠~몇 주 걸릴 수 있다(Search Console 색인 요청으로 앞당김).
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icon.png", sizes: "512x512", type: "image/png" }], shortcut: "/favicon.ico", apple: "/apple-icon.png" },
};

// 구글이 검색 결과에 보여줄 사이트 이름(WebSite 구조화 데이터). 홈에서 읽는다.
const siteLd = {
  "@context": "https://schema.org", "@type": "WebSite", name: "국룰겜", alternateName: ["국룰겜 스팀 구매 가이드", "gukrulgaem"], url: SITE_URL + "/",
  inLanguage: "ko-KR", description: "한국 스팀 가격 기록과 한국 게이머 평가로 지금 사도 되는 게임인지 판정하는 스팀 구매 가이드",
};

export default function RootLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const updated = lastUpdated();
  return (
    <html lang="ko">
      <body className={`min-h-screen antialiased ${notoSansKr.className}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
        <Analytics />
        <header className="border-b" style={{ borderColor: "var(--line)" }}>
          {/* 폰에서는 메뉴가 잘리지 않게 두 줄로 접힘(2026-10-08 모바일 개선) */}
          <nav className="mx-auto max-w-5xl px-4 py-2 sm:py-0 sm:h-14 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-1 sm:gap-5 text-sm whitespace-nowrap">
            {/* 로고(호랑이)는 홈 제목 옆에 크게(app/page.tsx), 탭 아이콘은 app/icon.png — 머리글엔 글자만(사용자 2026-10-08) */}
            <Link href="/" className="font-extrabold text-lg flex items-baseline gap-1.5">국룰겜<span className="text-xs font-normal muted hidden sm:inline">스팀 구매 가이드</span></Link>
            <Link href="/" className="muted hover:underline">이번 주 할인</Link>
            <Link href="/rank" className="muted hover:underline">순위</Link>
            <Link href="/calendar" className="muted hover:underline">달력</Link>
            <Link href="/wish" className="muted hover:underline">♡ 찜</Link>
            <Link href="/me" className="muted hover:underline">메일 알림</Link>
            <Link href="/about" className="muted hover:underline">판정 기준</Link>
            <Link href="/video" className="muted hover:underline">영상</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        {modal}
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs muted space-y-2 border-t" style={{ borderColor: "var(--line)" }}>
          {/* 주간 메일 구독: Resend 키(RESEND_API_KEY·RESEND_AUDIENCE_ID)가 Vercel에 들어가면 자동으로 나타남 */}
          {process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID && <div className="mb-4"><SubscribeBox /></div>}
          <p><b style={{ color: "var(--fg)" }}>국룰겜</b> · 한국 게이머를 위한 스팀 구매 가이드 · 매일 새벽 갱신 (마지막 {kstTime(updated)})</p>
          <p>
            <b>데이터 출처</b> — Steam 상점·리뷰·Web API(현재가·정가·장르·한국어 지원·리뷰·리뷰 인용·플레이 시간·접속자·판별 가격·스팀덱 호환) ·
            <a href="https://isthereanydeal.com" className="underline ml-1">IsThereAnyDeal</a>(한국 기준 가격 이력·역대 최저가·공식 판매처 가격) ·
            <a href="https://directg.net" className="underline ml-1">다이렉트 게임즈</a>(원화 판매가). 시즌 세일 일정은 예년 기준 예상치입니다.
          </p>
          <p>
            <b>판정 방식</b> — 바닥가·좋은 가격·보통·기다림·함정 할인과 한국 주의, 시간당 가격, 후회 지수는 모두 <Link href="/about" className="underline">판정 기준</Link>에 공개한 계산식으로 자동 산출됩니다.
            같은 데이터면 같은 결과가 나오며 사람의 추천이나 광고가 끼어들지 않습니다.
          </p>
          <p>
            <b>주의</b> — 가격과 평가는 수집 시점 기준이며 결제 전 판매처에서 실제 가격·지역 제한·환불 조건을 확인하세요. 판매처 키는 스팀과 달리 환불이 안 될 수 있습니다.
            판매처 이동 링크 중 일부는 IsThereAnyDeal의 추적(제휴) 링크입니다.
          </p>
          <p>
            이 사이트는 Valve(Steam), IsThereAnyDeal, 에이치투인터렉티브(다이렉트 게임즈), Epic Games, Ubisoft, Electronic Arts, Microsoft, Blizzard와 아무 관련이 없는 개인 운영 사이트입니다.
            각 게임·판매처·플랫폼의 이름과 그림은 해당 권리자의 것입니다. 문의: asdfpil0001@gmail.com
          </p>
        </footer>
      </body>
    </html>
  );
}
