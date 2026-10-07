import { NextRequest, NextResponse } from "next/server";
import { adminMode, checkPassword, decide, readQueue } from "@/lib/admin";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  return checkPassword(req.headers.get("x-admin-password"));
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "비밀번호가 틀립니다" }, { status: 401 });
  try {
    return NextResponse.json({ mode: adminMode(), items: await readQueue() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "비밀번호가 틀립니다" }, { status: 401 });
  const body = await req.json() as { id: string; status: "approved" | "rejected"; appid?: number | null };
  if (!body?.id || !["approved", "rejected"].includes(body.status)) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  try {
    return NextResponse.json({ item: await decide(body.id, body.status, body.appid ?? null) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
