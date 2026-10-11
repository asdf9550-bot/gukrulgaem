// RSS 피드(2026-10-11): 새 바닥가 · 새 할인 · 오늘 안에 끝나는 세일 · 이번 주 국룰. 30분마다 다시 만든다.
// 구독기, 디스코드·텔레그램 봇, 구글 디스커버가 읽는다. 데이터는 매일 새벽 수집 결과(prices_prev와 비교).
import { deals, lastUpdated, pricesPrev } from "@/lib/data";
import { todayChanges } from "@/lib/changes";
import { weeklyPicks } from "@/lib/pick";
import { KIND, kindOf } from "@/lib/kind";
import { won } from "@/lib/format";
import type { Deal } from "@/lib/data";

export const revalidate = 1800;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gukrulgaem.com";
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

function item(d: Deal, section: string, updated: string) {
  const k = KIND[kindOf(d.price, d.game)];
  const title = `[${section}] ${d.game.name} ${won(d.price.current_price)} (-${d.price.discount_pct ?? 0}%) · ${k.label}`;
  const bits = [
    `정가 ${won(d.price.regular_price)} → ${won(d.price.current_price)} (${d.price.discount_pct ?? 0}% 할인)`,
    `역대 최저 ${won(d.price.historical_low)} · ${k.short}`,
    d.price.sale_end_at ? `세일 종료 ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric" }).format(new Date(d.price.sale_end_at))}` : "",
    d.game.reviews_all ? `전체 긍정 ${Math.round(d.game.positive_all / d.game.reviews_all * 100)}%${d.game.reviews_ko ? ` · 한국 긍정 ${Math.round(d.game.positive_ko / d.game.reviews_ko * 100)}%` : ""}` : "",
  ].filter(Boolean);
  const link = `${SITE}/game/${d.game.appid}`;
  // guid에 날짜를 넣어 같은 게임이 다른 날 다시 바닥가가 되면 새 글로 보이게 한다
  return `<item><title>${esc(title)}</title><link>${link}</link><guid isPermaLink="false">${d.game.appid}-${section}-${updated.slice(0, 10)}</guid>` +
    `<pubDate>${new Date(updated).toUTCString()}</pubDate><description>${esc(bits.join(" · "))}</description>` +
    (d.game.header_image ? `<enclosure url="${esc(d.game.header_image)}" type="image/jpeg" length="0"/>` : "") + `</item>`;
}

export function GET() {
  const rows = deals();
  const updated = lastUpdated() ?? new Date().toISOString();
  const c = todayChanges(rows, pricesPrev());
  const picks = weeklyPicks(rows);
  const seen = new Set<number>();
  const take = (list: Deal[], section: string, max: number) => list.filter((d) => !seen.has(d.game.appid)).slice(0, max).map((d) => { seen.add(d.game.appid); return item(d, section, updated); });
  const items = [
    ...take(picks, "이번 주 국룰", 5),
    ...take(c.newFloor, "새로 바닥가", 20),
    ...take(c.endingSoon, "오늘 안에 끝남", 10),
    ...take(c.newDeals, "새 할인", 20),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>국룰겜 — 스팀 할인 판정</title>
<link>${SITE}/</link>
<atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
<description>한국 스팀 가격 기록과 한국 게이머 평가로 판정한 오늘의 바닥가·새 할인·곧 끝나는 세일</description>
<language>ko</language>
<lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>
<image><url>${SITE}/brand/logo-512.png</url><title>국룰겜</title><link>${SITE}/</link></image>
${items.join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
}
