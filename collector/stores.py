"""판매처 가격 비교: IsThereAnyDeal(국가 KR)에서 공식 판매처 가격을 받아 offers.json / offer_history.json 에 저장.

- ITAD는 KR 기준으로 외화 판매처 가격을 원화로 환산해 준다(그날 환율). 우리는 외화 결제 판매처에
  해외 결제 수수료(rules.foreign_card_fee_pct)를 더해 '실제 결제 추정(약)'을 만든다.
- 모든 판매처 포함 역대 최저가는 ITAD historyLow.all(KR) 을 그대로 쓴다(출처 표기 필수).
- 키 리셀러는 config/stores.json 에 없으므로 수집되지 않는다.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from . import itad
from .common import ROOT, load_rules, now_iso

DATA = ROOT / "data"


def load_stores() -> list[dict]:
    cfg = json.loads((ROOT / "config" / "stores.json").read_text(encoding="utf-8"))
    return [s for s in cfg["stores"] if s.get("enabled")]


def _read(name: str) -> list[dict]:
    path = DATA / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else []


def _write(name: str, rows) -> None:
    (DATA / f"{name}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def ensure_itad_ids(prices: list[dict], log=print) -> None:
    """prices 행에 itad_id 가 없으면 찾아 넣는다(한 번만 드는 비용)."""
    for row in prices:
        if row.get("itad_id") is not None or row.get("itad_missing"):
            continue
        try:
            gid = itad.lookup(row["appid"])
        except Exception as error:
            log(f"  itad 번호 조회 실패 {row['appid']}: {str(error)[:80]}")
            continue
        if gid:
            row["itad_id"] = gid
        else:
            row["itad_missing"] = True


def fetch_offers(prices: list[dict], stores: list[dict], rules: dict, log=print) -> tuple[list[dict], dict]:
    """(offers 행들, {appid: 모든 판매처 포함 역대 최저가})"""
    by_shop = {s["itad_shop"]: s for s in stores if s.get("itad_shop")}
    shops = ",".join(str(k) for k in by_shop)
    id_to_appid = {row["itad_id"]: row["appid"] for row in prices if row.get("itad_id")}
    ids = list(id_to_appid)
    fee = 1 + float(rules.get("foreign_card_fee_pct", 0)) / 100
    offers: list[dict] = []
    lows: dict = {}
    fetched = now_iso()
    for start in range(0, len(ids), 100):
        chunk = ids[start:start + 100]
        rows = itad._post("games/prices/v3", {"country": itad.COUNTRY, "shops": shops, "vouchers": "false"}, chunk) or []
        log(f"  판매처 가격 {min(start + 100, len(ids))}/{len(ids)}")
        for row in rows:
            appid = id_to_appid.get(row.get("id"))
            if appid is None:
                continue
            low = ((row.get("historyLow") or {}).get("all") or {})
            if low.get("currency") == "KRW" and low.get("amount") is not None:
                lows[appid] = int(round(low["amount"]))
            for deal in row.get("deals") or []:
                shop = by_shop.get((deal.get("shop") or {}).get("id"))
                price = deal.get("price") or {}
                if not shop or price.get("currency") != "KRW" or price.get("amount") is None:
                    continue
                krw = int(round(price["amount"]))
                estimate = not shop["krw_payment"]
                offers.append({
                    "appid": appid, "store_id": shop["id"], "store_name": shop["name"],
                    "price_original": krw, "currency": "KRW", "converted_by": "itad" if estimate else None,
                    "regular_original": int(round((deal.get("regular") or {}).get("amount") or 0)) or None,
                    "discount_pct": int(deal.get("cut") or 0),
                    "price_krw": int(round(krw * fee)) if estimate else krw,
                    "is_estimate": estimate,
                    "product_url": deal.get("url"), "affiliate": "itad",
                    "drm": [d.get("name") for d in deal.get("drm") or []],
                    "region_lock": shop.get("region_lock_default", "unknown"),
                    "korean_only_here": False,
                    "sale_end_at": deal.get("expiry"),
                    "fetched_at": fetched,
                })
    return offers, lows


def update_history(offers: list[dict]) -> list[dict]:
    """판매처별 가격 이력: 같은 날 같은 가격이면 추가하지 않는다."""
    history = _read("offer_history")
    last: dict = {}
    for h in history:
        last[(h["appid"], h["store_id"])] = h
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for o in offers:
        key = (o["appid"], o["store_id"])
        prev = last.get(key)
        if prev and prev["price_krw"] == o["price_krw"] and prev["at"][:10] == today:
            continue
        if prev and prev["price_krw"] == o["price_krw"]:
            continue
        row = {"appid": o["appid"], "store_id": o["store_id"], "at": o["fetched_at"], "price_krw": o["price_krw"],
               "price_original": o["price_original"], "currency": o["currency"]}
        history.append(row)
        last[key] = row
    return history


def collect_offers(prices: list[dict], rules: dict | None = None, log=print) -> dict:
    """전체 실행: prices 행(itad_id·all_stores_low 갱신) → offers.json, offer_history.json 저장. 결과 요약을 돌려준다."""
    rules = rules or load_rules()
    stores = load_stores()
    ensure_itad_ids(prices, log)
    offers, lows = fetch_offers(prices, stores, rules, log)
    for row in prices:
        if row["appid"] in lows:
            row["all_stores_low"] = lows[row["appid"]]
    _write("offers", offers)
    _write("offer_history", update_history(offers))
    _write("stores", [{k: v for k, v in s.items()} for s in stores])
    games_with = len({o["appid"] for o in offers})
    cheaper = 0
    steam = {o["appid"]: o["price_krw"] for o in offers if o["store_id"] == "steam"}
    for appid, sp in steam.items():
        best = min(o["price_krw"] for o in offers if o["appid"] == appid)
        cheaper += best < sp
    return {"offers": len(offers), "games": games_with, "cheaper_than_steam": cheaper}
