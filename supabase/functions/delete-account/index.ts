/**
 * Apaga a conta do aluno que fez a chamada. A Apple e o Google exigem que a
 * exclusão de conta possa ser feita dentro do app.
 *
 * Remove o usuário do Auth; perfil, progresso, agenda, check-ins, diagnósticos
 * e posts saem em cascata. O registro das compras (entitlements, por e-mail)
 * fica, porque é dado fiscal da venda: se a pessoa criar outra conta com o
 * mesmo e-mail, o acesso comprado volta.
 *
 * Deploy: supabase functions deploy delete-account
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Faça login para apagar a conta.' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sessão inválida. Entre de novo e tente outra vez.' }, 401);

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ ok: true });
});
