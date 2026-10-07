import type { Game, Offer } from "@/lib/data";
import { editionKind, KIND_LABEL, KIND_ORDER, type EditionKind } from "@/lib/editions";
import { won } from "@/lib/format";

type Cell = { price: number; regular: number; cut: number; name: string };

// 판 비교 표: 세로 = 일반판·디럭스·…, 가로 = 판매처(스팀·다이렉트 게임즈). 디럭스엔 "일반판 + N원".
export default function EditionCompare({ game, offers }: { game: Game; offers: Offer[] }) {
  const stores: { id: string; name: string; cells: Map<EditionKind, Cell> }[] = [];

  // 스팀: games.json 의 editions
  const steam = new Map<EditionKind, Cell>();
  for (const e of game.editions ?? []) {
    const k = editionKind(e.name, game.name);
    if (!steam.has(k) || e.price < steam.get(k)!.price) steam.set(k, { price: e.price, regular: e.regular, cut: e.cut, name: e.name });
  }
  if (steam.size === 0 && game.editions === undefined) return null;
  stores.push({ id: "steam", name: "스팀", cells: steam });

  // 다이렉트 게임즈 등: offers 의 일반판 + editions
  for (const o of offers) {
    if (o.store_id === "steam") continue;
    const cells = new Map<EditionKind, Cell>();
    cells.set("standard", { price: o.price_krw, regular: o.regular_original ?? o.price_krw, cut: o.discount_pct, name: o.store_name });
    for (const e of o.editions ?? []) {
      if (e.price == null) continue;
      const k = editionKind(e.name, game.name);
      if (k === "standard") continue;
      if (!cells.has(k) || e.price < cells.get(k)!.price) cells.set(k, { price: e.price, regular: e.regular ?? e.price, cut: e.cut, name: e.name });
    }
    if (cells.size > 1) stores.push({ id: o.store_id, name: o.store_name, cells });
  }

  const kinds = KIND_ORDER.filter((k) => stores.some((s) => s.cells.has(k)));
  const hasEditions = kinds.some((k) => k !== "standard");
  if (!hasEditions) return null;
  const base = steam.get("standard")?.price ?? null;

  return (
    <section className="card p-4 sm:p-5 space-y-3">
      <div>
        <h2 className="text-lg font-bold">판 비교 — 디럭스는 얼마나 더 내나</h2>
        <p className="text-sm muted">판별 가격과 할인율. "일반판 + N원"은 스팀 일반판 지금 가격 기준 추가 금액이에요. 판정(바닥가 등)은 일반판에만 붙어요.</p>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead className="muted text-xs">
            <tr className="text-left">
              <th className="px-2 py-1 font-normal">판</th>
              {stores.map((s) => <th key={s.id} className="px-2 py-1 font-normal text-right">{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => {
              const prices = stores.map((s) => s.cells.get(k)?.price).filter((p): p is number => p != null);
              const best = prices.length ? Math.min(...prices) : null;
              return (
                <tr key={k} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="font-bold">{KIND_LABEL[k]}</div>
                    {k !== "standard" && base != null && steam.get(k) && (
                      <div className="text-xs" style={{ color: "#b45309" }}>일반판 + {won(steam.get(k)!.price - base)}</div>
                    )}
                  </td>
                  {stores.map((s) => {
                    const c = s.cells.get(k);
                    if (!c) return <td key={s.id} className="px-2 py-2 text-right muted">-</td>;
                    const top = stores.length > 1 && best != null && c.price === best;
                    return (
                      <td key={s.id} className="px-2 py-2 text-right whitespace-nowrap">
                        <span className="font-extrabold" style={top ? { color: "#16a34a" } : undefined}>{won(c.price)}</span>
                        {c.cut > 0 && <span className="ml-1 text-xs font-bold" style={{ color: "#ef4444" }}>-{c.cut}%</span>}
                        {c.cut > 0 && <div className="text-[11px] muted line-through">{won(c.regular)}</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs muted">스팀 판 이름: {(game.editions ?? []).map((e) => e.name).join(" · ")}</p>
    </section>
  );
}
