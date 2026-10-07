"""스팀 공식 Web API: 지금 접속자 수(GetNumberOfCurrentPlayers). 키 없이 호출 가능."""
from __future__ import annotations

from .common import get_json, now_iso

URL = "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/"


def current_players(appid: int) -> dict:
    """{'current_players': int|None, 'players_at': 시각}. 통계가 없는 게임은 None."""
    try:
        data = get_json(URL, {"appid": appid}, host_interval=0.5, retry=2)
    except Exception:
        return {"current_players": None, "players_at": now_iso()}
    resp = (data or {}).get("response") or {}
    count = resp.get("player_count") if resp.get("result") == 1 else None
    return {"current_players": int(count) if count is not None else None, "players_at": now_iso()}
