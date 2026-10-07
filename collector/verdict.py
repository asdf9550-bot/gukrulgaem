"""5단계 가격 판정 + 보조 태그. 순수 계산만 하므로 네트워크 없이 테스트할 수 있다.

판정(위에서부터 처음 맞는 것):
  none   판정 없음  — 최근 24개월 세일 2회 미만
  floor  바닥가     — 역대 최저가와 같거나 더 쌈
  good   좋은 가격  — 평소 세일가보다 5% 이상 쌈
  trap   함정 할인  — 평소 세일가보다 20% 이상 비쌈
  wait   기다림     — 평소 세일가보다 5% 이상 비쌈
  normal 보통       — 그 외
평소 세일가 = 최근 24개월 할인율 중앙값 × 현재 정가
"""
from __future__ import annotations

from statistics import median

LABELS = {"none": "판정 없음", "floor": "바닥가", "good": "좋은 가격", "normal": "보통", "wait": "기다림", "trap": "함정 할인"}
TAG_LABELS = {"korea_warning": "한국 주의", "subscription": "구독 추천"}


def sale_cuts(history: list[dict]) -> list[int]:
    """가격 변동 기록에서 '세일 시작' 지점의 할인율만 뽑는다(할인율 0 → 양수로 바뀐 순간)."""
    cuts: list[int] = []
    previous = 0
    for point in history:
        cut = int(point.get("cut") or 0)
        if cut > 0 and previous == 0:
            cuts.append(cut)
        previous = cut
    return cuts


def usual_sale_price(regular_price: int | None, history: list[dict]) -> tuple[int | None, int]:
    """(평소 세일가, 세일 횟수). 세일 기록이 없으면 (None, 0)."""
    cuts = sale_cuts(history)
    if not cuts or not regular_price:
        return None, len(cuts)
    return int(round(regular_price * (100 - median(cuts)) / 100)), len(cuts)


def price_verdict(current_price: int | None, regular_price: int | None, historical_low: int | None,
                  history: list[dict], rules: dict) -> dict:
    """{'verdict', 'label', 'usual_sale_price', 'sale_count', 'vs_usual_pct'}"""
    usual, count = usual_sale_price(regular_price, history)
    out = {"verdict": "none", "usual_sale_price": usual, "sale_count": count, "vs_usual_pct": None}
    if current_price is None or current_price <= 0 or count < rules["min_sales_for_verdict"] or not usual:
        out["label"] = LABELS["none"]
        return out
    if historical_low is not None and current_price <= historical_low:
        out["verdict"] = "floor"
    else:
        diff = (current_price - usual) / usual * 100          # 양수 = 평소보다 비쌈
        out["vs_usual_pct"] = round(diff, 1)
        if diff <= -rules["good_price_cheaper_pct"]:
            out["verdict"] = "good"
        elif diff >= rules["trap_pricier_pct"]:
            out["verdict"] = "trap"
        elif diff >= rules["wait_pricier_pct"]:
            out["verdict"] = "wait"
        else:
            out["verdict"] = "normal"
    out["label"] = LABELS[out["verdict"]]
    return out


def tags(gap_pp: float | None, reviews_ko: int, rules: dict, gamepass: bool = False) -> list[str]:
    out = []
    if gap_pp is not None and reviews_ko >= rules["korea_warning_min_reviews"] and gap_pp <= -rules["korea_warning_gap_pp"]:
        out.append("korea_warning")
    if gamepass:
        out.append("subscription")
    return out
