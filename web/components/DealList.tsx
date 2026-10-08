"use client";
import { useMemo, useState } from "react";
import GameCard from "@/components/GameCard";
import type { Deal, KoreanSupport, Verdict } from "@/lib/data";
import { pct, VERDICT } from "@/lib/format";
import { pricePerHour } from "@/lib/stats";

type Sort = "rank" | "discount" | "price_asc" | "price_desc" | "rating" | "gap" | "per_hour" | "players";
const SORTS: { key: Sort; label: string }[] = [
  { key: "rank", label: "스팀 판매 순위" }, { key: "discount", label: "할인율 높은 순" }, { key: "price_asc", label: "가격 낮은 순" }, { key: "price_desc", label: "가격 높은 순" },
  { key: "rating", label: "평가 좋은 순" }, { key: "gap", label: "한국 평가 격차 큰 순" },
  { key: "per_hour", label: "시간당 가격 싼 순" }, { key: "players", label: "지금 접속자 많은 순" },
];
const PRICE_BANDS = [
  { key: "all", label: "전체", min: 0, max: Infinity }, { key: "u10", label: "1만원 이하", min: 0, max: 10000 },
  { key: "u30", label: "1~3만원", min: 10000, max: 30000 }, { key: "o30", label: "3만원 넘음", min: 30000, max: Infinity },
];
const VERDICT_ORDER: Verdict[] = ["floor", "good", "normal", "wait", "trap", "none"];
const PAGE = 30;   // 처음 30개, "더 보기"마다 30개(사용자 2026-10-09)

