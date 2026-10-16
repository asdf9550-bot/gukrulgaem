"use client";
import { useState } from "react";

// 2026-10-16 (사용자 "쇼츠 썸네일 못 가져오네"): 쓰던 oardefault.jpg 는 유튜브에 없는 주소(404)였음.
// 세로 썸네일은 oar2.jpg(1080×1920). 그것도 없으면 hqdefault(4:3, 가운데 세로 화면)로.
export default function ShortsThumb({ id }: { id: string }) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${id}/oar2.jpg`);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover"
    onError={() => { if (!src.endsWith("hqdefault.jpg")) setSrc(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`); }} />;
}
