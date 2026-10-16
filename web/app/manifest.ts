import type { MetadataRoute } from "next";

// 2026-10-16 (사용자 "홈 화면에 추가하면 호랑이 아이콘으로"): 폰 브라우저의 "홈 화면에 추가"가 앱처럼 붙게 하는 설정
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "국룰겜 — 스팀 구매 가이드",
    short_name: "국룰겜",
    description: "한국 스팀 가격 기록과 한국 게이머 평가로 지금 사도 되는 게임인지 판정",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#0f1115",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
