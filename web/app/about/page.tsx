import type { Metadata } from "next";
import VerdictBadge from "@/components/VerdictBadge";
import { rules } from "@/lib/data";
import { VERDICT } from "@/lib/format";

export const metadata: Metadata = { title: "판정 기준", description: "가격 판정 계산식과 데이터 출처를 공개합니다." };

export default function AboutPage() {
  const r = rules();
  const steps: { v: keyof typeof VERDICT; text: string }[] = [
    { v: "none", text: `최근 ${r.history_months}개월 세일이 ${r.min_sales_for_verdict}회 미만이면 판정하지 않습니다.` },
    { v: "floor", text: "지금 가격이 역대 최저가와 같거나 더 쌉니다." },
    { v: "good", text: `평소 세일가보다 ${r.good_price_cheaper_pct}% 이상 쌉니다.` },
    { v: "trap", text: `평소 세일가보다 ${r.trap_pricier_pct}% 이상 비쌉니다. 할인율이 커 보여도 평소보다 비싼 "함정"입니다.` },
    { v: "wait", text: `평소 세일가보다 ${r.wait_pricier_pct}% 이상 비쌉니다. 다음 세일을 기다리는 편이 낫습니다.` },
    { v: "normal", text: "그 외. 평소 세일가 수준입니다." },
  ];
  return (
    <article className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">판정 기준</h1>
        <p className="muted mt-1">모든 판정은 아래 공개된 계산식으로 자동 산출됩니다. 사람의 의견은 들어가지 않습니다.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">1. 가격 판정 (위에서부터 처음 맞는 것)</h2>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.v} className="card p-3 flex items-start gap-3">
              <span className="muted text-sm w-5 shrink-0 pt-1">{i + 1}</span>
              <VerdictBadge verdict={s.v} />
              <span className="text-sm pt-0.5">{s.text}</span>
            </li>
          ))}
        </ol>
        <div className="card p-4 text-sm space-y-1">
          <p><b>평소 세일가</b> = 최근 {r.history_months}개월 세일 할인율의 중앙값 × 현재 정가</p>
          <p><b>역대 최저가</b> = 한국 스팀 상점에서 기록된 가장 낮은 가격 (다른 판매처 가격은 섞지 않습니다)</p>
          <p className="muted">예: 정가 66,000원, 최근 2년 세일 할인율 중앙값 65% → 평소 세일가 23,100원</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">2. 한국 평가 격차</h2>
        <div className="card p-4 text-sm space-y-1">
          <p><b>격차(%p)</b> = 한국어 리뷰 긍정률 − 전체 리뷰 긍정률</p>
          <p>한국어 리뷰가 {r.korea_warning_min_reviews}개 이상일 때만 계산합니다. 격차가 −{r.korea_warning_gap_pp}%p 이하이면
            <span className="rounded-full px-2 py-0.5 text-xs font-bold mx-1" style={{ background: "#fee2e2", color: "#b91c1c" }}>한국 주의</span>태그를 붙입니다.</p>
          <p className="muted">"한국어 리뷰"는 리뷰를 쓴 언어 기준이며, 작성자의 국가 기준이 아닙니다.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">3. 한국어 지원</h2>
        <div className="card p-4 text-sm">
          <p>스팀 상점의 지원 언어 표에서 읽습니다. <b>음성·자막</b> / <b>자막만</b> / <b>미지원</b> 세 단계입니다.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">4. 시간당 가격 · 플레이 시간 · 후회 지수</h2>
        <div className="card p-4 text-sm space-y-1">
          <p><b>시간당 가격</b> = 지금 가격 ÷ 리뷰어 플레이 시간 중앙값. 최근 리뷰 100개의 작성자 플레이 시간(스팀 리뷰 API)으로 계산하며, 표본이 20개 미만이면 표시하지 않습니다.</p>
          <p><b>한국인 플레이 시간</b>은 한국어 리뷰 작성자만 따로 계산합니다. "2시간 전 리뷰 비율"은 스팀 환불 가능 구간(2시간 미만)에 리뷰를 쓴 사람의 비율입니다.</p>
          <p><b>후회 지수</b>는 가격 판정, 다음 세일 예상까지 남은 날, 세일 주기, 한국 평가 격차를 점수로 합쳐 낮음/보통/높음으로 나눕니다. 사람의 의견은 들어가지 않습니다.</p>
          <p><b>지금 접속자</b>는 스팀 공식 Web API의 현재 플레이어 수이며 수집 시점 값입니다.</p>
          <p><b>스팀덱 호환</b>은 스팀 상점이 보여주는 밸브의 호환 등급(확인됨·플레이 가능·지원 안 함)을 그대로 씁니다.</p>
          <p><b>한국 게이머 한마디</b>는 스팀 한국어 리뷰 중 "도움이 됨"이 많은 글을 200자까지 인용하고 원문 링크를 둡니다. 욕설이 든 글은 인용하지 않습니다. <b>리뷰 추세</b>는 수집 때마다 리뷰 수·긍정률을 기록해 첫 기록과 비교한 것입니다.</p>
          <p><b>좋아한 이유 / 싫어한 이유 5줄</b>은 한국어 추천·비추천 리뷰(도움이 됨 순 20개씩)를 AI(Claude)가 읽고 리뷰에 나온 내용만으로 정리한 것입니다. 게임당 주 1회 갱신하며, 한국어 리뷰 100개 이상·해당 리뷰 8개 이상인 게임만 만듭니다.</p>
          <p><b>오늘 바뀐 것</b>은 전날 수집 결과와 비교해 새로 바닥가가 된 게임, 새 할인, 할인이 커진 게임, 24시간 안에 끝나는 세일을 자동으로 고릅니다.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">5. 판매처 가격 비교</h2>
        <div className="card p-4 text-sm space-y-1">
          <p><b>원화로 결제할 수 있는 공식 판매처만</b> 비교합니다(스팀, 에픽게임즈 스토어, 유비소프트 스토어, EA 앱, 마이크로소프트 스토어, 배틀넷). 외화 결제 판매처, 지역 제한 키가 많은 곳, G2A·에네바·CDKeys 같은 키 리셀러는 넣지 않습니다. 같은 판매처라도 상품별로 지역 제한이 있을 수 있으니 결제 전 확인하세요.</p>
          <p><b>실제 결제 금액</b>은 판매처 표시 가격 그대로입니다. (외화 판매처를 켤 경우에는 환산가에 해외 결제 수수료 {Number(rules().foreign_card_fee_pct ?? 2)}%를 더한 추정치로 "약"을 붙입니다.)</p>
          <p><b>모든 판매처 포함 역대 최저가</b>는 IsThereAnyDeal의 한국 기준 기록입니다. 가격 판정(바닥가 등)은 여전히 스팀 기준입니다.</p>
          <p className="muted">판매처 링크는 IsThereAnyDeal 추적 링크(제휴)입니다. 판매처 키는 환불이 안 될 수 있으니 결제 전 확인하세요.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">6. 데이터 출처와 갱신</h2>
        <div className="card p-4 text-sm space-y-1">
          <p><b>가격 기록·역대 최저가·세일 종료 시각</b>: <a className="underline" href="https://isthereanydeal.com">IsThereAnyDeal</a> (한국 스팀 상점 기준)</p>
          <p><b>현재가·정가·장르·한국어 지원·리뷰·플레이 시간</b>: Steam 상점·리뷰 API</p>
          <p><b>지금 접속자</b>: Steam Web API (GetNumberOfCurrentPlayers)</p>
          <p>매주 화요일 스팀 세일이 바뀐 뒤 한 번 수집합니다. 할인 중이면서 리뷰 {r.collect_min_reviews.toLocaleString()}개 이상인 게임이 대상입니다.</p>
          <p className="muted">가격은 수집 시점 기준입니다. 결제 전에는 스팀 상점에서 실제 가격을 확인하세요.</p>
        </div>
      </section>
    </article>
  );
}
