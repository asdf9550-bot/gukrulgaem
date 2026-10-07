import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
