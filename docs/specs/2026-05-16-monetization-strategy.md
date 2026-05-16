# Estratégia de Monetização — Founders Cohort

> Spec estratégico de monetização. Define como o produto sai de "MVP rodando local" para "primeiros pagantes". Documento vivo: lotes seguintes são decididos com base no sinal do lote anterior.

**Status:** aprovado v2 — 2026-05-16 (re-validado para audience EN/global)
**Origem:** brainstorming session 2026-05-16 (sessão "calendarfr", chat de monetização)
**Macro spec relacionado:** [`2026-05-08-mvp-overview.md`](2026-05-08-mvp-overview.md)
**Próxima fase:** executar smoke test (Stripe Payment Link USD + landing EN + Loom 90s + lista de 100 leads)

---

## Objetivo

Validar se o produto entrega **valor real** a pessoas reais, usando dinheiro pago como sinal de comprometimento (filtro de "curioso" vs "intencional") e cohort pequena + curada como motor de feedback e iteração.

**Não-objetivo:** ROI, escala, receita recorrente, runway. Tudo isso vem depois — e só faz sentido depois — de PMF embrionário comprovado.

---

## Princípios

1. **Validação > ROI.** O valor da cohort inicial está no feedback e na retenção, não na receita.
2. **Cohort pequena + curadoria > escala anônima.** 10 pessoas pagantes com quem você conversa direto vale mais que 200 leads de waitlist.
3. **Preço em escada captura múltiplos sinais.** Um preço único só responde "pagaria X?". Escada responde "qual é a willingness to pay nessa cohort?".
4. **Lifetime vitalício para founders.** Sem assinatura escondida, sem upsell, sem cobrança recorrente. Promessa pública e cumprida.
5. **Distribuição manual.** Sem ads pagos, sem influencer, sem rede social pré-existente. DM personalizada é o canal-âncora.
6. **Métrica de retenção > métrica de venda.** Vender 20 e ter 2 ativos no D30 é fracasso. Vender 10 e ter 6 ativos no D30 é sucesso.
7. **Promessa única em todos os tiers.** "Vitalício, sem assinatura, sem upsell, sem cobrança escondida. Pagou uma vez, é seu para sempre."

---

## Decisões tomadas

### Modelo: escada de 4 lotes

