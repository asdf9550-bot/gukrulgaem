"""텔레그램 알림 — 매일 수집 뒤 실행(예약 작업 안에서).
1) 봇에게 온 메시지(getUpdates)를 읽어 "/start <스팀ID>" 는 구독, "/stop" 은 해지 → data/telegram_subs.json
2) 구독자마다 스팀 위시리스트(공개) 중 지금 바닥가·좋은 가격인 게임을 골라 한 통 보냄(같은 게임·같은 가격은 다시 안 보냄)
필요: .env 의 TELEGRAM_BOT_TOKEN, STEAM_WEB_API_KEY. 없으면 조용히 건너뜀.
"""
from __future__ import annotations

import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .common import ROOT, env, get_json, now_iso

DATA = ROOT / "data"
SUBS = DATA / "telegram_subs.json"
SITE = "https://gukrulgaem.com"


def _load(name: str):
    p = DATA / f"{name}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.is_file() else []


def _subs() -> list[dict]:
    return _load("telegram_subs")


def _save_subs(rows: list[dict]) -> None:
    SUBS.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def _tg(token: str, method: str, **params):
    data = urlencode(params).encode("utf-8") if params else None
    with urlopen(Request(f"https://api.telegram.org/bot{token}/{method}", data=data), timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def read_commands(token: str, log=print) -> list[dict]:
    """봇에게 온 /start·/stop 처리."""
    subs = _subs()
    state = {s["chat_id"]: s for s in subs}
    offset = max([s.get("last_update", 0) for s in subs] + [0]) + 1 if subs else None
    res = _tg(token, "getUpdates", **({"offset": offset, "timeout": 0} if offset else {"timeout": 0}))
    for u in res.get("result", []):
        msg = u.get("message") or {}
        chat = (msg.get("chat") or {}).get("id")
        text = (msg.get("text") or "").strip()
        if not chat or not text.startswith("/"):
            continue
        parts = text.split()
        if parts[0].startswith("/start") and len(parts) >= 2 and parts[1].isdigit() and len(parts[1]) == 17:
            state[chat] = {"chat_id": chat, "steamid": parts[1], "added_at": now_iso(), "sent": {}, "last_update": u["update_id"]}
            _tg(token, "sendMessage", chat_id=chat, text="국룰겜 알림을 켰어요. 위시리스트 게임이 바닥가·좋은 가격이 되면 매일 새벽 한 번 알려 드릴게요. 해지는 /stop")
            log(f"  텔레그램 구독 {chat}")
        elif parts[0].startswith("/stop"):
            state.pop(chat, None)
            _tg(token, "sendMessage", chat_id=chat, text="알림을 껐어요. 다시 받으려면 /start 스팀ID")
            log(f"  텔레그램 해지 {chat}")
        elif parts[0].startswith("/start"):
            _tg(token, "sendMessage", chat_id=chat, text=f"스팀 ID(17자리 숫자)를 같이 보내 주세요. 예: /start 7656119…\n{SITE}/me 에서 확인한 ID를 그대로 붙여 넣으면 돼요.")
        for s in state.values():
            s["last_update"] = max(s.get("last_update", 0), u["update_id"])
    rows = list(state.values())
    _save_subs(rows)
    return rows


def wishlist(steamid: str, key: str) -> set[int]:
    data = get_json("https://api.steampowered.com/IWishlistService/GetWishlist/v1/", {"key": key, "steamid": steamid}, host_interval=0.5, retry=2) or {}
    return {int(i["appid"]) for i in (data.get("response") or {}).get("items") or []}


def send_alerts(log=print) -> dict:
    token, key = env("TELEGRAM_BOT_TOKEN"), env("STEAM_WEB_API_KEY")
    if not token or not key:
        log("  텔레그램: TELEGRAM_BOT_TOKEN/STEAM_WEB_API_KEY 없음 → 건너뜀")
        return {"sent": 0, "subs": 0}
    subs = read_commands(token, log)
    games = {g["appid"]: g for g in _load("games")}
    prices = {p["appid"]: p for p in _load("prices")}
    sent = 0
    for s in subs:
        try:
            wanted = wishlist(s["steamid"], key)
        except Exception as error:
            log(f"  위시리스트 실패 {s['steamid']}: {str(error)[:80]}")
            continue
        hits = []
        for appid in wanted:
            p = prices.get(appid); g = games.get(appid)
            if not p or not g or p["verdict"] not in ("floor", "good"):
                continue
            mark = f"{p['current_price']}"
            if s.get("sent", {}).get(str(appid)) == mark:
                continue
            hits.append((g, p)); s.setdefault("sent", {})[str(appid)] = mark
        if not hits:
            continue
        lines = ["🎮 위시리스트 게임이 살 때가 됐어요"]
        for g, p in hits[:15]:
            lines.append(f"• {g['name']} — {p['current_price']:,}원 (-{p['discount_pct']}%) {p['verdict_label']}\n  {SITE}/game/{g['appid']}")
        if len(hits) > 15:
            lines.append(f"… 외 {len(hits) - 15}개")
        _tg(token, "sendMessage", chat_id=s["chat_id"], text="\n".join(lines), disable_web_page_preview="true")
        sent += 1
    _save_subs(subs)
    return {"sent": sent, "subs": len(subs)}
