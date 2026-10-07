"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// 목록 위에 겹쳐 뜨는 창. 바깥을 누르거나 Esc, 닫기 단추로 닫히고, 주소는 이전으로 돌아간다.
export default function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") router.back(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [router]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-2 sm:p-6" style={{ background: "rgba(0,0,0,.6)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) router.back(); }}>
      <div ref={panel} tabIndex={-1} className="relative w-full max-w-3xl rounded-2xl p-3 sm:p-4 fade-up outline-none text-[15px]" style={{ background: "var(--bg)" }}>
        <button onClick={() => router.back()} aria-label="닫기"
          className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full text-lg font-bold" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>×</button>
        {children}
        <div className="mt-4 flex justify-center">
          <button onClick={() => router.back()} className="rounded-xl px-5 py-2 text-sm font-bold" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>목록으로 돌아가기</button>
        </div>
      </div>
    </div>
  );
}
