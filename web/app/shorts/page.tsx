import type { Metadata } from "next";
import Link from "next/link";
import { games, isPublicOnYouTube, shorts } from "@/lib/data";
import { kst } from "@/lib/format";

export const metadata: Metadata = { title: "쇼츠", description: "국룰겜 스팀 할인 게임 쇼츠 모음" };
// 2026-10-15 (사용자 "쇼츠 다른 페이지"): 쇼츠 전용 페이지. 유튜브 공개 여부를 30분마다 다시 확인.
export const revalidate = 1800;

export default async function ShortsPage() {
  // 쇼츠만(지운 영상 제외: lib/data.shorts) + 유튜브에서 공개 상태인 것만
  const all = shorts().sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  const flags = await Promise.all(all.map((v) => isPublicOnYouTube(v.video_id)));
  const rows = all.filter((_, i) => flags[i]);
  const names = new Map(games().map((g) => [g.appid, g.name]));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold">쇼츠</h1>
        <Link href="/video" className="muted hover:underline text-sm">🎮 게임 영상(롱폼) 보기 →</Link>
      </div>
      <p className="muted mt-1">할인 게임을 1분 안에 소개하는 세로 영상입니다. 누르면 유튜브에서 재생됩니다.</p>
      {rows.length === 0 && (
        <div className="card p-8 text-center muted">
          <p className="font-bold" style={{ color: "var(--fg)" }}>아직 공개된 쇼츠가 없습니다.</p>
          <p className="text-sm mt-1">유튜브에 공개되면 30분 안에 여기에 나타납니다.</p>
        </div>
      )}
      {/* 세로 영상이라 카드도 세로로, 한 줄에 더 많이 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((v) => (
          <div key={v.video_id} className="card overflow-hidden">
            <a href={`https://www.youtube.com/shorts/${v.video_id}`} target="_blank" rel="noopener noreferrer" className="block relative" style={{ aspectRatio: "9 / 16" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${v.video_id}/oardefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover"
                onError={undefined} />
            </a>
            <div className="p-2.5 space-y-1.5">
              <a href={`https://www.youtube.com/shorts/${v.video_id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-sm hover:underline line-clamp-2">{v.title.replace(/\s*#Shorts\s*$/i, "")}</a>
              <p className="text-xs muted">{kst(v.published_at)}</p>
              {v.appids.length > 0 && (
                <p className="text-xs flex flex-wrap gap-1">
                  {v.appids.map((id) => names.has(id)
                    ? <Link key={id} href={`/game/${id}`} className="rounded-full px-2 py-0.5 hover:underline" style={{ background: "var(--line)" }}>{names.get(id)}</Link>
                    : <a key={id} href={`https://store.steampowered.com/app/${id}/?l=koreana`} target="_blank" rel="noopener noreferrer" className="rounded-full px-2 py-0.5 hover:underline muted" style={{ background: "var(--line)" }}
                        title="사이트 수집 대상이 아니라 스팀 상점으로 연결">{v.names?.[String(id)] ?? `게임 ${id}`} ↗</a>)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
