/**
 * Valida as contribuições que valem pontos e estão "em validação":
 * mensagens de ajuda (3 pontos) e conselhos/dicas (4 pontos).
 *
 * 1. Regras do _shared/contribution.ts (tamanho, esforço, repetição, ofensa,
 *    contato fora do app, sinais de risco).
 * 2. Se ANTHROPIC_API_KEY estiver configurada, o Claude confirma se o texto
 *    ajuda de verdade e se combina com o propósito da trilha.
 * Sinal de risco vira denúncia automática para a equipe olhar.
 *
 * O app chama a função logo depois de publicar ou comentar; agende também
 * a cada 5 minutos (Supabase → Integrations → Cron) para pegar o que sobrar.
 *
 * Segredos (opcional): supabase secrets set ANTHROPIC_API_KEY=...
 * Deploy: supabase functions deploy validate-contributions
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { aiPrompt, type ContributionKind, judgeContribution } from '../_shared/contribution.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const AI_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const AI_MODEL = Deno.env.get('VIVAH_AI_MODEL') ?? 'claude-haiku-5-5';

const PURPOSE: Record<string, string> = {
  aquecimento: 'Área grátis: ansiedade, Escudo Anticrise e acolhimento.',
  respira: 'Mente: ansiedade, pensar demais, sono e autoestima.',
  ritmo: 'Gestão do tempo: prioridades, foco e produtividade.',
  eleva: 'Carreira e negócios: CS, vendas, liderança e comunicação.',
  prospera: 'Finanças pessoais: orçamento, dívidas e reserva.',
  move: 'Corpo: treino em casa, movimento e disposição.',
  nutre: 'Alimentação: comida de verdade, rotina de refeições e água.',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function askAi(kind: ContributionKind, track: string, body: string): Promise<{ valido: boolean; motivo: string; risco: boolean } | null> {
  if (!AI_KEY) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 200,
        messages: [{ role: 'user', content: aiPrompt(kind, PURPOSE[track] ?? PURPOSE.aquecimento, body) }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null; // Sem IA, valem as regras.
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const { data: pending, error } = await supabase
    .from('point_events')
    .select('id, user_id, kind, track_id, post_id, comment_id')
    .eq('status', 'pendente')
    .order('created_at')
    .limit(50);
  if (error) return json({ error: error.message }, 500);

  let validated = 0;
  let refused = 0;
  for (const ev of pending ?? []) {
    const kind = ev.kind as ContributionKind;
    let body = '';
    let previous: string[] = [];
    if (kind === 'ajuda' && ev.comment_id) {
      const { data } = await supabase.from('comments').select('body').eq('id', ev.comment_id).maybeSingle();
      body = data?.body ?? '';
      const { data: prev } = await supabase.from('comments').select('body').eq('author_id', ev.user_id).neq('id', ev.comment_id).order('created_at', { ascending: false }).limit(20);
      previous = (prev ?? []).map((p) => p.body);
    } else if (ev.post_id) {
      const { data } = await supabase.from('posts').select('body').eq('id', ev.post_id).maybeSingle();
      body = data?.body ?? '';
      const { data: prev } = await supabase.from('posts').select('body').eq('author_id', ev.user_id).neq('id', ev.post_id).order('created_at', { ascending: false }).limit(20);
      previous = (prev ?? []).map((p) => p.body);
    }

    let verdict = judgeContribution(kind, body, previous);
    if (verdict.ok) {
      const ai = await askAi(kind, ev.track_id, body);
      if (ai?.risco) verdict = { ok: false, reason: 'Mensagem com sinal de risco enviada para a equipe Vivah cuidar.', flag: 'risco' };
      else if (ai && !ai.valido) verdict = { ok: false, reason: ai.motivo || 'A validação não identificou ajuda neste texto.' };
    }

    if (verdict.flag) {
      await supabase.from('reports').insert({
        reporter_id: null,
        source: 'sistema',
        target_type: ev.comment_id ? 'comment' : 'post',
        target_id: ev.comment_id ?? ev.post_id,
        reason: verdict.reason,
      });
    }
    await supabase
      .from('point_events')
      .update(verdict.ok ? { status: 'valido', reason: verdict.reason } : { status: 'recusado', points: 0, reason: verdict.reason })
      .eq('id', ev.id)
      .eq('status', 'pendente');
    if (verdict.ok) validated++;
    else refused++;
  }
  return json({ validated, refused });
});
