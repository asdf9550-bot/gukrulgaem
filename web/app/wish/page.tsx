import type { Metadata } from "next";
import WishList from "@/components/WishList";
import { deals } from "@/lib/data";

export const metadata: Metadata = { title: "찜 목록", description: "찜한 게임의 총액·절약액·판정 요약", robots: { index: false } };

export default function WishPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">찜 목록</h1>
        <p className="muted mt-1">로그인 없이 이 브라우저에만 저장돼요. 할인이 끝난 게임은 목록에서 자동으로 빠져요.</p>
      </div>
      <WishList deals={deals()} />
    </div>
  );
}