export default function DealList({ deals }: { deals: Deal[] }) {
  const [sort, setSort] = useState<Sort>("rank");
  const [band, setBand] = useState("all");
  const [genre, setGenre] = useState("all");
  const [support, setSupport] = useState<KoreanSupport | "all">("all");
  const [mode, setMode] = useState<"all" | "single" | "multi" | "coop">("all");
  const [cheaper, setCheaper] = useState(false);
  const [os, setOs] = useState<"all" | "windows" | "mac" | "linux">("all");
  const [verdicts, setVerdicts] = useState<Set<Verdict>>(new Set());
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const genres = useMemo(() => Array.from(new Set(deals.flatMap((d) => d.game.genres))).sort(), [deals]);

  const shown = useMemo(() => {
    const b = PRICE_BANDS.find((x) => x.key === band)!;
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    const rows = deals.filter(({ game: g, price: p, cheaper_than_steam, search }) =>
      (!cheaper || cheaper_than_steam) &&
      (!q || search.includes(q)) &&
      (p.current_price ?? 0) >= b.min && (p.current_price ?? 0) < b.max &&
      (genre === "all" || g.genres.includes(genre)) &&
      (support === "all" || g.korean_support === support) &&
      (mode === "all" || (g.play_modes ?? []).includes(mode)) &&
      (os === "all" || (g.platforms ?? []).includes(os)) &&
      (verdicts.size === 0 || verdicts.has(p.verdict)));
    const rating = (d: Deal) => pct(d.game.positive_all, d.game.reviews_all) ?? -1;
    return rows.sort((a, b) => {
      switch (sort) {
        case "rank": return (a.game.steam_rank ?? 9999) - (b.game.steam_rank ?? 9999);
        case "discount": return (b.price.discount_pct ?? 0) - (a.price.discount_pct ?? 0);
        case "price_asc": return (a.price.current_price ?? 0) - (b.price.current_price ?? 0);
        case "price_desc": return (b.price.current_price ?? 0) - (a.price.current_price ?? 0);
        case "rating": return rating(b) - rating(a);
        case "gap": return (a.game.gap_pp ?? 0) - (b.game.gap_pp ?? 0);
        case "per_hour": return (pricePerHour(a.price.current_price, a.game.playtime_median_h_all, a.game.playtime_n_all) ?? 1e12)
          - (pricePerHour(b.price.current_price, b.game.playtime_median_h_all, b.game.playtime_n_all) ?? 1e12);
        case "players": return (b.game.current_players ?? -1) - (a.game.current_players ?? -1);
      }
    });
  }, [deals, sort, band, genre, support, mode, os, verdicts, query, cheaper]);
  const cheaperCount = deals.filter((d) => d.cheaper_than_steam).length;
  const visible = shown.slice(0, limit);

  const toggleVerdict = (v: Verdict) => setVerdicts((s) => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; });
  // 폰에서는 두 칸 격자로 꽉 채움(사용자 2026-10-08 밤 "게임 위 필터 오른쪽까지 정리") — 넓은 화면은 예전처럼 내용 폭대로 흐름
  const sel = "rounded-lg px-2 py-1.5 text-sm w-full sm:w-auto min-w-0" as const;
  const selStyle = { background: "var(--card)", border: "1px solid var(--line)", color: "var(--fg)" };

  return (
    <div className="space-y-4">
      {/* 판정 칩 */}
      <div className="flex flex-wrap gap-2">
        {VERDICT_ORDER.map((v) => {
          const on = verdicts.has(v); const c = VERDICT[v]; const n = deals.filter((d) => d.price.verdict === v).length;
          return (
            <button key={v} onClick={() => toggleVerdict(v)} className="rounded-full px-3 py-1 text-sm font-bold transition-opacity"
              style={{ color: c.color, background: c.bg, opacity: verdicts.size && !on ? 0.4 : 1, outline: on ? `2px solid ${c.color}` : "none" }}>
              {c.label} {n}
            </button>
          );
        })}
      </div>
      {/* 검색·필터·정렬 */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} placeholder="게임 이름 검색 (한글·영어)"
          className={`${sel} col-span-2 sm:w-56`} style={selStyle} />
        <select className={sel} style={selStyle} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className={sel} style={selStyle} value={band} onChange={(e) => setBand(e.target.value)}>
          {PRICE_BANDS.map((b) => <option key={b.key} value={b.key}>가격: {b.label}</option>)}
        </select>
        <select className={sel} style={selStyle} value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="all">장르: 전체</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className={sel} style={selStyle} value={support} onChange={(e) => setSupport(e.target.value as KoreanSupport | "all")}>
          <option value="all">한국어: 전체</option>
          <option value="voice_sub">음성·자막</option>
          <option value="sub">자막만</option>
          <option value="none">미지원</option>
        </select>
        <select className={sel} style={selStyle} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="all">플레이: 전체</option>
          <option value="single">싱글</option>
          <option value="multi">멀티</option>
          <option value="coop">협동</option>
        </select>
        <select className={sel} style={selStyle} value={os} onChange={(e) => setOs(e.target.value as typeof os)}>
          <option value="all">운영체제: 전체</option>
          <option value="windows">Windows</option>
          <option value="mac">Mac</option>
          <option value="linux">Linux</option>
        </select>
        <label className={`${sel} col-span-2 flex items-center gap-2 cursor-pointer`} style={selStyle}>
          <input type="checkbox" checked={cheaper} onChange={(e) => { setCheaper(e.target.checked); setLimit(PAGE); }} />
          스팀보다 싼 곳 있음 ({cheaperCount})
        </label>
      </div>
      <p className="text-sm muted">{shown.length}개 게임{shown.length > visible.length ? ` 중 ${visible.length}개 표시` : ""}</p>
      {/* grid-cols-1 = minmax(0,1fr): 이게 없으면 칸이 긴 게임 이름의 폭(min-content)만큼 커져 폰 화면이 옆으로 늘어남(2026-10-08 사용자 "1번 게임 줄에 맞춰") */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 items-stretch">
        {visible.map((d, i) => (
          <div key={d.game.appid} className="fade-up h-full" style={{ animationDelay: `${Math.min(i % PAGE, 12) * 60}ms` }}><GameCard deal={d} /></div>
        ))}
      </div>
      {shown.length === 0 && <p className="muted py-8 text-center">조건에 맞는 게임이 없습니다.</p>}
      {shown.length > visible.length && (
        <div className="flex justify-center">
          <button onClick={() => setLimit((n) => n + PAGE)} className="rounded-xl px-6 py-3 font-bold" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
            더 보기 ({shown.length - visible.length}개 남음)
          </button>
        </div>
      )}
    </div>
  );
}
