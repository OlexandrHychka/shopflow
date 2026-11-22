import Link from 'next/link';

export default function HomePage() {
  return (
    <main data-testid="start-page">
      <h1>ShopFlow</h1>
      <Link href="/health">System health</Link>
    </main>
  );
}
