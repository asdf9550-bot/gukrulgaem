import type { Metadata } from "next";
import GameCard from "@/components/GameCard";
import { deals, rules, type Deal } from "@/lib/data";
import { kst, won } from "@/lib/format";
import { hours, pricePerHour } from "@/lib/stats";

export const metadata: Metadata = { title: "테마 순위", description: "한국인만 싫어한 게임, 한국어 지원 바닥가, 역대 최저가 갱신 순위" };

function Section({ title, intro, rows, note }: { title: string; intro: string; rows: Deal[]; note: (d: Deal) => string }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="text-sm muted">{intro}</p>
      </div>
      {rows.length === 0
        ? <p className="muted text-sm py-4">이번 주에는 해당하는 게임이 없습니다.</p>
        : <div className="grid gap-3 md:grid-cols-2 items-stretch">{rows.map((d, i) => (
            <div key={d.game.appid} className="fade-up h-full" style={{ animationDelay: `${i * 60}ms` }}><GameCard deal={d} note={`${i + 1}위 · ${note(d)}`} /></div>
          ))}</div>}
    </section>
  );
}

export default function RankPage() {
  const all = deals();
  const r = rules();
  // "싫어했다"고 할 만큼: 주의 기준(10%p)의 절반 이상 낮은 게임만
  const minGap = r.korea_warning_gap_pp / 2;
  const disliked = all.filter((d) => d.game.gap_pp != null && d.game.gap_pp <= -minGap)
    .sort((a, b) => a.game.gap_pp! - b.game.gap_pp!).slice(0, 10);
  const koreanFloor = all.filter((d) => d.price.verdict === "floor" && d.game.korean_support !== "none")
    .sort((a, b) => (b.price.discount_pct ?? 0) - (a.price.discount_pct ?? 0)).slice(0, 10);
  const newLows = all.filter((d) => d.price.verdict === "floor")
    .sort((a, b) => (a.price.historical_low_at ?? "") < (b.price.historical_low_at ?? "") ? 1 : -1).slice(0, 10);
  const ph = (d: Deal) => pricePerHour(d.price.current_price, d.game.playtime_median_h_all, d.game.playtime_n_all);
  const valueForMoney = all.filter((d) => ph(d) != null && (d.game.playtime_median_h_all ?? 0) >= 5)
    .sort((a, b) => ph(a)! - ph(b)!).slice(0, 10);
  const koreansPlay = all.filter((d) => (d.game.playtime_n_ko ?? 0) >= 20 && d.game.playtime_median_h_all && d.game.playtime_median_h_ko)
    .sort((a, b) => b.game.playtime_median_h_ko! / b.game.playtime_median_h_all! - a.game.playtime_median_h_ko! / a.game.playtime_median_h_all!).slice(0, 10);
  const busy = all.filter((d) => (d.game.current_players ?? 0) > 0)
    .sort((a, b) => b.game.current_players! - a.game.current_players!).slice(0, 10);
  return (
    <div className="space-y-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold">테마 순위</h1>
      <Section title="한국인만 싫어한 게임" intro={`한국어 리뷰 긍정률이 전체보다 ${minGap}%p 이상 낮은 게임, 격차 큰 순 (한국어 리뷰 ${r.korea_warning_min_reviews}개 이상만)`}
        rows={disliked} note={(d) => `전체보다 ${Math.abs(d.game.gap_pp!)}%p 낮음`} />
      <Section title="한국어 지원 바닥가" intro="한국어로 할 수 있으면서 지금이 역대 최저가인 게임, 할인율 순"
        rows={koreanFloor} note={(d) => `${d.price.discount_pct}% 할인`} />
      <Section title="역대 최저가 갱신" intro="최근에 역대 최저가를 새로 찍은 순서"
        rows={newLows} note={(d) => `${won(d.price.historical_low)} · ${kst(d.price.historical_low_at)}`} />
      <Section title="시간당 가격 가성비" intro="지금 가격 ÷ 리뷰어 플레이 시간 중앙값이 가장 낮은 게임 (플레이 시간 5시간 이상만)"
        rows={valueForMoney} note={(d) => `${ph(d)!.toLocaleString("ko-KR")}원/시간 · ${hours(d.game.playtime_median_h_all)}`} />
      <Section title="한국인이 유독 오래 하는 게임" intro="한국어 리뷰어 플레이 시간이 전체보다 긴 순서 (한국어 표본 20개 이상)"
        rows={koreansPlay} note={(d) => `한국 ${hours(d.game.playtime_median_h_ko)} vs 전체 ${hours(d.game.playtime_median_h_all)}`} />
      <Section title="지금 가장 많이 하는 할인 게임" intro="수집 시점 스팀 접속자 수 순 (멀티 게임 고를 때)"
        rows={busy} note={(d) => `${d.game.current_players!.toLocaleString("ko-KR")}명 접속`} />
    </div>
  );
}
