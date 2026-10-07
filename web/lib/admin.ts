// 관리자 승인 저장: 내 PC에서는 data/match_queue.json 을 바로 고치고,
// Vercel(GitHub 저장소 연결)에서는 GitHub API로 같은 파일을 커밋한다. 둘 다 같은 함수로 처리.
import fs from "node:fs";
import path from "node:path";

export interface QueueItem {
  id: string; store_id: string; product_id: string; product_url: string; title_raw: string; edition: string; price: number;
  candidates: { appid: number; name: string; score: number }[];
  status: "pending" | "approved" | "rejected"; appid: number | null; decided_at: string | null;
}

const REL = "data/match_queue.json";

function localPath(): string | null {
  for (const c of [path.join(process.cwd(), "..", REL), path.join(process.cwd(), REL)]) if (fs.existsSync(c)) return c;
  return null;
}

export function checkPassword(given: string | null): boolean {
  const want = process.env.ADMIN_PASSWORD;
  return !!want && !!given && given === want;
}

export function adminMode(): "github" | "local" | "none" {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) return "github";
  if (localPath()) return "local";
  return "none";
}

async function githubGet(): Promise<{ items: QueueItem[]; sha: string }> {
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");
  const branch = process.env.GITHUB_BRANCH || "main";
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${REL}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`GitHub 읽기 실패 ${r.status}`);
  const j = await r.json() as { content: string; sha: string };
  return { items: JSON.parse(Buffer.from(j.content, "base64").toString("utf-8")), sha: j.sha };
}

async function githubPut(items: QueueItem[], sha: string, message: string): Promise<void> {
  const [owner, repo] = process.env.GITHUB_REPO!.split("/");
  const branch = process.env.GITHUB_BRANCH || "main";
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${REL}`, {
    method: "PUT", headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({ message, branch, sha, content: Buffer.from(JSON.stringify(items, null, 1), "utf-8").toString("base64") }),
  });
  if (!r.ok) throw new Error(`GitHub 저장 실패 ${r.status}`);
}

// ---- 관리자가 붙여 넣은 다이렉트 게임즈 상품 주소 (data/directg_links.json) ----
export interface ManualLink { appid: number; product_id: string; product_url: string; added_at: string }
const LINKS_REL = "data/directg_links.json";

async function readJson<T>(rel: string): Promise<{ items: T[]; sha?: string; path?: string }> {
  if (adminMode() === "github") {
    const [owner, repo] = process.env.GITHUB_REPO!.split("/");
    const branch = process.env.GITHUB_BRANCH || "main";
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${rel}?ref=${branch}`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" }, cache: "no-store" });
    if (r.status === 404) return { items: [] };
    if (!r.ok) throw new Error(`GitHub 읽기 실패 ${r.status}`);
    const j = await r.json() as { content: string; sha: string };
    return { items: JSON.parse(Buffer.from(j.content, "base64").toString("utf-8")), sha: j.sha };
  }
  const base = localPath() ? path.dirname(path.dirname(localPath()!)) : null;
  if (!base) throw new Error("data 폴더 없음");
  const p = path.join(base, rel);
  return { items: fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf-8")) as T[]) : [], path: p };
}

async function writeJson<T>(rel: string, items: T[], sha: string | undefined, p: string | undefined, message: string): Promise<void> {
  if (adminMode() === "github") {
    const [owner, repo] = process.env.GITHUB_REPO!.split("/");
    const branch = process.env.GITHUB_BRANCH || "main";
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${rel}`, {
      method: "PUT", headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
      body: JSON.stringify({ message, branch, ...(sha ? { sha } : {}), content: Buffer.from(JSON.stringify(items, null, 1), "utf-8").toString("base64") }),
    });
    if (!r.ok) throw new Error(`GitHub 저장 실패 ${r.status}`);
    return;
  }
  fs.writeFileSync(p!, JSON.stringify(items, null, 1), "utf-8");
}

export async function readLinks(): Promise<ManualLink[]> {
  return (await readJson<ManualLink>(LINKS_REL)).items;
}

export async function addLink(productUrl: string, appid: number): Promise<ManualLink> {
  const m = productUrl.match(/product_id=([0-9a-f-]{36})/i);
  if (!m) throw new Error("다이렉트 게임즈 상품 주소가 아닙니다 (product_id= 가 있어야 함)");
  const { items, sha, path: p } = await readJson<ManualLink>(LINKS_REL);
  const link: ManualLink = { appid, product_id: m[1].toLowerCase(), product_url: `https://directg.net/game/game_view.html?product_id=${m[1].toLowerCase()}`, added_at: new Date().toISOString() };
  const next = items.filter((x) => x.product_id !== link.product_id && x.appid !== appid).concat(link);
  await writeJson(LINKS_REL, next, sha, p, `admin: link directg ${link.product_id} → ${appid}`);
  return link;
}

export async function removeLink(productId: string): Promise<void> {
  const { items, sha, path: p } = await readJson<ManualLink>(LINKS_REL);
  await writeJson(LINKS_REL, items.filter((x) => x.product_id !== productId), sha, p, `admin: unlink directg ${productId}`);
}

export async function readQueue(): Promise<QueueItem[]> {
  if (adminMode() === "github") return (await githubGet()).items;
  const p = localPath();
  return p ? (JSON.parse(fs.readFileSync(p, "utf-8")) as QueueItem[]) : [];
}

/** 승인/거절 적용. appid 는 승인 때만. */
export async function decide(id: string, status: "approved" | "rejected", appid: number | null): Promise<QueueItem> {
  const apply = (items: QueueItem[]) => {
    const it = items.find((x) => x.id === id);
    if (!it) throw new Error("대기 항목을 찾을 수 없음");
    it.status = status; it.appid = status === "approved" ? appid : null; it.decided_at = new Date().toISOString();
    return it;
  };
  if (adminMode() === "github") {
    const { items, sha } = await githubGet();
    const it = apply(items);
    await githubPut(items, sha, `admin: ${status} ${it.title_raw}`);
    return it;
  }
  const p = localPath();
  if (!p) throw new Error("match_queue.json 없음");
  const items = JSON.parse(fs.readFileSync(p, "utf-8")) as QueueItem[];
  const it = apply(items);
  fs.writeFileSync(p, JSON.stringify(items, null, 1), "utf-8");
  return it;
}
