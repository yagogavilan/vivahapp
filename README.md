# Vivah · app do aluno

App da Vivah para web/desktop, iPhone e Android, feito com **Expo (React Native)** e **Supabase**.
Um código só gera as três versões.

Este é o **MVP de 01/12/2026**:

- **Área de Aquecimento (grátis):** Escudo Anticrise diário, lives semanais com replay, aula de amostra e vitrine das seis trilhas.
- **Trilhas e cursos:** Respira (mente), Ritmo (tempo), Eleva (carreira e CS), Prospera (finanças), Move (corpo) e Nutre (alimentação). Têm aulas em vídeo, áudio e texto, com progresso salvo.
- **Acesso pela Hotmart:** a compra aprovada libera o curso para o e-mail do comprador. Reembolso, chargeback e cancelamento tiram o acesso.
- **Comunidade:** canal Aquecimento, aberto a todos, e um canal por trilha, só para alunos.
- **Agenda:** lives, aulas, foco, treino e refeições, com "salvar a live na agenda".
- **Diagnóstico:** 12 perguntas que recomendam por qual trilha começar.
- **Check-in de humor e sono:** só com consentimento (dado de saúde, LGPD art. 11).
- **Privacidade:** o aluno exporta os próprios dados e apaga a conta dentro do app, como as lojas exigem.

### Pontos, recompensas e o propósito de cada trilha (versão 4)

- **Menus da trilha:** Hoje, Cursos, Comunidade, **Prêmios** e Perfil. A agenda saiu do menu: os compromissos do dia aparecem no Hoje (com "Ver agenda").
- **Hoje com o propósito da trilha:** check-in, **plano do dia validado na hora** (ex.: Ritmo recusa mais de 3 prioridades e agenda que não cabe no dia; Prospera confere se os gastos previstos passam do limite; Move respeita a dor do check-in), prática, **fechamento do dia com nota de 0 a 100** (Ritmo: teste de produtividade; Respira: diário da noite; Prospera: fechamento financeiro; Move: corpo ativo e minutos da semana contra os 150 da OMS; Nutre: comida de verdade; Eleva: dia profissional; Aquecimento: três coisas boas) e gráfico de evolução de 14 dias. Regras em `src/domain/programs.ts`.
- **Pontos de 1 a 5, por trilha e validados no servidor:** curtida 1, agradecimento 2, mensagem de ajuda 3, conselho/dica 4 e apoio a outra pessoa 5. Cada atividade conta poucas vezes por dia (10, 5, 3, 1 e 1): no máximo **38 pontos por dia** em cada trilha. Curtidas da mesma pessoa contam até 10 por mês, agradecimentos até 3, apoio à mesma pessoa uma vez por semana. Cada ponto vira uma linha no extrato, com o motivo quando não pontua.
- **Validação das mensagens:** ajuda (mín. 40 caracteres) e conselho (mín. 80) passam por regras de esforço, repetição, ofensa, contato fora do app e sinal de risco (`supabase/functions/_shared/contribution.ts`). Com `ANTHROPIC_API_KEY` configurada, a função `validate-contributions` também pede a avaliação do Claude. Sinal de risco vira denúncia para a equipe.
- **Apoio a outra pessoa (5 pontos):** em cada pedido de apoio aparece a ação da trilha: Respira e Aquecimento reservam um horário (entra na agenda dos dois); Ritmo monta o planejamento; Eleva, um plano de carreira de 30 dias; Prospera, um orçamento; Move combina um treino juntos; Nutre monta um cardápio. Os pontos só caem quando a pessoa ajudada confirma.
- **Recompensas por trilha, resgatadas com pontos:** a mais barata custa **1.140 pontos (um mês fazendo tudo, todos os dias)**; as outras, 2, 3, 5, 6 e 12 meses, com nível mínimo. Conteúdo digital abre na hora em Cursos; prêmio físico vira pedido para a equipe. Resgatar não baixa o nível. Catálogo em `src/domain/rewards.ts`.
- **Selos por trilha:** selo de bondade (nível na trilha) e **selo de aulas**, dividido em um pedaço por curso que se completa conforme as aulas são concluídas. A coleção de todas as trilhas fica no Perfil.

Migração `20261107000000_pontos_por_trilha.sql` (extrato `point_events`, `daily_logs`, `support_actions`, `track_rewards`, `reward_redemptions`, conselheiros por trilha). Publique também a função: `supabase functions deploy validate-contributions` e agende-a a cada 5 minutos.

### App por trilha e comunidade (versão 3)

