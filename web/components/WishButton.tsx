"use client";
import { useWish } from "@/lib/wish";

// 찜 하트 단추. 카드 안에서 쓰면 링크 이동을 막고 찜만 바꾼다.
export default function WishButton({ appid, size = "sm" }: { appid: number; size?: "sm" | "lg" }) {
  const [ids, toggle, ready] = useWish();
  const on = ids.includes(appid);
  const cls = size === "lg" ? "h-11 px-4 text-base gap-2" : "h-8 w-8 text-base";
  return (
    <button type="button" aria-label={on ? "찜 해제" : "찜하기"} aria-pressed={on}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(appid); }}
      className={`inline-flex items-center justify-center rounded-full font-bold transition-transform active:scale-90 ${cls}`}
      style={{ background: on ? "#fee2e2" : "var(--card)", border: "1px solid var(--line)", color: on ? "#dc2626" : "var(--muted)", opacity: ready ? 1 : 0.6 }}>
      <span aria-hidden>{on ? "♥" : "♡"}</span>
      {size === "lg" && <span>{on ? "찜했어요" : "찜하기"}</span>}
    </button>
  );
}
