import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>mini-order</h1>
      <p>모듈러 모노리스 토이 — 진영 2 (도메인 단위) UI 실험</p>
      <ul>
        <li><Link href="/orders">주문 목록</Link></li>
      </ul>
    </main>
  );
}
