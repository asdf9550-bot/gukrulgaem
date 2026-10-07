// 판(에디션) 이름 분류: 스팀·다이렉트 게임즈 이름을 같은 종류끼리 짝짓는다.
export type EditionKind = "standard" | "deluxe" | "ultimate" | "gold" | "premium" | "complete" | "collector" | "bundle" | "season" | "starter" | "founder" | "other";

const KINDS: { kind: EditionKind; words: string[] }[] = [
  { kind: "ultimate", words: ["얼티밋", "ultimate", "얼티메이트"] },
  { kind: "deluxe", words: ["디럭스", "deluxe"] },
  { kind: "gold", words: ["골드", "gold"] },
  { kind: "premium", words: ["프리미엄", "premium"] },
  { kind: "complete", words: ["컴플리트", "complete", "완전판", "definitive", "디피니티브", "game of the year", "goty"] },
  { kind: "collector", words: ["컬렉터", "collector", "컬렉션", "collection", "레거시", "legacy"] },
  { kind: "season", words: ["시즌 패스", "season pass", "시즌패스", "확장팩", "expansion"] },
  { kind: "starter", words: ["스타터", "starter"] },
  { kind: "founder", words: ["개척자", "founder", "파운더"] },
  { kind: "bundle", words: ["번들", "bundle", "세트", "팩", "pack"] },
];

export const KIND_LABEL: Record<EditionKind, string> = {
  standard: "일반판", deluxe: "디럭스", ultimate: "얼티밋", gold: "골드", premium: "프리미엄", complete: "컴플리트",
  collector: "컬렉터", bundle: "번들", season: "시즌 패스·확장", starter: "스타터", founder: "개척자", other: "기타",
};

export function editionKind(name: string, baseName?: string): EditionKind {
  const low = name.toLowerCase();
  for (const k of KINDS) if (k.words.some((w) => low.includes(w))) return k.kind;
  if (baseName && name.trim().toLowerCase() === baseName.trim().toLowerCase()) return "standard";
  if (/스탠다드|standard|일반판/.test(low)) return "standard";
  return "other";
}

/** 판 종류 정렬 순서(표 세로) */
export const KIND_ORDER: EditionKind[] = ["standard", "deluxe", "gold", "premium", "ultimate", "complete", "collector", "founder", "starter", "season", "bundle", "other"];
