import { ImageResponse } from "next/og";
import { game, games } from "@/lib/data";
import { VERDICT } from "@/lib/format";
import { fontFor } from "@/lib/og";

// 게임 링크를 카톡·유튜브·디시에 붙이면 뜨는 미리보기 그림(1200×630). 빌드 때 게임마다 한 장씩 만든다.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "국룰겜 가격 판정";

export function generateStaticParams() {
  return games().map((g) => ({ appid: String(g.appid) }));
}

const won = (v: number | null) => (v == null ? "-" : `${v.toLocaleString("ko-KR")}원`);

export default async function Image({ params }: { params: Promise<{ appid: string }> }) {
  const { appid } = await params;
  const row = game(Number(appid));
  const g = row?.game, p = row?.price;
  const name = g?.name ?? "국룰겜";
  const v = p ? VERDICT[p.verdict] : VERDICT.none;
  const koPct = g && g.reviews_ko ? Math.round(g.positive_ko / g.reviews_ko * 100) : null;
  const allPct = g && g.reviews_all ? Math.round(g.positive_all / g.reviews_all * 100) : null;
  const text = [name, v.label, won(p?.current_price ?? null), won(p?.regular_price ?? null), won(p?.historical_low ?? null),
    `역대 최저 전체 긍정 한국 긍정 ${allPct ?? ""}${koPct ?? ""} 지금 가격 정가`].join("");
  const [bold, black] = await Promise.all([fontFor(text, 700), fontFor(text, 900)]);
  const image = g?.header_image ?? null;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: "#0f1115", color: "#e8eaee", fontFamily: "Noto", position: "relative" }}>
        {image && <img src={image} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, width: 1200, height: 630, objectFit: "cover", opacity: 0.35 }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(15,17,21,0.98) 0%, rgba(15,17,21,0.9) 55%, rgba(15,17,21,0.5) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", width: 1200, height: 630 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 14, background: "#ef4444", color: "#fff", fontSize: 34, fontWeight: 900 }}>국</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#9aa3b2" }}>국룰겜 · 스팀 구매 가이드</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: name.length > 18 ? 52 : 64, fontWeight: 900, lineHeight: 1.1, maxWidth: 1000 }}>{name}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
              <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1 }}>{won(p?.current_price ?? null)}</div>
              {p?.discount_pct ? <div style={{ fontSize: 44, fontWeight: 900, color: "#ef4444", paddingBottom: 10 }}>{`-${p.discount_pct}%`}</div> : null}
              {p?.regular_price ? <div style={{ fontSize: 34, color: "#9aa3b2", textDecoration: "line-through", paddingBottom: 14 }}>{won(p.regular_price)}</div> : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", padding: "10px 28px", borderRadius: 999, background: v.bg, color: v.color, fontSize: 40, fontWeight: 900 }}>{v.label}</div>
              {p?.historical_low != null && <div style={{ fontSize: 28, color: "#9aa3b2" }}>{`역대 최저 ${won(p.historical_low)}`}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, fontSize: 28, color: "#9aa3b2" }}>
            {allPct != null && <div style={{ display: "flex" }}>{`전체 긍정 ${allPct}%`}</div>}
            {koPct != null && g!.reviews_ko >= 100 && <div style={{ display: "flex", color: koPct >= 80 ? "#4ade80" : "#fbbf24" }}>{`한국 긍정 ${koPct}%`}</div>}
            <div style={{ display: "flex", marginLeft: "auto" }}>gukrulgaem.com</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Noto", data: bold, weight: 700 }, { name: "Noto", data: black, weight: 900 }] },
  );
}
