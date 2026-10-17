// data 폴더의 JSON을 읽는다(빌드 때 한 번). 수집 스크립트(collector)가 쓰는 파일과 모양이 같다.
import fs from "node:fs";
import path from "node:path";

export type KoreanSupport = "voice_sub" | "sub" | "none";
export type Verdict = "none" | "floor" | "good" | "normal" | "wait" | "trap";

export interface Game {
  appid: number;
  name: string;
  genres: string[];
  korean_support: KoreanSupport;
  header_image: string | null;
  capsule_image?: string | null;     // 616×353
  hero_image?: string | null;        // 3840×1240 (없는 게임도 있음)
  release_date: string | null;
  steam_url: string;
  reviews_all: number;
  positive_all: number;
  reviews_ko: number;
  positive_ko: number;
  gap_pp: number | null;
  // 리뷰어 플레이 시간(최근 리뷰 100개 표본, 시간 단위) — 스팀 리뷰 API
  playtime_median_h_all?: number | null;
  playtime_n_all?: number;
  under_2h_pct_all?: number | null;     // 2시간 미만(환불 가능 구간)에 쓴 리뷰 비율
  playtime_median_h_ko?: number | null;
  playtime_n_ko?: number;
  under_2h_pct_ko?: number | null;
  platforms?: ("windows" | "mac" | "linux")[];
  play_modes?: ("single" | "multi" | "coop")[];
  controller?: "full" | "partial" | "none";
  steam_rank?: number | null;          // 스팀 '특별 할인 · 판매 순' 검색 순위
  editions?: { name: string; price: number; regular: number; cut: number; packageid: number | null }[];   // 스팀 판별 가격
  deck?: "verified" | "playable" | "unsupported" | "unknown";   // 스팀덱 호환
  metacritic?: number | null;                                   // 메타크리틱 점수(스팀 상점 제공분만, 2026-10-08)
  screenshots?: { thumb: string | null; full: string }[];        // 스팀 상점 스크린샷 최대 6장(2026-10-09)
  trailer?: { hls: string; poster: string | null; name: string | null } | null;   // 첫 예고편(HLS m3u8 — 스팀이 mp4를 더는 안 줌)
  short_description?: string | null;                           // 스팀 상점 한 줄 소개
  korean_reviews?: { text: string; votes_up: number; hours: number; recommended: boolean; url: string | null }[];   // 한국어 추천 리뷰 인용
  // 지금 접속자 — 스팀 공식 Web API
  current_players?: number | null;
  players_at?: string;
  updated_at: string;
}

export interface Offer {
  appid: number;
  store_id: string;
  store_name: string;
  price_original: number;
  currency: string;
  regular_original: number | null;
  discount_pct: number;
  price_krw: number;            // 실제 결제 추정(외화면 수수료 포함)
  is_estimate: boolean;         // true 면 "약"
  product_url: string | null;
  affiliate: string | null;     // "itad" = IsThereAnyDeal 추적 링크
  drm: string[];
  region_lock: "kr" | "global" | "unknown";
  korean_only_here: boolean;
  sale_end_at: string | null;
  fetched_at: string;
  matched_by?: "link" | "title" | "manual" | null;
  editions?: { name: string; price: number | null; regular?: number | null; cut: number }[];   // 다이렉트 게임즈: 디럭스 등 다른 판
}

export interface Store {
  id: string; name: string; url: string; currency: string; krw_payment: boolean;
  region_lock_default: "kr" | "global" | "unknown"; korean_account_ok: boolean;
  refund: { possible: boolean; note: string }; official: boolean; enabled: boolean;
}

export interface Price {
  appid: number;
  itad_id?: string | null;
  all_stores_low?: number | null;   // 모든 판매처 포함 역대 최저가(IsThereAnyDeal, KR)
  regular_price: number | null;
  current_price: number | null;
  discount_pct: number | null;
  sale_end_at: string | null;
  historical_low: number | null;
  historical_low_at: string | null;
  usual_sale_price: number | null;
  sale_count_24m: number;
  vs_usual_pct: number | null;
  verdict: Verdict;
  verdict_label: string;
  tags: string[];
  fetched_at: string;
}

