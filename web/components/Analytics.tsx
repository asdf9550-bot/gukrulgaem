import Script from "next/script";

// 구글 애널리틱스(GA4). 측정 ID(G-…)는 비밀값이 아니라 공개돼도 되는 값이라 NEXT_PUBLIC_ 으로 둔다.
// 값이 없으면(내 PC 미리보기 등) 아무것도 넣지 않는다.
export default function Analytics() {
  // 2026-10-08 만든 국룰겜 속성의 측정 ID. 환경 변수로 바꿔 끼울 수 있고, 빈 문자열이면 끔.
  const id = process.env.NEXT_PUBLIC_GA_ID ?? "G-WZ4VENE5DN";
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${id}', { anonymize_ip: true });
      `}</Script>
    </>
  );
}
