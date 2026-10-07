import type { Game } from "@/lib/data";

// 한국 반응 한 줄: 스팀 한국어 리뷰 중 '도움이 됨' 많은 것 인용(원문 링크·출처 표기)
export default function KoreanReviews({ game }: { game: Game }) {
  const rows = game.korean_reviews ?? [];
  if (rows.length === 0) return null;
  return (
    <section className="card p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">한국 게이머 한마디</h2>
        <span className="text-xs muted">스팀 한국어 리뷰 · 도움이 됨 많은 순 · 원문 링크</span>
      </div>
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold h-fit" style={r.recommended ? { background: "#dcfce7", color: "#15803d" } : { background: "#fee2e2", color: "#b91c1c" }}>
              {r.recommended ? "추천" : "비추천"}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm leading-relaxed">“{r.text}”</p>
              <p className="text-xs muted">
                {r.hours}시간 플레이 · 도움이 됨 {r.votes_up}
                {r.url && <> · <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">원문 보기</a></>}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs muted">리뷰 저작권은 작성자에게 있으며 일부만 인용했습니다. 출처: Steam</p>
    </section>
  );
}