export interface HistoryPoint {
  appid: number;
  at: string;
  price: number;
  regular: number | null;
  cut: number;
}

export interface Run {
  week: string;
  started_at: string;
  finished_at: string;
  game_count: number;
}

export interface Video {
  video_id: string;
  title: string;
  kind: "shorts" | "long";
  published_at: string;
  appids: number[];
  hidden?: boolean;      // 관리자가 지운 영상(2026-10-11): 줄은 남기되 어디에도 보이지 않음
  names?: Record<string, string>;     // 2026-10-11: 게임 이름(수집 대상이 아닌 게임도 번호 대신 이름으로)
  chapters?: Record<string, number>;  // 2026-10-11: 게임별 영상 시작 초(유튜브 챕터) → "03:59부터 보기"
}

function dataDir(): string {
  // 저장소 구조: <루트>/data 와 <루트>/web. Vercel에서 web 을 루트로 잡아도 ../data 를 읽는다.
  for (const candidate of [path.join(process.cwd(), "..", "data"), path.join(process.cwd(), "data")]) {
    if (fs.existsSync(path.join(candidate, "games.json"))) return candidate;
  }
  throw new Error("data 폴더를 찾지 못했습니다. collector.run_weekly 를 먼저 실행하세요.");
}

function read<T>(name: string): T[] {
  const file = path.join(dataDir(), `${name}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T[];
}

export const games = (): Game[] => read<Game>("games");

// 2026-10-17: 출시 예정 신작(collector/upcoming.py). 사이트 /upcoming
export interface Upcoming {
  appid: number; name: string; release_text: string; release_at: string | null; release_precision: "day" | "month" | "quarter" | "year" | "unknown";
  price: number | null; korean_support: KoreanSupport; genres: string[]; header_image: string | null; platforms: string[];
  short_description: string | null; developers: string[]; steam_url: string; popular_rank: number | null; wishlist_rank: number | null;
}
export function upcoming(): { updated_at: string | null; items: Upcoming[] } {
  const file = path.join(dataDir(), "upcoming.json");
  if (!fs.existsSync(file)) return { updated_at: null, items: [] };
  const d = JSON.parse(fs.readFileSync(file, "utf-8")) as { updated_at?: string; items?: Upcoming[] };
  return { updated_at: d.updated_at ?? null, items: d.items ?? [] };
}

// 2026-10-16: 지금 무료인 게임(에픽 주간 무료 + 스팀 100% 할인). collector/free_games.py 가 만든다.
export interface FreeGame { source: "epic" | "steam"; title: string; status: "now" | "upcoming"; start: string | null; end: string | null; url: string; image: string | null; regular_price_krw: number | null; appid?: number }
export function freeGames(): FreeGame[] {
  const file = path.join(dataDir(), "free_games.json");
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf-8")) as { items?: FreeGame[] }).items ?? [];
}
export const prices = (): Price[] => read<Price>("prices");
export const history = (): HistoryPoint[] => read<HistoryPoint>("price_history");
export const runs = (): Run[] => read<Run>("runs");
// 영상 프로그램이 올린 영상만. 유튜브 영상 번호는 11글자라서 시험용 줄("testVideo" 등)은 걸러낸다.
// 2026-10-11 (사용자): 롱폼만, 관리자가 지운 영상 제외. 2026-10-15 (사용자 "쇼츠 다른 페이지"): 종류별로 나눈다.
const videoRows = (kind: "long" | "shorts"): Video[] => read<Video>("videos")
  .filter((v) => /^[A-Za-z0-9_-]{11}$/.test(String(v.video_id ?? "")) && v.kind === kind && !v.hidden);
export const videos = (): Video[] => videoRows("long");
export const shorts = (): Video[] => videoRows("shorts");

/** 유튜브에서 공개 상태인지(oEmbed가 200이면 공개·일부공개, 비공개·삭제는 401/404). 실패하면 보수적으로 "모름"(false). */
export async function isPublicOnYouTube(videoId: string): Promise<boolean> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${videoId}&format=json`,
      { next: { revalidate: 1800 } });
    return r.ok;
  } catch { return false; }
}

