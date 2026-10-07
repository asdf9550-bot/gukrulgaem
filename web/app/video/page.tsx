import type { Metadata } from "next";
import Link from "next/link";
import { games, videos } from "@/lib/data";
import { kst } from "@/lib/format";

export const metadata: Metadata = { title: "영상", description: "쇼츠와 주간 구매 가이드 영상, 영상에 나온 게임 바로 가기" };

export default function VideoPage() {
  const rows = videos().sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  const names = new Map(games().map((g) => [g.appid, g.name]));
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">영상</h1>
        <p className="muted mt-1">이 사이트 데이터로 만든 쇼츠와 주간 구매 가이드입니다.</p>
      </div>
      {rows.length === 0 && (
        <div className="card p-8 text-center muted">
          <p className="font-bold" style={{ color: "var(--fg)" }}>아직 올린 영상이 없습니다.</p>
          <p className="text-sm mt-1">첫 영상이 올라오면 여기에 나타납니다.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((v) => (
          <div key={v.video_id} className="card overflow-hidden">
            <a href={`https://www.youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener noreferrer" className="block relative aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold text-white" style={{ background: v.kind === "shorts" ? "#dc2626" : "#1d4ed8" }}>
                {v.kind === "shorts" ? "쇼츠" : "롱폼"}
              </span>
            </a>
            <div className="p-3 space-y-2">
              <a href={`https://www.youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline line-clamp-2">{v.title}</a>
              <p className="text-xs muted">{kst(v.published_at)}</p>
              {v.appids.length > 0 && (
                <p className="text-xs flex flex-wrap gap-1">
                  {v.appids.map((id) => (
                    <Link key={id} href={`/game/${id}`} className="rounded-full px-2 py-0.5 hover:underline" style={{ background: "var(--line)" }}>{names.get(id) ?? `게임 ${id}`}</Link>
                  ))}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