| Lote                            | Preço (USD)                     | Vagas | Distribuição                                 | Total bruto se vender tudo |
| ------------------------------- | ------------------------------- | ----- | -------------------------------------------- | -------------------------- |
| **1 — Pioneers** (#1-10)        | **$5** lifetime                 | 10    | DM curada manual (você seleciona quem entra) | $50                        |
| **2 — Early Founders** (#11-30) | **$15** lifetime                | 20    | Link público compartilhado em comunidades    | $300                       |
| **3 — Founders** (#31-50)       | **$29** lifetime                | 20    | Link público + posts orgânicos + depoimentos | $580                       |
| **4 — Public launch** (#51+)    | TBD: $49 lifetime **ou** $5/mês | ∞     | A decidir após dados dos lotes 1-3           | recorrência ou volume      |

**Total Founders (lotes 1-3): 50 vagas, ~$930 brutos (~$870 líquido após Stripe).** Não é receita — é budget de aprendizado.

**Por que esses preços (não $1, não $9 no piso):**

- **$1 piso** descartado: Stripe USD cobra $0.30 + 2.9% — $1 vira $0.67 líquido (33% fee). Além disso, "$1 indie product" no mercado EN sinaliza desespero/spam, não escassez.
- **$5 piso** escolhido: 9% de fee (aceitável), abaixo de **qualquer** indie product comparável (Bear $15/ano, Tot $20, Things 3 $50). É "coffee money" pro Analog Maker — impulso real sem ruído.
- **$29 no topo (lote 3)** ainda fica abaixo do anchor Things 3 ($50). Founder pode sentir "premium acessível".
- Conversão BRL aproximada: $5 ≈ R$ 25, $15 ≈ R$ 75, $29 ≈ R$ 145. BR devs no canal paralelo pagam em USD via cartão internacional sem fricção.

### Lifetime + zero assinatura

Promessa universal para Founders: pagamento único, acesso vitalício, sem upsell. Mesmo quando o modelo público (lote 4+) virar subscription, os Founders são grandfathered for life.

### Stack de pagamento

- **Stripe Checkout (USD, global)** — pricing único em USD, Stripe localiza display (mostra R$, €, £ etc. no checkout).
- **Fee padrão:** $0.30 + 2.9% por transação cartão (international); ~5% efetivo no piso de $5.
- **Tax handling:** primeiros 50 Founders → ignorar VAT/sales tax (volume baixo, fora do threshold de qualquer jurisdição relevante). Pós-lote 3, decidir Merchant of Record.
- **Alternativas MoR (Merchant of Record)** para resolver VAT global automaticamente quando volume justificar:
  - [**Lemon Squeezy**](https://lemonsqueezy.com): 5% + $0.50, popular entre indie devs, handles global VAT
  - [**Polar**](https://polar.sh): 4% + $0.40, mais novo, dev-focused, open-source-friendly
  - [**Paddle**](https://paddle.com): 5% + $0.50, mais enterprise
- **Para o lote 1 (Pioneers): Stripe Payment Link em USD é suficiente.** Sem MoR ainda.

### Stack de infra (decidido)

- **Supabase free tier** suporta até ~500 usuários ativos
- **Pro tier $25/mês** só quando passar disso
- Estimativa de tempo para infra de produção: **4-5 dias**, não 2 semanas como inicialmente pensado
- Domain (~$12/ano) + Stripe fees por transação = único custo fixo

---

## Persona âncora: **Analog Maker**

> Dev / designer / maker (25-40) que ama planejamento analógico (BuJo, Moleskine, Hobonichi, Field Notes) mas trabalha 8h+ no laptop. Sente que pegar caderno+caneta enquanto está no Mac é "fora de fluxo", mas Notion / Todoist / Things parecem frios demais pro ritual diário.

**Profile detalhado:**

- 25-40 anos, dev / designer / PM / maker
- Usa Mac (alta probabilidade) — paga caro por software bonito (Things $50, Bear $15/ano, Linear, Raycast Pro, Cron, Arc)
- Já tentou: Notion (abandonou), Todoist (não pegou), papel (ama mas perde caderno)
- Lê: Hacker News, IndieHackers, Twitter dev, Lenny's Newsletter
- Vibe: aprecia tools "with taste" (Cron, Arc, Linear, Things 3, Tot, Bear)
- Idioma: bilíngue PT/EN funcional, consome conteúdo majoritariamente em EN

**Por que essa persona (5 argumentos):**

1. **Mom Test cumprido por dentro.** O founder É o cliente — origin story autêntica ("dev que adora papel mas trabalha no Mac"). Decisões de produto ficam menos arriscadas.
2. **High LTV.** Devs/designers pagam por software bonito (Things 3 cobra $50 one-time há 15 anos sem assinatura).
3. **Nicho underserved.** Mercado tem (a) planners corporativos frios (Notion, Akiflow) ou (b) apps BuJo "femininos coloridos". **Não existe "BuJo for devs"**.
4. **WOM-friendly.** Audience compartilha tools no Twitter, IndieHackers, HN. 1 tweet vira 50 vendas grátis.
5. **Distribuição acessível.** Mora em comunidades públicas (Twitter dev, HN, IndieHackers, r/macapps) — sem influencer, sem ads.

**Anti-personas (NÃO mirar):**

- Bullet Journaler tradicional Instagram BR (#bujo feminino, washi tape) — pitch errado
- Productivity nerd extremo (Notion power user, GTD evangelist) — quer sistema, não ritual
- Mindfulness/wellness audience (Stoic, Calm) — quer journaling profundo, não planner diário

---

## Idioma da operação

**EN-first, PT como canal paralelo.**

| Aspecto               | Decisão                                                   |
| --------------------- | --------------------------------------------------------- |
| Landing page          | EN                                                        |
| Loom / demo           | EN                                                        |
| Posts build-in-public | EN (Twitter/X, IndieHackers, HN)                          |
| DMs principais        | EN                                                        |
| Canal secundário PT   | r/brdev, Telegram dev BR, Discords BR (~15% do esforço)   |
| Onboarding 1:1        | Idioma do Pioneer (fala em PT se BR, EN se internacional) |

**Racional:** audience global do Analog Maker é ~50x maior que BR-only. AI assiste revisão de copy EN. Mercado BR não é abandonado — vira canal paralelo de menor esforço.

---

## Canais de outreach (lote 1: Pioneers)

| #   | Canal                                                                               | Como abordar                                                                                                                                  | Lead alvo            |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | **Twitter/X** — devs que postam sobre BuJo, Moleskine, Hobonichi, planner workflows | Buscar `bujo macbook`, `hobonichi developer`, `moleskine + code`. Curtir + responder genuíno + DM no dia seguinte.                            | 30                   |
| 2   | **Reddit** — r/bulletjournal, r/digitaljournaling, r/macapps                        | Não postar venda — postar **conteúdo** ("built this for myself, would love feedback"). Comentar em threads relevantes. Levar conversa pro DM. | 20                   |
| 3   | **IndieHackers**                                                                    | Post na seção "I built this" com origin story autêntica. Engajamento → DMs naturais.                                                          | 15                   |
| 4   | **Hacker News (Show HN)**                                                           | Quando produto deploy-ável, "Show HN: A bullet journal-style daily planner I built for myself". 1 tentativa, alto upside.                     | 20-50 (se viralizar) |
| 5   | **Comunidades dev BR** — r/brdev, Telegram dev BR, Discords                         | Post em PT, mensagem ajustada ("fiz isso pra mim, devs BR podem curtir").                                                                     | 15                   |

**Total alvo: ~100 leads.** Trabalho manual: ~25 DMs/dia × 4 dias ≈ 6-8h totais.

---

## Workflow operacional (AI-assisted)

**Princípio:** AI faz trabalho repetitivo. Humano faz conversa real. Funil de "AI funnel into human handshake".

| Etapa                    | AI?        | Como                                                                                                                                                 |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Achar leads              | ✅ Forte   | GPT/Claude busca perfis: "encontre 20 tweets em EN dos últimos 30 dias sobre Hobonichi + dev". Retorna handle + 1 linha contexto. Você lê + escolhe. |
| Personalizar DM          | ⚠️ Cuidado | AI rascunha baseado no perfil. Você EDITA antes de enviar. Raw AI grita "spam".                                                                      |
| Triagem de respostas     | ✅ Forte   | Classifica respostas (positivo / negativo / pergunta técnica) e prioriza fila de follow-up.                                                          |
| Conteúdo build-in-public | ✅ Forte   | Rascunha threads/posts a partir de decisões reais ("explica em tom Twitter por que escolhi Caveat"). Você revisa pro tom.                            |
| Onboarding dos Pioneers  | ❌ Não     | Puro humano. Pioneers compraram porque viram VOCÊ. Onboarding automatizado mata o sinal.                                                             |
| Resposta a feedback      | ❌ Não     | Profundidade do feedback é o ouro do lote 1. Resposta humana é não-negociável.                                                                       |

**Stack operacional (zero infra paga):**

```
- Google Sheets / Airtable free → CRM de leads
  colunas: handle | canal | contexto | DM v1 | data | resposta | status | nota
- GPT-4 / Claude → discovery + DM draft + content draft
- QuickTime Player (Mac nativo) → gravação do Loom de 90s
- Stripe Payment Link (USD, global cards) → checkout
- Carrd / Framer free → landing
```

Tempo de setup: ~3-4h num sábado.

---

## Assets de venda v1

### DM v1 — EN (canais 1-4)

```
hey [name] — saw your [post / project / tweet] about [specific thing].

built a daily planner that feels like a Moleskine page — because i love
paper BuJo but felt weird grabbing pen+paper next to my MacBook.

90s demo: [loom link]
$5 lifetime — Pioneer spot, 10/10 left: [stripe link]

no subs ever. Founder badge in the UI when shipped.
```

### DM v1 — PT (canal 5)

```
oi [nome] — vi seu post sobre [X específico].

construí um planner diário que parece uma página de Moleskine — porque
amo BuJo em papel mas achei estranho pegar caneta+papel do lado do MacBook.

demo de 90s: [loom link]
$5 vitalício (≈ R$ 25) — vaga Pioneer, 10/10 livres: [stripe link]

sem assinatura, nunca. badge de Founder na UI quando sair.
```

### Loom 90s — outline (EN)

| Tempo  | Trecho        | Roteiro                                                                                                                                                                                                                 |
| ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0-10s  | HOOK          | "I love paper bullet journaling. But I felt absurd grabbing pen + Moleskine while working on my MacBook all day. So I built this."                                                                                      |
| 10-35s | SHOW          | [screen-record do app] "One page per day. Looks like a Moleskine. Handwritten font. Three zones: morning intention top, hour-by-hour left, free notes right. Cmd+Arrow flips pages. Bold/italic shortcuts. Auto-saves." |
| 35-60s | WHY DIFFERENT | "This isn't Notion — no templates, no system to learn. Not Sunsama — no calendar sync, no meetings. It's just a page. For today. That feels good to write on."                                                          |
| 60-85s | OFFER         | "Opening 10 Pioneer spots at $5 lifetime. You pay once, you keep it forever, no subscription ever. Founder badge in UI when shipped. I'll onboard you personally."                                                      |
| 85-90s | CTA           | "Link in DM. Thanks for watching."                                                                                                                                                                                      |

### Landing v1 — estrutura (EN)

```
HERO
  H1: A daily page that feels like Moleskine
  H2: For makers who love paper bullet journaling but live on a laptop.
  Visual: GIF do produto (15s loop)
  CTA: "Claim Pioneer spot — $5 lifetime (X/10 left)"

ORIGIN
  1 paragraph: "I'm a dev who loves paper BuJo. Felt absurd grabbing
  pen+Moleskine next to my MacBook. So I built this for myself. Now
  opening it to 10 Pioneers."

WHAT IT IS (3 cards)
  - One page per day. Three zones.
  - Handwritten font. Paper texture. No templates.
  - Cmd+Arrow flips pages. Auto-save. That's it.

NOT WHAT IT IS (3 cards)
  - Not Notion. No templates, no databases.
  - Not Sunsama. No calendar sync, no meetings.
  - Not a habit tracker. Today only.

FOUNDER OFFER
  - $5 lifetime (one-time, USD, global cards accepted)
  - 10 Pioneer spots — first come, first served
  - Founder badge in UI (when shipped)
  - Personal onboarding from me

FAQ
  - When does it ship? [target date]
  - What if I don't like it? 30-day refund, no questions asked.
  - Will there be a subscription later? Yes for public launch, but Pioneers are grandfathered for life.
  - Mobile? Not yet. Web-only (works great on iPad Safari).
  - I'm in the EU — what about VAT? For Pioneers, price is final. Future tiers may add VAT.

CTA (repeat)
  Claim Pioneer spot — $5 lifetime
```

---

## Decisões pendentes

1. **Modelo do lote 4** ($49 lifetime **ou** $5/mês) — decidido após dados dos lotes 1-3.
2. **Data alvo de envio do produto** para os Pioneers (preenche o FAQ da landing). Sugestão: 30-45 dias após primeira venda do lote 1.
3. **Merchant of Record** (Stripe puro × LemonSqueezy × Polar) — decisão necessária antes do lote 4 (volume começa a justificar VAT global automático).

---

## Métricas de validação

### Sinais primários por lote

| Lote      | Métrica primária                            | Threshold de "sucesso"     | Threshold de "pivot" |
| --------- | ------------------------------------------- | -------------------------- | -------------------- |
| Pioneers  | Dos 10, quantos abrem o app no **D7**?      | >7                         | <5                   |
| Pioneers  | Dos 10, quantos escrevem em ≥2 zonas no D7? | >5                         | <3                   |
| Early     | Tempo médio entre "ver link" e "pagar"      | <10min                     | >1h                  |
| Founders  | % que compra após ver depoimento de Pioneer | >5%                        | <1%                  |
| **Todos** | **% com ≥3 dias de uso na semana, no D30**  | **>40% = PMF embrionário** | **<20% = produto**   |

### Gates de decisão

- **Após lote 1 (D30):**
  - > 40% retention semanal → abrir lote 2 (Early Founders $15)
  - 20-40% retention → iterar produto antes de abrir lote 2 (não vender pra mais ninguém ainda)
  - <20% retention → pivotar mensagem ou produto, refundar voluntariamente os Pioneers
- **Após lote 3 (50 vagas vendidas OU 90 dias):**
  - Decidir modelo do lote 4 (lifetime $49 OU sub $5/mês) baseado em:
    - Retention das 50 pessoas
    - Volume de demanda residual (lista de espera?)
    - Pedidos qualitativos (querem features que justificam sub?)
  - Decidir Merchant of Record (Stripe puro → LemonSqueezy/Polar se volume EU/UK aumentar)

### Telemetria embutida (sem Mixpanel/Amplitude)

Cada `PUT /api/days/:date` no Supabase vira evento. Cohort retention extraível direto do Postgres com 1 query — não precisa stack de produto/analytics no MVP.

---

## Funil esperado (lote 1: Pioneers)

```
100 DMs personalizadas (manual, ~25/dia × 4 dias)
  ↓ 30% taxa de resposta
30 conversas
  ↓ 33% conversão
10 Pioneers vendidos
```

Trabalho real: ~6-8h totais de DMs ao longo de 1-2 semanas. Investimento financeiro: $0.

### Build in public (canal secundário, alimenta lotes 2-3)

Em paralelo, posts diários (~30min/dia) em Twitter/X (EN) mostrando: screenshots do produto, decisões de design ("por que Caveat e não Comic Sans"), time-lapses de feature, bastidor da própria construção. Conversão esperada: 1-3% dos seguidores. **Útil pra alimentar lotes 2 e 3, não o lote 1** (lote 1 não depende de audiência — depende de DM curada).

---

## Sequência de execução (próximos 60 dias)

| Semana  | Foco                                                                      | Output esperado                          |
| ------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| **0**   | Cravar ICP + promessa + canais + script DM v1 (próxima sessão)            | Plano de outreach pronto                 |
| **1**   | Setup smoke test: landing (Carrd/Framer) + Stripe Payment Link + Loom 90s | Infra de venda zero-code montada         |
| **2**   | Listar 100 leads + iniciar DMs (25/dia)                                   | 3-5 vendas + 10-15 conversas de pesquisa |
| **3**   | Continuar DMs + onboarding manual dos primeiros Pioneers                  | 5-10 Pioneers vendidos                   |
| **4**   | Concluir lote 1 (10/10) + iniciar build de infra real (Supabase)          | Lote 1 fechado, Supabase em construção   |
| **5-6** | Build Supabase + auth + multi-tenant + Stripe webhook (4-5 dias úteis)    | App hosted em produção                   |
| **7-8** | Onboarding real dos Pioneers no app hosted + medir retention D30          | Decisão: abrir lote 2 ou iterar          |

**Custo total nas 8 semanas:**

- Financeiro: ~$12 (domain) + Stripe fees por venda (~5% efetivo no piso de $5)
- Tempo: ~80h distribuídas

---

## Riscos identificados

| Risco                                                                   | Mitigação                                                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| $5 atrai impulso e polui sinal (gente paga e nunca volta)               | Pioneers via DM curada — você seleciona, não é open-link                               |
| Sem audiência, DMs ficam ignoradas / soam genéricas                     | Personalização real (referência ao perfil/post da pessoa); aceitar 70% sem resposta    |
| Stripe pode dar atrito (KYC, payout em USD pra conta BR)                | Stripe BR aceita conta brasileira em USD; fallback: LemonSqueezy/Polar (handle global) |
| Onboarding manual não escala depois do lote 1                           | Aceito — antes do lote 2 a infra real está pronta (~semana 5-6)                        |
| Promessa "lifetime" pode pesar no futuro se modelo virar sub puro       | Founders são grandfathered for life — mesmo se modelo público virar sub, eles ficam    |
| Retention pode ser baixa porque produto está incompleto                 | Aceito — é exatamente o que queremos descobrir. Mitigação: refund voluntário se <20%   |
| VAT/sales tax global (EU/UK) sem MoR                                    | Volume baixo (<50 vendas) fica abaixo de thresholds; lote 4 decide MoR explicitamente  |
| Audience EN não converte tão bem quanto esperado (cultura "free first") | Sinal real — não brigar com mercado, considerar tier free + paid power-features futuro |

---

## Anti-decisões (o que NÃO vamos fazer)

1. **Ads pagos** (Meta, Google, TikTok) — sem orçamento, sem ICP validado, queima dinheiro.
2. **Influencer marketing** — sem orçamento, sem rede, e premia escala antes de PMF.
3. **Open-link público sem curadoria no lote 1** — destrói o sinal de validação.
4. **Subscription antes de PMF** — churn em produto não validado é brutal, conversa errada cedo demais.
5. **Preço > $49 antes do lote 4** — produto ainda não justifica.
6. **Pay-what-you-want** — útil pra pesquisa, ruim pra estratégia comercial (anchoring frágil).
7. **Aceitar reservas/waitlist em vez de venda** — interesse declarado ≠ dinheiro real. Waitlist não valida nada.

---

## Glossário

- **Founder / Founders Cohort:** os primeiros 50 pagantes (lotes 1-3) com promessa de acesso vitalício.
- **Pioneers:** subset dos Founders, os 10 primeiros, $5 lifetime, curadoria manual.
- **Merchant of Record (MoR):** entidade que vende o produto pra você do ponto de vista fiscal — assume responsabilidade por VAT, sales tax, GST globais. Stripe ≠ MoR; LemonSqueezy/Polar/Paddle são.
- **PMF embrionário:** sinal inicial de Product-Market Fit. Operacionalizado neste spec como **>40% de retenção semanal no D30**.
- **Smoke test:** validação por venda antes de construção (Steve Blank, Eric Ries). Aqui: vender Pioneers antes de Supabase existir.
- **Concierge MVP:** onboarding manual e personalizado dos primeiros usuários antes de automatizar (Manuel Rosso, Y Combinator playbook).
- **Grandfathered:** quando preço/condições antigas são preservadas para usuários antigos mesmo após mudança do modelo.

---

## Histórico de decisões

| Data       | Decisão                                                                                                                                        | Por quê                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-16 | Adotada escada de 4 lotes ($5 → $15 → $29 → TBD)                                                                                               | Captura 3 sinais de willingness to pay em vez de 1; cria urgência real; viabiliza WOM                                                                                     |
| 2026-05-16 | Lote 1 a $5 lifetime via Stripe USD, 10 vagas, DM curada manual                                                                                | $5 é piso viável em USD (9% fee); abaixo de qualquer indie comparable; ainda "coffee money"                                                                               |
| 2026-05-16 | Promessa de lifetime para todos os Founders, independente do modelo público futuro                                                             | Honestidade + cria base de defensores leais; custo marginal de 50 acessos vitalícios ≈ 0                                                                                  |
| 2026-05-16 | Supabase escolhido como stack de infra de produção                                                                                             | Free tier suficiente até ~500 ativos; reduz infra de 2 semanas pra 4-5 dias                                                                                               |
| 2026-05-16 | Smoke test (landing + Stripe + Loom) **antes** de construir infra real                                                                         | Validação > construção; se 0 pagantes em 14 dias, economiza 4-5 dias de infra inútil                                                                                      |
| 2026-05-16 | Métrica-âncora de PMF embrionário: >40% retention semanal no D30                                                                               | Padrão indústria (Andrew Chen, Lenny Rachitsky); operacionalizável com dados do Supabase                                                                                  |
| 2026-05-16 | Persona-âncora: **Analog Maker** (dev/designer/maker que ama analógico + vive no laptop)                                                       | Origin story do founder cumpre Mom Test por dentro; nicho underserved; high LTV; WOM-friendly; canais de acesso gratuitos                                                 |
| 2026-05-16 | Operação **EN-first**, PT como canal paralelo (~15% do esforço)                                                                                | Audience global do Analog Maker é ~50x maior que BR-only; AI assiste revisão de copy EN                                                                                   |
| 2026-05-16 | 5 canais definidos: Twitter/X, Reddit (r/bulletjournal+r/digitaljournaling+r/macapps), IndieHackers, Hacker News (Show HN), comunidades dev BR | Cada canal alcança um subset diferente do Analog Maker; total alvo ~100 leads com esforço manual ~6-8h                                                                    |
| 2026-05-16 | AI-assisted workflow: AI faz discovery/draft/triage, humano faz onboarding/feedback                                                            | Princípio "AI funnel into human handshake" — escala o repetitivo sem matar a autenticidade que vende o lote 1                                                             |
| 2026-05-16 | Escopo por tier: produto único pra todos os Founders, Pioneers ganham badge (feature futura)                                                   | Simplicidade > segmentação prematura; badge cria identidade de cohort sem custo de implementação significativo                                                            |
| 2026-05-16 | **Re-validação:** preços convertidos de BRL → USD; piso $1 → $5; Stripe BR+PIX → Stripe USD global; Hotmart/Kiwify → LemonSqueezy/Polar (MoR)  | Audience EN-first inviabiliza PIX e infraestrutura BR; pricing precisa respeitar fee minimums + signaling no mercado indie EN; tax/VAT global vira consideração explícita |