export function game(appid: number): { game: Game; price: Price; history: HistoryPoint[] } | null {
  const g = games().find((x) => x.appid === appid);
  const p = prices().find((x) => x.appid === appid);
  if (!g || !p) return null;
  return { game: g, price: p, history: history().filter((x) => x.appid === appid) };
}

export interface Rules {
  history_months: number;
  min_sales_for_verdict: number;
  good_price_cheaper_pct: number;
  wait_pricier_pct: number;
  trap_pricier_pct: number;
  korea_warning_gap_pp: number;
  korea_warning_min_reviews: number;
  collect_min_reviews: number;
  foreign_card_fee_pct?: number;
}

export function rules(): Rules {
  const file = path.join(dataDir(), "..", "config", "rules.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Rules;
}

/** 검색용 한글 별명: config/aliases.json(손으로) + 다이렉트 게임즈 한글 제목(자동) */
export function aliases(): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const file = path.join(dataDir(), "..", "config", "aliases.json");
  if (fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, string[]>;
    for (const [k, v] of Object.entries(raw)) if (/^\d+$/.test(k) && Array.isArray(v)) out.set(Number(k), [...v]);
  }
  const cache = path.join(dataDir(), "directg_cache.json");
  if (fs.existsSync(cache)) {
    const products = (JSON.parse(fs.readFileSync(cache, "utf-8")) as { products: Record<string, { title: string; appid_hint: number | null }> }).products;
    for (const p of Object.values(products)) if (p.appid_hint && p.title) out.set(p.appid_hint, [...(out.get(p.appid_hint) ?? []), p.title]);
  }
  return out;
}

export interface Season { name: string; start: string; end: string; confirmed: boolean }

export function seasons(): Season[] {
  const file = path.join(dataDir(), "..", "config", "steam_seasons.json");
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf-8")) as { seasons: Season[] }).seasons;
}

// 2026-10-16 (사용자 "시즌 달력 맞춰서 폰에서 보고 준비"): 시즌 세일 + 페스티벌 전체. 달력 페이지의 "영상 올릴 날"에 씀.
export interface SteamEvent { name: string; kind: "sale" | "fest"; start: string; end: string; confirmed: boolean; tip?: string }

export function steamEvents(): SteamEvent[] {
  const file = path.join(dataDir(), "..", "config", "steam_seasons.json");
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf-8")) as { events?: SteamEvent[] }).events ?? [];
}

export interface ReviewPoint { appid: number; at: string; reviews_all: number; positive_all: number; reviews_ko: number; positive_ko: number; current_players: number | null }
export const reviewHistory = (): ReviewPoint[] => read<ReviewPoint>("review_history");
export const pricesPrev = (): Price[] => read<Price>("prices_prev");

export interface ReviewSummary {
  appid: number; week: string; created_at: string;
  reasons?: string[]; summary?: string; sample?: number;              // 싫어한 이유(비추천 리뷰)
  likes?: string[]; likes_summary?: string; likes_sample?: number;    // 좋아한 이유(추천 리뷰)
}
export const reviewSummaries = (): ReviewSummary[] => read<ReviewSummary>("review_summaries");
/** 한 게임의 가장 최근 요약 */
export function reviewSummaryFor(appid: number): ReviewSummary | null {
  return reviewSummaries().filter((r) => r.appid === appid).sort((a, b) => b.week.localeCompare(a.week))[0] ?? null;
}

export const offers = (): Offer[] => read<Offer>("offers");
export const storesList = (): Store[] => read<Store>("stores");

/** 한 게임의 판매처 가격, 실제 결제 금액 순 */
export function offersFor(appid: number, all: Offer[] = offers()): Offer[] {
  return all.filter((o) => o.appid === appid).sort((a, b) => a.price_krw - b.price_krw);
}

