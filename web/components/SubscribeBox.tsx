"use client";
import { useState } from "react";

// 주간 메일 구독 칸(모든 페이지 아래). 매주 수요일 아침 "이번 주 국룰 5 + 새로 바닥가" 한 통.
export default function SubscribeBox() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy"); setMsg("");
    const r = await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setState("ok"); setMsg("구독됐어요. 매주 수요일 아침에 보내 드릴게요."); setEmail(""); }
    else { setState("err"); setMsg(j.error ?? "오류가 났어요."); }
  }
  return (
    <form onSubmit={submit} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="sm:flex-1">
        <div className="font-bold" style={{ color: "var(--fg)" }}>주간 메일 받기</div>
        <div className="text-xs muted">매주 수요일 아침 · 이번 주 국룰 5 + 새로 바닥가 된 게임 · 광고 없음 · 언제든 해지</div>
      </div>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소"
        className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--fg)" }} />
      <button disabled={state === "busy"} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "#ef4444" }}>
        {state === "busy" ? "보내는 중…" : "구독"}
      </button>
      {msg && <div className="text-xs sm:w-full" style={{ color: state === "ok" ? "#16a34a" : "#dc2626" }}>{msg}</div>}
    </form>
  );
}
