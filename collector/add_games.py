"""영상에 들어갈 게임을 사이트 자료에 바로 추가(2026-10-12, 사용자 "사이트 기준으로 영상 만들어야 돼").

영상 프로그램이 게임을 고른 뒤, 사이트(data/*.json)에 아직 없는 게임만 이 명령으로 수집해 넣는다.
리뷰 수 기준(collect_min_reviews)은 건너뛴다 — 영상에 나오는 게임은 사이트에도 판정이 있어야 하므로.
기존 줄은 그대로 두고 해당 게임 줄만 추가·교체한다. 매일 새벽 전체 수집이 다시 덮어써도 같은 결과가 나온다
(run_weekly.video_appids 가 영상에 나온 게임을 계속 수집).

  python -m collector.add_games --appids 4968640:34,4282780:84      (앱번호:스팀 판매 순위)
결과는 마지막 줄에 JSON 한 줄: {"added": [...], "skipped": {...}, "errors": {...}}
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

from . import run_weekly
from .common import load_rules

DATA = run_weekly.DATA


def _load(name: str) -> list[dict]:
    path = DATA / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8-sig")) if path.is_file() else []


def _save(name: str, rows: list[dict]) -> None:
    path = DATA / f"{name}.json"
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    for attempt in range(5):          # 빌드·영상 프로그램이 읽는 중이면 잠깐 기다렸다 바꿈
        try:
            os.replace(temporary, path)
            return
        except PermissionError:
            time.sleep(1 + attempt)
    os.replace(temporary, path)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--appids", required=True, help="앱번호 또는 앱번호:순위, 쉼표로 구분")
    args = parser.parse_args(argv)
    targets: list[tuple[int, int | None]] = []
    for part in args.appids.split(","):
        appid, _, rank = part.strip().partition(":")
        if appid.isdigit():
            targets.append((int(appid), int(rank) if rank.isdigit() else None))
    rules = load_rules()
    games, prices, history = _load("games"), _load("prices"), _load("price_history")
    added, skipped, errors = [], {}, {}
    for appid, rank in targets:
        try:
            game, price, points, why = run_weekly.collect_one(appid, rules, steam_rank=rank, force=True)
        except Exception as error:      # 한 게임 실패가 나머지를 막지 않게
            errors[str(appid)] = str(error)[:200]
            continue
        if why:
            skipped[str(appid)] = why
            continue
        games = [g for g in games if g["appid"] != appid] + [game]
        prices = [p for p in prices if p["appid"] != appid] + [price]
        history = [h for h in history if h["appid"] != appid] + points
        added.append(appid)
        print(f"{appid} {game['name']} — {price['verdict_label']}", file=sys.stderr)
    if added:
        _save("games", games); _save("prices", prices); _save("price_history", history)
    print(json.dumps({"added": added, "skipped": skipped, "errors": errors}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
