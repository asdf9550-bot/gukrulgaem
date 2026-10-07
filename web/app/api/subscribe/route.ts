import { NextRequest, NextResponse } from "next/server";

// 주간 메일 구독: 이메일을 Resend "Audience"(주소록)에 저장한다. 사이트 자체에는 저장하지 않는다.
// 필요한 환경 변수: RESEND_API_KEY, RESEND_AUDIENCE_ID (Vercel 환경 변수에 입력)
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const key = process.env.RESEND_API_KEY, audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) return NextResponse.json({ error: "아직 메일 구독을 받을 준비가 안 됐어요. 조금만 기다려 주세요." }, { status: 503 });
  let email = "";
  try { email = String(((await req.json()) as { email?: string }).email ?? "").trim().toLowerCase(); } catch {}
  if (!EMAIL.test(email) || email.length > 200) return NextResponse.json({ error: "이메일 주소를 확인해 주세요." }, { status: 400 });
  const r = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (!r.ok && r.status !== 409) {
    return NextResponse.json({ error: "지금은 구독 처리가 안 돼요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
