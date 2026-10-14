import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 2026-10-14: Vercel 무료 이미지 최적화 한도 초과(402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)로 그림이 안 보임
    // → 최적화를 끄고 스팀 CDN 그림을 그대로 씀(스팀이 이미 크기별로 줌, 비용 0)
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**.steamstatic.com" }],
  },
  // 옛 주소(gukrulgaem.vercel.app)와 www 로 들어오면 대표 주소 gukrulgaem.com 으로 영구 이동(검색 엔진도 따라옴)
  async redirects() {
    return [
      { source: "/:path*", has: [{ type: "host", value: "gukrulgaem.vercel.app" }], destination: "https://gukrulgaem.com/:path*", permanent: true },
      { source: "/:path*", has: [{ type: "host", value: "www.gukrulgaem.com" }], destination: "https://gukrulgaem.com/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
