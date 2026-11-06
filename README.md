# Vivah · app do aluno

App da Vivah para web/desktop, iPhone e Android, feito com **Expo (React Native)** e **Supabase**.
Um código só gera as três versões.

Este é o **MVP de 01/12/2026**:

- **Área de Aquecimento (grátis):** Escudo Anticrise diário, lives semanais com replay, aula de amostra e vitrine das seis trilhas.
- **Trilhas e cursos:** Respira (mente), Ritmo (tempo), Eleva (carreira e CS), Prospera (finanças), Move (corpo) e Nutre (alimentação). Têm aulas em vídeo, áudio e texto, com progresso salvo.
- **Acesso pela Hotmart:** a compra aprovada libera o curso para o e-mail do comprador. Reembolso, chargeback e cancelamento tiram o acesso.
- **Comunidade:** canal Aquecimento, aberto a todos, e um canal por trilha, só para alunos.
- **Agenda:** lives, aulas, foco, treino e refeições, com "salvar a live na agenda".
- **Teste de momento de vida:** 14 perguntas no primeiro acesso indicam o momento e a trilha para começar.
- **Check-in de humor e sono:** só com consentimento (dado de saúde, LGPD art. 11).
- **Privacidade:** o aluno exporta os próprios dados e apaga a conta dentro do app, como as lojas exigem.

### Notificações push (versão 9)

- **Admin escolhe quando avisar.** Em *Administração → Avisos e push*: aviso livre ou lançamento, para todos ou para quem assina uma trilha, com destino ao tocar (Agenda, Loja, Hoje da trilha…). Ao criar uma aula, o interruptor *Avisar os alunos* (desligado por padrão) já traz o texto pronto. No curso e no low ticket há *Avisar do lançamento*. Antes de enviar aparecem a prévia como no celular e quantas pessoas recebem. Depois aparecem os números: quantas receberam no sino, quantos push foram entregues e quantas pessoas abriram.
- **Regras das lojas no próprio texto.** Aula, curso e low ticket não podem citar preço nem ter chamada de compra ("R$", "%", "compre agora", "desconto", "checkout"…). O botão de enviar fica bloqueado, e a função no servidor confere de novo. Lançamentos e ofertas só chegam por push a quem aceitou (diretriz 4.5.4 da Apple), e a data do aceite fica gravada.
- **O aluno escolhe o que recebe.** Em *Perfil → Notificações e lembretes*: desligar tudo; ligar ou desligar *Aulas e cursos novos*, *Avisos da Vivah* e *Lançamentos e ofertas*; escolher de quais trilhas recebe. Os lembretes locais (Escudo e lives) continuam na mesma tela.
- **Sino com caixa de avisos** em todas as trilhas e na tela inicial, com o número de não lidos. Funciona também na web, onde não há push. Tocar no push abre a tela certa e marca como lido, inclusive com o app fechado.
- **Pedido de permissão na hora certa:** depois do primeiro check-in, um convite no Hoje ("Avisar quando sair aula nova?") com *Ativar* e *Agora não*. O pedido do sistema só aparece depois do *Ativar*, porque o iPhone só deixa pedir uma vez.
- **Capacidade:** com 10 mil alunos, montar o público e a caixa de avisos leva cerca de 0,2 s no banco. O envio sai em lotes de 100 a até 500 por segundo, em segundo plano (cerca de 20 s para 10 mil celulares). Celulares que não existem mais saem da lista sozinhos. Ao sair da conta, o celular deixa de receber os avisos dela.

Migração `20261113000000_notificacoes.sql` e função `send-notification` (ver *Ligar as notificações push*).

### Experiência mais visual (versão 8)

- **Login com e-mail e senha** e cadastro completo: nome, e-mail, senha com medidor de força, confirmação da senha, aceite da LGPD e confirmação do e-mail por código. "Esqueci a senha" troca a senha com um código, sem sair do app.
- **Jornada sempre na ordem** (1 Respira, 2 Ritmo, 3 Move, 4 Nutre, 5 Prospera, 6 Eleva), na tela inicial e no resultado do teste, com a etiqueta **Recomendada** na trilha indicada. Todas abrem com um toque.
- **Teste inicial** com perguntas curtas e respostas visuais (barras de intensidade e ícones).
- **Hoje** com humor em um toque (carinhas), o dia em 5 ícones com o próximo passo em destaque e, na Respira, a **respiração guiada interativa**: círculo que enche e esvazia, contagem grande, sons para inspirar, segurar e soltar, som do mar opcional, vibração e escolha de 1, 2 ou 3 minutos. Os sons são gerados por `scripts/generate-sounds.py` (sem direitos de terceiros).
- Novos exercícios: suspiro cíclico (Balban et al., Cell Reports Medicine, 2023) e coerência cardíaca (6 respirações por minuto).
- Menos texto em todas as telas, números pequenos com botões de − e +.
- **Identidade visual própria:** títulos em Bricolage Grotesque, fundo verde-névoa (não o creme comum), botão principal em petróleo e coral só para destaque (Recomendada, Socorro, ponto de progresso). Superfícies chapadas, sem sombras nem gradientes decorativos, textos em caixa normal. Cada tela tem um único bloco escuro, o que pede atenção (na Respira, a respiração).

