import type { Metadata } from "next";
import Link from "next/link";
import { games, isPublicOnYouTube, videos } from "@/lib/data";
import { kst } from "@/lib/format";

export const metadata: Metadata = { title: "영상", description: "국룰겜 주간 구매 가이드 영상과 영상에 나온 게임 바로 가기" };
// 2026-10-11 (사용자 "공개된 것만 보이게"): 유튜브 공개 여부를 30분마다 다시 확인한다(비공개로 올린 영상은 공개로 바꾼 뒤 30분 안에 나타남).
export const revalidate = 1800;

export default async function VideoPage() {
  // 롱폼만(쇼츠·지운 영상 제외: lib/data.videos) + 유튜브에서 공개 상태인 것만
  const all = videos().sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  const flags = await Promise.all(all.map((v) => isPublicOnYouTube(v.video_id)));
  const rows = all.filter((_, i) => flags[i]);
  const names = new Map(games().map((g) => [g.appid, g.name]));
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">영상</h1>
        <p className="muted mt-1">이 사이트 데이터로 만든 주간 구매 가이드입니다. 영상에 나온 게임을 누르면 가격 기록으로 갑니다.</p>
      </div>
      {rows.length === 0 && (
        <div className="card p-8 text-center muted">
          <p className="font-bold" style={{ color: "var(--fg)" }}>아직 공개된 영상이 없습니다.</p>
          <p className="text-sm mt-1">유튜브에 공개되면 30분 안에 여기에 나타납니다.</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((v) => (
          <div key={v.video_id} className="card overflow-hidden">
            <a href={`https://www.youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener noreferrer" className="block relative aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
