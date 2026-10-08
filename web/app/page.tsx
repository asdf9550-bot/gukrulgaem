import Link from "next/link";
import Image from "next/image";
import DealList from "@/components/DealList";
import VerdictBadge from "@/components/VerdictBadge";
import TodayChanges from "@/components/TodayChanges";
import { deals, lastUpdated, pricesPrev } from "@/lib/data";
import { kst, won } from "@/lib/format";
import { pickReason, weeklyPicks } from "@/lib/pick";
import { todayChanges } from "@/lib/changes";

export default function Home() {
  const rows = deals();
  const floor = rows.filter((d) => d.price.verdict === "floor").length;
  const picks = weeklyPicks(rows);
  const changes = todayChanges(rows, pricesPrev());
  return (
    <div className="space-y-6">
      {/* 2026-10-08: 호랑이 로고를 제목 왼쪽에 크게(사용자 요청) */}
      <div className="flex items-center gap-4">
        <Image src="/brand/logo-512.png" alt="국룰겜" width={96} height={96} priority className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl" />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold">이번 주 스팀 할인, 지금 사도 될까?</h1>
          <p className="muted mt-1">
            한국 스팀 가격 기록과 한국 게이머 평가로 판정합니다. 할인 중 {rows.length}개 중 {floor}개가 역대 최저가예요.
            <span className="text-xs"> · {kst(lastUpdated(), true)} 갱신</span>
          </p>
        </div>
      </div>

      {picks.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold"><span style={{ color: "#ef4444" }}>이번 주 국룰</span> {picks.length}</h2>
            <span className="text-xs muted">역대 최저·평가 85%↑·리뷰 5천↑·한국 주의 없음 · 판매 순</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {picks.map((d, i) => (
              <Link key={d.game.appid} href={`/game/${d.game.appid}`} scroll={false}
                className="card shrink-0 w-56 sm:w-60 overflow-hidden snap-start fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="relative aspect-[460/215]">
                  {(d.game.capsule_image ?? d.game.header_image) && <Image src={d.game.capsule_image ?? d.game.header_image!} alt="" fill sizes="240px" className="object-cover" />}
                  <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-extrabold text-white" style={{ background: "#ef4444" }}>국룰 {i + 1}</span>
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-bold truncate">{d.game.name}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-extrabold">{won(d.price.current_price)}</span>
                    <span className="text-sm font-bold" style={{ color: "#16a34a" }}>-{d.price.discount_pct}%</span>
                    <VerdictBadge verdict={d.price.verdict} />
                  </div>
                  <div className="text-xs muted truncate">{pickReason(d)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <TodayChanges c={changes} />

      <DealList deals={rows} />
    </div>
  );
}
