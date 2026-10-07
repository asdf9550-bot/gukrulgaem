"""스팀 리뷰(appreviews): 전체·한국어 긍정률, 리뷰어 플레이 시간, 한국어 부정 리뷰 본문.
language 는 국가가 아니라 '리뷰를 쓴 언어' 기준이다."""
from __future__ import annotations

from statistics import median

from .common import get_json, load_rules

APPREVIEWS = "https://store.steampowered.com/appreviews/{appid}"
SAMPLE = 100          # 플레이 시간 표본: 최근 리뷰 100개(한 번 호출에 받을 수 있는 최대)


def _page(appid: int, language: str, rules: dict, count: int = SAMPLE) -> dict:
    """리뷰 한 페이지(요약 + 리뷰 목록). count=0이면 요약만."""
    return get_json(APPREVIEWS.format(appid=appid),
                    {"json": 1, "language": language, "purchase_type": "all", "filter": "recent",
                     "num_per_page": count, "cursor": "*"},
                    host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"]) or {}


def _playtime(reviews: list[dict]) -> dict:
    """리뷰어 플레이 시간(시간 단위) 중앙값과 '2시간 미만에 쓴 리뷰 비율'(환불 가능 구간)."""
    forever = [r["author"]["playtime_forever"] / 60 for r in reviews if (r.get("author") or {}).get("playtime_forever") is not None]
    at_review = [r["author"].get("playtime_at_review", r["author"].get("playtime_forever", 0)) / 60 for r in reviews if r.get("author")]
    return {"n": len(forever),
            "median_hours": round(median(forever), 1) if forever else None,
            "under_2h_pct": round(sum(h < 2 for h in at_review) / len(at_review) * 100) if at_review else None}


def review_stats(appid: int, rules: dict | None = None) -> dict:
    """긍정률(전체·한국어)과 격차, 리뷰어 플레이 시간(전체·한국어).
    gap_pp(한국 평가 격차) = 한국어 긍정률 − 전체 긍정률(%p). 한국어 리뷰가 기준 개수 미만이면 None."""
    rules = rules or load_rules()
    all_page = _page(appid, "all", rules)
    ko_page = _page(appid, "koreana", rules)
    qa, qk = all_page.get("query_summary") or {}, ko_page.get("query_summary") or {}
    all_ = {"total": int(qa.get("total_reviews") or 0), "positive": int(qa.get("total_positive") or 0)}
    ko = {"total": int(qk.get("total_reviews") or 0), "positive": int(qk.get("total_positive") or 0)}
    gap = None
    if all_["total"] and ko["total"] >= rules["korea_warning_min_reviews"]:
        gap = round(ko["positive"] / ko["total"] * 100 - all_["positive"] / all_["total"] * 100, 1)
    pa, pk = _playtime(all_page.get("reviews") or []), _playtime(ko_page.get("reviews") or [])
    return {"reviews_all": all_["total"], "positive_all": all_["positive"],
            "reviews_ko": ko["total"], "positive_ko": ko["positive"], "gap_pp": gap,
            "playtime_median_h_all": pa["median_hours"], "playtime_n_all": pa["n"], "under_2h_pct_all": pa["under_2h_pct"],
            "playtime_median_h_ko": pk["median_hours"], "playtime_n_ko": pk["n"], "under_2h_pct_ko": pk["under_2h_pct"]}


def korean_negative_reviews(appid: int, count: int = 20, rules: dict | None = None) -> list[str]:
    """한국어 부정 리뷰 본문(최근순). 3단계 'AI 이유 요약' 재료. 지금은 수집만 하고 요약하지 않는다."""
    rules = rules or load_rules()
    data = get_json(APPREVIEWS.format(appid=appid),
                    {"json": 1, "language": "koreana", "review_type": "negative", "filter": "recent",
                     "purchase_type": "all", "num_per_page": min(count, 100)},
                    host_interval=rules["steam_request_interval_sec"], retry=rules["steam_retry"])
    return [r.get("review", "").strip() for r in (data or {}).get("reviews") or [] if r.get("review")]
