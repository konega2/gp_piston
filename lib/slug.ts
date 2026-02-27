import { sql } from '@/lib/db';

const DEFAULT_SLUG = 'evento';

export function generateSlug(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || DEFAULT_SLUG;
}

export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const normalizedBase = generateSlug(baseSlug);
  const likePattern = `${normalizedBase}-%`;

  const { rows } = await sql<{ slug: string }>`
    SELECT slug
    FROM events
    WHERE slug = ${normalizedBase} OR slug LIKE ${likePattern};
  `;

  const existing = new Set(
    rows
      .map((row) => row.slug)
      .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
  );

  if (!existing.has(normalizedBase)) {
    return normalizedBase;
  }

  let counter = 2;
  while (existing.has(`${normalizedBase}-${counter}`)) {
    counter += 1;
  }

  return `${normalizedBase}-${counter}`;
}