- **Escolha da trilha primeiro:** a tela inicial mostra as trilhas do aluno, a Área de Aquecimento (grátis) e as outras trilhas com cadeado (levam à vitrine). Ao entrar, o app se molda à trilha: **Hoje, Cursos, Comunidade, Agenda e Perfil** só dela. O seletor no topo troca de trilha.
- **Check-in diário por trilha:** perguntas comuns (humor, sentimento, energia, sono) e as da trilha (Respira: ansiedade 0–10, pensamentos acelerados e sintomas no corpo; Ritmo: sobrecarga; Eleva: peso do trabalho; Prospera: preocupação com dinheiro; Move: dor; Nutre: alimentação). Uma pergunta por tela.
- **Resumo com alertas e socorro na hora:** se o estado é crítico (ex.: ansiedade 8+), um exercício guiado começa sozinho (respiração 4-6 e aterramento 5-4-3-2-1), depois o aluno marca de 0 a 10 como ficou. Alertas com CVV 188 e SAMU 192 quando cabe. Botão **Socorro** sempre no topo. Regras em `src/domain/checkin-protocol.ts`; exercícios em `src/domain/exercises.ts` (o campo `audioUrl` recebe a versão narrada pelo Edmilson).
- **Hoje limpo, com jornada:** check-in primeiro e depois quatro passos (check-in, Escudo, aula do dia, comunidade), o curso atual e a próxima live.
- **Comunidade em feed:** tipo do post (pedir apoio, desabafo, conquista, dica), sentimento, curtir, reagir com emojis, comentar, filtros (pedem apoio, sem resposta, mesmo sentimento que você hoje), denúncia e aviso de "ninguém respondeu ainda".
- **Agradecer e níveis:** o obrigado vira ponto (ver versão 4). Oito níveis por trilha: Semente, Mão Amiga, Ombro Amigo, Coração Gentil, Ponte, Farol, Porto Seguro e Luz Vivah. Cada um exige pontos **e** pessoas diferentes (`src/domain/kindness.ts`).
- **Conselheiros:** a partir do nível Farol, com código de conduta e Formação de Conselheiro. Pedido, aceite, conversa dentro do app, encerrar, agradecer e denunciar.

Migração `20261106000000_trilha_comunidade.sql`: check-in por trilha, reações, agradecimentos (o banco decide quem recebe e quantos pontos), níveis, prêmios pedidos, cursos exclusivos por nível, conselheiros, conversas e denúncias. Tudo com RLS e testes.

### Engajamento (versão 2, baseada em referências de mercado)

Inspirado em Headspace, Duolingo, Calm e no player da Hotmart (e nas reclamações dos alunos sobre ele):

- **Plano do dia na tela Hoje:** 3 passos curtos (Escudo, uma aula, check-in) que mudam à noite (a partir das 18h de Brasília) para "Desacelere em poucos minutos". Anel de progresso e atalhos "Acalmar agora · Focar · Dormir melhor".
- **Sequência de dias gentil:** qualquer atividade conta (Escudo, aula, check-in, foco, live, post), há 1 dia de folga por semana e o aluno pode esconder a contagem em *Lembretes e sequência*. Sem mensagens de culpa.
- **Conquistas e certificados:** 11 conquistas (primeira aula, 7 dias, curso concluído…), marcos de 25/50/75% no curso e certificado do curso concluído.
- **Player melhor:** velocidade 0,75× a 2× no vídeo e no áudio, anotações privadas por aula, favoritos (aulas e Escudos) e "Continue de onde parou" em carrossel.
- **Busca** em trilhas, cursos, aulas e Escudos, sem acento e sem maiúsculas.
- **Bloco de foco** (15/25/50 min) que registra o tempo no dia do aluno.
- **Lembretes no celular:** Escudo diário no horário escolhido e aviso 15 min antes da live salva na agenda. Tocar no aviso abre a tela certa. Exigem *development build* ou build das lojas (o Expo Go não mostra notificações agendadas no Android). Na web a tela explica que é só no app.
- **Desktop e tablet de verdade:** menu lateral e duas colunas a partir de 1024 px. O app da Hotmart é criticado justamente por abrir "como celular" no iPad e no Mac.
- **Acabamento:** capas em degradê por trilha, esqueletos de carregamento, animações de entrada e vibração leve nos toques.

Tabelas novas (migração `20261103000000_engajamento.sql`): `activity_log` (o dia é sempre o de Brasília, gravado pelo banco), `lesson_notes` (só em aula liberada), `favorites` e `profiles.preferences`. Todas com RLS e incluídas na exportação de dados.