### Loja e Socorro (versão 7)

- **Menu Loja** (ícone de sacola), no lugar de Prêmios, com duas partes separadas:
  - **Produtos:** produtos físicos que a Vivah vende (camiseta, garrafa, planner, kits…), por trilha ou em todas. Preço, foto, link de pagamento e se está à venda ou oculto, tudo na página de admin (Administração → Loja). Produto físico pode ser vendido também nos apps do iPhone e do Android, porque o pagamento é fora do app (regra 3.1.5 da Apple e política de pagamentos do Google Play). Os itens que vêm no app são exemplos para trocar.
  - **Resgatar pontos:** as recompensas da bondade (saldo, selos, catálogo e extrato), como antes.
- **Socorro só na Respira:** o botão no topo e o atalho aparecem só nessa trilha. Os exercícios das outras trilhas (descarrego mental, relaxar o corpo…) abrem numa tela de exercício própria. O cuidado do check-in continua em todas as trilhas: se o check-in indicar crise, o app faz um exercício na hora e mostra o CVV 188.

Migração `20261111000000_loja.sql` (tabela `store_items`).

### Painel de cada trilha e conteúdo completo (versão 6)

- **Todas as seis trilhas no ar**, cada uma com 4 cursos em sequência (Respira 59 aulas, Ritmo 43, Eleva 36, Prospera 32, Move 55, Nutre 40) e de 2 a 3 low tickets. Os títulos e resumos das aulas são roteiro para os professores gravarem; troque o que quiser na página de admin.
- **Painel da trilha no Hoje** (e completo em "Painel completo"), com o que é próprio de cada área. Regras e referências em `src/domain/panels.ts`:
  - **Move:** água com meta de 35 ml por kg, peso com IMC e alerta de mudança rápida (mais de 1% por semana), treinos de academia, funcional, corrida etc. com intensidade, esforço de 0 a 10 (Borg) e volume de carga ("4x10 40kg"), minutos da semana contra a OMS (150 min, vigorosa vale o dobro, força em 2 dias), passos e medidas com risco da cintura e relação cintura-quadril (OMS).
  - **Nutre:** refeições com o prato do Guia Alimentar, fome antes e saciedade depois, como comeu e o que levou a comer; porções de frutas e hortaliças (meta 5); ultraprocessados; água (a mesma do Move). Sem calorias e sem peso.
  - **Respira:** GAD-7 semanal com faixas e orientação para procurar ajuda a partir de 10 pontos, diário do sono com eficiência (alvo 85%), preocupações (dependem de você ou não) e minutos de respiração (os exercícios do Socorro entram sozinhos).
  - **Ritmo:** minutos de foco (o Bloco de foco entra sozinho), interrupções, auditoria do tempo por categoria e revisão semanal (GTD).
  - **Prospera:** lançamentos na regra 50-30-20, quanto ainda dá para gastar por dia, dívidas na ordem avalanche e bola de neve (com alerta de rotativo e cheque especial) e reserva de emergência.
  - **Eleva:** diário de conquistas, metas do trimestre, contatos e estudo da semana, feedbacks e autoavaliação de habilidades (PDI).
- Peso, medidas, sono, refeições e GAD-7 são dados de saúde: só gravam com o consentimento e são apagados se ele for retirado. Água, passos, treinos e gastos não pedem consentimento.

Migração `20261110000000_paineis.sql` (tabela `track_entries`, contador `track_counter_add`, todas as trilhas no ar).

### Teste de momento de vida, assinatura por trilha e página de admin (versão 5)

