import { createContext, type ReactNode, useContext } from 'react';

import type { Space } from '../domain/spaces';

const SpaceContext = createContext<Space | null>(null);

export function SpaceProvider({ space, children }: { space: Space; children: ReactNode }) {
  return <SpaceContext.Provider value={space}>{children}</SpaceContext.Provider>;
}

/** Espaço (trilha) aberto agora. Só existe dentro de /t/[track]. */
export function useSpace(): Space {
  const s = useContext(SpaceContext);
  if (!s) throw new Error('useSpace fora de um espaço de trilha');
  return s;
}
