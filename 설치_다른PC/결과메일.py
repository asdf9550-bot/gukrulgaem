# 국룰겜 자동 수집 결과 메일 (2026-10-13). 2_자동수집_올리기.ps1 이 성공했을 때 부른다.
# Gmail 앱 비밀번호로 내 메일(MAIL_TO)에 보냄. .env: GMAIL_USER, GMAIL_APP_PASSWORD, MAIL_TO(없으면 GMAIL_USER)
# 사용: python 결과메일.py <로그파일> <상태문구>
import os
import re
import smtplib
import socket
import sys
from email.mime.text import MIMEText
from pathlib import Path

root = Path(__file__).resolve().parent.parent


def load_env():
    env = {}
    f = root / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8-sig").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def main():
    log_path = Path(sys.argv[1])
    status = sys.argv[2] if len(sys.argv) > 2 else "성공"
    env = load_env()
    user = env.get("GMAIL_USER", "")
    pw = env.get("GMAIL_APP_PASSWORD", "").replace(" ", "")
    to = env.get("MAIL_TO") or user
    if not user or not pw:
        print("메일 건너뜀: .env 에 GMAIL_USER / GMAIL_APP_PASSWORD 가 없음")
        return 0

    log = log_path.read_text(encoding="utf-8-sig", errors="replace") if log_path.exists() else ""
    # 오늘 로그에 여러 회차가 있으면 마지막 회차만
    last = log[log.rfind("=== 시작"):] if "=== 시작" in log else log
    done = re.findall(r"완료: 게임 .*", last)
    summary = done[-1] if done else "(수집 요약 줄 없음)"

    body = (
        f"{status}\n\n"
        f"PC: {socket.gethostname()}\n"
        f"{summary}\n\n"
        f"사이트: https://gukrulgaem.com\n"
        f"기록 파일: {log_path}\n\n"
        "---- 마지막 회차 기록 (끝부분) ----\n"
        + "\n".join(last.strip().splitlines()[-25:])
    )
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = f"[국룰겜] 자동 수집 {status}"
    msg["From"] = user
    msg["To"] = to

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as s:
        s.starttls()
        s.login(user, pw)
        s.send_message(msg)
    print(f"메일 보냄 → {to}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
