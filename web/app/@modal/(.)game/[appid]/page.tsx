import GameDetail from "@/components/GameDetail";
import Modal from "@/components/Modal";
import { games } from "@/lib/data";

// 목록에서 게임을 누르면 페이지 이동 없이 이 창이 겹쳐 뜬다. 주소는 /game/번호로 바뀌므로
// 새로고침하거나 링크를 공유하면 전체 페이지가 열린다.
export function generateStaticParams() {
  return games().map((g) => ({ appid: String(g.appid) }));
}

export default async function GameModal({ params }: { params: Promise<{ appid: string }> }) {
  const { appid } = await params;
  return <Modal><GameDetail appid={Number(appid)} compact /></Modal>;
}
