import { NextRequest, NextResponse } from "next/server";
import { deals } from "@/lib/data";

// 스팀 공개 프로필의 위시리스트를 읽어 우리 할인 목록과 맞춰 준다.
// 필요한 환경 변수: STEAM_WEB_API_KEY (steamcommunity.com/dev/apikey 에서 무료 발급). 프로필·위시리스트가 '공개'여야 함.
export const dynamic = "force-dynamic";

async function resolveSteamId(input: string, key: string): Promise<string | null> {
  const s = input.trim();
  const m = s.match(/(\d{17})/);
  if (m) return m[1];
  const vanity = s.replace(/^https?:\/\/steamcommunity\.com\/id\//i, "").replace(/\/.*$/, "");
  if (!/^[\w-]{2,64}$/.test(vanity)) return null;
  const r = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`, { cache: "no-store" });
  const j = await r.json().catch(() => ({})) as { response?: { success?: number; steamid?: string } };
  return j.response?.success === 1 ? j.response.steamid ?? null : null;
}

export async function GET(req: NextRequest) {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) return NextResponse.json({ error: "아직 스팀 연동 준비가 안 됐어요." }, { status: 503 });
  const input = req.nextUrl.searchParams.get("steam") ?? "";
  const steamid = await resolveSteamId(input, key);
  if (!steamid) return NextResponse.json({ error: "스팀 ID를 찾지 못했어요. 프로필 주소(steamcommunity.com/id/이름 또는 /profiles/숫자)를 넣어 주세요." }, { status: 404 });
  const r = await fetch(`https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${key}&steamid=${steamid}`, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "위시리스트를 읽지 못했어요. 프로필과 게임 정보가 '공개'인지 확인해 주세요." }, { status: 502 });
  const j = await r.json().catch(() => ({})) as { response?: { items?: { appid: number; priority?: number; date_added?: number }[] } };
  const items = j.response?.items ?? [];
  if (items.length === 0) return NextResponse.json({ steamid, total: 0, matched: [] });
  const wanted = new Set(items.map((i) => i.appid));
  const matched = deals().filter((d) => wanted.has(d.game.appid)).map((d) => ({
    appid: d.game.appid, name: d.game.name, price: d.price.current_price, regular: d.price.regular_price, discount: d.price.discount_pct,
    verdict: d.price.verdict, verdict_label: d.price.verdict_label, sale_end_at: d.price.sale_end_at, image: d.game.capsule_image ?? d.game.header_image,
    cheapest: d.cheapest ? { store: d.cheapest.store_name, price: d.cheapest.price_krw } : null,
  }));
  const order = { floor: 0, good: 1, normal: 2, none: 3, wait: 4, trap: 5 } as Record<string, number>;
  matched.sort((a, b) => order[a.verdict] - order[b.verdict] || (b.discount ?? 0) - (a.discount ?? 0));
  return NextResponse.json({ steamid, total: items.length, matched });
}
