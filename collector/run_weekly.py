"""매주 실행: 수집 → 계산 → data 폴더의 json 저장.

쓰는 법
  python -m collector.run_weekly                      할인 중인 게임을 찾아 전부 수집
  python -m collector.run_weekly --appids 1,2,3       지정한 게임만
  python -m collector.run_weekly --limit 5 --table    5개만, 결과를 표로 출력
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import itad, steam_deck, steam_players, steam_reviews, steam_store, stores, verdict
from .common import ROOT, load_rules, now_iso

DATA = ROOT / "data"


def collect_one(appid: int, rules: dict, steam_rank: int | None = None) -> tuple[dict | None, dict | None, list[dict], str | None]:
    """(games 행, prices 행, price_history 행들, 건너뛴 이유). steam_rank = 스팀 '특별 할인·판매 순' 검색에서의 순위."""
    store = steam_store.appdetails(appid, rules)
    if not store:
        return None, None, [], "상점에 없음"
    if not store.get("discount_pct"):
        return None, None, [], "할인 중 아님"
    adult = steam_store.adult_reason(store, rules)
    if adult:
        return None, None, [], adult
    reviews = steam_reviews.review_stats(appid, rules)
    if reviews["reviews_all"] < rules["collect_min_reviews"]:
        return None, None, [], f"리뷰 {reviews['reviews_all']}개 (기준 {rules['collect_min_reviews']})"
    try:
        record = itad.collect(appid, rules["history_months"])
    except Exception as error:                 # 가격 기록을 못 받아도 게임은 싣는다(판정만 없음)
        print(f"  가격 기록 실패({appid}): {str(error)[:120]} → 판정 없음으로 저장", file=sys.stderr)
        record = {"itad_id": None, "historical_low": None, "historical_low_at": None, "sale_end_at": None, "history": []}
    judged = verdict.price_verdict(store["current_price"], store["regular_price"], record["historical_low"],
                                   record["history"], rules)
    game = {"appid": appid, "name": store["name"], "genres": store["genres"], "korean_support": store["korean_support"],
            "header_image": store["header_image"], "capsule_image": store.get("capsule_image"), "hero_image": store.get("hero_image"),
            "release_date": store["release_date"], "steam_url": store["steam_url"],
            "platforms": store.get("platforms", []), "play_modes": store.get("play_modes", []), "controller": store.get("controller", "none"),
            "steam_rank": steam_rank, "editions": store.get("editions", []),
            "deck": steam_deck.deck_status(appid, rules),
            "korean_reviews": steam_reviews.korean_top_reviews(appid, 3, rules) if reviews["reviews_ko"] >= 20 else [],
            **reviews, **steam_players.current_players(appid), "updated_at": now_iso()}
    price = {"appid": appid, "itad_id": record.get("itad_id"),
             "regular_price": store["regular_price"], "current_price": store["current_price"],
             "discount_pct": store["discount_pct"], "sale_end_at": record["sale_end_at"],
             "historical_low": record["historical_low"], "historical_low_at": record["historical_low_at"],
             "usual_sale_price": judged["usual_sale_price"], "sale_count_24m": judged["sale_count"],
             "vs_usual_pct": judged["vs_usual_pct"], "verdict": judged["verdict"], "verdict_label": judged["label"],
             "tags": verdict.tags(reviews["gap_pp"], reviews["reviews_ko"], rules), "fetched_at": now_iso()}
    points = [{"appid": appid, **p} for p in record["history"]]
    return game, price, points, None


def _append_review_history(games: list[dict]) -> None:
    """리뷰 수·긍정률·접속자를 실행마다 기록(게임당 최근 26개) → 화면의 '추세'."""
    path = DATA / "review_history.json"
    rows = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else []
    at = now_iso()
    for g in games:
        rows.append({"appid": g["appid"], "at": at, "reviews_all": g["reviews_all"], "positive_all": g["positive_all"],
                     "reviews_ko": g["reviews_ko"], "positive_ko": g["positive_ko"], "current_players": g.get("current_players")})
    keep: dict[int, list[dict]] = {}
    for r in rows:
        keep.setdefault(r["appid"], []).append(r)
    rows = [r for lst in keep.values() for r in lst[-26:]]
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def save(games: list[dict], prices: list[dict], history: list[dict], run: dict) -> None:
    DATA.mkdir(exist_ok=True)
    # 어제 가격을 보관 → 홈 "오늘 바뀐 것"(새로 바닥가, 새 할인)
    prev = DATA / "prices.json"
    if prev.is_file():
        (DATA / "prices_prev.json").write_text(prev.read_text(encoding="utf-8"), encoding="utf-8")
    for name, rows in (("games", games), ("prices", prices), ("price_history", history)):
        (DATA / f"{name}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    _append_review_history(games)
    runs_path = DATA / "runs.json"
    runs = json.loads(runs_path.read_text(encoding="utf-8")) if runs_path.is_file() else []
    runs = ([run] + runs)[:52]
    runs_path.write_text(json.dumps(runs, ensure_ascii=False, indent=1), encoding="utf-8")
    for name in ("videos", "review_summaries"):
        path = DATA / f"{name}.json"
        if not path.is_file():
            path.write_text("[]", encoding="utf-8")


def table(games: list[dict], prices: list[dict]) -> str:
    by_id = {p["appid"]: p for p in prices}
    support = {"voice_sub": "음성·자막", "sub": "자막만", "none": "미지원"}
    lines = ["| 게임 | 정가 | 지금 | 할인 | 역대 최저 | 평소 세일가 | 세일 횟수 | 판정 | 한국어 | 전체 긍정 | 한국 긍정 | 격차 | 태그 |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for g in games:
        p = by_id[g["appid"]]
        pos_all = f"{g['positive_all'] / g['reviews_all'] * 100:.0f}% ({g['reviews_all']:,})" if g["reviews_all"] else "-"
        pos_ko = f"{g['positive_ko'] / g['reviews_ko'] * 100:.0f}% ({g['reviews_ko']:,})" if g["reviews_ko"] else "-"
        won = lambda v: f"{v:,}원" if v is not None else "-"
        gap = f"{p and g['gap_pp']:+.1f}%p" if g["gap_pp"] is not None else "(100개 미만)"
        lines.append(f"| {g['name']} | {won(p['regular_price'])} | {won(p['current_price'])} | {p['discount_pct']}% | "
                     f"{won(p['historical_low'])} | {won(p['usual_sale_price'])} | {p['sale_count_24m']} | {p['verdict_label']} | "
                     f"{support[g['korean_support']]} | {pos_all} | {pos_ko} | {gap} | "
                     f"{', '.join(verdict.TAG_LABELS[t] for t in p['tags']) or '-'} |")
    return "\n".join(lines)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--appids", help="쉼표로 구분한 스팀 앱 번호")
    parser.add_argument("--limit", type=int, default=0, help="할인 목록에서 앞 N개만")
    parser.add_argument("--table", action="store_true", help="결과를 표로 출력")
    parser.add_argument("--no-save", action="store_true", help="data 폴더에 저장하지 않음")
    args = parser.parse_args(argv)
    rules = load_rules()
    started = now_iso()
    target = args.limit or int(rules.get("collect_target") or 100)
    if args.appids:
        appids = [int(a) for a in args.appids.split(",") if a.strip()]
    else:
        # 건너뛰는 게임(리뷰 부족·성인)이 있으니 목표보다 넉넉히 가져온다
        appids = steam_store.discounted_appids(limit=int(target * 1.6), rules=rules)
    args.limit = target
    games, prices, history, skipped, errors = [], [], [], [], []
    for index, appid in enumerate(appids, 1):
        if args.limit and len(games) >= args.limit:
            break
        try:
            game, price, points, why = collect_one(appid, rules, steam_rank=None if args.appids else index)
        except Exception as error:          # 한 게임 실패가 전체를 멈추지 않게
            errors.append({"appid": appid, "error": str(error)[:200]})
            print(f"[{index}/{len(appids)}] {appid} 실패: {error}", file=sys.stderr)
            continue
        if why:
            skipped.append({"appid": appid, "why": why})
            print(f"[{index}/{len(appids)}] {appid} 건너뜀: {why}")
            continue
        games.append(game); prices.append(price); history.extend(points)
        print(f"[{index}/{len(appids)}] {game['name']} — {price['verdict_label']}")
    # 판매처 가격 비교(IsThereAnyDeal 공식 판매처). 실패해도 본 수집은 저장한다.
    offers_summary = None
    if not args.no_save and prices:
        try:
            offers_summary = stores.collect_offers(prices, rules)
            print(f"판매처 가격: {offers_summary}")
        except Exception as error:
            errors.append({"appid": None, "error": f"판매처 가격 실패: {str(error)[:160]}"})
            print(f"판매처 가격 실패: {error}", file=sys.stderr)
        # 다이렉트 게임즈(B안: 사이트맵, 하루 1회, 3초 간격). 실패해도 마지막 캐시로 이어 간다.
        try:
            from . import directg
            directg_summary = directg.run(games, rules)
            print(f"다이렉트 게임즈: {directg_summary}")
            if offers_summary is not None:
                offers_summary["directg"] = directg_summary
        except Exception as error:
            errors.append({"appid": None, "error": f"다이렉트 게임즈 실패: {str(error)[:160]}"})
            print(f"다이렉트 게임즈 실패: {error}", file=sys.stderr)
    run = {"week": datetime.now(timezone.utc).strftime("%G-W%V"), "started_at": started, "finished_at": now_iso(),
           "game_count": len(games), "skipped": skipped, "errors": errors, "offers": offers_summary}
    if not args.no_save:
        save(games, prices, history, run)
    if args.table:
        print(); print(table(games, prices))
    print(f"\n완료: 게임 {len(games)}개, 건너뜀 {len(skipped)}개, 오류 {len(errors)}개")
    return 1 if errors and not games else 0


if __name__ == "__main__":
    sys.exit(main())
