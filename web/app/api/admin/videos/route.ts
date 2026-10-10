import { NextRequest, NextResponse } from "next/server";
import { checkPassword, hideVideo, readVideos } from "@/lib/admin";

// 관리자 영상 목록: 보기(GET) · 지우기/되돌리기(POST {video_id, hidden}). 2026-10-11
export const dynamic = "force-dynamic";

const auth = (req: NextRequest) => checkPassword(req.headers.get("x-admin-password"));

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "비밀번호가 틀립니다" }, { status: 401 });
  try {
    const rows = (await readVideos()).filter((v) => /^[A-Za-z0-9_-]{11}$/.test(String(v.video_id ?? "")))
      .sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
    return NextResponse.json({ videos: rows });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "비밀번호가 틀립니다" }, { status: 401 });
  const body = await req.json() as { video_id?: string; hidden?: boolean };
  if (!body.video_id) return NextResponse.json({ error: "영상 번호가 필요합니다" }, { status: 400 });
  try {
    await hideVideo(body.video_id, body.hidden !== false);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
