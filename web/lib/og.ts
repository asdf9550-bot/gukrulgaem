// 공유 미리보기 그림(OG)용 글꼴: 구글 폰트에서 "필요한 글자만" 담은 작은 TTF를 받아 쓴다.
// 전체 한글 글꼴은 수 MB라서 text= 로 부분 글꼴을 요청한다. 게임마다 따로 받으면 빌드 때 수백 번 요청해
// 실패하기 쉬우므로, 모든 게임 이름의 글자를 모아 굵기별로 한 번만 받는다.
import { games } from "./data";

const FIXED = "0123456789,.%-+·|~!?:()[]/&'’ 원국룰겜바닥가좋은격보통기다림함정할인판없음한주의지금사도될까스팀구매이드역대최저전체긍정한국이번중개가예요게이머를위한gukrulgaem.com";
const cache = new Map<number, Promise<ArrayBuffer>>();

function allChars(): string {
  const set = new Set<string>(FIXED);
  for (const g of games()) for (const ch of g.name) set.add(ch);
  for (const ch of "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") set.add(ch);
  return Array.from(set).join("");
}

async function fetchOnce(weight: number, chars: string): Promise<ArrayBuffer> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(chars)}`, {
    // 옛 사파리로 보이면 TTF 주소를 줌(최신 브라우저로 보이면 woff2만 줘서 satori가 못 읽음)
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1" },
  }).then((r) => r.text());
  const url = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/)?.[1];
  if (!url) throw new Error("글꼴 주소를 찾지 못함");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`글꼴 받기 실패 ${r.status}`);
  return r.arrayBuffer();
}

// 공유 그림에 넣을 로고(호랑이). 빌드 때 public/brand/logo-512.png 를 읽어 data URL 로 만든다(없으면 "").
let logoCache: string | null = null;
export function logoDataUrl(): string {
  if (logoCache !== null) return logoCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const file = path.join(process.cwd(), "public", "brand", "logo-512.png");
    logoCache = fs.existsSync(file) ? `data:image/png;base64,${fs.readFileSync(file).toString("base64")}` : "";
  } catch {
    logoCache = "";
  }
  return logoCache;
}

export function fontFor(_text: string, weight: 700 | 900 = 700): Promise<ArrayBuffer> {
  if (!cache.has(weight)) {
    const chars = allChars();
    cache.set(weight, (async () => {
      let lastError: unknown;
      for (let i = 0; i < 3; i++) {
        try { return await fetchOnce(weight, chars); } catch (e) { lastError = e; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
      }
      cache.delete(weight);
      throw lastError;
    })());
  }
  return cache.get(weight)!;
}