- **Teste do primeiro acesso:** 14 perguntas (mente, tempo, corpo, alimentação, finanças, carreira e o objetivo para os próximos 3 meses). Mostra o **momento de vida** (reequilíbrio, organização, estabilidade ou crescimento, em 4 degraus) e a **trilha indicada**, respeitando a ordem da jornada: Respira → Ritmo, Move, Nutre → Prospera → Eleva; quem chega pela carreira com a base em ordem segue Eleva → Ritmo → Prospera. É só indicação: todas as trilhas aparecem e qualquer uma pode ser a primeira. Regras em `src/domain/life-test.ts`; o aluno refaz o teste pela tela inicial ou pelo Perfil.
- **Trilha sempre à vista:** em Hoje, Cursos, Comunidade e Prêmios o topo mostra "Você está na trilha …" (toque para trocar); nas telas internas (curso, aula, plano, check-in, socorro, publicar, apoio, conselheiros, post) aparece a etiqueta da trilha.
- **Cobrança por trilha, anual:** toda trilha abre para o aluno conhecer (Hoje e Socorro são livres); os **cursos, a comunidade e os conselheiros** pedem a assinatura anual daquela trilha (produto `trilha-<id>`). Quem assina recebe também os cursos novos que o admin criar depois.
- **Sequência obrigatória:** dentro da trilha, a próxima aula só abre quando a anterior foi concluída (curso, módulo, aula). O app mostra o cadeado e leva à "aula da vez"; o banco aplica a mesma regra (`can_read_lesson`).
- **Low tickets:** seção própria em Cursos com aulas curtas, planilhas e ferramentas de cada trilha, cada uma com preço e link próprios, fora da sequência. Low ticket não abre a comunidade.
- **Página de admin** (Perfil → Administração, só para `role = admin`): por trilha, preço e link de pagamento da assinatura, situação (no ar / em breve), cursos em ordem (setas para reordenar), low tickets, módulos e aulas (título, formato, duração, link do vídeo/áudio/arquivo, texto, aula grátis). Cada curso criado entra sozinho no produto certo. Curso que já tem alunos não pode ser apagado.

Migração `20261108000000_trilha_anual_admin.sql`. Na demonstração, entre com um e-mail que comece com `admin` para ver a página de admin.

### Pontos, recompensas e o propósito de cada trilha (versão 4)

- **Menus da trilha:** Hoje, Cursos, Comunidade, **Prêmios** (hoje, Loja) e Perfil. A agenda saiu do menu: os compromissos do dia aparecem no Hoje (com "Ver agenda").
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
| **Web / desktop** | Mostra o preço da assinatura anual (ou do low ticket) e o botão **Assinar a trilha**, que abre o checkout já com o e-mail do aluno |
| **iPhone / Android** | Mostra "Conteúdo para alunos Vivah", explica que o acesso aparece com o mesmo e-mail da inscrição e oferece **Atualizar meus acessos** |

A venda acontece no pitch das lives, nos grupos, no WhatsApp, no e-mail e na versão web. Dentro do app de celular, o player das lives não deixa abrir links. Na hora do pitch, o link da Hotmart vai pelo WhatsApp.

A regra está em `CAN_SELL_IN_APP` (`src/lib/config.ts`) e no `LockedPanel` (`src/components/locked-panel.tsx`).

## Capacidade: 5 mil alunos ou mais

Teste de carga no Postgres local (2 núcleos, 7 GB, parecido com o Supabase Small ou Medium), com **10 mil alunos** e uso intenso: 40 mil posts, 120 mil comentários, 400 mil reações, 1 milhão de eventos de pontos, 1,5 milhão de registros de painel, 30 dias de check-in e plano. Rode com `npm run db:load`.

| Tela | Tempo no banco |
|---|---|
| Catálogo, progresso, check-ins, plano, painel | menos de 1 ms |
| Meus acessos | 3 a 4 ms |
| Abrir aula (com a regra da sequência) | 7 ms |
| Feed de uma trilha (50 posts com reações e nível de bondade) | 4 a 6 ms |
| Comentários do post mais comentado | 10 a 13 ms |

Com 40 conexões simultâneas abrindo o app (6 consultas cada) e 10% de escrita (curtidas com pontos validados), o banco processou cerca de **280 aberturas de app por segundo**, sem erros. Para 5 mil alunos online ao mesmo tempo, cada um abrindo uma tela a cada 30 segundos, são cerca de 170 por segundo.

O que foi ajustado para chegar a isso (migração `20261109000000_desempenho.sql`): as regras de acesso eram avaliadas linha a linha e o feed de uma trilha levava 43 segundos; agora cada função roda uma vez por consulta. Os totais de pontos ficam prontos numa tabela, há índices para as buscas e para apagar contas, e o app envia o filtro do aluno e lê o id da sessão local.

**Recomendações para o lançamento**

