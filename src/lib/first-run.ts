/**
 * Trilha escolhida no fim do teste do primeiro acesso. Ao terminar o
 * onboarding o app troca de pilha de telas e volta para a tela inicial; ela
 * lê este valor uma vez e abre direto a trilha escolhida.
 */
let pending: string | null = null;

export function setFirstTrack(trackId: string) {
  pending = trackId;
}

export function takeFirstTrack(): string | null {
  const t = pending;
  pending = null;
  return t;
}
