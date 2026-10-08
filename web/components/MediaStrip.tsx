"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Game } from "@/lib/data";

// 스팀 예고편은 HLS(m3u8)로만 와서, 사파리는 그대로, 크롬·엣지는 hls.js(cdnjs)를 눌렀을 때만 불러와 재생
const HLS_JS = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.15/hls.min.js";
type HlsCtor = new () => { loadSource: (u: string) => void; attachMedia: (v: HTMLVideoElement) => void; destroy: () => void };
function TrailerPlayer({ src, poster }: { src: string; poster?: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
      return;
    }
    const attach = () => {
      const Hls = (window as unknown as { Hls?: HlsCtor & { isSupported?: () => boolean } }).Hls;
      if (cancelled) return;
      if (!Hls || (Hls.isSupported && !Hls.isSupported())) { setFailed(true); return; }
      const h = new Hls();
      hls = h;
      h.loadSource(src);
      h.attachMedia(video);
      video.play().catch(() => {});
    };
    const existing = document.querySelector(`script[src="${HLS_JS}"]`) as HTMLScriptElement | null;
    if ((window as unknown as { Hls?: unknown }).Hls) attach();
    else if (existing) existing.addEventListener("load", attach, { once: true });
    else {
      const s = document.createElement("script");
      s.src = HLS_JS; s.async = true;
      s.addEventListener("load", attach, { once: true });
      s.addEventListener("error", () => setFailed(true), { once: true });
      document.head.appendChild(s);
    }
    return () => { cancelled = true; hls?.destroy(); };
  }, [src]);
  if (failed) return <div className="w-full h-full flex items-center justify-center text-sm text-white">이 브라우저에서는 재생이 안 돼요 · 스팀 페이지에서 보세요</div>;
  return <video ref={ref} poster={poster ?? undefined} controls playsInline className="w-full h-full object-contain" />;
}

// 사진·예고편(2026-10-09 사용자 "사이트에 사진이 너무 부족해"):
// 스팀 상점 스크린샷을 가로로 넘겨 보고, 누르면 크게 봄. 예고편은 포스터를 누르면 재생(소리 끔, 자동 재생 안 함).
export default function MediaStrip({ game: g }: { game: Game }) {
  const shots = (g.screenshots ?? []).filter((s) => s.full);
  const [open, setOpen] = useState<number | null>(null);
  const [play, setPlay] = useState(false);
  if (shots.length === 0 && !g.trailer) return null;
  return (
    <section className="card p-4 sm:p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">사진 · 예고편</h2>
        <span className="text-xs muted">스팀 상점 제공 · 옆으로 넘겨 보세요</span>
      </div>
      <div className="flex gap-2 overflow-x-auto snap-x -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {g.trailer && (
          <div className="relative shrink-0 w-[78vw] sm:w-96 aspect-video rounded-lg overflow-hidden snap-start bg-black">
            {play ? (
              <TrailerPlayer src={g.trailer.hls} poster={g.trailer.poster} />
            ) : (
              <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 w-full h-full" aria-label="예고편 재생">
                {g.trailer.poster && <Image src={g.trailer.poster} alt="" fill sizes="(max-width: 640px) 78vw, 384px" className="object-cover" />}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full px-5 py-2 text-sm font-extrabold text-white group-hover:scale-105 transition-transform" style={{ background: "rgba(0,0,0,0.65)" }}>▶ 예고편</span>
                </span>
              </button>
            )}
          </div>
        )}
        {shots.map((s, i) => (
          <button key={s.full} type="button" onClick={() => setOpen(i)} className="relative shrink-0 w-[62vw] sm:w-72 aspect-video rounded-lg overflow-hidden snap-start" aria-label={`스크린샷 ${i + 1} 크게 보기`}>
            <Image src={s.thumb ?? s.full} alt="" fill sizes="(max-width: 640px) 62vw, 288px" className="object-cover hover:scale-[1.03] transition-transform" />
          </button>
        ))}
      </div>
      {open != null && shots[open] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.85)" }} onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <button type="button" className="absolute top-3 right-4 text-white text-3xl font-bold" aria-label="닫기" onClick={() => setOpen(null)}>×</button>
          {open > 0 && <button type="button" className="absolute left-2 sm:left-6 text-white text-4xl font-bold px-2" aria-label="이전" onClick={(e) => { e.stopPropagation(); setOpen(open - 1); }}>‹</button>}
          {open < shots.length - 1 && <button type="button" className="absolute right-2 sm:right-6 text-white text-4xl font-bold px-2" aria-label="다음" onClick={(e) => { e.stopPropagation(); setOpen(open + 1); }}>›</button>}
          {/* 원본은 1920px 안팎이라 next/image 대신 그대로 보여줌 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shots[open].full} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-3 text-white text-xs">{open + 1} / {shots.length}</div>
        </div>
      )}
    </section>
  );
}
