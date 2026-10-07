import { NextRequest, NextResponse } from "next/server";
import { addLink, checkPassword, readLinks, removeLink } from "@/lib/admin";
import { games } from "@/lib/data";

export const dynamic = "force-dynamic";

const auth = (req: NextRequest) => checkPassword(req.headers.get("x-admin-password"));

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "비밀번호가 틀립니다" }, { status: 401 });
  try {
    const list = games().map((g) => ({ appid: g.appid, name: g.name })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return NextResponse.json({ links: await readLinks(), games: list });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "비밀번호가 틀립니다" }, { status: 401 });
  const body = await req.json() as { product_url?: string; appid?: number; remove?: string };
  try {
    if (body.remove) { await removeLink(body.remove); return NextResponse.json({ ok: true }); }
    if (!body.product_url || !body.appid) return NextResponse.json({ error: "주소와 게임이 필요합니다" }, { status: 400 });
    return NextResponse.json({ link: await addLink(body.product_url, Number(body.appid)) });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