- **Supabase Pro** (US$ 25/mês, 8 GB de banco, 250 GB de tráfego, 100 mil usuários ativos por mês). A base de teste com 10 mil alunos e 3 meses de uso ocupou 930 MB. Comece no computador Small e suba para Medium se o painel de desempenho do Supabase mostrar CPU alta.
- **E-mail de login:** configure um SMTP próprio (Resend, SES ou SendGrid). O SMTP padrão do Supabase envia só 2 e-mails por hora. Com SMTP próprio, ajuste em Authentication → Rate Limits o limite de envios por hora para o tamanho do lançamento (o padrão é 30).
- **Vídeos fora do Supabase:** o banco guarda só o link de cada aula, então o número de aulas não pesa. O que pesa é o tráfego: 5 mil alunos assistindo 2 horas por mês em 720p dão cerca de 7 TB por mês, o que no Supabase (US$ 0,09 por GB além dos 250 GB) passaria de US$ 600. Use Bunny Stream (a partir de US$ 0,005 por GB entregue e US$ 0,01 por GB armazenado, sem custo de codificação) ou Panda Video (planos com banda incluída e proteção contra download). PDFs e planilhas podem ficar no Storage do Supabase.
- Ative o backup com recuperação por horário (PITR) quando o banco passar de 4 GB.

## Rodar no computador

```bash
npm install
npm run web          # abre no navegador
```

Sem `.env`, o app abre em **modo demonstração**: entre com `ana@exemplo.com` (aluna que assina a Respira) ou `admin@vivah.com.br` (administrador), senha `vivah1234`, ou crie uma conta (o código de confirmação é `123456`).

### Testar no iPhone

O Expo Go da App Store só abre projetos até o SDK 54, e este app usa o SDK 58. Há três caminhos:

1. **Versão web no Safari (sem conta da Apple):** publique na Vercel (o `vercel.json` já está pronto: em vercel.com, importe o repositório do GitHub e clique em Deploy) e abra o link no iPhone. Em Compartilhar → Adicionar à Tela de Início, ele vira um ícone. Não tem notificações nem os recursos nativos, mas serve para navegar por todas as telas.
2. **Development build (o app de verdade, atualiza na hora enquanto você programa):** precisa do Apple Developer Program (US$ 99 por ano). O build é feito na nuvem da Expo, sem precisar de Mac.
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest device:create          # gera um link: abra no iPhone e instale o perfil
   npx eas-cli@latest build --profile development --platform ios
   npx expo start --dev-client               # com o iPhone na mesma rede Wi-Fi (ou --tunnel)
   ```
   No iPhone, ative Ajustes → Privacidade e Segurança → Modo de Desenvolvedor, instale pelo link do build e abra o projeto pelo QR code.
3. **TestFlight (para os sócios testarem):** `npx eas-cli@latest build --profile production --platform ios` e depois `npx eas-cli@latest submit --platform ios`. Cada um instala pelo app TestFlight, sem cadastrar aparelho.

## Ligar o Supabase

1. Crie o projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. Copie `.env.example` para `.env` e preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
3. Rode o banco:
   ```bash
   npx supabase@latest link --project-ref SEU_REF
   npx supabase@latest db push                                   # cria tabelas, funções e regras de acesso
   psql "$(npx supabase@latest db url)" -f supabase/seed.sql     # ou cole o seed.sql no SQL Editor
   ```
4. **Login com e-mail e senha:**
   - Authentication → Providers → Email: deixe ativos *Enable Email provider* e *Confirm email*. Em Password, defina o mínimo de 8 caracteres (o app já exige letra e número).
   - Authentication → Email Templates: o app confirma o cadastro e troca a senha com **código de 6 dígitos**, sem link. Em *Confirm signup* e em *Reset password*, troque o corpo por um texto com `{{ .Token }}`, por exemplo:
     > Seu código da Vivah é **{{ .Token }}**. Ele vale por 1 hora.
   - Authentication → SMTP: configure um provedor de e-mail próprio (Resend, SES, SendGrid…). O SMTP padrão do Supabase envia só 2 e-mails por hora.
5. **Edge Functions:**
   ```bash
   npx supabase@latest secrets set HOTMART_HOTTOK=hottok-copiado-da-hotmart
   npx supabase@latest functions deploy hotmart-webhook --no-verify-jwt
   npx supabase@latest functions deploy delete-account
   npx supabase@latest functions deploy send-notification
   ```

## Ligar a Hotmart

1. Na Hotmart: **Ferramentas → Webhook (API e notificações) → Cadastrar webhook**.
   - URL: `https://SEU_REF.supabase.co/functions/v1/hotmart-webhook`
   - Versão: **2.0.0**
   - Eventos: compra aprovada, completa, cancelada, reembolsada, chargeback, protesto, expirada e cancelamento de assinatura.
   - Copie o **hottok** e grave com `supabase secrets set HOTMART_HOTTOK=...`.
