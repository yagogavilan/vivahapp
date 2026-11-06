import { Redirect, useLocalSearchParams } from 'expo-router';

/** Endereço antigo da vitrine: agora cada trilha abre direto nos seus cursos. */
export default function TrilhaAntiga() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/t/[track]/cursos', params: { track: id } }} />;
}
