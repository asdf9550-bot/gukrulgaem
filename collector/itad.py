"""IsThereAnyDeal(공식 API, 국가 KR): 가격 이력, 역대 최저가, 세일 종료 시각.
스팀 상점(shop 61)·원화(KRW)만 쓴다. 리셀러의 달러 가격이 섞이면 판정이 틀린다.
약관: 출처 표기 필수, 가격 수정 금지 — 모든 페이지 하단에 ATTRIBUTION 을 쓴다."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .common import env, get_json

API = "https://api.isthereanydeal.com"
ATTRIBUTION = "가격 기록: IsThereAnyDeal (isthereanydeal.com)"
COUNTRY = "KR"
STEAM_SHOP = 61


def _key() -> str:
    key = env("ITAD_API_KEY")
    if not key:
        raise ValueError("ITAD_API_KEY 가 없습니다. .env 파일(또는 GitHub 비밀값)에 넣으세요.")
    return key


INTERVAL = 1.2      # 초. 0.3초로는 429(너무 많은 요청)가 났음(2026-10-06)
RETRY = 5


def _get(path: str, params: dict):
    return get_json(f"{API}/{path}", {**params, "key": _key()}, host_interval=INTERVAL, retry=RETRY)


def _post(path: str, params: dict, body):
    return get_json(f"{API}/{path}", {**params, "key": _key()}, host_interval=INTERVAL, retry=RETRY, method="POST", body=body)


def lookup(appid: int) -> str | None:
    """스팀 앱 번호 → ITAD 게임 번호. 모르는 게임이면 None."""
    data = _get("games/lookup/v1", {"appid": int(appid)})
    return (data.get("game") or {}).get("id") if data.get("found") else None


def steam_low(game_id: str) -> dict | None:
    """스팀 상점 역대 최저가 {'price', 'cut', 'timestamp'} (원화만). 없으면 None."""
    rows = _post("games/storelow/v2", {"country": COUNTRY, "shops": STEAM_SHOP}, [game_id])
    for row in rows or []:
        for low in row.get("lows") or []:
            price = low.get("price") or {}
            if (low.get("shop") or {}).get("id") == STEAM_SHOP and price.get("currency") == "KRW" \
                    and price.get("amount") is not None:
                return {"price": int(round(price["amount"])), "cut": low.get("cut"), "timestamp": low.get("timestamp")}
    return None


def history(game_id: str, months: int = 24) -> list[dict]:
    """최근 N개월 스팀 상점 가격 변동 기록(오래된 것부터): [{'at', 'price', 'regular', 'cut'}]."""
    since = (datetime.now(timezone.utc) - timedelta(days=30 * months)).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = _get("games/history/v2", {"id": game_id, "country": COUNTRY, "shops": STEAM_SHOP, "since": since})
    points = []
    for row in rows or []:
        deal = row.get("deal") or {}
        price = deal.get("price") or {}
        if price.get("amount") is None or price.get("currency") != "KRW":
            continue
        if (row.get("shop") or {}).get("id") not in (None, STEAM_SHOP):
            continue
        points.append({"at": row.get("timestamp"), "price": int(round(price["amount"])),
                       "regular": int(round((deal.get("regular") or {}).get("amount") or 0)) or None,
                       "cut": int(deal.get("cut") or 0)})
    points.sort(key=lambda p: p["at"] or "")
    return points


def current_deal(game_id: str) -> dict | None:
    """지금 스팀 상점 가격과 세일 종료 시각 {'price', 'regular', 'cut', 'expiry'}. 없으면 None."""
    rows = _post("games/prices/v3", {"country": COUNTRY, "shops": STEAM_SHOP, "vouchers": "false"}, [game_id])
    for row in rows or []:
        for deal in row.get("deals") or []:
            price = deal.get("price") or {}
            if (deal.get("shop") or {}).get("id") == STEAM_SHOP and price.get("currency") == "KRW":
                return {"price": int(round(price.get("amount") or 0)),
                        "regular": int(round((deal.get("regular") or {}).get("amount") or 0)),
                        "cut": int(deal.get("cut") or 0), "expiry": deal.get("expiry")}
    return None


def collect(appid: int, months: int = 24) -> dict:
    """한 게임의 가격 기록 묶음. ITAD가 모르는 게임이면 빈 값."""
    game_id = lookup(appid)
    if not game_id:
        return {"itad_id": None, "historical_low": None, "historical_low_at": None, "sale_end_at": None, "history": []}
    low = steam_low(game_id)
    deal = current_deal(game_id)
    return {"itad_id": game_id,
            "historical_low": low["price"] if low else None,
            "historical_low_at": low["timestamp"] if low else None,
            "sale_end_at": deal.get("expiry") if deal else None,
            "history": history(game_id, months)}