// 목록(홈·순위·찜·달력)에 넘기는 가벼운 줄. 2026-10-11: 홈 HTML이 1.9MB(게임마다 리뷰 인용·스크린샷·예고편까지 실림)라
// 목록이 실제로 쓰는 칸만 추린다. 상세 화면은 game(appid)으로 전체를 읽는다.
export type ListGame = Pick<Game, "appid" | "name" | "genres" | "korean_support" | "header_image" | "capsule_image" | "release_date"
  | "reviews_all" | "positive_all" | "reviews_ko" | "positive_ko" | "gap_pp" | "playtime_median_h_all" | "playtime_n_all"
  | "playtime_median_h_ko" | "playtime_n_ko" | "platforms" | "play_modes" | "steam_rank" | "metacritic" | "current_players">;
export type ListPrice = Pick<Price, "appid" | "regular_price" | "current_price" | "discount_pct" | "sale_end_at" | "historical_low"
  | "historical_low_at" | "usual_sale_price" | "sale_count_24m" | "vs_usual_pct" | "verdict" | "tags">;
export type ListOffer = Pick<Offer, "store_id" | "store_name" | "price_krw" | "is_estimate">;

export interface Deal {
  game: ListGame; price: ListPrice;
  cheapest: ListOffer | null;       // 가장 싼 판매처(스팀 포함)
  cheaper_than_steam: boolean;      // 스팀보다 싼 곳이 있나
  search: string;                   // 검색용: 이름 + 한글 별명 (소문자, 공백 제거)
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

const slimGame = (g: Game): ListGame => ({
  appid: g.appid, name: g.name, genres: g.genres, korean_support: g.korean_support, header_image: g.header_image, capsule_image: g.capsule_image ?? null,
  release_date: g.release_date, reviews_all: g.reviews_all, positive_all: g.positive_all, reviews_ko: g.reviews_ko, positive_ko: g.positive_ko, gap_pp: g.gap_pp,
  playtime_median_h_all: g.playtime_median_h_all ?? null, playtime_n_all: g.playtime_n_all ?? 0, playtime_median_h_ko: g.playtime_median_h_ko ?? null, playtime_n_ko: g.playtime_n_ko ?? 0,
  platforms: g.platforms ?? [], play_modes: g.play_modes ?? [], steam_rank: g.steam_rank ?? null, metacritic: g.metacritic ?? null, current_players: g.current_players ?? null,
});
const slimPrice = (p: Price): ListPrice => ({
  appid: p.appid, regular_price: p.regular_price, current_price: p.current_price, discount_pct: p.discount_pct, sale_end_at: p.sale_end_at,
  historical_low: p.historical_low, historical_low_at: p.historical_low_at, usual_sale_price: p.usual_sale_price, sale_count_24m: p.sale_count_24m,
  vs_usual_pct: p.vs_usual_pct, verdict: p.verdict, tags: p.tags,
});

export function deals(): Deal[] {
  const byId = new Map(prices().map((p) => [p.appid, p]));
  const all = offers();
  const alias = aliases();
  return games().flatMap((g) => {
    const p = byId.get(g.appid);
    if (!p) return [];
    const list = offersFor(g.appid, all);
    const cheapest = list[0] ?? null;
    const steam = list.find((o) => o.store_id === "steam");
    const steamPrice = steam?.price_krw ?? p.current_price ?? Infinity;
    const search = [g.name, ...(alias.get(g.appid) ?? [])].map(squash).join("|");
    return [{
      game: slimGame(g), price: slimPrice(p),
      cheapest: cheapest ? { store_id: cheapest.store_id, store_name: cheapest.store_name, price_krw: cheapest.price_krw, is_estimate: cheapest.is_estimate } : null,
      cheaper_than_steam: !!cheapest && cheapest.store_id !== "steam" && cheapest.price_krw < steamPrice, search,
    }];
  });
}

export function lastUpdated(): string | null {
  const r = runs();
  return r.length ? r[0].finished_at : null;
}
