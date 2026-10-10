import type { Metadata } from "next";
import SubscribeBox from "@/components/SubscribeBox";

// 2026-10-11 (사용자): 텔레그램·스팀 프로필(ID) 알림은 없애고 메일 알림만 남김.
export const metadata: Metadata = { title: "메일 알림", description: "바닥가·좋은 가격 소식을 메일로 받기", robots: { index: false } };

export default function MePage() {
  const ready = !!(process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID);
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">메일로 알림 받기</h1>
        <p className="muted mt-1">매주 수요일 아침, 이번 주 국룰 5개와 새로 바닥가가 된 게임을 메일 한 통으로 보내 드려요. 로그인 없음, 광고 없음, 메일 아래 링크로 언제든 해지.</p>
      </div>
      {ready ? <SubscribeBox /> : (
        <div className="card p-6 muted text-sm">아직 메일 구독을 받을 준비가 안 됐어요. 조금만 기다려 주세요.</div>
      )}
      <section className="card p-4 space-y-1 text-sm muted">
        <p className="font-bold" style={{ color: "var(--fg)" }}>어떤 메일인가요?</p>
        <p>· 이번 주 할인 중 국룰겜 판정이 <b>바닥가</b>·<b>좋은 가격</b>인 게임 5개</p>
        <p>· 새로 역대 최저가가 된 게임</p>
        <p>· 큰 시즌 세일(여름·가을·겨울) 시작 전 미리 알림</p>
        <p>저장하는 건 메일 주소 하나뿐이고, 다른 용도로 쓰지 않아요.</p>
      </section>
    </div>
  );
}
