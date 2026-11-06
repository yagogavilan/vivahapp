import type { StoreItem } from '../data/types';
import { AQUECIMENTO } from './spaces';

/** Produtos à venda na loja da trilha: os da trilha primeiro, depois os da Vivah (que aparecem em todas). */
export function storeItemsFor(trackId: string, items: StoreItem[]): StoreItem[] {
  return items
    .filter((i) => i.active && (trackId === AQUECIMENTO || i.trackId === null || i.trackId === trackId))
    .sort((a, b) => Number(a.trackId === null) - Number(b.trackId === null) || a.sort - b.sort);
}
