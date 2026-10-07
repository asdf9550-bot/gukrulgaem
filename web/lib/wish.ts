"use client";
// 찜 목록: 로그인 없이 이 브라우저에만 저장(localStorage). 같은 탭의 다른 부품에도 바로 알림.
import { useEffect, useState } from "react";

const KEY = "gukrulgaem.wish";
const EVENT = "gukrulgaem-wish";

export function readWish(): number[] {
  try { const raw = localStorage.getItem(KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr.filter((x) => Number.isInteger(x)) : []; }
  catch { return []; }
}

export function writeWish(ids: number[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {}
  try { window.dispatchEvent(new Event(EVENT)); } catch {}
}

export function useWish(): [number[], (appid: number) => void, boolean] {
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setIds(readWish());
    sync(); setReady(true);
    window.addEventListener(EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const toggle = (appid: number) => {
    const cur = readWish();
    writeWish(cur.includes(appid) ? cur.filter((x) => x !== appid) : [...cur, appid]);
  };
  return [ids, toggle, ready];
}
