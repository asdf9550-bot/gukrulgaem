// 공유 미리보기 그림(OG)용 글꼴: 구글 폰트에서 "필요한 글자만" 담은 작은 TTF를 받아 쓴다.
// 전체 한글 글꼴은 수 MB라서, text= 로 그 그림에 쓰는 글자만 요청한다(빌드 때 게임마다 한 번).
const cache = new Map<string, Promise<ArrayBuffer>>();

export function fontFor(text: string, weight: 700 | 900 = 700): Promise<ArrayBuffer> {
  const chars = Array.from(new Set(text + "0123456789,원%-+·|국룰겜바닥가좋은격보통기다림함정할인판없음한주의지금사도될까스팀구매이드")).join("");
  const key = `${weight}:${chars}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const css = await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(chars)}`, {
        // 옛 사파리로 보이면 TTF 주소를 줌(파이어폭스 12는 woff를 줌)
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1" },
      }).then((r) => r.text());
      const url = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/)?.[1];
      if (!url) throw new Error("글꼴 주소를 찾지 못함");
      return fetch(url).then((r) => r.arrayBuffer());
    })());
  }
  return cache.get(key)!;
}