## Vendas: só na web, nunca dentro dos apps das lojas

O app da Apple Store e da Play Store **não vende nada**: não mostra preço, botão nem link para comprar fora da loja. Assim não há comissão da Apple ou do Google e o app passa na revisão.

| Onde | Trilha bloqueada |
|---|---|
| **Web / desktop** | Mostra o preço e o botão **Quero acessar**, que abre o checkout da Hotmart já com o e-mail do aluno |
| **iPhone / Android** | Mostra "Conteúdo para alunos Vivah", explica que o acesso aparece com o mesmo e-mail da inscrição e oferece **Atualizar meus acessos** |

A venda acontece no pitch das lives, nos grupos, no WhatsApp, no e-mail e na versão web. Dentro do app de celular, o player das lives não deixa abrir links. Na hora do pitch, o link da Hotmart vai pelo WhatsApp.

A regra está em `CAN_SELL_IN_APP` (`src/lib/config.ts`) e no `LockedPanel` (`src/components/locked-panel.tsx`).

## Rodar no computador

```bash
npm install
npm run web          # abre no navegador
npx expo start       # QR code para abrir no celular
```

Sem `.env`, o app abre em **modo demonstração**: aceita qualquer e-mail, o código é `123456` e vem com uma aluna que já tem o Protocolo e o Calma em 5 Minutos. Serve para os sócios navegarem antes do backend estar pronto.

`expo-audio`, `expo-video` e `react-native-webview` têm código nativo. Para testar no celular com tudo funcionando, use um development build:

```bash
npx eas-cli@latest build --profile development --platform ios     # ou android
```

## Ligar o Supabase

1. Crie o projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. Copie `.env.example` para `.env` e preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
3. Rode o banco:
   ```bash
   npx supabase@latest link --project-ref SEU_REF
   npx supabase@latest db push                                   # cria tabelas, funções e regras de acesso
   psql "$(npx supabase@latest db url)" -f supabase/seed.sql     # ou cole o seed.sql no SQL Editor
   ```
4. **Login por código:** em Authentication → Email Templates → *Magic Link*, troque o corpo por um texto com `{{ .Token }}`, por exemplo:
   > Seu código de acesso à Vivah é **{{ .Token }}**. Ele vale por 1 hora.

   Em Authentication → SMTP, configure um provedor de e-mail próprio (Resend, SES, SendGrid…). O SMTP padrão do Supabase tem limite baixo de envios.
5. **Edge Functions:**
   ```bash
   npx supabase@latest secrets set HOTMART_HOTTOK=hottok-copiado-da-hotmart
   npx supabase@latest functions deploy hotmart-webhook --no-verify-jwt
   npx supabase@latest functions deploy delete-account
   ```

## Ligar a Hotmart

1. Na Hotmart: **Ferramentas → Webhook (API e notificações) → Cadastrar webhook**.
   - URL: `https://SEU_REF.supabase.co/functions/v1/hotmart-webhook`
   - Versão: **2.0.0**
   - Eventos: compra aprovada, completa, cancelada, reembolsada, chargeback, protesto, expirada e cancelamento de assinatura.
   - Copie o **hottok** e grave com `supabase secrets set HOTMART_HOTTOK=...`.
2. No Supabase, tabela **products**: em cada produto, preencha `hotmart_product_id` (o ID numérico do produto na Hotmart) e `checkout_url` (o link de pagamento `https://pay.hotmart.com/...`).
3. A tabela **product_courses** diz quais cursos cada produto libera. O seed já liga cada curso ao seu produto, e a **Assinatura Vivah** a todos os cursos marcados como `in_subscription`.
4. Use **Enviar teste** na Hotmart e confira a tabela **hotmart_events**: o campo `result` mostra `liberado`, `revogado`, `ignorado` ou o erro (por exemplo, produto não cadastrado). Depois de corrigir o cadastro, reenvie o evento pelo painel da Hotmart e ele é processado de novo.

Order bumps e upsells são produtos próprios na Hotmart. Cadastre cada um em `products` com o seu ID.

## Cadastrar conteúdo (sem programar)

Tudo é feito pelo **Table Editor** do Supabase:

