/** Regras de e-mail e senha, iguais no app e nos testes. */
export const PASSWORD_MIN = 8;

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Problemas da senha (vazio = ok): pelo menos 8 caracteres, com letra e número. */
export function passwordProblems(pw: string): string[] {
  const out: string[] = [];
  if (pw.length < PASSWORD_MIN) out.push(`${PASSWORD_MIN} caracteres`);
  if (!/[A-Za-zÀ-ÿ]/.test(pw)) out.push('uma letra');
  if (!/\d/.test(pw)) out.push('um número');
  return out;
}

/** Força de 0 a 3, para a barrinha do cadastro. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= PASSWORD_MIN) s++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s) as 1 | 2 | 3;
}

/** Mensagens do servidor de login em português. */
export function authMessage(raw: string | undefined | null): string {
  const m = (raw ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o seu e-mail com o código que enviamos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já tem conta. Entre ou use "Esqueci a senha".';
  if (m.includes('password should be') || m.includes('weak password')) return `Use uma senha com pelo menos ${PASSWORD_MIN} caracteres, letras e números.`;
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  if (m.includes('token has expired') || (m.includes('invalid') && m.includes('token')) || m.includes('otp')) return 'Código inválido ou vencido. Peça um novo.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem conexão. Confira a internet.';
  return raw || 'Não deu certo. Tente de novo.';
}
