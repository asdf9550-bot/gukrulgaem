"""스팀덱 호환 등급(밸브가 스팀 상점 페이지에 쓰는 것과 같은 응답).
resolved_category: 3 확인됨(verified) / 2 플레이 가능(playable) / 1 지원 안 함(unsupported) / 0 미확인(unknown)."""
from __future__ import annotations

from .common import get_json, load_rules

URL = "https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport"
LABEL = {3: "verified", 2: "playable", 1: "unsupported", 0: "unknown"}


def deck_status(appid: int, rules: dict | None = None) -> str:
    rules = rules or load_rules()
    try:
        data = get_json(URL, {"nAppID": appid, "l": "koreana"}, host_interval=rules["steam_request_interval_sec"], retry=2)
    except Exception:
        return "unknown"
    results = (data or {}).get("results") or {}
    return LABEL.get(int(results.get("resolved_category") or 0), "unknown")
