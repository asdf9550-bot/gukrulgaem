import type { Deal, Price } from "./data";

// 홈 "오늘 바뀐 것": 어제 가격(prices_prev.json)과 비교
export interface Changes {
  newFloor: Deal[];      // 어제는 아니었는데 오늘 바닥가
  newDeals: Deal[];      // 어제 목록에 없던 게임(새 할인)
  endingSoon: Deal[];    // 24시간 안에 세일 종료
  bigger: Deal[];        // 어제보다 할인율이 커진 게임
}

export function todayChanges(deals: Deal[], prev: Price[], now = Date.now()): Changes {
  const before = new Map(prev.map((p) => [p.appid, p]));
  const day = 86_400_000;
  const newFloor = deals.filter((d) => d.price.verdict === "floor" && before.has(d.game.appid) && before.get(d.game.appid)!.verdict !== "floor");
  const newDeals = prev.length ? deals.filter((d) => !before.has(d.game.appid)) : [];
  const endingSoon = deals.filter((d) => d.price.sale_end_at && new Date(d.price.sale_end_at).getTime() - now < day && new Date(d.price.sale_end_at).getTime() > now)
    .sort((a, b) => (b.price.discount_pct ?? 0) - (a.price.discount_pct ?? 0));
  const bigger = deals.filter((d) => before.has(d.game.appid) && (d.price.discount_pct ?? 0) > (before.get(d.game.appid)!.discount_pct ?? 0) + 4);
  const byRank = (a: Deal, b: Deal) => (a.game.steam_rank ?? 9999) - (b.game.steam_rank ?? 9999);
  return { newFloor: newFloor.sort(byRank), newDeals: newDeals.sort(byRank), endingSoon, bigger: bigger.sort(byRank) };
}
