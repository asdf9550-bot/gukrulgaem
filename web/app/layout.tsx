import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { lastUpdated } from "@/lib/data";
import { kst } from "@/lib/format";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gukrulgaem.vercel.app";
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "국룰겜 — 스팀 구매 가이드", template: "%s | 국룰겜" },
  description: "국룰겜: 한국 스팀 가격 기록과 한국 게이머 평가로 '지금 사도 되는 게임인지' 판정하는 스팀 구매 가이드.",
};

export default function RootLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const updated = lastUpdated();
  return (
    <html lang="ko">
      <body className={`min-h-screen antialiased ${notoSansKr.className}`}>
        <header className="border-b" style={{ borderColor: "var(--line)" }}>
          <nav className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-4 sm:gap-5 text-sm whitespace-nowrap overflow-x-auto">
            <Link href="/" className="font-extrabold text-lg flex items-baseline gap-1.5">국룰겜<span className="text-xs font-normal muted hidden sm:inline">스팀 구매 가이드</span></Link>
            <Link href="/" className="muted hover:underline">이번 주 할인</Link>
            <Link href="/rank" className="muted hover:underline">순위</Link>
            <Link href="/about" className="muted hover:underline">판정 기준</Link>
            <Link href="/video" className="muted hover:underline">영상</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        {modal}
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs muted space-y-1 border-t" style={{ borderColor: "var(--line)" }}>
          <p>결제 전에는 판매처에서 실제 가격을 확인하세요. 가격과 평가는 수집 시점 기준입니다. 판매처 키는 스팀과 달리 환불이 안 될 수 있어요.</p>
          <p>가격 기록·판매처 가격: <a href="https://isthereanydeal.com" className="underline">IsThereAnyDeal</a> · 현재가·리뷰·접속자: Steam · 마지막 갱신 {kst(updated, true)}</p>
        </footer>
      </body>
    </html>
  );
}
