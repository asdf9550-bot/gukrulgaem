import DealList from "@/components/DealList";
import { deals, lastUpdated } from "@/lib/data";
import { kst } from "@/lib/format";

export default function Home() {
  const rows = deals();
  const floor = rows.filter((d) => d.price.verdict === "floor").length;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">이번 주 스팀 할인, 지금 사도 될까?</h1>
        <p className="muted mt-1">
          한국 스팀 가격 기록과 한국 게이머 평가로 판정합니다. 할인 중 {rows.length}개 중 {floor}개가 역대 최저가예요.
          <span className="text-xs"> · {kst(lastUpdated(), true)} 갱신</span>
        </p>
      </div>
      <DealList deals={rows} />
    </div>
  );
}
