import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const result = await sql`SELECT NOW() as time`;

  return (
    <main>
      <h1>DB Connection Test</h1>
      <pre>{JSON.stringify(result.rows[0] ?? null, null, 2)}</pre>
    </main>
  );
}
