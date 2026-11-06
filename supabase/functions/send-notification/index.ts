/**
 * Envia um aviso criado pelo admin (tabela notifications, status draft).
 *
 * 1. Confere se quem chamou é admin.
 * 2. Confere o texto (preço e compra de conteúdo digital são proibidos nos apps).
 * 3. dispatch_notification: põe o aviso na caixa de cada pessoa do público e
 *    devolve os celulares que aceitam este tipo de aviso.
 * 4. Envia pela Expo em lotes de 100, até ~500 por segundo, e apaga os tokens
 *    de celulares que não existem mais.
 * 5. Grava os números (enviados, falhas) para o admin ver.
 *
 * Responde na hora ("sending") e termina o envio em segundo plano.
 *
 * Segredos (opcional): supabase secrets set EXPO_ACCESS_TOKEN=...
 *   (só se a "segurança de push" estiver ligada no painel da Expo)
 * Deploy: supabase functions deploy send-notification
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { buildMessages, type NotificationKind, pushCopyIssues, sendAll } from '../_shared/push.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? null;

interface Row {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  url: string | null;
  status: string;
}

async function deliver(n: Row) {
  try {
    const { data, error } = await supabase.rpc('dispatch_notification', { p_id: n.id });
    if (error) throw new Error(error.message);
    const tokens = ((data ?? []) as { token: string }[]).map((r) => r.token);
    const messages = buildMessages(tokens, n);
    const result = await sendAll(messages, { fetch, accessToken: EXPO_ACCESS_TOKEN });
    if (result.deadTokens.length) await supabase.from('push_tokens').delete().in('token', result.deadTokens);
    await supabase
      .from('notifications')
      .update({
        status: messages.length && result.ok === 0 ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
        push_targets: messages.length,
        push_ok: result.ok,
        push_failed: result.failed,
        error: result.errors.length ? result.errors.join('; ').slice(0, 500) : null,
      })
      .eq('id', n.id);
  } catch (e) {
    await supabase.from('notifications').update({ status: 'failed', error: (e as Error).message.slice(0, 500) }).eq('id', n.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return json({ error: 'Entre de novo para enviar avisos.' }, 401);
  const { data: me } = await supabase.from('profiles').select('role').eq('id', auth.user.id).single();
  if (me?.role !== 'admin') return json({ error: 'Só o admin envia avisos.' }, 403);

  const { notificationId } = (await req.json().catch(() => ({}))) as { notificationId?: string };
  if (!notificationId) return json({ error: 'Faltou o aviso.' }, 400);
  const { data: n } = await supabase.from('notifications').select('id, kind, title, body, url, status').eq('id', notificationId).single();
  if (!n) return json({ error: 'Aviso não encontrado.' }, 404);
  if (n.status !== 'draft' && n.status !== 'failed') return json({ error: 'Este aviso já foi enviado.' }, 409);

  const blocking = pushCopyIssues(n.kind, n.title, n.body).filter((i) => i.blocking);
  if (blocking.length) return json({ error: blocking.map((i) => i.message).join(' ') }, 422);

  const job = deliver(n as Row);
  // Termina em segundo plano: o admin não espera os lotes.
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime) runtime.waitUntil(job);
  else await job;
  return json({ ok: true, status: 'sending' }, 202);
});
