"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import VerdictBadge from "@/components/VerdictBadge";
import type { Verdict } from "@/lib/data";
import { kst, won } from "@/lib/format";

type Row = { appid: number; name: string; price: number | null; regular: number | null; discount: number | null; verdict: Verdict; verdict_label: string; sale_end_at: string | null; cheapest: { store: string; price: number } | null };

export default function MyWishlist() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [steamid, setSteamid] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => { try { const s = localStorage.getItem("gukrulgaem.steam"); if (s) setInput(s); } catch {} }, []);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setState("busy"); setMsg("");
    const r = await fetch(`/api/me/wishlist?steam=${encodeURIComponent(input)}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setState("err"); setMsg(j.error ?? "오류"); return; }
    try { localStorage.setItem("gukrulgaem.steam", input); } catch {}
    setRows(j.matched); setSteamid(j.steamid); setTotal(j.total); setState("done");
  }
  const buy = rows.filter((r) => r.verdict === "floor" || r.verdict === "good");
  const box = { background: "var(--card)", border: "1px solid var(--line)", color: "var(--fg)" };

  return (
    <div className="space-y-5">
      <form onSubmit={run} className="card p-4 space-y-2">
        <label className="text-sm font-bold">스팀 프로필 주소 또는 ID</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://steamcommunity.com/id/내아이디  또는 7656…(17자리)" className="flex-1 rounded-lg px-3 py-2 text-sm" style={box} />
          <button disabled={state === "busy" || !input.trim()} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "#ef4444" }}>{state === "busy" ? "읽는 중…" : "확인"}</button>
        </div>
        <p className="text-xs muted">공개 설정: 스팀 → 프로필 → 프로필 편집 → 개인 정보 설정 → "내 프로필"과 "게임 세부 정보"를 공개로.</p>
        {msg && <p className="text-sm" style={{ color: "#dc2626" }}>{msg}</p>}
      </form>

      {state === "done" && (
        <section className="space-y-3">
          <p className="text-sm">위시리스트 {total}개 중 <b>지금 할인 중 {rows.length}개</b>{buy.length > 0 && <> · <span style={{ color: "#16a34a" }} className="font-bold">지금 사도 좋은 것 {buy.length}개</span></>}</p>
          {rows.length === 0 && <p className="card p-6 muted">이번 주 할인 목록에 있는 위시리스트 게임이 없어요.</p>}
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map((r) => (
              <li key={r.appid} className="card p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/game/${r.appid}`} className="font-bold hover:underline truncate block">{r.name}</Link>
                  <div className="text-xs muted">{r.sale_end_at ? `세일 종료 ${kst(r.sale_end_at)}` : ""}{r.cheapest && r.cheapest.price < (r.price ?? Infinity) ? ` · ${r.cheapest.store} ${won(r.cheapest.price)}` : ""}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold">{won(r.price)} <span className="text-xs" style={{ color: "#16a34a" }}>-{r.discount}%</span></div>
                  <VerdictBadge verdict={r.verdict} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4 space-y-2">
        <h2 className="font-bold">텔레그램으로 알림 받기</h2>
        <p className="text-sm muted">위시리스트 게임이 바닥가·좋은 가격이 되면 매일 새벽 한 번 텔레그램으로 알려 드려요.</p>
        <ol className="text-sm list-decimal pl-5 space-y-1">
          <li>텔레그램에서 <b>@gukrulgaem_bot</b> 을 찾아 대화 시작</li>
          <li>아래 한 줄을 그대로 보내기 (위에서 확인한 뒤 자동으로 채워져요)</li>
        </ol>
        <code className="block rounded-lg px-3 py-2 text-sm select-all" style={box}>{steamid ? `/start ${steamid}` : "/start 스팀ID(17자리)"}</code>
        <p className="text-xs muted">알림 해지: 봇에게 <code>/stop</code> 보내기. 저장되는 건 텔레그램 대화 번호와 스팀 ID뿐이에요.</p>
      </section>
    </div>
  );
}
