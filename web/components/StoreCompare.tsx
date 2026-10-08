import type { Offer, Price, Store } from "@/lib/data";
import { kst, won } from "@/lib/format";

const DRM: Record<string, string> = { "Drm Free": "DRM 없음", Steam: "스팀 키", Epic: "에픽", GOG: "GOG", "Ubisoft Connect": "유비 커넥트", "EA app": "EA 앱", "Microsoft Store": "MS 스토어", "Battle.net": "배틀넷" };

function Badge({ children, tone }: { children: React.ReactNode; tone: "good" | "warn" | "bad" | "plain" }) {
  const t = { good: { background: "#dcfce7", color: "#15803d" }, warn: { background: "#fef3c7", color: "#b45309" },
    bad: { background: "#fee2e2", color: "#b91c1c" }, plain: { background: "var(--line)", color: "var(--muted)" } }[tone];
  return <span className="rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap" style={t}>{children}</span>;
}

// "어디서 사야 제일 싸나" 카드: 실제 결제 금액 순 판매처 표
export default function StoreCompare({ offers, price, stores }: { offers: Offer[]; price: Price; stores: Store[] }) {
  if (offers.length === 0) return null;
  const byId = new Map(stores.map((s) => [s.id, s]));
  const best = offers[0];
  const allLow = price.all_stores_low ?? null;
  const vsLow = allLow != null && allLow > 0 ? Math.round((best.price_krw - allLow) / allLow * 100) : null;
  const steam = offers.find((o) => o.store_id === "steam");
  const saveVsSteam = steam && best.store_id !== "steam" ? steam.price_krw - best.price_krw : 0;

  return (
    <section className="card p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">어디서 사야 제일 싸나</h2>
          <p className="text-sm muted">공식 판매처 {offers.length}곳 · 실제 결제 금액 순{saveVsSteam > 0 ? ` · 스팀보다 ${won(saveVsSteam)} 싼 곳 있음` : " · 스팀이 가장 쌈"}</p>
        </div>
        {allLow != null && (
          <div className="text-right">
            <div className="text-xs muted">모든 판매처 포함 역대 최저가 {won(allLow)}</div>
            <div className="text-2xl font-extrabold" style={{ color: vsLow != null && vsLow <= 0 ? "#16a34a" : vsLow != null && vsLow <= 15 ? "#1d4ed8" : "#b45309" }}>
              {vsLow == null ? "-" : vsLow <= 0 ? "역대 최저가 수준" : `역대 최저가 대비 +${vsLow}%`}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead className="muted text-xs">
            {/* 폰(640px 미만)에서는 할인·참고 칸을 숨기고 참고 표시는 판매처 이름 아래에 둠 → 표가 옆으로 안 밀림(2026-10-08 모바일) */}
            <tr className="text-left"><th className="px-2 py-1 font-normal">판매처</th><th className="px-2 py-1 font-normal text-right">실제 결제</th><th className="px-2 py-1 font-normal hidden sm:table-cell">할인</th><th className="px-2 py-1 font-normal hidden sm:table-cell">참고</th><th className="px-2 py-1" /></tr>
          </thead>
          <tbody>
            {offers.map((o, i) => {
              const s = byId.get(o.store_id);
              const top = i === 0;
              return (
                <tr key={o.store_id} style={top ? { background: "color-mix(in srgb, #22c55e 12%, transparent)" } : undefined} className="border-t" >
                  <td className="px-2 py-2 font-bold whitespace-nowrap" style={{ borderColor: "var(--line)" }}>
                    {top && <span className="mr-1" style={{ color: "#16a34a" }}>★</span>}{o.store_name}
                    {o.drm.length > 0 && <span className="muted font-normal text-xs"> · {o.drm.map((d) => DRM[d] ?? d).join("/")}</span>}
                    {o.editions && o.editions.length > 0 && (
                      <div className="muted font-normal text-[11px] mt-0.5">{o.editions.slice(0, 2).map((e) => `${e.name.replace(/^.*?(디럭스|얼티밋|골드|프리미엄|컬렉션|완전판|업그레이드|시즌 패스)/, "$1")} ${e.price?.toLocaleString("ko-KR") ?? "-"}원`).join(" · ")}</div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1 font-normal whitespace-normal sm:hidden">
                      {o.discount_pct > 0 && <span className="font-bold text-xs" style={{ color: "#ef4444" }}>-{o.discount_pct}%</span>}
                      {s?.krw_payment ? <Badge tone="good">원화 결제</Badge> : <Badge tone="warn">외화 결제</Badge>}
                      {o.region_lock === "kr" && <Badge tone="plain">한국 지역</Badge>}
                      {o.korean_only_here && <Badge tone="good">여기만 한국어</Badge>}
                      {s && !s.refund.possible && <Badge tone="bad">환불 불가</Badge>}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <span className={`font-extrabold ${top ? "text-lg" : ""}`}>{o.is_estimate ? "약 " : ""}{won(o.price_krw)}</span>
                    {o.is_estimate && <div className="text-[11px] muted">환산 {won(o.price_original)} + 수수료</div>}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap hidden sm:table-cell">{o.discount_pct > 0 ? <span className="font-bold" style={{ color: "#ef4444" }}>-{o.discount_pct}%</span> : <span className="muted">정가</span>}</td>
                  <td className="px-2 py-2 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {s?.krw_payment ? <Badge tone="good">원화 결제</Badge> : <Badge tone="warn">외화 결제</Badge>}
                      {o.region_lock === "kr" && <Badge tone="plain">한국 지역</Badge>}
                      {o.korean_only_here && <Badge tone="good">여기만 한국어</Badge>}
                      {s && !s.refund.possible && <Badge tone="bad">환불 불가</Badge>}
                      {o.sale_end_at && <Badge tone="plain">~{kst(o.sale_end_at)}</Badge>}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    {o.product_url && (
                      <a href={o.product_url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: top ? "#16a34a" : "#374151" }}>
                        이동{o.affiliate ? <span className="hidden sm:inline"> · 제휴 링크</span> : ""}
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs muted">
        외화 판매처 금액은 그날 환율로 환산한 값에 해외 결제 수수료를 더한 <b>추정치</b>예요. 판매처 키는 스팀과 달리 환불이 안 될 수 있어요. 결제 전 판매처에서 가격·지역 제한·환불 조건을 확인하세요.
        판매처 가격·역대 최저가 출처: IsThereAnyDeal.
      </p>
    </section>
  );
}
