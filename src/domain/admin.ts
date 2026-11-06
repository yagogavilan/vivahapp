/**
 * Regras da página de admin: ids legíveis, reordenação e os produtos que
 * nascem dos cursos (assinatura anual da trilha + um produto por low ticket).
 * O banco faz o mesmo com o gatilho course_products_sync.
 */
import type { Course, Product, Track } from '../data/types';

/** "Planilha de Orçamento!" → "planilha-de-orcamento" (sem repetir um id que já existe). */
export function slugId(title: string, taken: Iterable<string>, prefix = ''): string {
  const base =
    prefix +
    (title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'item');
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Sobe ou desce um item; devolve a nova ordem de ids (ou a mesma, se já está na ponta). */
export function moveId(ids: string[], id: string, dir: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Curso que pode ser vendido (não é conteúdo de nível nem de recompensa). */
export function isSellable(c: Pick<Course, 'minKindnessLevel' | 'rewardOnly'>): boolean {
  return c.minKindnessLevel == null && !c.rewardOnly;
}

export function deriveProducts(tracks: Track[], courses: Course[], checkouts: Record<string, string | null>): Product[] {
  const sellable = courses.filter(isSellable);
  return [
    ...tracks.map((t) => ({
      id: `trilha-${t.id}`,
      name: `Trilha ${t.title} · anual`,
      hotmartProductId: null,
      checkoutUrl: checkouts[`trilha-${t.id}`] ?? null,
      courseIds: sellable.filter((c) => c.trackId === t.id && !c.lowTicket).map((c) => c.id),
    })),
    ...sellable
      .filter((c) => c.lowTicket)
      .map((c) => ({ id: c.id, name: c.title, hotmartProductId: null, checkoutUrl: checkouts[c.id] ?? null, courseIds: [c.id] })),
  ];
}

/** Link de pagamento parece um endereço https válido? */
export function isCheckoutUrl(url: string): boolean {
  return /^https:\/\/[^\s/]+\.[^\s]+$/.test(url.trim());
}