| O quê | Tabela | Campo |
|---|---|---|
| Vídeo ou áudio de uma aula | `lesson_media` | `media_url` (MP4/HLS/MP3) |
| Material de texto/PDF | `lesson_media` | `body` e `media_url` do arquivo |
| Escudo Anticrise do dia | `escudo_audios` | `audio_url`, `title`, `summary`, `publish_date` |
| Link da live | `lives` | `youtube_id` (o código depois de `v=`), datas e `replay_until` |
| Lançar uma trilha | `tracks` | `status` de `soon` para `live` |
| Dar acesso manual (cortesia) | `entitlements` | e-mail em minúsculas + curso + produto |
| Tornar alguém moderador | `profiles` | `role = admin` (só pelo painel) |

Os arquivos podem ficar no **Storage** do Supabase. Para vídeo pago, prefira um player com link assinado (Panda Video, Vimeo, Bunny Stream). O app só entrega o link a quem tem acesso, mas um link público continua funcionando para quem o tiver em mãos.

O catálogo inicial (trilhas, cursos, aulas, produtos, lives, Escudo e diagnóstico) fica em `src/data/catalog.ts`. Depois de mudar esse arquivo, rode `npm run seed:generate` e aplique o `supabase/seed.sql` de novo. O seed só atualiza o catálogo: não apaga compras, progresso nem posts, e não sobrescreve vídeos ou checkouts já cadastrados.

## Publicar

- **Web:** `npx expo export --platform web` gera a pasta `dist/`, um site estático para Vercel, Netlify ou Hostinger. Configure o servidor para responder `index.html` em qualquer rota.
- **Lojas:**
  ```bash
  npx eas-cli@latest build --profile production --platform all
  npx eas-cli@latest submit --platform ios
  npx eas-cli@latest submit --platform android
  ```
  O app já vem com `bundleIdentifier`/`package` `br.com.vivah.app`. Troque em `app.json` se quiser outro. Na revisão da Apple, crie uma conta de teste com acesso a um curso e informe e-mail e código no App Store Connect. Explique que o app é de consumo de conteúdo já adquirido (sem venda no app).

## Como o código está organizado

```
src/app/                 telas (Expo Router)
  index                  escolha da trilha (primeira tela)
  t/[track]/             espaço da trilha: Hoje · Cursos · Comunidade · Prêmios · Perfil
  trilha/ curso/ aula/   trilha → curso → aula
  live/ escudo/ post/    Área de Aquecimento e comunidade
  entrar, boas-vindas, diagnostico, checkin, evento, privacidade
  foco, buscar, conquistas, lembretes, favoritos, certificado/
  checkin, socorro, publicar, plano, fechamento, apoio, agenda, conselheiros, conselheiro, conselho/
src/components/          componentes visuais (ui, players, vitrine, painel bloqueado)
src/data/                catálogo, tipos, API (Supabase e demonstração) e hooks
src/domain/              regras sem tela: acesso, datas de Brasília, agenda, diagnóstico,
                         sequência, conquistas, plano do dia e busca
src/lib/                 lembretes (notificações locais), vibração, configuração
supabase/migrations/     banco, funções e RLS
supabase/functions/      webhook da Hotmart e exclusão de conta (Deno)
supabase/tests/          testes das regras de acesso
tests/                   testes das regras de negócio e do webhook
```

## Testes

```bash
npm run typecheck   # TypeScript
npx expo lint       # ESLint
npm test            # acesso, datas, agenda, diagnóstico, sequência, conquistas, busca e webhook da Hotmart
npm run db:test     # migração + seed + RLS num Postgres local (PGPASSWORD=... se precisar)
```

## Próximos passos (fora do MVP)

- Acompanhamentos de treino, peso, refeições, gastos, foco e carreira, e o painel **Minha evolução** (V1–V3 do plano).
- Push enviado pelo servidor (ex.: "a live começou agora" para todos). Os lembretes locais já estão prontos.
- Painel administrativo próprio (hoje é o Table Editor do Supabase).
- Assinatura recorrente: o webhook já trata `SUBSCRIPTION_CANCELLATION`. Falta definir se o acesso cai na hora ou no fim do ciclo pago.

## Cuidados legais já previstos

- A Vivah é psicoeducação. O app avisa que não substitui terapia e mostra o CVV (188) na comunidade e no check-in de humor muito baixo.
- O diagnóstico é autoavaliação, não teste psicológico. Testes psicológicos exigem aprovação do Conselho Federal de Psicologia e aplicação por psicólogo.
- Treino e plano alimentar individuais só com educador físico (CREF) e nutricionista (CRN), nos produtos de acompanhamento.
- Humor e sono só são guardados com consentimento. Desligar apaga tudo (há um gatilho no banco para isso).
