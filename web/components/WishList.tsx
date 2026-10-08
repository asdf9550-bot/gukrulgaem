"use client";
import GameCard from "@/components/GameCard";
import type { Deal } from "@/lib/data";
import { VERDICT, won } from "@/lib/format";
import { useWish } from "@/lib/wish";

// 찜 페이지 본문: 찜한 게임만 모아 총액·절약액·판정 요약
export default function WishList({ deals }: { deals: Deal[] }) {
  const [ids, toggle, ready] = useWish();
  const byId = new Map(deals.map((d) => [d.game.appid, d]));
  const mine = ids.map((id) => byId.get(id)).filter((d): d is Deal => !!d);
  const missing = ids.length - mine.length;
  const total = mine.reduce((s, d) => s + (d.price.current_price ?? 0), 0);
  const regular = mine.reduce((s, d) => s + (d.price.regular_price ?? 0), 0);
  const counts = mine.reduce<Record<string, number>>((m, d) => ((m[d.price.verdict] = (m[d.price.verdict] ?? 0) + 1), m), {});
  const buyNow = mine.filter((d) => d.price.verdict === "floor" || d.price.verdict === "good");
  const wait = mine.filter((d) => d.price.verdict === "wait" || d.price.verdict === "trap");

  if (!ready) return <p className="muted">불러오는 중…</p>;
  if (ids.length === 0) return (
    <div className="card p-8 text-center space-y-2">
      <p className="font-bold">아직 찜한 게임이 없어요.</p>
      <p className="text-sm muted">목록이나 게임 페이지의 ♡ 를 누르면 여기에 모여요. 로그인 없이 이 브라우저에만 저장돼요.</p>
    </div>
  );
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { k: "찜한 게임", v: `${mine.length}개` },
          { k: "지금 다 사면", v: won(total) },
          { k: "정가보다 절약", v: won(regular - total) },
          { k: "판정", v: Object.entries(counts).map(([k, n]) => `${VERDICT[k as keyof typeof VERDICT].label} ${n}`).join(" · ") || "-" },
        ].map((c) => (
          <div key={c.k} className="card p-4"><div className="text-xs muted">{c.k}</div><div className="font-extrabold text-xl truncate">{c.v}</div></div>
        ))}
      </section>
      {(buyNow.length > 0 || wait.length > 0) && (
        <p className="text-sm">
          {buyNow.length > 0 && <span style={{ color: "#16a34a" }} className="font-bold">지금 사도 좋은 것 {buyNow.length}개</span>}
          {buyNow.length > 0 && wait.length > 0 && " · "}
          {wait.length > 0 && <span style={{ color: "#b45309" }} className="font-bold">기다리는 게 나은 것 {wait.length}개</span>}
          {missing > 0 && <span className="muted"> · 할인이 끝나 목록에서 빠진 것 {missing}개</span>}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 items-stretch">
        {mine.map((d) => (
          <div key={d.game.appid} className="relative h-full">
            <GameCard deal={d} />
            <button onClick={() => toggle(d.game.appid)} className="absolute right-2 top-2 text-xs underline muted">빼기</button>
          </div>
        ))}
      </div>
    </div>
  );
}
