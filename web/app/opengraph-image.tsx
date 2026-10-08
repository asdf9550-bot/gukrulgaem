import { ImageResponse } from "next/og";
import { deals } from "@/lib/data";
import { fontFor, logoDataUrl } from "@/lib/og";

// 홈 공유 그림: 이번 주 할인 개수와 바닥가 개수
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "국룰겜 — 스팀 구매 가이드";

export default async function Image() {
  const rows = deals();
  const floor = rows.filter((d) => d.price.verdict === "floor").length;
  const text = `국룰겜 스팀 구매 가이드 이번 주 할인 개 중 개가 역대 최저가 지금 사도 될까 한국 게이머를 위한 ${rows.length}${floor}`;
  const [bold, black] = await Promise.all([fontFor(text, 700), fontFor(text, 900)]);
  const logo = logoDataUrl();
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "linear-gradient(135deg, #0f1115 0%, #1b0f12 100%)", color: "#e8eaee", fontFamily: "Noto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} width={84} height={84} style={{ borderRadius: 20 }} alt="" /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 18, background: "#ef4444", color: "#fff", fontSize: 44, fontWeight: 900 }}>국</div>}
          <div style={{ fontSize: 44, fontWeight: 900 }}>국룰겜</div>
          <div style={{ fontSize: 30, color: "#9aa3b2" }}>한국 게이머를 위한 스팀 구매 가이드</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.1 }}>이번 주 스팀 할인, 지금 사도 될까?</div>
          <div style={{ display: "flex", fontSize: 40, color: "#9aa3b2", gap: 10 }}>
            <div style={{ display: "flex" }}>{`할인 중 ${rows.length}개 중`}</div>
            <div style={{ display: "flex", color: "#4ade80", fontWeight: 900 }}>{`${floor}개`}</div>
            <div style={{ display: "flex" }}>가 역대 최저가</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#9aa3b2" }}>gukrulgaem.com</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Noto", data: bold, weight: 700 }, { name: "Noto", data: black, weight: 900 }] },
  );
}
