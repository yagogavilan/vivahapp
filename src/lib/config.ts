import { Platform } from 'react-native';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Sem as chaves do Supabase o app roda em modo demonstração, com dados de
 * exemplo em memória. Serve para os sócios navegarem e para testar telas.
 */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_DEMO === '1';

/** Código aceito no modo demonstração. */
export const DEMO_CODE = '123456';

/**
 * Venda só na versão web. Nos apps da Apple Store e da Play Store não há
 * preço, botão nem link para comprar fora da loja: assim não há comissão
 * e o app passa na revisão. O aluno compra na Hotmart (lives, WhatsApp,
 * site) e o acesso aparece no app pelo mesmo e-mail.
 */
export const CAN_SELL_IN_APP = Platform.OS === 'web';

export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'contato@vivah.com.br';
