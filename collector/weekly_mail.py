"""주간 메일 보내기 — 매주 수요일 아침(예약 작업). Resend API 로 주소록(Audience) 전체에 Broadcast.

필요: .env 의 RESEND_API_KEY, RESEND_AUDIENCE_ID, MAIL_FROM(예 "국룰겜 <news@gukrulgaem.com>" — 가비아 DNS에 Resend 인증 레코드 필요)
내용: 이번 주 국룰 5(사이트와 같은 규칙) + 새로 바닥가 + 오늘 안에 끝나는 세일. 광고 없음. 해지 링크는 Resend가 붙임.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from .common import ROOT, env, now_iso

DATA = ROOT / "data"
SITE = "https://gukrulgaem.com"
PICK = {"min_reviews": 5000, "min_positive": 85, "min_discount": 30, "count": 5}     # web/lib/pick.ts 와 같은 규칙


def _load(name: str) -> list[dict]:
    p = DATA / f"{name}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.is_file() else []


def picks() -> list[tuple[dict, dict]]:
    prices = {p["appid"]: p for p in _load("prices")}
    rows = []
    for g in _load("games"):
        p = prices.get(g["appid"])
        if not p or p["verdict"] not in ("floor", "good") or g["reviews_all"] < PICK["min_reviews"]:
            continue
        if g["reviews_all"] and g["positive_all"] / g["reviews_all"] * 100 < PICK["min_positive"]:
            continue
        if "korea_warning" in p.get("tags", []) or (p.get("discount_pct") or 0) < PICK["min_discount"]:
            continue
        rows.append((g, p))
    rows.sort(key=lambda gp: (gp[0].get("steam_rank") or 9999, -(gp[1].get("discount_pct") or 0)))
    return rows[:PICK["count"]]


def new_floor() -> list[tuple[dict, dict]]:
    prev = {p["appid"]: p for p in _load("prices_prev")}
    games = {g["appid"]: g for g in _load("games")}
    out = []
    for p in _load("prices"):
        if p["verdict"] == "floor" and p["appid"] in prev and prev[p["appid"]]["verdict"] != "floor" and p["appid"] in games:
            out.append((games[p["appid"]], p))
    return out[:10]


def won(v) -> str:
    return "-" if v is None else f"{int(v):,}원"


def build_html() -> tuple[str, str]:
    today = datetime.now().strftime("%m월 %d일")
    subject = f"[국룰겜] {today} 이번 주 국룰 5 — 역대 최저가만 골랐어요"
    def row(g, p):
        return (f'<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="{SITE}/game/{g["appid"]}" style="color:#111;font-weight:700;text-decoration:none">{g["name"]}</a>'
                f'<div style="color:#666;font-size:13px">{p["verdict_label"]} · 한국 긍정 {round(g["positive_ko"]/g["reviews_ko"]*100) if g["reviews_ko"] else "-"}%</div></td>'
                f'<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap"><b>{won(p["current_price"])}</b> <span style="color:#dc2626">-{p["discount_pct"]}%</span></td></tr>')
    pk = picks(); nf = new_floor()
    html = f"""<div style="font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:560px;margin:0 auto;color:#111">
<h1 style="font-size:20px"><span style="color:#ef4444">국룰겜</span> 주간 메일 · {today}</h1>
<p style="color:#444">한국 스팀 가격 기록과 한국 게이머 평가로 고른 이번 주 살 만한 게임이에요. 판정은 공개 규칙으로 자동 계산됩니다.</p>
<h2 style="font-size:16px;margin-top:24px">이번 주 국룰 {len(pk)}</h2>
<table style="width:100%;border-collapse:collapse">{''.join(row(g,p) for g,p in pk) or '<tr><td>이번 주는 조건에 맞는 게임이 없어요.</td></tr>'}</table>
{('<h2 style="font-size:16px;margin-top:24px">새로 바닥가</h2><table style="width:100%;border-collapse:collapse">' + ''.join(row(g,p) for g,p in nf) + '</table>') if nf else ''}
<p style="margin-top:24px"><a href="{SITE}" style="display:inline-block;background:#ef4444;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">전체 할인 보기</a></p>
<p style="color:#888;font-size:12px;margin-top:24px">가격은 수집 시점 기준이며 결제 전 스팀에서 확인하세요. 가격 기록: IsThereAnyDeal. 이 메일은 gukrulgaem.com 에서 직접 구독한 분께만 보냅니다. {{{{{{RESEND_UNSUBSCRIBE_URL}}}}}} </p>
</div>"""
    html = html.replace("{{{RESEND_UNSUBSCRIBE_URL}}}", '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#888">수신 거부</a>')
    return subject, html


def send(dry: bool = False) -> dict:
    key, audience, sender = env("RESEND_API_KEY"), env("RESEND_AUDIENCE_ID"), env("MAIL_FROM")
    subject, html = build_html()
    if dry or not (key and audience and sender):
        out = ROOT / "output" / "weekly_mail_preview.html"; out.parent.mkdir(exist_ok=True)
        out.write_text(html, encoding="utf-8")
        return {"sent": False, "preview": str(out), "reason": "dry" if dry else "RESEND 설정 없음"}
    body = {"audience_id": audience, "from": sender, "subject": subject, "html": html, "name": subject}
    req = Request("https://api.resend.com/broadcasts", data=json.dumps(body).encode("utf-8"), method="POST",
                  headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=30) as r:
            created = json.loads(r.read().decode("utf-8"))
        bid = created.get("id")
        req2 = Request(f"https://api.resend.com/broadcasts/{bid}/send", data=b"{}", method="POST",
                       headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        with urlopen(req2, timeout=30) as r2:
            sent = json.loads(r2.read().decode("utf-8"))
        return {"sent": True, "broadcast": bid, "result": sent, "at": now_iso()}
    except HTTPError as error:
        return {"sent": False, "error": f"HTTP {error.code}: {error.read()[:200]!r}"}


if __name__ == "__main__":
    print(send(dry="--dry" in sys.argv))
