"use client";
import { useEffect, useState } from "react";
import type { QueueItem } from "@/lib/admin";

// 확인 대기 매칭 승인/거절 화면. 비밀번호는 환경 변수 ADMIN_PASSWORD.
export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [mode, setMode] = useState("");
  const [msg, setMsg] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [links, setLinks] = useState<{ appid: number; product_id: string; product_url: string }[]>([]);
  const [gameList, setGameList] = useState<{ appid: number; name: string }[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newAppid, setNewAppid] = useState("");
  const [gameFilter, setGameFilter] = useState("");

  useEffect(() => { try { const s = sessionStorage.getItem("adminpw"); if (s) { setPw(s); load(s); } } catch {} }, []);

  async function load(p = pw) {
    setMsg("불러오는 중…");
    const r = await fetch("/api/admin/queue", { headers: { "x-admin-password": p }, cache: "no-store" });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? "오류"); setItems(null); return; }
    try { sessionStorage.setItem("adminpw", p); } catch {}
    setItems(j.items); setMode(j.mode); setMsg("");
    const r2 = await fetch("/api/admin/links", { headers: { "x-admin-password": p }, cache: "no-store" });
    const j2 = await r2.json();
    if (r2.ok) { setLinks(j2.links); setGameList(j2.games); }
  }

  async function addLink() {
    if (!newUrl || !newAppid) { setMsg("상품 주소와 게임을 고르세요"); return; }
    setMsg("저장 중…");
    const r = await fetch("/api/admin/links", { method: "POST", headers: { "x-admin-password": pw, "content-type": "application/json" },
      body: JSON.stringify({ product_url: newUrl, appid: Number(newAppid) }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? "오류"); return; }
    setLinks((prev) => prev.filter((x) => x.product_id !== j.link.product_id && x.appid !== j.link.appid).concat(j.link));
    setNewUrl(""); setNewAppid(""); setGameFilter("");
    setMsg("연결했어요. 다음 수집 때부터 가격이 자동으로 갱신돼요.");
  }

  async function unlink(productId: string) {
    const r = await fetch("/api/admin/links", { method: "POST", headers: { "x-admin-password": pw, "content-type": "application/json" }, body: JSON.stringify({ remove: productId }) });
    if (r.ok) setLinks((prev) => prev.filter((x) => x.product_id !== productId));
  }
  const gameName = (appid: number) => gameList.find((g) => g.appid === appid)?.name ?? String(appid);
  const filteredGames = gameList.filter((g) => !gameFilter || g.name.toLowerCase().includes(gameFilter.toLowerCase())).slice(0, 30);

  async function act(id: string, status: "approved" | "rejected", appid: number | null) {
    setMsg("저장 중…");
    const r = await fetch("/api/admin/queue", { method: "POST", headers: { "x-admin-password": pw, "content-type": "application/json" },
      body: JSON.stringify({ id, status, appid }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? "오류"); return; }
    setItems((prev) => prev?.map((x) => (x.id === id ? j.item : x)) ?? null);
    setMsg(status === "approved" ? "승인했어요. 다음 수집·빌드 때 반영돼요." : "거절했어요.");
  }

  const pending = items?.filter((x) => x.status === "pending") ?? [];
  const done = items?.filter((x) => x.status !== "pending") ?? [];
  const box = { background: "var(--card)", border: "1px solid var(--line)", color: "var(--fg)" };

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-extrabold">관리자 · 판매처 상품 연결</h1>
      {!items && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" className="rounded-lg px-3 py-2" style={box} />
          <button className="rounded-lg px-4 py-2 font-bold text-white" style={{ background: "#ef4444" }}>들어가기</button>
        </form>
      )}
      {msg && <p className="text-sm muted">{msg}</p>}
      {items && (
        <>
          <p className="text-sm muted">저장 방식: {mode === "github" ? "GitHub 저장소(어디서나)" : mode === "local" ? "내 PC 파일" : "저장 불가"} · 대기 {pending.length}개 · 처리됨 {done.length}개</p>

          <section className="card p-4 space-y-3">
            <h2 className="font-bold">다이렉트 게임즈 상품 직접 연결</h2>
            <p className="text-xs muted">다이렉트 게임즈에서 게임 페이지 주소를 복사해 붙여 넣고, 우리 목록의 게임을 고르세요. 그 뒤로는 매일 가격이 자동으로 갱신돼요.</p>
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://directg.net/game/game_view.html?product_id=…" className="w-full rounded-lg px-3 py-2 text-sm" style={box} />
            <div className="flex flex-wrap gap-2 items-center">
              <input value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} placeholder="게임 이름으로 찾기" className="rounded-lg px-3 py-2 text-sm" style={box} />
              <select value={newAppid} onChange={(e) => setNewAppid(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={box}>
                <option value="">게임 선택</option>
                {filteredGames.map((g) => <option key={g.appid} value={g.appid}>{g.name}</option>)}
              </select>
              <button onClick={addLink} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "#ef4444" }}>연결</button>
            </div>
            {links.length > 0 && (
              <ul className="text-sm space-y-1">
                {links.map((l) => (
                  <li key={l.product_id} className="flex justify-between gap-2">
                    <span>{gameName(l.appid)} ← <a href={l.product_url} target="_blank" rel="noopener noreferrer" className="underline muted">{l.product_id.slice(0, 8)}…</a></span>
                    <button onClick={() => unlink(l.product_id)} className="text-xs underline muted">연결 해제</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {pending.length === 0 && <p className="card p-6 text-center muted">확인할 항목이 없어요.</p>}
          <ul className="space-y-3">
            {pending.map((q) => (
              <li key={q.id} className="card p-4 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs muted">{q.store_id === "directg" ? "다이렉트 게임즈" : q.store_id} · {q.edition === "edition" ? "에디션" : "일반판"}</span>
                    <div className="font-bold text-lg">{q.title_raw}</div>
                  </div>
                  <div className="font-extrabold">{q.price.toLocaleString("ko-KR")}원</div>
                </div>
                <a href={q.product_url} target="_blank" rel="noopener noreferrer" className="text-xs underline muted">상품 페이지 열기</a>
                <div className="text-sm">이 게임인가요?</div>
                <div className="flex flex-wrap gap-2">
                  {q.candidates.map((c) => (
                    <button key={c.appid} onClick={() => act(q.id, "approved", c.appid)} className="rounded-lg px-3 py-1.5 text-sm font-bold" style={box}>
                      {c.name} <span className="muted font-normal">({Math.round(c.score * 100)}%)</span>
                    </button>
                  ))}
                  <button onClick={() => act(q.id, "rejected", null)} className="rounded-lg px-3 py-1.5 text-sm font-bold text-white" style={{ background: "#6b7280" }}>해당 없음 · 거절</button>
                </div>
              </li>
            ))}
          </ul>
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone((v) => !v)} className="text-sm underline muted">처리된 항목 {showDone ? "숨기기" : "보기"} ({done.length})</button>
              {showDone && (
                <ul className="mt-2 space-y-1 text-sm">
                  {done.map((q) => (
                    <li key={q.id} className="flex justify-between gap-2">
                      <span>{q.title_raw}</span>
                      <span className="muted">{q.status === "approved" ? `승인 → ${q.candidates.find((c) => c.appid === q.appid)?.name ?? q.appid}` : "거절"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
