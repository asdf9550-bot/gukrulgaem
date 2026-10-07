import type { Metadata } from "next";
import MyWishlist from "@/components/MyWishlist";

export const metadata: Metadata = { title: "내 위시리스트", description: "스팀 위시리스트 중 이번 주 사야 할 게임만 골라 보고 텔레그램으로 알림 받기", robots: { index: false } };

export default function MePage() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">내 위시리스트 중 지금 사야 할 것</h1>
        <p className="muted mt-1">스팀 프로필 주소만 넣으면 위시리스트를 읽어 이번 주 할인·판정과 맞춰 줘요. 로그인·비밀번호 필요 없음. 프로필과 게임 정보가 <b>공개</b>여야 해요.</p>
      </div>
      <MyWishlist />
    </div>
  );
}