2. No Supabase, tabela **products**: em cada produto, preencha `hotmart_product_id` (o ID numérico do produto na Hotmart) e `checkout_url` (o link de pagamento `https://pay.hotmart.com/...`).
3. A tabela **product_courses** diz quais cursos cada produto libera. Cada curso da trilha entra sozinho no produto `trilha-<id>` (assinatura anual) e cada low ticket vira um produto com o próprio id. O link de pagamento pode ser preenchido na página de admin. A assinatura deve durar um ano: quando a plataforma de pagamento for integrada, grave `expires_at` no acesso.
4. Use **Enviar teste** na Hotmart e confira a tabela **hotmart_events**: o campo `result` mostra `liberado`, `revogado`, `ignorado` ou o erro (por exemplo, produto não cadastrado). Depois de corrigir o cadastro, reenvie o evento pelo painel da Hotmart e ele é processado de novo.

Order bumps e upsells são produtos próprios na Hotmart. Cadastre cada um em `products` com o seu ID.

## Ligar as notificações push

O push usa o serviço gratuito da Expo, que entrega pela Apple (APNs) e pelo Google (FCM).

1. **Projeto no EAS** (uma vez): `npx eas-cli@latest init`. Isso grava `extra.eas.projectId` no `app.json`. Sem ele, o app funciona normalmente, mas não registra o celular.
2. **Credenciais:**
   - iPhone: `npx eas-cli@latest credentials` → iOS → *Push Notifications: set up a push key*. O EAS cria e guarda a chave da Apple (precisa da conta Apple Developer).
   - Android: crie um projeto no Firebase, baixe o `google-services.json`, aponte para ele em `app.json` (`android.googleServicesFile`) e envie a chave de conta de serviço com `npx eas-cli@latest credentials` → Android → *FCM V1*.
3. **Função de envio:**
   ```bash
   npx supabase@latest functions deploy send-notification
   # Só se ligar "Enhanced push security" no painel da Expo:
   npx supabase@latest secrets set EXPO_ACCESS_TOKEN=...
   ```
4. **Testar:** o push precisa de um build de desenvolvimento ou de loja (`npx eas-cli@latest build --profile development`). No Expo Go do Android não há push remoto. Entre no app, faça um check-in e toque em *Ativar*. Depois, no admin, envie um aviso para *Todos os alunos*.

No **modo demonstração** não há servidor: o aviso enviado pelo admin aparece no sino das contas e, no celular, como notificação local.

## Cadastrar conteúdo (sem programar)

Cursos, módulos, aulas, low tickets, preços e links de pagamento: pela **página de admin do app** (Perfil → Administração). O resto, pelo **Table Editor** do Supabase:

| O quê | Tabela | Campo |
|---|---|---|
| Vídeo ou áudio de uma aula | `lesson_media` | `media_url` (MP4/HLS/MP3) |
| Material de texto/PDF | `lesson_media` | `body` e `media_url` do arquivo |
| Escudo Anticrise do dia | `escudo_audios` | `audio_url`, `title`, `summary`, `publish_date` |
| Link da live | `lives` | `youtube_id` (o código depois de `v=`), datas e `replay_until` |
| Segurar uma trilha como "em breve" | página de admin | Situação: Em breve |
| Dar acesso manual (cortesia) | `entitlements` | e-mail em minúsculas + curso + produto |
| Tornar alguém moderador | `profiles` | `role = admin` (só pelo painel) |

Os arquivos podem ficar no **Storage** do Supabase. Para vídeo pago, prefira um player com link assinado (Panda Video, Vimeo, Bunny Stream). O app só entrega o link a quem tem acesso, mas um link público continua funcionando para quem o tiver em mãos.

O catálogo inicial (trilhas, cursos, aulas, produtos, lives, Escudo e diagnóstico) fica em `src/data/catalog.ts`. Rode `npm run seed:generate` e aplique o `supabase/seed.sql` num banco novo. Rodar o seed de novo só **cria o que falta** em trilhas, cursos, módulos e aulas, para não desfazer o que foi editado na página de admin; níveis, recompensas, lives e Escudo são atualizados. Não apaga compras, progresso nem posts.

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
npm test            # acesso, sequência, teste de momento, painéis das trilhas, pontos, agenda e webhook
npm run db:test     # migração + seed + RLS num Postgres local (PGPASSWORD=... se precisar)
npm run db:load     # base de carga com 10 mil alunos e tempo de cada consulta
```

O TypeScript confere os links entre telas (rotas tipadas) depois que o `npx expo start` gera `.expo/types` uma vez.

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
