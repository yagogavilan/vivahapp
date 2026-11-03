/**
 * Webhook da Hotmart → libera ou retira o acesso aos cursos.
 *
 * Configure na Hotmart (Ferramentas → Webhook) a URL
 *   https://<projeto>.supabase.co/functions/v1/hotmart-webhook
 * com a versão 2.0.0 e os eventos de compra aprovada, completa, cancelada,
 * reembolsada, chargeback, protesto e cancelamento de assinatura.
 *
 * Segredos: supabase secrets set HOTMART_HOTTOK=<hottok da Hotmart>
 * Deploy:   supabase functions deploy hotmart-webhook --no-verify-jwt
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { type HotmartEvent, isAuthentic, missingFields, parseHotmartWebhook } from '../_shared/hotmart.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  let evt: HotmartEvent;
  try {
    evt = parseHotmartWebhook(body, req.headers.get('x-hotmart-hottok'));
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  if (!isAuthentic(evt, Deno.env.get('HOTMART_HOTTOK'))) {
    return json({ error: 'hottok inválido' }, 401);
  }

  // A Hotmart pode reenviar o mesmo evento: só reprocessa se a primeira vez deu erro.
  if (evt.eventId) {
    const { data: previous } = await supabase
      .from('hotmart_events')
      .select('result')
      .eq('hotmart_event_id', evt.eventId)
      .maybeSingle();
    if (previous && !previous.result.startsWith('erro')) {
      return json({ ok: true, result: previous.result, duplicate: true });
    }
  }

  let result: string;
  try {
    result = await apply(evt);
  } catch (e) {
    result = `erro: ${(e as Error).message}`;
  }

  const log = {
    hotmart_event_id: evt.eventId,
    event: evt.event,
    email: evt.email,
    hotmart_product_id: evt.hotmartProductId,
    transaction: evt.transaction,
    payload: body,
    result,
  };
  const { error: logError } = evt.eventId
    ? await supabase.from('hotmart_events').upsert(log, { onConflict: 'hotmart_event_id' })
    : await supabase.from('hotmart_events').insert(log);
  if (logError) console.error('Falha ao registrar evento da Hotmart', logError);

  // Responde 200 mesmo com erro de cadastro: o evento fica registrado em
  // hotmart_events e pode ser reenviado pelo painel da Hotmart depois do ajuste.
  return json({ ok: !result.startsWith('erro'), result });
});

async function apply(evt: HotmartEvent): Promise<string> {
  if (evt.action === 'ignore') return `ignorado: ${evt.event}`;

  const missing = missingFields(evt);
  if (missing) return `erro: ${missing}`;

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('hotmart_product_id', evt.hotmartProductId)
    .maybeSingle();
  if (productError) throw productError;
  if (!product) return `erro: produto Hotmart ${evt.hotmartProductId} não cadastrado em products`;

  if (evt.action === 'grant') {
    const { data: links, error: linksError } = await supabase
      .from('product_courses')
      .select('course_id')
      .eq('product_id', product.id);
    if (linksError) throw linksError;
    if (!links?.length) return `erro: produto ${product.id} sem cursos em product_courses`;

    const now = new Date().toISOString();
    const { error } = await supabase.from('entitlements').upsert(
      links.map((l) => ({
        email: evt.email,
        course_id: l.course_id,
        product_id: product.id,
        hotmart_transaction: evt.transaction,
        status: 'active',
        granted_at: now,
        revoked_at: null,
      })),
      { onConflict: 'email,course_id,product_id' },
    );
    if (error) throw error;
    return `liberado: ${links.length} curso(s) de ${product.id} para ${evt.email}`;
  }

  const { data: revoked, error } = await supabase
    .from('entitlements')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('email', evt.email)
    .eq('product_id', product.id)
    .eq('status', 'active')
    .select('id');
  if (error) throw error;
  return `revogado: ${revoked?.length ?? 0} acesso(s) de ${product.id} para ${evt.email}`;
}
