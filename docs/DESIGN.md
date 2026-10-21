# Especificação final: SUPER APP Rolim de Moura (casca de app, movimento, onboarding e funerárias de plantão)

Base: a proposta **civic**, com as correções dos jurados. Repositório: `web/`. Os caminhos abaixo partem de `web/src`, salvo indicação.

---

## 1. Princípios e decisões

1. **Partir do estado real da árvore.** Já existem e devem ser reaproveitados, sem recriar:
   - `domain/duty.ts`, com `DUTY_META` (`/plantao/farmacias`, `/plantao/funerarias`) e `dutyTypeFromSlug`;
   - `useDutyUnits`, `watchOwnedDutyUnits`, `setDutyState`;
   - `MyDutyUnitsPage`, `/painel/meus-plantoes` e o papel `DUTY_MANAGER`;
   - as 2 funerárias e `plantao@rolim.test` no seed.

   **O build está quebrado:** `HomePage.tsx` e `PharmaciesPage.tsx` importam `usePharmacies`, que não existe mais. Corrigir isso primeiro.
2. **Barra superior verde em todas as telas do cidadão.** A meta `black-translucent` deixa relógio e bateria do iPhone em branco, então papel claro atrás da safe-area é proibido. O `theme-color` fica fixo: #0d7a49 no claro, #0f3b28 no escuro. Nada de troca por rota.
3. **Contraste.** Nenhum texto ipê sobre verde. A marca usa texto branco (5,39:1 sobre #0d7a49). No escuro, ícones em mata-3, nunca mata-8.
4. **Cor com significado fixo:**
   - verde: aberta, concluída, ação principal;
   - ipê: **de plantão** (a mesma cor nos dois tipos, no mapa e no painel) e "atenção";
   - barro: problema, indeferida;
   - ardósia: neutro, fechada, acento das funerárias.
5. **Orçamento: JS inicial de no máximo 300 KB gzip, verificado no build.** Sem biblioteca de animação. Só CSS e View Transitions do RR7.
6. **Público idoso:**
   - alvos de toque ≥ 48 px (56 px nas ações principais);
   - corpo de 17 px **só em `.citizen`**;
   - "Tamanho do texto" com 100, 112,5 e 125%;
   - todo ícone com texto e nenhum tooltip;
   - nenhum carrossel e nada que avance sozinho.
7. **Escopo enxuto:** TabBar no celular, NavRail a partir de 768 px. Nada de Sidebar, mestre-detalhe ou `animation-timeline`.

---

## 2. Marca

**`config/city.ts`**
```ts
export const APP_NAME = "SUPER APP Rolim de Moura";
export const APP_SHORT_NAME = "SUPER APP";
export const APP_KICKER = "SUPER APP";
export const MAINTAINER = "Prefeitura Municipal de Rolim de Moura"; // = INSTITUTION
export const PARTNER = { name: "Projeto Cidades Inteligentes", url: "https://cidadesinteligentes.online/", logo: "/parceiros/cidades-inteligentes.png" };
export const MAINTAINER_LINE = "Uma iniciativa da Prefeitura de Rolim de Moura junto com o Projeto Cidades Inteligentes";
// CONTACTS ganha crasPhone: "" (vazio = oculto)
```
Nenhum componente escreve "Prefeitura de" como título.

**`components/brand/BrandMark.tsx`**, com as variantes `onGreen`, `onPaper` e `compact`:
- pino do logo com 32 px;
- linha 1: "SUPER APP", Public Sans 800, 12 px, `.16em`;
- linha 2: "Rolim de Moura", Fraunces 600, 19 px;
- cor branca sobre o verde; mata-8 e ink sobre o papel;
- nome acessível: "SUPER APP Rolim de Moura, início";
- criar `public/logo-mono.svg` (pino branco com miolo ipê, sem o quadrado verde), para usar sobre o verde.

**`index.html`**
- `<title>SUPER APP Rolim de Moura</title>`
- `apple-mobile-web-app-title`: "SUPER APP"
- `meta description`: "Problemas na rua, ouvidoria, farmácias e funerárias de plantão e avisos. Uma iniciativa da Prefeitura de Rolim de Moura junto com o Projeto Cidades Inteligentes."
- viewport: acrescentar `interactive-widget=resizes-content`.
- Splash `.boot`:
  - fundo #0d7a49 (#0f3b28 no escuro) e logo-mono de 96 px;
  - "SUPER APP" (branco, 13 px, `.2em`) e "Rolim de Moura" (Georgia, 32 px, branco);
  - três pontos piscando só por opacity, com `role=status` e o texto oculto "Carregando o SUPER APP";
  - no pé, acima da safe-area: a logo do Projeto Cidades Inteligentes (num quadrado branco de 40 px) e "Uma iniciativa da Prefeitura de Rolim de Moura junto com o Projeto Cidades Inteligentes" (13 px, branco).
- noscript: "Ative o JavaScript para usar o SUPER APP Rolim de Moura."
- `og:title`, `og:description` e `og:image` (`/og-image.png`, fora do precache).

**Manifest (`vite.config.ts`)**
- `id: "/"` mantido.
- `name: "SUPER APP Rolim de Moura"`, `short_name: "SUPER APP"`. A alternativa "SuperApp RM" depende de validação com a prefeitura.
- `description`: a mesma da meta.
- `theme_color` e `background_color`: `#0d7a49`.
- `launch_handler: { client_mode: "navigate-existing" }`.
- Atalhos:
  - "Problema na rua" → `/zeladoria/nova`
  - "Farmácia de plantão" → `/plantao/farmacias`
  - "Funerária de plantão" → `/plantao/funerarias`
  - "Meus pedidos" → `/protocolos`
- `injectManifest.globIgnores`: `["og-image.png", "loja/**", "apple-splash-*"]`.

**Títulos de aba:** "<Tela> · SUPER APP Rolim de Moura", pelo hook `useDocumentTitle` a partir de `handle.title`.

**Painel**
- Cabeçalho: `BrandMark onPaper compact` mais o chip ardósia "Painel da equipe".
- Título da janela: "<Página> · Painel · SUPER APP Rolim de Moura" (ex.: "Zeladoria · Painel · SUPER APP Rolim de Moura").
- Rodapé do menu: `MAINTAINER_LINE`.

**Rodapé institucional:** sai da Início. A linha `MAINTAINER_LINE`, sempre com a logo do Projeto Cidades Inteligentes (`components/brand/MaintainerCredit`), aparece em:
- slide 1 do onboarding;
- rodapé de Entrar e Criar conta;
- Perfil › Sobre o app, junto com a versão e "Privacidade e uso de dados";
- rodapé do NavRail.

**E-mails (`functions/src/mail.ts`):** o remetente exibido passa a ser `APP_NAME`, e o rodapé ganha `MAINTAINER_LINE`.

---

## 3. Navegação

**Handle de rota** (`layouts/routeHandle.ts`):
```ts
{ chrome: "home" | "root" | "push" | "flow", title?: string, back?: { to: string; label: string } }
```
O `CitizenLayout` lê o handle com `useMatches()`.

### Celular (< 768 px)

**TabBar** (`layouts/chrome/TabBar.tsx`)
- Altura: 72 px + safe-area.
- 5 colunas iguais, rótulos de 13/600 e ícones de 26 px.

| Posição | Rótulo | Ícone | Destino / ativo em |
|---|---|---|---|
| 1 | Início | IconHome / IconHomeFilled | `/` |
| 2 | Pedidos | IconListCheck | `/protocolos*` |
| 3 | Solicitar | IconPlus, círculo mata-8 de 60 px, elevado | abre a folha |
| 4 | Plantão | IconClock24 | `/plantao/*` |
| 5 | Avisos | IconBell / IconBellFilled, ponto barro se houver não lido | `/comunicados` |

- Item ativo: pílula de 56×32 px em mata-light atrás do ícone; rótulo em mata-8 no claro e mata-3 no escuro.
- Tocar de novo na aba ativa rola a tela até o topo.
- Com a folha aberta, o "+" gira 45° e vira "×".
- A barra aparece em `home`, `root` e `push` e some em `flow`.

**AppBar** (`layouts/chrome/AppBar.tsx`): sempre verde, 56 px + `env(safe-area-inset-top)`, texto branco.
- `home`: BrandMark à esquerda; à direita, avatar de 40 px (link `/perfil`) ou a pílula branca "Entrar".
- `root` (Pedidos, Plantão, Avisos, Perfil):
  - uma faixa verde abaixo da barra traz o **H1** em Fraunces 28 branco;
  - quando ele sai da tela (IntersectionObserver liga `data-collapsed`), o título compacto aparece na barra (17/700, `aria-hidden`).
- `push` (detalhe do pedido, Meus dados, Privacidade):
  - Voltar rotulado à esquerda, por exemplo "‹ Pedidos" (no máximo 14 caracteres; senão "Voltar");
  - à direita, ações com texto ou `aria-label`.
- `flow` (zeladoria, ouvidoria, entrar, cadastro, recuperar senha, completar cadastro):
  - "Fechar" (X de 48 px) e o título;
  - barra de progresso segmentada logo abaixo;
  - ações fixas no rodapé.

**Voltar** (`hooks/useBackNavigation.ts`):
- se `history.state?.idx > 0`, faz `navigate(-1)`;
- se não, faz `navigate(handle.back.to, { replace: true })`. Quem chega por link de e-mail ou push volta para "Meus pedidos", e não para fora do app.

**Root:**
- `<ScrollRestoration getKey={(l) => l.pathname} />`;
- após cada navegação, o foco vai para o H1 (`tabIndex=-1`), sem região live;
- link "Pular para o conteúdo".

**Folha "Solicitar"** (`components/sheet/BottomSheet.tsx`, sobre `<dialog>.showModal()`):
- altura do conteúdo, alça de 36×5 px, raio 28 e botão "Cancelar" de 52 px;
- **um único mecanismo** para o Voltar do Android: o `cancel` nativo do dialog (CloseWatcher). Nada de `pushState`;
- trava a rolagem no `html` e devolve o foco ao botão Solicitar;
- retornos (snackbar) só aparecem depois de a folha fechar.

### Rotas

| Rota | Comportamento |
|---|---|
| `/plantao/:tipo` | `pages/duty/DutyPage` (`farmacias` ou `funerarias`); tipo inválido → 404 |
| `/plantao` | redireciona para o último tipo visto (sessionStorage `rolim.plantao`; padrão `farmacias`) |
| `/farmacias` | `<Navigate to="/plantao/farmacias" replace />` (atalho antigo e e2e offline) |
| `/funerarias` | `<Navigate to="/plantao/funerarias" replace />` |
| `/boas-vindas` | lazy, sob o Root, **fora** do CitizenLayout |

### Tablet e computador (≥ 768 px)

**NavRail** (88 px, carregado sob demanda se o orçamento apertar):
- logo de 40 px no topo;
- "Solicitar" (56 px, com rótulo);
- Início, Pedidos, Plantão e Avisos com a mesma pílula;
- no pé: Perfil ou Entrar e, para a equipe, "Painel";
- `MAINTAINER_LINE`.

Conteúdo com até 720 px e a Início com até 1040 px. O menu horizontal de links sai. Hover só em `@media (hover:hover) and (pointer:fine)`.

**Painel** continua no AppShell de sistema; mudam a marca e os itens (ver §5).

---

## 4. Tela inicial (`pages/home/`)

Ordem no celular:

**1. `HomeHeader`**
- Fundo: gradiente mata-8 até #0a5c37.
- H1 em Fraunces 30 branco: "Boa noite, Maria." quando logado; "Olá! Que bom ter você aqui." quando não.
- Celular com menos de 360 px ou texto "Muito grande": a saudação ocupa a largura toda e o cartão-postal fica ao lado da data; "Boa noite," nunca quebra no meio.
- Linha de 16 px (branco a 88%): a data por extenso.
- Equipe logada: chip "Você é da equipe · Abrir painel".
- Foto da cidade em cartão-postal (`/ilustracoes/rolim-de-moura.webp|jpg`, 440×240, cerca de 10 KB): rotatória do centro, de Franklin Baldo (CC BY 2.5, Wikimedia Commons); o crédito fica em Perfil › Sobre o app. Para trocar por uma foto oficial da prefeitura, substitua os dois arquivos mantendo a proporção 11:6.

**2. `ServiceGrid`** (H2 "Serviços")
- Grade: `repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr))`, gap 12. Dá 2 colunas em 320 px e 1 coluna com o texto em 125%.
- Blocos: altura mínima de 124 px, raio 24, quadrado de 52 px com ícone de 28 px, título 18/700 e linha de 15 px **que pode quebrar** (nunca reticências).

| Bloco | Linha de apoio | Destino |
|---|---|---|
| Problema na rua (mata, IconTools) | "Zeladoria: buraco, poste, lixo, mato" | `/zeladoria/nova` |
| Ouvidoria (ipê, IconMessages) | "Elogio, sugestão ou reclamação" | `/ouvidoria/nova` |
| Farmácias (mata, IconPill) | ao vivo: "1 de plantão agora" ou "Ver abertas" | `/plantao/farmacias` |
| Funerárias (ardósia, IconFlower) | "1 de plantão agora" ou "Ver lista" | `/plantao/funerarias` |

**3. `DutyNowCard`** ("De plantão agora")
- Cabeçalho: "De plantão agora" e "atualizado há 12 min".
- **Linha da farmácia** (72 px):
  - quadrado mata-light com IconPill, "Farmácia", nome em 17/700 (até 2 linhas) e "Av. Norte Sul, 1200";
  - distância só se `navigator.permissions` já disser "granted". A Início nunca pede localização;
  - botão "Ligar" (48 px, verde, `aria-label="Ligar para <nome>"`);
  - ponto vivo pulsando.
- **Linha da funerária** (compacta, 64 px, logo abaixo):
  - ardósia com IconFlower, nome e botão contornado "Ligar";
  - sem pulso, sem destaque;
  - some se não houver funerária cadastrada.
- Toque fora do botão abre a lista do tipo.
- Mais de uma de plantão: "e mais 1 ›".
- Nenhuma de plantão: "Nenhuma farmácia informou plantão agora · Ver abertas ›".

**4. `MyRequestsPreview`** ("Seus pedidos" e "Ver todos ›")
- Logado: até 2 RequestCards em lista vertical (sem carrossel). O pedido que mudou ganha o chip "Atualizado".
- Logado sem nada em aberto: "Nada em andamento. Precisa de algo?" e [Solicitar].
- Cadastro incompleto: "Falta pouco: complete seu cadastro".
- Anônimo: "Entre para fazer pedidos e acompanhar cada passo", com [Entrar] e [Criar conta].

**5. `LatestNotice`:** uma linha com "Último aviso · anteontem", o título e um chevron.

**6. `ContextInvite`:** no máximo um convite por vez, dispensável.
- (a) App não instalado: "Coloque o app na tela do celular", com [Instalar] no Android ou [Ver como] no iPhone (folha com 3 passos).
- (b) Logado, avisos desligados e já fez algum pedido: "Quer saber quando seu pedido andar?" com [Ligar avisos], que abre uma folha explicativa antes do pedido de permissão.

**Estados**
- Carregando: skeletons com a altura final (72, 96 e 64 px). Cabeçalho e serviços são estáticos e aparecem na hora.
- Sem internet: pílula ipê "Sem internet · mostrando dados salvos".
- Erro: "Não foi possível carregar. [Tentar de novo]" dentro do próprio cartão.

**Computador:** cabeçalho como cartão de raio 28; abaixo, duas colunas (7/12 com Serviços em 4 colunas e Seus pedidos; 5/12 com Plantão agora e Último aviso).

**Critério de aceite:** em 360×640, sem rolar, aparecem a saudação, os 4 serviços e o início do cartão de plantão.

---

## 5. Plantão (farmácias e funerárias)

### Domínio (`domain/duty.ts`, mais testes em `duty.test.ts`)
- `dutyCounts(list) → { duty, open, all }` e `filterDuty(list, "plantao" | "abertas" | "todas")`.
- `sortDuty(list, pos?)`:
  - ordem: plantão, depois abertas, depois fechadas;
  - dentro de cada grupo: distância (se houver), depois nome com `localeCompare("pt-BR")`;
  - corrige o bug atual, em que a distância ignorava o plantão.
- `isStale(updatedAt, now)`: mais de 24 h.
- `DUTY_COPY[type]`: textos por tipo.
- `data/buildings.ts`: `confirmDutyState(id)` regrava só o `updatedAt` (as regras atuais já permitem).
- `domain/documents.ts`: `whatsappLink(phone, text?)`.

### Tela do cidadão (`pages/duty/DutyPage.tsx`, em `/plantao/:tipo`)

1. **AppBar `root`.** H1 "Farmácias de plantão" ou "Funerárias de plantão". O H1 ainda contém "Farmácias", então o e2e por heading continua passando.
2. **`DutyTypeSwitch`:** 2 partes de 52 px, presas sob a barra: [IconPill Farmácias] [IconFlower Funerárias].
   - Cada parte é `<Link replace viewTransition>`.
   - O indicador desliza por `translateX`, 240 ms.
3. **Linha de apoio (16 px)**
   - Farmácias: "Informado pelas próprias farmácias. Ligue antes para confirmar."
   - Funerárias: "Informado pelas próprias funerárias. Quando estão de plantão, atendem por telefone a qualquer hora."
4. **Funerárias:** `FuneralHelp` (`<details>` recolhido) no topo da lista, com o título "Em caso de falecimento: o que fazer".
   - Conteúdo em `config/city.ts` `FUNERAL_GUIDE = { enabled: false, steps: [...] }`. **Só é renderizado com `enabled: true`, depois de validado pelas secretarias de Saúde e de Assistência Social.**
   - Passos de rascunho:
     1. "Em casa ou na rua, ligue 192 (SAMU). Se houver suspeita de violência ou acidente, ligue 190."
     2. "No hospital, a equipe orienta e entrega a declaração de óbito."
     3. "A funerária orienta o registro no cartório e o sepultamento."
   - Botões "Ligar 192" e "Ligar 190".
   - Linha do CRAS e o botão "Ligar para o CRAS" só se `CONTACTS.crasPhone` estiver preenchido.
5. **Chips de 44 px**, com rolagem horizontal e estado em `?filtro=`:
   - "De plantão (n)" (padrão), "Abertas agora (n)" e "Todas (n)";
   - o chip de ação "Perto de mim" (IconCurrentLocation) abre, antes, uma folha: "Para mostrar a distância, o app usa sua localização só agora. Ela não é guardada." com [Usar minha localização] e [Agora não];
   - o chip "Mapa" (`aria-pressed`) abre o Leaflet sob demanda numa folha de 70% da altura. Marcadores: ipê para plantão, verde para aberta, cinza para fechada.
6. **"Atualizado há 5 min":** o maior `updatedAt` da lista.
7. **`DutyCard`** (raio 20, padding 16)
   - **Pílulas** (sempre ícone e texto):
     - "De plantão": fundo ipê-4, texto #3a2a00, 8,2:1;
     - "Aberta agora" / "Fechada"; nas funerárias, "Atendendo agora" / "Fora do horário";
     - "De plantão · só por telefone" quando `isOnDuty && !isOpen`;
     - distância à direita.
   - **Conteúdo:**
     - nome 19/700 (até 2 linhas), endereço 16 px e horário 15 px;
     - telefone escrito por extenso: "(69) 3442-0001";
     - "Atualizado há 2 h pela farmácia";
     - com `isStale`, o aviso ipê "Faz tempo que não atualizam. Confirme por telefone."
   - **Ações** em grade de colunas iguais, 52 px:
     - "Ligar" (cheio verde), com o primeiro telefone que não for WhatsApp;
     - "WhatsApp", com o texto "Olá! Vi no SUPER APP Rolim de Moura que vocês estão de plantão.";
     - "Rota".
     - Cada botão tem nome acessível único, por exemplo "Ligar para Farmácia Exemplo Centro". Botão sem dado não aparece.
8. **Estados**
   - Vazio: "Nenhuma farmácia informou plantão agora" ou "Nenhuma funerária informou plantão agora", com [Ver todas (n)].
   - Erro: "Não foi possível carregar a lista." e [Tentar de novo].
   - Carregando: 3 skeletons de 196 px.
   - Nota no fim: "Informações atualizadas pelas próprias empresas. Ligue antes de ir."

**Tom das funerárias:** acento ardósia, IconFlower, sem pulso, sem "pop", sem vermelho, sem ilustração.

### Painel
- **Papel:** `ROLE_LABEL.DUTY_MANAGER = "Responsável por plantão"`. A descrição do StaffEditor continua a atual.
- **Menu:** "Meus plantões" (IconClock24) e "Unidades e plantões".
- **`MyDutyUnitsPage`:**
  - grupos "Farmácias" e "Funerárias";
  - linhas de 56 px, clicáveis inteiras, com Switch lg: "Aberta agora" e "De plantão – aparece em destaque para toda a cidade";
  - ligar o plantão também liga "aberta";
  - atualização **otimista**, com snackbar "Plantão ligado. A cidade já vê <nome> em destaque." e [Desfazer] por 5 s;
  - prévia "A população vê assim:", com as mesmas pílulas do app do cidadão;
  - com `isStale`, a faixa ipê e o botão "Continua de plantão" (`confirmDutyState`).
- **`BuildingsAdminPage`:** SegmentedControl "Unidades públicas | Farmácias | Funerárias"; colunas Responsáveis e Atualizado ("Desatualizado" em barro acima de 24 h).
- **`BuildingForm`:** tipo com 3 opções; "Responsáveis pelo plantão" (pessoas ativas com `DUTY_MANAGER`); placeholder do horário "Ex.: Atendimento 24 horas".
- **`DashboardPage`:** cartão "Plantão agora" com "atualizado há…".

### Migração do papel em produção (ordem obrigatória, documentada em `docs/OPERACAO.md`)
1. Publicar regras transitórias que aceitam `PHARMACY_MANAGER` **e** `DUTY_MANAGER`.
2. Publicar o web com leitura tolerante em `data/people.ts` (`PHARMACY_MANAGER` passa a valer como `DUTY_MANAGER`).
3. Rodar o novo `scripts/migrate-duty-role.mjs` (firebase-admin) em `staff/*`.
4. Publicar as regras finais.

---

## 6. Demais telas

- **Meus pedidos (`/protocolos`):**
  - título "Meus pedidos";
  - chips "Em aberto", "Todos" (**sem contagem**, o e2e usa `exact`), "Zeladoria" e "Ouvidoria", com `?filtro=`;
  - grupos "Em andamento" e "Concluídos e encerrados";
  - RequestCard: título 17/700 primeiro, depois "Iluminação pública · Rua da Escola", a barra de 4 segmentos com "Etapa 3 de 4 · Em andamento" e o protocolo em mono 13.
- **Detalhe:**
  - `push` com "‹ Pedidos" e "Compartilhar" (Web Share; se não houver suporte, copia);
  - cartão de situação com a barra de 4 etapas e o protocolo em mono 18, com [Copiar] que vira "Copiado";
  - resposta da prefeitura como balão ipê-light;
  - detalhes em lista com ícones, sem rótulos em CAIXA ALTA;
  - **mapa só ao tocar em "Ver local no mapa"** (economiza cerca de 52 KB de Leaflet e os tiles);
  - "Cancelar pedido" como botão de texto barro, com confirmação em folha.
- **Problema na rua e Ouvidoria (`flow`):**
  - o Stepper sai; entram a barra segmentada e "Passo 1 de 4";
  - cada passo é `?passo=N` com push no histórico, para o Voltar do Android voltar um passo. `?passo>1` sem dados faz replace para o passo 1;
  - perguntas em Fraunces 26 ("Qual é o problema?", "Onde fica?", "Conte o que aconteceu", "Confira e envie"). No passo 1, o toque marca e avança;
  - rodapé fixo com "Voltar" e "Continuar" ou "Enviar pedido" (56 px);
  - X com dados preenchidos abre a folha "Descartar o pedido? O que você preencheu será perdido." com [Continuar preenchendo] e [Descartar];
  - `overscroll-behavior-y: none`;
  - a Ouvidoria só ganha o mesmo chrome e o tipo em blocos grandes.
- **`SubmittedPanel`:**
  - "Pedido enviado!" e o protocolo num "canhoto" picotado, com [Copiar] e [Compartilhar];
  - convite "Ligar avisos" com explicação antes;
  - [Acompanhar pedido] e [Voltar ao início].
- **Avisos:**
  - título "Avisos";
  - cartão de push só se estiver `disabled` e a pessoa logada. **O estado `unconfigured` fica oculto**;
  - sem conta: convite [Entrar] ("Receba os avisos no celular") só quando o push está disponível neste aparelho (estado `disabled`); `unconfigured`, `unsupported`, `denied` e `enabled` não mostram nada;
  - sem `InstallCard`;
  - grupos Hoje, Esta semana e Mais antigos, com o chip "Novo" (`rolim.noticesSeenAt`).
- **Perfil:**
  - lista agrupada com linhas de 56 px:
    - Minha conta: Meus dados (`/perfil/dados`, com "Excluir minha conta" no fim) e Painel da equipe;
    - Celular: Avisos (switch) e Colocar na tela inicial;
    - Leitura: **Tamanho do texto** (Normal, Grande, Muito grande) e Aparência;
    - Ajuda: Ver a apresentação de novo (`/boas-vindas?rever=1`), Privacidade e Sobre o app;
  - "Sair" no fim.
- **Entrar e Cadastro:**
  - `flow` com logo de 56 px e "Entre no SUPER APP";
  - "Entrar com Google" primeiro;
  - rótulos exatos "E-mail" e "Senha" (o e2e usa);
  - campos lg e botão de 56 px;
  - `MAINTAINER_LINE` no rodapé.

---

## 7. Sistema de movimento (`theme/motion.css`)

**Tokens**
```css
:root{
  --motion-press:100ms; --motion-fast:160ms; --motion-base:240ms;
  --motion-screen:280ms; --motion-sheet-in:340ms; --motion-sheet-out:220ms; --motion-emph:480ms;
  --stagger:40ms;
  --ease-standard:cubic-bezier(.2,0,0,1);
  --ease-enter:cubic-bezier(.16,1,.3,1);
  --ease-exit:cubic-bezier(.3,0,1,1);
  --ease-spring:var(--ease-enter);
}
@supports (transition-timing-function: linear(0,1)){
  :root{ --ease-spring:linear(0,.5 12%,.92 25%,1.04 36%,1.02 50%,1); }
}
```
Só se animam `transform`, `opacity` e `clip-path`. `will-change` só durante o arrasto.

**View Transitions (RR7)**
- `components/AppLink.tsx` é um `<Link viewTransition>` com a prop `nav`:
  - TabBar: `tab`;
  - fluxos: `flow`;
  - padrão: `push`.
- Antes de navegar, grava `<html data-nav>`. Um listener de `popstate`, registrado em `main.tsx` antes do router, grava `pop` (o RR7 reaplica a transição no POP).
- Nomes: `app-bar`, `tab-bar` e `nav-rail` com `animation:none` (a casca fica parada). Mapas Leaflet e o portal de notificações recebem `view-transition-name:none`. O conteúdo anima por `root`.

| Tipo | Saída (old) | Entrada (new) |
|---|---|---|
| push | translateX(-12px)+fade, 200 ms exit | translateX(28px→0)+fade, 280 ms enter |
| pop | espelho do push | espelho do push |
| tab | fade 120 ms | fade + scale(.985→1), 200 ms, atraso 60 ms |
| flow | fade 200 ms | translateY(40px→0)+fade, 280 ms |

- Sem suporte a View Transitions: entrada da tela só por opacidade (200 ms, `layouts/chrome/useScreenEntrance.ts`), para não animar duas vezes. Sem `transform` no contêiner da rota: ele viraria o bloco de referência dos rodapés fixos das tarefas.
- Desligar a transição (`viewTransition: false`) quando houver `useReducedMotion()` ou `data-motion="lite"`.
- **Modo lite:** `<html data-motion="lite">` quando houver `navigator.connection?.saveData` ou `deviceMemory ≤ 2`. Nesse modo, sem View Transitions, sem brilho e sem stagger. O toque e a folha continuam.
- Pré-carregar em `requestIdleCallback` os chunks de `/protocolos`, `/plantao/:tipo` e `/comunicados`.
- `.route-progress` com `animation-delay: 250ms`.

**Listas:** `.enter-rise` (opacity e translateY de 8 px a 0, 240 ms enter), com `animation-delay: calc(min(var(--i),6) * var(--stagger))`.
- Vale só na primeira montagem: `data-animate` sai depois. As keys estáveis evitam reanimar nas atualizações do Firestore.
- Um item alterado ganha um chip com scale 1 → 1,08 → 1 em 240 ms e "Atualizado agora" por 3 s.

**Microinterações**
- `[data-press]:active`: `scale(.97)` em 100 ms, mais uma camada `::before` com opacity .08 (feedback que não depende só do movimento).
- TabBar: a pílula entra com scaleX(.5 → 1) e opacity em 240 ms; Solicitar com `scale(.92)`; o "+" gira 45°.
- Folha:
  - entra com translateY(100% → 0) em 340 ms (spring), por `@starting-style`;
  - `::backdrop` com opacity de 0 a .45;
  - o arrasto segue o dedo e fecha acima de 80 px ou com velocidade acima de .5 px/ms; saída em 220 ms.
- Título compacto: opacity e translateY(4px → 0) em 160 ms.
- Etapas: scaleX a partir da esquerda, 480 ms; o anel da etapa atual pulsa 2 vezes e para.
- Sucesso:
  - círculo com scale(.6 → 1) em 340 ms (spring);
  - check por `clip-path: inset(0 100% 0 0 → 0)` em 280 ms;
  - canhoto com `.enter-rise` e 200 ms de atraso;
  - `navigator.vibrate?.(15)`.
- Copiar: crossfade do rótulo em 160 ms.
- Ponto vivo (só farmácia): `::after` com scale(1 → 2,4) e opacity(.6 → 0) a cada 2 s. Sai o `box-shadow` animado.
- Skeleton: `::after` com translateX(-100% → 100%) em 1,2 s.
- Corrigir os anti-padrões atuais: `gap` animado do tileCta, `flex-grow` da stackBar do painel (passa a scaleX) e `translateY` no hover fora de `(hover:hover)`.

**Fica parado:** mapas, textos, números, tabelas, a ilustração da cidade, tudo das funerárias além da troca de tela, e o painel (só fade de 160 ms).

**Movimento reduzido**
```css
@media (prefers-reduced-motion: reduce){
  ::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}
  .enter-rise,.pulse,.shimmer::after{animation:none!important}
}
```
Nos dois casos (movimento reduzido e `[data-motion="lite"]`), a regra global atual continua; o onboarding mostra o quadro final; `scroll-behavior: auto`.

---

## 8. Onboarding de primeiros acessos

**Persistência:** `rolim.onboarding = "v1"` no localStorage, sempre via `safeStorage`.

**Regra** (`features/onboarding/onboardingState.ts`, função pura com teste):
- **`main.tsx`, antes do router:**
  - grava a entrada da sessão: se ainda não existir, `sessionStorage rolim.entry = location.pathname + location.search` (com cópia em memória);
  - **lê** `rolim.firstSeen` e só depois grava.
  - Usuário antigo: `firstSeen` ausente e (`navigator.serviceWorker.controller` ou `rolim.installDismissed` ou `rolim.pushToken`). Nesse caso grava `rolim.onboarding="v1"` e `rolim.novidades="pendente"`.
- **`shouldShowOnboarding(requestUrl, env)`**, chamado no `loader` da rota index com `new URL(request.url)` (nunca `window.location`). Retorna true só se todas valerem:
  1. o armazenamento funciona (teste de escrita e leitura);
  2. `rolim.onboarding !== "v1"`;
  3. a entrada da sessão é exatamente `/` e o `requestUrl.pathname` é `/`;
  4. a apresentação ainda não foi mostrada nesta sessão (`sessionStorage rolim.introShown`);
  5. não há `?intro=0`. Se houver, grava `"v1"` e remove o parâmetro.
- Se verdadeiro: `redirect("/boas-vindas")`. Como o redirect acontece no loader, a Início não pisca.
- **Nunca intercepta** `/protocolos/*`, `/plantao/*`, `/entrar?next=`, `/cadastro`, `/painel/*` nem atalhos do manifest diferentes de `/`.
- Contador `rolim.onboarding.vezes`: na 2ª exibição sem conclusão, grava `"v1"`.
- `OnboardingPage`: se o Auth resolver com usuário que tem perfil e não houver `?rever=1`, chama `completeOnboarding()` e `navigate("/", { replace: true })`.
- Concluem a apresentação: Pular, Começar a usar, Entrar e **login bem-sucedido**.

**`beforeinstallprompt`:** capturar em nível de módulo (`lib/installPrompt.ts`, importado no `main.tsx`); `useInstallPrompt` passa a ler esse store.

**Tela:**
- fundo papel e faixa verde superior com a ilustração SVG inline (até 2 KB por slide, `aria-hidden`);
- título em Fraunces 28 e texto de 18 px;
- pager com `scroll-snap-type: x mandatory`;
- "Pular" (48 px) no canto superior direito, nos slides 1 a 4;
- rodapé fixo: pontos com o texto oculto "Passo 2 de 5", [Voltar] a partir do slide 2 e [Próximo] (56 px).

**Slides**

1. **"Bem-vindo ao SUPER APP Rolim de Moura"**
   - Texto: "Os serviços da prefeitura num só lugar, no seu celular. É grátis."
   - Rodapé: `MAINTAINER_LINE`.
   - Ilustração: cidade com ipê e o pino descendo.
2. **"Viu um problema na rua? Avise."**
   - Texto: "Buraco, poste apagado, lixo ou mato alto: tire uma foto, marque o local e envie."
3. **"Acompanhe cada passo"**
   - Texto: "Cada pedido ganha um número de protocolo. Você vê quando a prefeitura recebe, analisa e resolve."
   - Ilustração: a mesma barra de 4 etapas do app.
4. **"Farmácia e funerária de plantão"**
   - Texto: "Veja quem está de plantão, ligue com um toque ou trace a rota. Não precisa entrar na conta."
5. **"Deixe do seu jeito"**
   - **Tamanho do texto**: "Aa" em Normal, Grande e Muito grande, com prévia ao vivo (`rolim.textSize`).
   - **"Colocar o app na tela do celular"**:
     - Android com o evento disponível: [Instalar o app];
     - iPhone: [Ver como instalar], que abre uma folha com 3 passos;
     - sem o evento: "Você pode instalar depois pelo menu do navegador.";
     - já instalado: o item some.
   - **Avisos**: só texto, "Depois de entrar, você pode ligar os avisos para saber quando seu pedido andar." Nenhuma permissão é pedida aqui.
   - Botões: [Começar a usar], que faz `navigate("/", { replace: true, viewTransition: true })`, e [Entrar ou criar conta], que leva a `/entrar?next=/`. [Entrar ou criar conta] fica no rodapé fixo, abaixo de [Voltar] [Começar a usar], só sem login (botão de texto, 48 px); Instalar e Avisos ficam lado a lado quando cabem.
   - Com `?rever=1` (aberto pelo Perfil), Pular, Esc e Começar a usar voltam ao Perfil.

**"Novidade" para usuários antigos:** uma folha única, 1,2 s depois de abrir a Início, com "Agora você também encontra a funerária de plantão, com telefone e rota.", [Ver funerárias de plantão] e [Fechar].
- Grava `rolim.novidades = "2026-10-funerarias"`.
- Nunca aparece junto com a apresentação nem quando a pessoa chegou por link direto.

**Acessibilidade**
- `<main aria-labelledby>`; cada slide é `<section role="group" aria-roledescription="slide" aria-label="2 de 5">`.
- Slides fora da tela ficam com `inert`.
- Ao trocar de slide, o foco vai para o título do slide (`tabIndex=-1`), **sem aria-live**.
- Setas trocam de slide; Esc equivale a Pular; "Pular" é o primeiro item do Tab.
- Funciona com o texto em 125% (o slide rola na vertical).
- Com movimento reduzido, a troca é instantânea.

**E2E**
- `playwright.config.ts`: `use.storageState` com `origins: [{ origin: "http://localhost:4180", localStorage: [rolim.onboarding="v1", rolim.firstSeen="2026-01-01", rolim.novidades="2026-10-funerarias"] }]`.
- `onboarding.spec.ts`, com `test.use({ storageState: { cookies: [], origins: [] } })`, testa:
  - `/` leva a `/boas-vindas`;
  - Pular leva à Início;
  - recarregar não mostra de novo;
  - `/protocolos/zeladoria/x` e `/plantao/funerarias` não mostram;
  - `/?intro=0` vai direto para a Início;
  - Tab e Enter percorrem tudo.
- Lighthouse em `/?intro=0`.

---

## 9. Plano de implementação (em ordem)

**F0. Consertar e medir**
- `HomePage.tsx`: trocar o import para `useDutyUnits("PHARMACY")`.
- Criar `pages/duty/DutyPage.tsx` a partir de `PharmaciesPage` e apagar a antiga.
- `router.tsx`: rotas de §3.
- `theme/theme.ts`: trocar **todos** os `X.extend(...)` por `{ X: { defaultProps } }`, sem `transitionProps` de Drawer ou Modal.
- `main.tsx`: `<Notifications/>` via `lazy` depois do idle; `RouterProvider` importado de `react-router/dom`.
- `vite.config.ts`: `build.manifest: true`.
- Novo `scripts/check-bundle.mjs`: percorre `dist/.vite/manifest.json` a partir do entry, seguindo os imports estáticos e os `import()` do `main.tsx` (router, AuthProvider) com seus estáticos; soma o gzip e falha acima de 300 KB. Entra no `"build"`.
- **Aceite:**
  - `tsc --noEmit` sem erros;
  - `grep -l "Drawer\|SegmentedControl" dist/assets/index-*.js` vazio;
  - check-bundle ≤ 300 KB (linha de base: cerca de 312).

**F1. Marca e plantão**
- `config/city.ts`, `index.html`, `vite.config.ts` e `BrandMark` com `logo-mono.svg`.
- `domain/duty.ts` com testes, `confirmDutyState`, `whatsappLink(text)`.
- `pages/duty/*` (DutyPage, DutyCard, DutyTypeSwitch, DutyFilters, LocationPrompt, FuneralHelp).
- Painel: `MyDutyUnitsPage`, `BuildingsAdminPage`, `BuildingForm`, `roles.ts`, `AdminLayout`.
- `data/people.ts` com leitura tolerante, `scripts/migrate-duty-role.mjs`, `docs/OPERACAO.md`, `functions/src/mail.ts`.
- `e2e/plantao.spec.ts`:
  - funerárias sem login;
  - pílula "De plantão";
  - link `tel:`;
  - responsável alterna o plantão.
- `app.spec.ts`: "Plantão" exato passa a "De plantão".
- **Aceite:** `/farmacias` cai em `/plantao/farmacias`, inclusive offline; nenhum "Prefeitura de" em título.

**F2. Casca**
- `layouts/chrome/{AppBar,TabBar,NavRail}.tsx`, `routeHandle.ts`, `navItems.ts`.
- `components/sheet/BottomSheet.tsx`; `newRequestSheet` passa a usá-la.
- `useBackNavigation`, `useDocumentTitle`.
- `theme/global.css`:
  - `.citizen` sobrescreve `--mantine-font-size-*` (md 17 px);
  - `html[data-text-size]`;
  - hover só em `(hover:hover)`.
- `lib/preferences.ts` com teste.
- **Aceite:**
  - safe-area verde em todas as telas do cidadão, conferida num iPhone com o app instalado;
  - o Voltar do Android fecha a folha numa única vez;
  - axe sem violações nos dois temas.

**F3. Início e telas internas**
- `pages/home/*`, `MyRequestsPage`, `RequestDetails` (mapa no toque), `NewIssuePage` (`?passo=`), `NewOmbudsmanPage`, `SubmittedPanel`, `NoticesPage`, `ProfilePage` e `ProfileDataPage`, `AuthFrame`, `PushToggle` (oculta `unconfigured`), `InstallCard` → `ContextInvite`.
- `app.spec.ts`: `getByText(/de plantão agora/i).first()`.
- **Aceite:**
  - layout em 320 e 360 px com o texto em 125%, sem reticências;
  - o critério da primeira dobra de §4.

**F4. Movimento:** `theme/motion.css`, `components/AppLink.tsx`, `lib/navMotion.ts` (`data-nav`, `data-motion`, popstate), pré-carga ociosa.
- **Aceite:**
  - projeto Playwright com `reducedMotion: "reduce"` sem animações;
  - nenhum keyframe anima propriedade de layout (revisão por grep);
  - CLS < 0,1.

**F5. Onboarding:** `features/onboarding/*` (OnboardingPage, slides, onboardingState com teste, WhatsNewSheet), `lib/installPrompt.ts`, `playwright.config.ts` (storageState, projeto WebKit), `e2e/onboarding.spec.ts`, `e2e/visual.spec.ts` (320, 375, 768, 1024 e 1440 px, claro e escuro).
- **Aceite:**
  - Lighthouse acessibilidade 100 em `/?intro=0` e em `/boas-vindas`;
  - check-bundle ≤ 300 KB;
  - chunk do onboarding ≤ 9 KB gzip.

---

## 10. Fora de escopo agora

- Mestre-detalhe no computador, Sidebar ≥ 1200 px e trilho expandido.
- `animation-timeline`, `routeChunks.ts`, animação de push específica do iOS e elemento compartilhado entre lista e detalhe.
- Carrossel na Início e cadastro em vários passos.
- Biblioteca de animação (motion/react: cerca de 15 a 30 KB, ganho nulo diante de CSS mais View Transitions) e Lottie.
- CSS do Mantine importado por componente.
- Screenshots do manifest e telas de abertura do iPhone: ficam para depois, já previstos no `globIgnores`.
- Publicar o guia de falecimento: depende da validação das secretarias de Saúde e de Assistência Social.
- Trocar o `short_name`: depende da prefeitura.

---

## 11. Animações da apresentação e da Início, e passo a passo do primeiro acesso

Base: a proposta **calm** ("Guia calmo"), com enxertos das propostas **native** e **delight** e todas as correções obrigatórias dos jurados. O pedido: mais animações (sobretudo na apresentação e na Início) e um passeio guiado para quem abre o app pela primeira vez. Caminhos a partir de `web/src`. Esta seção complementa §3, §4, §6, §7 e §8; o que muda nelas está em "Ajustes nas seções anteriores". As medidas foram feitas em 21/10/2026 no servidor de desenvolvimento (porta 5180), com os dados de exemplo e sem login.

### Princípios

1. **Movimento que explica, toca uma vez e para.** Cada animação encena o que o texto ao lado diz e termina no estado de repouso, que é o próprio estilo base. Nenhum laço novo; anéis pulsam no máximo 2 vezes.
2. **Só `transform`, `opacity` e `clip-path`**, com os tokens de §7 (`--motion-*`, `--stagger`, `--ease-*`). Sem biblioteca, sem `animation-timeline`, sem ouvinte de rolagem que mova coisas a cada quadro.
3. **Opt-in.** Toda regra decorativa nova fica dentro de `@media (prefers-reduced-motion: no-preference)` e sob `html:not([data-motion="lite"])`. Sem as duas condições, aparece o quadro final. No lite continuam só o retorno ao toque e a folha (§7).
4. **Fica parado (reforça §7):**
   - títulos e textos dos slides;
   - o H1, a data e os números da Início;
   - o cartão-postal da cidade e as curvas de nível (mexer neles exige emenda de §7 aprovada pela prefeitura);
   - tudo das funerárias (casa da ilustração, selo, linha, ícone do bloco), que no máximo esmaece.
5. **LCP e CLS.**
   - Nada da primeira dobra começa com `opacity: 0`.
   - Os elementos de LCP (H1 da Início; h2 do slide 1 em `/boas-vindas`) nunca animam.
   - Entradas usam keyframes só com `from` e `animation-fill-mode: backwards`. Nunca `both` em elemento que tem transformação no `:active` ou no hover, para não travar o retorno ao toque.
6. **CSS Modules renomeiam keyframes.**
   - Todo `@keyframes` usado num `*.module.css` é declarado no mesmo arquivo.
   - Keyframes globais só entram por classes globais (`.enter-rise`, `.bump`) ou por regras em `theme/motion.css`.
   - `mark-pop` e `check-draw` continuam no `SubmittedPanel.module.css`.
7. **SVG:** nenhuma transformação CSS em nó que já tem o atributo `transform` (ex.: o `<g>` do `Pin`, com `translate(120 14) scale(.62)`): no Chromium a animação partiria da matriz errada e o WebKit descarta o atributo. Anima-se um `<g>` externo, sem atributo.
8. **O plantão nunca fica preso atrás do passeio.** Os botões "Ligar" funcionam com um toque em qualquer passo (ver "Passeio: interação e emergência").
9. **Orçamento.**
   - JS inicial ≤ 300 KB gzip (hoje 295,0 KB); esta entrega soma até 1,6 KB.
   - O passeio é um pedaço separado, baixado só por quem vai vê-lo.
   - A apresentação continua ≤ 9 KB (§9 F5).

### Apresentação: animação das ilustrações (`features/onboarding/`)

**Mecanismo**
- Cada ilustração já recebe `active` e passa a pôr `data-play={active || undefined}` na raiz: no `<svg>` e, no slide 3, em `.mockStack`. As partes que se movem ganham classes de `illustrations.module.css` (novo, dentro do pedaço da apresentação).
- Padrão, dentro do opt-in:
```css
.scene .parte { animation: <nome> <duração> <curva> <atraso> both paused; }
.scene[data-play] .parte { animation-play-state: running; }
```
- Comportamento:
  - Até ficar ativo, o slide mostra o primeiro quadro. Ele é sempre composto (só deslocamento e opacidade parcial), nunca vazio: é o que aparece enquanto o dedo arrasta o próximo slide.
  - A cena começa quando o slide fica ativo (o `usePager` decide ao assentar ou ao tocar em Próximo) e **toca uma vez**. Voltar a um slide não repete: a animação já terminou e fica no quadro final. A barra de etapas do slide 3 mantém a exceção atual (a `key` remonta).
  - Keyframes só com `from`: o quadro final é o estilo base, e `animation: none` (movimento reduzido, lite) mostra o fim na hora.
  - Origens em unidades do SVG com `transform-box: view-box` (valores abaixo); `fill-box` só onde indicado.
  - Cada cena dura no máximo cerca de 1,1 s. Nada pisca, nada treme, sem paralaxe.
- O lite desliga as cenas porque transformações em filhos de SVG rodam na thread principal, o que pesa em aparelho fraco.

**Slide 1, "Bem-vindo" (`CityArt`): a cidade se arruma e o pino pousa (cerca de 800 ms)**
- O caminho único dos prédios vira 3 `<g>` (prédio e suas janelas), com `--n` de 0 a 2: `onb-rise` `from{transform:translateY(14px);opacity:.4}`, `--motion-sheet-in`, `--ease-enter`, atraso `calc(var(--n) * var(--stagger))`.
- As 3 copas do ipê (`--n` de 0 a 2), com `fill-box` e origem no centro: `onb-bloom` `from{transform:scale(.3)}`, `--motion-sheet-in`, `--ease-spring`, atraso `calc(160ms + var(--n) * var(--stagger))`. O tronco fica parado: o ipê floresce.
- Pino: o `<Pin>` fica dentro de um `<g class=drop>` sem atributo. `onb-drop` `from{transform:translateY(-36px)}`, `--motion-emph`, `--ease-spring`, atraso 200 ms.
- Sombra do pino: `onb-shadow` `from{transform:scale(.3);opacity:0}`, origem `140px 64px`, `--motion-emph`, `--ease-enter`, atraso 200 ms.
- Raios acima do pino ("é aqui"): `onb-fade` `from{opacity:0}`, `--motion-fast`, atraso 640 ms.
- Sol e chão: parados.

**Slide 2, "Viu um problema na rua? Avise." (`StreetArt`): foto, local, enviar (cerca de 1 s)**
- Celular (corpo, tela e conteúdo num `<g>`): `onb-rise-lg` `from{transform:translateY(28px)}`, `--motion-sheet-in`, `--ease-spring`. O `<svg>` recorta o que passa da borda.
- "Foto" na tela (faixa cinza e buraco num `<g>`): `onb-photo` `from{transform:scale(.92);opacity:0}`, `fill-box` com origem no centro, `--motion-base`, `--ease-enter`, atraso 240 ms.
- Pino da tela (caminho e ponto num `<g>`): `onb-drop-sm` `from{transform:translateY(-18px);opacity:0}`, `--motion-sheet-in`, `--ease-spring`, atraso 420 ms.
- Botão de enviar (retângulo verde): `onb-press` `50%{transform:scale(.9)}`, `fill-box` com origem no centro, `--motion-base`, `--ease-standard`, atraso 760 ms.
- Buraco da rua, poste e mato: parados. **O poste não pisca e não há flash de câmera.**

**Slide 3, "Acompanhe cada passo" (`TrackArt`, em `OnboardingPage.module.css`)**
- `.mock`: `onb-card` `from{transform:translateY(16px)}`, `--motion-sheet-in`, `--ease-enter`. Sem opacidade, porque o cartão tem texto.
- `.mockStack::before`: `onb-fan` `from{transform:none}` até o repouso atual, `translate(10px,-10px) rotate(3deg)`; `--motion-emph`, `--ease-spring`, atraso 120 ms ("uma pilha de pedidos").
- `StepBar`: como hoje (preenche em 480 ms; o anel da etapa atual pulsa 2 vezes e para).
- Mesmo padrão `paused`/`running`, com `.mockStack[data-play]`.

**Slide 4, "Farmácia e funerária de plantão" (`DutyArt`) (cerca de 1 s)**
- Relógio ipê (círculo e ponteiro num `<g>`): `onb-pop` `from{transform:scale(.6)}`, origem `150px 72px`, `--motion-sheet-in`, `--ease-spring`.
- Ponteiro ("plantão, 24 h"): `onb-turn` `from{transform:rotate(-90deg)}`, origem `150px 72px`, `--motion-emph`, `--ease-enter`, atraso 120 ms.
- Balão do telefone (círculo branco e aparelho num `<g>`), "ligue com um toque": `onb-pop` com `opacity:0` no `from`, origem `282px 46px`, `--motion-sheet-in`, `--ease-spring`, atraso 320 ms. O aparelho não toca nem treme.
- Rota pontilhada ("trace a rota"): `onb-draw` `from{clip-path:inset(0 100% 0 0)}`, `--motion-emph`, `--ease-standard`, atraso 480 ms. Navegador que ignora `clip-path` em SVG mostra a rota inteira (o quadro final).
- Farmácia e **funerária: paradas**.

**Slide 5, "Deixe do seu jeito" (`SettingsArt` e `SettingsPanel`) (cerca de 800 ms)**
- "Aa" usa dois `<g>`, para a entrada nunca disputar a propriedade com a transição:
  - o externo (`.aaSize`) acompanha o tamanho escolhido: `transition: transform var(--motion-base) var(--ease-spring)`, `fill-box`, origem `0 100%`; `html[data-text-size="grande"]` dá `scale(1.12)` e `"muito-grande"` dá `scale(1.25)`. É resposta ao toque, então vale no lite; com movimento reduzido fica instantânea (regra global);
  - o interno (`.aa`) entra com `onb-grow` `from{transform:scale(.8)}`, mesma origem, `--motion-emph`, `--ease-enter`.
- Ícone do app na tela do celular (quadrado verde e ponto ipê num `<g>`): `onb-pop` `from{transform:scale(.5)}`, origem `162px 50px`, `--motion-sheet-in`, `--ease-spring`, atraso 200 ms.
- Sino: parado. O ponto ipê do sino ("chegou um aviso"): `onb-pop` `from{transform:scale(0)}`, origem `280px 44px`, `--motion-base`, `--ease-spring`, atraso 420 ms.
- `SettingsPanel`:
  - `.sizes` ganha `data-touched` no primeiro `onChange`, para a escolha padrão nunca animar ao montar;
  - `.sizes[data-touched] .size:has(:checked) .check`: `size-check` `from{transform:scale(.6)}`, `--motion-base`, `--ease-spring`. Vale no lite (é toque). O escolhido continua indicado pelo ícone, pela borda e pelo fundo;
  - instalação concluída: se `installed` passa a `true` depois de a tela abrir, o grupo continua e mostra, com `role="status"`, um check (`install-pop` `from{transform:scale(.6)}`, `--motion-sheet-in`, `--ease-spring`) e "Pronto! O app está na tela do celular.". Quem abre com o app já instalado continua sem o grupo.

**Rodapé**
- Um só botão principal, com caixa estável. O rótulo fica num `<span key={isLast ? "comecar" : "proximo"}>` que ganha `data-swap` a partir do slide 2: `onb-label` `from{opacity:0;transform:translateY(6px)}`, `--motion-fast`, `--ease-enter`. Só anima quando "Próximo" vira "Começar a usar" e vice-versa; o botão não remonta, então o foco não se perde.
- Seta do Próximo: `.next:active svg{transform:translateX(3px)}` com `transition: transform var(--motion-press)`.
- "Entrar ou criar conta" aparece com `.enter-rise`.
- Pontos: como hoje. Sem indicador deslizante.

**Passagem para a Início (View Transition, só no celular)**
- `start()` passa a receber o tipo de saída: `"comecar"` (Começar a usar) ou `"pular"` (Pular e Esc). Fora do `?rever=1`, logo depois de `navigate("/", { replace: true, nav: "tab" })`, grava `document.documentElement.dataset.navScope = "welcome"`. É o mesmo padrão do `DutyTypeSwitch`; o próximo `setNavKind` limpa.
- O `.top` da apresentação ganha a classe global `app-bar-vt`: a faixa da marca vira a AppBar da Início sem se mover (as regras de `app-bar` já existem).
- Só o `.art` do slide **ativo** recebe `onb-hero-vt`, e o `<header>` do `HomeHeader` recebe `home-hero-vt`. Um nome repetido abortaria a transição.
- Em `theme/motion.css` (global; um módulo renomearia o `vt-fade-out`):
```css
@media (max-width: 47.99em) {
  html[data-nav-scope="welcome"] .onb-hero-vt,
  html[data-nav-scope="welcome"] .home-hero-vt { view-transition-name: welcome-hero; }
}
::view-transition-group(welcome-hero) { animation-duration: var(--motion-emph); animation-timing-function: var(--ease-standard); }
::view-transition-old(welcome-hero) { animation: vt-fade-out var(--motion-fast) var(--ease-exit) both; }
::view-transition-new(welcome-hero) { animation: none; }
```
- Resultado:
  - a faixa verde da ilustração encolhe até o cabeçalho verde da Início. No celular as duas têm a mesma largura, então a imagem nova não estica;
  - a marca fica parada e as abas sobem com o `vt-bar-in` existente;
  - no tablet e no computador, onde o cabeçalho é um cartão de outra proporção, vale só o fade de aba.
- Sem suporte, com movimento reduzido ou no lite, o `AppLink` já desliga a transição.

**Ligação com o passeio**
- `start("comecar")` e `signIn()` chamam `markTourPending()` antes de navegar, só sem `?rever=1`.
- Não chamam: Pular, Esc, o efeito que conclui sozinho a apresentação de quem já tem conta e o limite de 2 exibições.
- No último slide, sem `?rever=1` e fora do lite (que já cobre a economia de dados): `requestIdleCallback(() => import("@/features/tour/HomeTour"))`, uma vez, com `catch` silencioso. Quem pular baixa cerca de 7 KB à toa; é aceitável.

### Início: animações (`pages/home/`)

**Quando toca**
- A `HomePage` decide na primeira renderização, sem efeito colateral:
```ts
let homeEntered = false; // vale para esta carga da página
const [intro] = useState(() => !homeEntered);
useEffect(() => { homeEntered = true; }, []);
// <div className={classes.page} data-home-intro={intro || undefined}>
```
- Toca na primeira montagem da Início em cada carga da página: ao abrir o app, ao recarregar e ao chegar da apresentação. Voltar pela aba "Início" não repete; ali já existe o fade de aba.
- Seletores: `:global(html:not([data-motion="lite"]) [data-home-intro]) .parte`, dentro de `@media (prefers-reduced-motion: no-preference)`, com os keyframes no próprio módulo.

**Coreografia (só `transform` e `opacity`; tudo visível desde o primeiro quadro)**

| Parte | Movimento | Tempo e curva | Atraso | Observação |
|---|---|---|---|---|
| H1, data, chip da equipe, cartão-postal, curvas de nível | nenhum | — | — | LCP e §7 |
| `li` dos 4 blocos (ServiceGrid) | `home-settle` `from{transform:translateY(12px)}` | `--motion-sheet-in`, `--ease-spring`, `backwards` | `calc(var(--i) * var(--stagger))`, de 0 a 120 ms | anima o `li`, não o `.tile` (`:active` e hover intactos); `--i` inline |
| Quadrado do ícone (tons mata e ipê) | `home-wake` `from{transform:scale(.88)}` | idem | `calc(80ms + var(--i) * var(--stagger))` | **o bloco das funerárias (ardósia) não** |
| Cartão "De plantão agora" | `duty-settle` `from{transform:translateY(16px)}` | `--motion-sheet-in`, `--ease-spring`, `backwards` | 160 ms | só desloca; nada pisca |
| Selo ipê da farmácia (`data-badge="live"`) | `badge-pop` `from{transform:scale(0)}` | `--motion-sheet-in`, `--ease-spring` | ao montar | depois, o pulso que já existe |
| Selo das funerárias (`data-badge="still"`) | `badge-fade` `from{opacity:0}` | `--motion-base` | ao montar | sem pop |
| "1 de plantão agora" (`.live`) | `line-in` `from{opacity:0}` | `--motion-fast`, `--ease-enter` | ao substituir o esqueleto | vale em toda visita; o esqueleto já reserva a altura |
| Linhas do plantão | `.enter-rise` (já existe) | — | — | a `key` passa a ser o id da unidade: a troca da farmácia de plantão sobe de novo; a mesma unidade não repete |
| Chip "Novo" (LatestNotice) | `notice-bump` `50%{transform:scale(1.08)}` | `--motion-base`, `--ease-spring` | 400 ms | uma vez |
| Convite de "Seus pedidos" (sem conta, incompleto, nada em andamento) | `.enter-rise` | — | — | ao substituir o esqueleto |
| "Como usar o app" | `.enter-rise` na `section`, `--i: 1` | — | — | o `data-press` fica no botão interno |

- **Toque nos blocos** (toda visita, também no lite): `.icon{transition:transform var(--motion-press) var(--ease-standard)}` e `.tile:not([data-tone="slate"]):active .icon{transform:scale(.94)}`. Com movimento reduzido, `transform:none`. O bloco das funerárias fica só com o `data-press` atual.
- Sem anel nem tremor no "Ligar", sem sino tocando, sem pétalas.

**Correção do lite (problema atual):** `html[data-motion="lite"] .live-dot::after{animation:none!important}` entra na lista do lite em `motion.css`. O ponto fica parado; "De plantão" continua no texto.

**Linha do tempo (360×640, primeira abertura, movimento liberado)**
- 0 ms: tudo pintado com opacidade 1.
- 0 a 460 ms: os blocos assentam. 80 a 540 ms: os ícones despertam. 160 a 500 ms: o cartão do plantão assenta.
- Vindo da apresentação: a passagem `welcome-hero` corre ao mesmo tempo, de 0 a 480 ms.
- Quando os dados chegam: esqueleto → conteúdo (160 ms), as linhas sobem (240 ms, 40 ms de escalonamento) e o selo da farmácia aparece (340 ms).
- A partir de 1,2 s, num momento calmo: a oferta do passeio (só no primeiro acesso).

**"Como usar o app" (`pages/home/HomeHelp.tsx`, novo; aparece também sem conta)**
- Estrutura:
  - `<section aria-labelledby="home-ajuda">` com `<h2 id="home-ajuda" class="visually-hidden">Ajuda</h2>`;
  - um `<button type="button" aria-haspopup="dialog" data-tour="ajuda" data-press>` no visual da linha do LatestNotice, com altura mínima de 64 px;
  - conteúdo: quadrado mata-light com `IconHelpCircle`, "Como usar o app" (17/700), "Passeio guiado pela tela inicial" (15 px, ink-soft) e o chevron.
- Toque: `requestTour({ source: "ajuda", origin: botão, onFail })`. O passeio começa direto no passo 1, sem oferta.
- Se demorar mais de 400 ms, o título vira "Abrindo o passeio…" com `aria-busy`. Se falhar, aparece abaixo, com `role="alert"`: "Não foi possível abrir o passeio agora. Confira a internet e tente de novo."
- Posição, já na primeira renderização:
  - no celular, depois do LatestNotice e **antes** do ContextInvite, que pode surgir tarde com o `beforeinstallprompt`;
  - em duas colunas (≥ 62em), no fim da coluna da esquerda, abaixo de "Seus pedidos".
  Assim nenhum convite tardio a empurra (em 1024×768 a Início inteira cabe na tela, e o deslocamento seria visível).
- Se o orçamento apertar: sem o `IconHelpCircle` (fica só o chevron, que já é compartilhado), −0,2 KB.

**Proteções de LCP e CLS**
- Nenhuma animação no H1, na data ou no cartão-postal; nada começa invisível; `data-home-intro` sai na primeira renderização.
- Só `transform` e `opacity`; esqueletos com a altura final (72, 96 e 64 px); "Como usar o app" antes do convite tardio.
- Trava de rolagem sem pulo no computador:
  - `acquireScrollLock` grava `data-scroll-gutter` no `<html>` quando há barra de rolagem clássica (`innerWidth > clientWidth`);
  - `global.css` aplica `html.sheet-open[data-scroll-gutter]{scrollbar-gutter:stable}`.
  - Vale para a oferta, para o passeio e para as folhas que já existem (hoje a Novidade desloca a página sem toque). Nos celulares, com barra sobreposta, nada muda.

### Passeio pela tela inicial: quando aparece

**Nome:** "Passeio pela tela inicial". São cinco passos sobre a Início (`/`), oferecidos uma vez a quem acabou de conhecer o app e repetíveis por qualquer pessoa.

**Persistência** (`features/tour/tourState.ts`, no pacote inicial). Usa o `BROWSER_ENV` do `onboardingState`, ou seja, `safeStorage` no local e a sessão com cópia em memória.

| Chave | Onde | Valores | Quem grava |
|---|---|---|---|
| `rolim.passeio` | local | ausente · `pendente` · `v1` | `pendente`: a apresentação. `v1`: passeio iniciado, "Agora não", 2ª oferta, usuário antigo, `?intro=0` |
| `rolim.passeio.vezes` | local | `1` | a oferta abriu (a chave sai quando vira `v1`) |
| `rolim.passeio.oferecido` | sessão | `1` | a oferta abriu nesta sessão |
| `rolim.passeio.pedido` | sessão | `1` (uso único) | o loader de `/?passeio=1` |

- **Ausente quer dizer nunca automático.** Quem já usa o app hoje fica de fora sem migração.
- `recordSessionEntry` grava `rolim.passeio = "v1"` junto com a marcação de usuário antigo. A decisão `"disable"` de `?intro=0` também grava (Lighthouse e e2e limpos).
- `markTourPending()` nunca sobrescreve `v1`.

**Decisão pura**
```ts
export function decideTourOffer(input: {
  storageWorks: boolean; state: string | null; entry: string | null;
  offeredThisSession: boolean; whatsNewPending: boolean;
  firstSeen: string | null; today: string;
}): boolean;
// true só se: storageWorks && state === "pendente" && entry === "/" && !offeredThisSession
//            && !whatsNewPending && firstSeen a no máximo 14 dias de today
```
- **Fica pendente** só por "Começar a usar" e "Entrar ou criar conta", sem `?rever=1`. Quem toca em Pular (ou aperta Esc) não recebe oferta; a linha "Como usar o app" fica à vista no fim da Início.
- **Nunca oferece:**
  - para usuário antigo;
  - em sessão que começou por link direto, por atalho do manifest diferente de `/` ("Farmácia de plantão", "Funerária de plantão"), por push ou por e-mail (`entry !== "/"`, inclusive nas sessões futuras);
  - com `?intro=0` ou `?rever=1`;
  - quando a apresentação é concluída sozinha para quem já tem conta, ou para no limite de 2 exibições;
  - com o armazenamento quebrado;
  - junto com a Novidade (que é só para usuário antigo, então a exclusão já vem da construção; a decisão confere de novo);
  - fora de `/`.
- O `CitizenLayout` decide uma vez, ao montar (`useState(shouldOfferTour)`, como a Novidade), e só monta o passeio com `pathname === "/"` e `chrome === "home"`.
- O caminho "Entrar ou criar conta" → `/entrar` → (cadastro) → `/` mantém a entrada `/` da sessão: a oferta aparece na Início, já na variante com conta. O `CitizenLayout` monta em `/entrar`, depois de `markTourPending()`.

**Momento da oferta.** É verificado a cada 600 ms, dentro do pedaço do passeio, e exige tudo isto:
- pelo menos 1,2 s desde que o passeio montou (o que já é depois da primeira pintura da Início; é o mesmo prazo da Novidade);
- nenhum `dialog[open]` nem `[role=dialog][aria-modal=true]` aberto (função `anotherDialogOpen` em `components/sheet/openDialogs.ts`, agora compartilhada com a Novidade) e sem `html.sheet-open`;
- `document.visibilityState === "visible"` e nenhuma View Transition em andamento;
- nenhum `pointerdown`, `keydown`, `wheel` ou rolagem nos últimos 600 ms, para a folha nunca subir sob o dedo;
- `useAuth().loading === false`, ou 6 s de espera (nesse caso o passo 5 usa a variante "carregando" e se atualiza sozinho);
- `shouldOfferTour()` ainda verdadeiro (outra aba pode ter concluído).

**Folha da oferta** (`TourOffer.tsx`, sobre o `BottomSheet`)
- Título: "Quer conhecer a tela inicial?"
- Apoio: "Um passeio mostra onde fica cada coisa, um passo de cada vez. São 5 passos curtos."
- Nota (15 px, ink-soft): "Se preferir, veja depois em “Como usar o app”, no fim da tela inicial."
- Botões: [Mostrar o passeio] (56 px, mata-8, `data-autofocus`) e [Agora não] (52 px, secundário).
- Sem ilustração animada.

O que cada resposta faz:
- Ao abrir: `markTourOffered()` grava `oferecido` e soma `vezes`; na 2ª vez, `rolim.passeio` vira `"v1"`.
- "Mostrar o passeio": `markTourDone()`; o passeio começa no `onAfterClose`, depois que a folha desce.
- "Agora não": `markTourDone()`.
- Fechar sem escolher (toque no fundo, arrastar, Esc, Voltar do Android): conta só a vez. A oferta volta uma única vez, numa sessão futura que comece por `/`.

**Repetir o passeio**
1. **Início › "Como usar o app"**, para todos (sem conta não existe Perfil). Começa no passo 1, sem oferta.
2. **Perfil › Ajuda**, nova primeira linha: `IconHandFinger`, "Passeio pela tela inicial", descrição "Mostra onde fica cada coisa, passo a passo", `to="/?passeio=1"`, `nav="tab"`.
   - O loader da rota index, depois da regra da apresentação, chama `requestTourFromLink()` e faz `redirect` sem o parâmetro, com `withoutParams(url, ["intro", "passeio"])` (substitui `withoutIntroParam`).
   - Na Início, o `CitizenLayout` consome o pedido. O passeio começa quando a transição de aba termina, mais 2 quadros (depois do `useFocusOnNavigate`).
3. "Ver a apresentação de novo" continua igual; `?rever=1` nunca dispara o passeio.

Qualquer passeio grava `rolim.passeio = "v1"` ao começar. Depois de iniciado, ele nunca mais é automático, termine como terminar.

### Passeio: passos e textos

São cinco passos, sempre "Passo N de 5".

**Regras do texto**
- Português simples, com "toque" (nunca "clique") e "você".
- Limites: título ≤ 36 caracteres, texto ≤ 115, texto curto ≤ 60, nota ≤ 80. Conferidos: maior título 29, maior texto 114, maior texto curto 52, maior nota 73.
- Cada texto diz **onde** a coisa fica, para quem não vê o destaque.

**Variantes**
- `nav`: `barra` (TabBar) ou `menu` (NavRail).
- `conta`: `anon`, `user` ou `carregando`, a partir de `useAuth()`.
- `plantao`: valor de `data-tour-state`.

**1. Serviços** (`servicos`; anel parado)
- Título: "Os serviços ficam aqui"
- Texto: "Cada quadro abre um serviço. “Problema na rua” serve para avisar de buraco, poste apagado ou lixo."
- Curto: "Cada quadro abre um serviço da prefeitura."

**2. Plantão** (`plantao`; anel parado, **nunca pulsa**)
- Título: "De plantão agora" (o mesmo do cartão).
- `ok`:
  - texto: "Aqui aparece quem está de plantão agora. O botão “Ligar” chama direto, sem precisar de conta."
  - curto: "O botão “Ligar” chama direto, sem precisar de conta."
- `sem-ligar`:
  - texto: "Aqui aparece quem está de plantão agora. Toque no nome para ver a lista completa."
  - curto: "Toque no nome para ver a lista completa."
- `carregando`:
  - texto: "Aqui aparece quem está de plantão agora, com o botão “Ligar” para chamar direto."
  - curto: "Aqui aparece quem atende agora."
- `erro`:
  - texto: "Aqui aparece quem está de plantão agora. Se não carregar, toque em “Tentar de novo”."
  - curto: "Se não carregar, toque em “Tentar de novo”."

**3. Solicitar** (`solicitar`; o anel pulsa 2 vezes)
- Título: "Para pedir algo à prefeitura"
- `barra`:
  - texto: "Toque em “Solicitar”, o botão verde no meio da barra de baixo. Ele aparece em todas as telas."
  - curto: "Toque em “Solicitar”, na barra de baixo."
- `menu`:
  - texto: "Toque em “Solicitar”, no alto do menu verde à esquerda. Ele aparece em todas as telas."
  - curto: "Toque em “Solicitar”, no alto do menu."
- Sem conta, a segunda frase dos dois textos vira "Para enviar, é preciso entrar na conta."

**4. Abas** (`abas`; anel parado)
- Título `barra`: "Esta barra leva você pelo app". Título `menu`: "Este menu leva você pelo app".
- Texto: "“Início” sempre volta para esta tela. “Pedidos”, “Plantão” e “Avisos” abrem as outras partes."
- Curto: "“Início” sempre volta para esta tela."

**5. Conta** (`conta`; o anel pulsa 2 vezes só em `anon`; botão principal [Concluir])
- `anon`, título "Entre quando quiser":
  - texto `barra`: "Toque em “Entrar”, no alto da tela, para criar sua conta ou entrar nela. Plantão e avisos funcionam sem conta.";
  - texto `menu`: "Toque em “Entrar”, no pé do menu verde, para criar sua conta ou entrar nela. Plantão e avisos funcionam sem conta.";
  - curtos: "Toque em “Entrar”, no alto da tela." e "Toque em “Entrar”, no pé do menu verde.".
- `user`, título "Seu perfil fica aqui":
  - texto `barra`: "Toque no círculo com suas iniciais, no alto da tela, para aumentar as letras, ligar os avisos e achar a Ajuda.";
  - texto `menu`: "Toque em “Perfil”, no pé do menu verde, para aumentar as letras, ligar os avisos e achar a Ajuda.";
  - curtos: "É o círculo com suas iniciais, no alto da tela." e "Toque em “Perfil”, no pé do menu verde.".
- `carregando`, título "Sua conta fica aqui":
  - texto `barra`: "Aqui, no alto da tela, você entra na conta ou abre o seu perfil.";
  - texto `menu`: "No pé do menu verde, você entra na conta ou abre o seu perfil.";
  - curtos: "Fica no alto da tela." e "Fica no pé do menu verde.".
- Nota (15 px, ink-soft):
  - `anon` e `carregando`: "Para ver de novo, toque em “Como usar o app”, no fim da Início."
  - `user`: "Para ver de novo: “Como usar o app”, no fim da Início, ou Perfil › Ajuda."
- Não há cartão de encerramento.

**Com e sem conta**
- **Sem conta** (o primeiro acesso típico): a AppBar mostra a pílula "Entrar" e "Seus pedidos" mostra [Entrar] [Criar conta]. O passo 3 avisa que enviar pede conta, o passo 5 aponta "Entrar" e a nota cita só "Como usar o app".
- **Com conta** (chegou por "Entrar ou criar conta"): aparece o avatar. O passo 5 aponta o perfil e cita o tamanho das letras, os avisos e a Ajuda; a nota cita também Perfil › Ajuda.
- **Carregando** (4G lento): variantes "carregando", trocadas ao vivo.
- **Equipe**: igual a com conta; o chip da equipe não é alvo.
- As variantes são relidas a cada medida (dados ou login que chegam no meio do passeio). A contagem nunca muda.

**Controles do cartão**
- Linha de cima: "Passo N de 5" (15/700, ink-soft, `aria-hidden`) e, à direita, [Sair do passeio]: botão de texto sublinhado, 48 px, **primeiro no Tab**.
- Depois:
  - o `h2` (`tabIndex=-1`), com "Passo N de 5. " oculto no começo;
  - o texto;
  - a nota, no passo 5;
  - as cópias de "Ligar", só no modo centro do passo 2.
- Linha de baixo:
  - [Voltar], a partir do passo 2: 56 px, fundo translúcido de tinta, como na apresentação;
  - [Próximo →] ou [Concluir]: 56 px, mata-8, `flex: 1`.

### Passeio: interação e emergência

**Modelo: o escuro segura o toque, o destaque funciona**
- O véu cobre a tela e absorve os toques. O furo deixa o toque passar para a página, porque o `clip-path` também recorta a área de clique.
- A "parte viva" de cada passo é o grupo destacado (o candidato escolhido, abaixo) mais os "Ligar" acesos. Todo o resto da página fica `inert`:
  - `tourDom.makeLive(vivos, camada)` sobe de cada elemento vivo até o `<body>` e marca como `inert` cada irmão fora desse caminho;
  - pula a própria camada e o que já era inerte; guarda a lista e desfaz a cada passo e na saída;
  - antes, descarta os vivos que estão dentro de outro vivo;
  - no modo centro, a lista é vazia e o `#root` inteiro fica inerte.
- O resultado vale igual para todos: o que está claro funciona ao toque, ao teclado e ao leitor de tela; o que está escuro não existe para nenhum deles. Por isso o cartão é `role="dialog" aria-modal="false"`.
- Navegador sem `inert`: o véu continua segurando o toque e o teclado alcança a página (degradação aceitável).

**"Ligar" sempre aceso**
- Em todos os passos, cada `a[href^="tel:"]` da Início que esteja inteiro na faixa visível (entre a AppBar e a TabBar) e fora do cartão ganha um furo próprio no véu e fica vivo. São até 2 vagas (farmácia e funerária). Um toque liga na hora.
- Esses furos não têm anel nem pulso; o tom das funerárias continua calmo.
- No passo 2 a regra é dura: o cartão **nunca** cobre um "Ligar" do cartão de plantão. Se nenhum arranjo deixa todos à vista junto com o cartão (ex.: 320×568 com texto em 125%), o cartão vai para o centro e traz cópias:
  - um `<a>` de 56 px por link, com o mesmo `href` e com texto igual ao `aria-label` ("Ligar para Farmácia Exemplo Centro");
  - a farmácia em botão cheio mata-8 e a funerária em botão contornado ardósia.

**Toque no destaque ou num "Ligar"**
- Um ouvinte de `click` no `document`, na fase de captura, verifica se o alvo do clique é um controle (`a, button, input, select, textarea, summary, label, [role=button]`) da parte viva ou uma cópia de "Ligar". Se for:
  - o passeio sai **antes** da ação: desfaz o `inert`, solta a rolagem e destrói o CloseWatcher, sem `preventDefault`;
  - a ação segue: o bloco abre o serviço, "Ligar" chama, "Entrar" abre o login;
  - o foco fica com o controle tocado. Resultado: `acao`.
- Exceção, Solicitar (passo 3): se em até 300 ms surgir um `dialog[open]` na mesma rota, o passeio fica escondido (`hidden`) e espera o `close` da folha.
  - Se a pessoa cancelar e continuar em `/`, ele volta no passo 3, com o foco no título.
  - Se a folha levar a outra tela, o passeio termina com a troca de rota.
- Toque no escuro: nada acontece na página. O cartão faz um aceno para mostrar onde estão os botões: `tour-nudge` `50%{transform:scale(1.03)}`, `--motion-base`, `--ease-spring`. Não há aceno com movimento reduzido nem no lite.
- Toque na parte viva fora de um controle: nada.
- A página não rola pelo dedo durante o passeio (trava de rolagem); só o passeio rola.

**Sair, voltar e teclado**
- Saídas:
  - [Sair do passeio], sempre visível e primeiro no Tab;
  - Esc;
  - Voltar do Android, por um `CloseWatcher` criado ao começar (sem `pushState`, como em §3);
  - [Concluir], no passo 5;
  - toque num controle aceso;
  - troca de rota (o `CitizenLayout` só monta o passeio em `/`).
- Sem `CloseWatcher` (WebKit, Firefox no Android), o Esc funciona pelo `keydown`, mas o Voltar do Android segue o histórico e o passeio some com a tela. É um risco aceito e registrado.
- As setas ← e → valem Voltar e Próximo quando o foco está no cartão (ignora `event.repeat`).
- Toque duplo: Próximo ou Voltar a menos de 400 ms do anterior, ou durante a troca de passo, é ignorado.
- Ordem do Tab:
  - começa no título;
  - segue por Sair do passeio → Voltar → Próximo;
  - depois passa pelos controles vivos da página;
  - do último, volta ao primeiro (um laço suave, só sobre o que está vivo).
- Nada avança sozinho, nada some com o tempo e nenhuma dica depende de passar o mouse.

**Foco e rolagem na saída**
- Sair, Esc e Voltar deixam a rolagem onde está. O foco vai para:
  - passo 1: o primeiro bloco ("Problema na rua");
  - passo 2: o título "De plantão agora" (`tabIndex=-1`), com o "Ligar" a poucos Tabs;
  - passo 3: o botão Solicitar;
  - passo 4: a aba atual ("Início");
  - passo 5: Entrar ou o avatar;
  - alvo ausente: o `main h1`.
- Concluir:
  - vindo da oferta: rola ao topo (suave se o movimento estiver liberado) e foca o `main h1` com `preventScroll`;
  - vindo de "Como usar o app": volta à rolagem de antes e foca a linha (`[data-tour="ajuda"]`);
  - vindo do Perfil: topo e `main h1`.
- Saída por ação no destaque: o foco e a rolagem ficam por conta da ação.

### Passeio: aparência, posição e movimento

**Camada** (`TourLayer.tsx` e `HomeTour.module.css`)
- Portal no `<body>`: `<div data-tour-layer>` com `position:fixed; inset:0; z-index:400; pointer-events:none`. Fica acima do `#root` (contexto z 1, que contém AppBar, NavRail e TabBar) e abaixo dos avisos flutuantes (1000) e das folhas (`<dialog>` na camada superior).
- **Véu** (`.scrim`, `aria-hidden`, `pointer-events:auto`, `touch-action:none`):
  - `background: var(--tour-scrim)`: `rgb(8 20 14 / .62)` no claro e `rgb(0 0 0 / .68)` no escuro;
  - `clip-path: path(evenodd, "M0 0H{vw}V{vh}H0Z" + 3 retângulos arredondados)`: o furo principal e as 2 vagas de "Ligar";
  - a lista de comandos é **sempre igual** (`M H A V A H A V A Z` por retângulo; vaga sem uso = tamanho zero no centro do próprio link), para a transição interpolar. Testado no Chromium e no WebKit;
  - sem `path()` no `clip-path` (`CSS.supports` falso): sem véu; anel, cartão e `inert` continuam;
  - rejeitados: o `box-shadow` de 200vmax (camada gigante) e um SVG redesenhado a cada rolagem.
- **Furo:** o grupo destacado, inflado 8 px e preso 4 px dentro da tela. Raio `clamp(raio do alvo + 8, 12, 28)`; pílulas e círculos usam `min(h/2, 28)`.
- **Anel** (`.ring`, `aria-hidden`, `pointer-events:none`):
  - `position:fixed; top:0; left:0` e `transform: translate(x, y)`; largura e altura do furo, trocadas só com o anel invisível; raio do furo;
  - `border: 3px solid var(--mantine-color-ipe-4)` e `box-shadow: 0 0 0 6px rgb(255 187 54 / .28)`;
  - pulso (Solicitar e Entrar sem conta): `::after` com o mesmo contorno, `tour-pulse` `from{opacity:.6;transform:scale(1)} to{opacity:0;transform:scale(1.15)}`, 1200 ms, `--ease-standard`, 2 vezes, atraso `--motion-base`.
- **Cartão** (`TourCard.tsx`):
  - `var(--app-surface)`, raio 28, padding 14/16/16, sombra `0 -12px 40px -12px rgb(8 20 14 / .45)`;
  - título em Fraunces 600, `1.5rem/1.2`; texto `1.1875rem/1.45`;
  - `data-typo="compacto"`: `1.3125rem` e `1.0625rem`; `data-typo="curto"`: compacto, com o texto curto;
  - tudo em rem, para seguir `html[data-text-size]`;
  - `max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))`: o texto rola por dentro e os botões ficam sempre à vista;
  - posição **só por `transform`**, a partir de `top:0; left:0`, para que nenhuma mudança de altura gere deslocamento de layout.
- **Cartão no celular** (< 48em, "encaixado"): largura `min(32rem, 100vw - 24px)`, centrado. Embaixo, `y = vh - 12 - inset inferior - altura`; em cima, `y = 12 + inset superior`.
- **Cartão a partir de 48em** ("ancorado"): largura `min(26rem, 100vw - var(--app-rail-w) - 32px)`. Tem uma seta de 18 px (quadrado girado) no lado voltado ao alvo, em `clamp(centro do alvo - borda do cartão, 28, tamanho - 28)`.
- `@media (forced-colors: active)`: o véu vira `Canvas`; o anel usa `border-color: Highlight`, sem sombra; o cartão ganha `border: 2px solid CanvasText`.

**Alvos e candidatos** (`tourDom.ts`)
- `findTarget(id)` devolve o primeiro `[data-tour=id]` com `getClientRects().length > 0`, área maior que zero e `visibility` diferente de `hidden`. Assim escolhe sozinho entre TabBar e NavRail.
- Os seletores são relidos a cada medida: os esqueletos são trocados, e a Início passa de uma para duas colunas em 62em.
- Grupos de cada alvo, do maior para o menor (o retângulo do grupo é a união):
  1. `servicos`: `[ul]` → `[li:nth-child(1), li:nth-child(2)]` → `[li:nth-child(1)]`.
  2. `plantao`: `[section]` → `[data-tour-part="linhas"]` (todas as linhas; nunca menos que todos os "Ligar").
  3. `solicitar`: o botão ∪ `[data-tour-part="fab"]`. O círculo sobe 26 px acima da caixa do botão: em 360×640, o botão começa no y 569 e o círculo no y 554.
  4. `abas`: o `nav` da TabBar ∪ `fab`; no trilho, `ul.items`.
  5. `conta`: o próprio elemento.
- Os passos 3 a 5 ficam em barras fixas e não rolam.
- Alvo ausente: modo centro naquele passo, sem mudar a contagem. Em desenvolvimento, `console.warn("[passeio] alvo ausente", id)`.

**Escolha da posição** (`tourGeometry.ts`, puro)
- Medidas:
  - `vw = clientWidth` e `vh = visualViewport.height ?? innerHeight`;
  - o fundo da `.app-bar-vt` (que cresce com a faixa "Sem internet");
  - o topo da `.tab-bar-vt` visível (ou `vh`) e a borda direita do trilho visível;
  - os insets da safe-area;
  - a altura do cartão nos três tipos, medida no `useLayoutEffect`, trocando `data-typo` antes de pintar (3 leituras).
- **Celular, alvo na página:**
  - escada `normal → compacto → curto`. Em cada degrau vale o primeiro candidato com `altura + 16 ≤ faixa livre`, sendo a faixa livre `[fundo da AppBar + 12, vh - 12 - altura do cartão - 16]`;
  - rolagem = `topo do furo - topo da faixa`, presa a `[-scrollY, scrollHeight - vh - scrollY]`;
  - se a trava do fim da página deixa o alvo sob o cartão, o cartão vai para cima e a faixa vira `[12 + inset + altura + 16, topo da TabBar - 12]`.
- **Celular, alvo em barra:**
  - alvo na TabBar: cartão em cima; cabe se `12 + inset + altura + 16 ≤ topo do furo`, descendo a escada;
  - alvo na AppBar: cartão embaixo.
- **Quando nada coube:**
  - passo 2: modo centro, com as cópias de "Ligar";
  - outros passos: **espiada**. Usa o menor candidato e o texto curto, rola o alvo para o topo da faixa e deixa o cartão por cima do resto, desde que 56 px do alvo fiquem à vista. Um controle vivo inteiramente coberto vira inerte;
  - se nem a espiada couber: modo centro, com o véu sem furo e o cartão centrado (o texto diz onde a coisa fica).
- **A partir de 48em:**
  - alvo no trilho: cartão à direita, com `x = direita do trilho + 16` e `y = clamp(centro do alvo - altura/2, 12 + inset, vh - 12 - altura)`;
  - alvo na página: para cada tipo de letra e cada candidato, tenta abaixo, acima (sob a AppBar) e ao lado (esquerda, depois direita, sem passar do trilho). Se nada couber, rola o alvo para `fundo da AppBar + 12` e tenta abaixo; depois, encaixado embaixo; por fim, o centro.
- Preferência branda em todos os passos: entre posições válidas, a que não cobre um "Ligar" visível.

**Medidas de referência** (servidor de desenvolvimento, sem login; alturas do cartão em px, nos tipos normal / compacto / curto)

| Tela | Faixa útil | Plantão: seção / linhas | Cartão do passo 2 | Passo 2 fica | Passo 1 fica |
|---|---|---|---|---|---|
| 360×640, normal | 56–568 | 294 / 214 | 301 / 261 / 236 | linhas, tipo normal, cartão embaixo (livre 243) | primeira fileira, tipo normal |
| 375×667, grande | 56–595 | 367 / 282 | 318 / 274 / 246 | linhas, texto curto (livre 325) | primeira fileira, tipo normal |
| 320×568, muito grande | 56–496 | 463 / 372 | 399 / 346 / 315 | centro com cópias (cartão de 471) | 1º bloco, texto curto (livre 156) |
| 768×1024, normal | trilho 0–88 | 220 / 158 | 246 | acima (x 220, y 260) | abaixo |
| 1024×768, normal (duas colunas) | trilho 0–88 | 276 / 214 | 246 | ao lado, à esquerda (x 203, y 303); os "Ligar" (x 910) ficam livres | primeira fileira, abaixo |

**Rolagem e atualização**
- A rolagem fica travada (`acquireScrollLock`) durante todo o passeio; `window.scrollTo` continua funcionando. Rolagem suave só com `motionAllowed()`; senão, instantânea.
- Durante a rolagem suave, o furo já vai para o retângulo previsto (o atual, deslocado pela rolagem) e acompanha a página. No `scrollend`, mede de novo e corrige sem transição. Sem `scrollend`, espera o `scrollY` ficar 3 quadros parado, por até 800 ms.
- A medida é agrupada num `requestAnimationFrame` e disparada por:
  - troca de passo;
  - `resize`, `resize` do `visualViewport` e `orientationchange`;
  - `ResizeObserver` em `documentElement`, no cartão, na raiz do alvo e na `.app-bar-vt`.
- Uma correção que não vem de troca de passo liga `data-instant` na camada por um quadro (sem transição).
- Nenhum ouvinte de rolagem parado e nenhum laço de `requestAnimationFrame`.

**Movimento.** As durações são lidas dos tokens com `getComputedStyle` e viram zero quando `!motionAllowed()`.

| Momento | O que acontece |
|---|---|
| Abrir | o véu vai de `opacity 0` a 1 (`--motion-sheet-in`, `--ease-enter`), já com o furo do passo 1; o cartão entra de `translateY(24px)` com opacidade (`--motion-sheet-in`, `--ease-enter`); o anel aparece depois (`--motion-base`, atraso `--motion-sheet-in`) |
| Trocar de passo, t = 0 | o conteúdo do cartão e o anel somem (`--motion-fast`, `--ease-exit`) |
| t = 160 ms | troca o texto, põe o foco no `h2`, refaz o `inert` e começa a rolagem; o furo desliza (`clip-path`, `--motion-emph`, `--ease-standard`); o cartão vai, invisível, para o novo lugar e entra de `translateY(8px)` (`--motion-base`, `--ease-enter`) |
| depois de `max(--motion-emph, scrollend)` | o anel entra (opacidade de 0 a 1 e `scale(1.04→1)`, `--motion-base`, `--ease-enter`) e pulsa 2 vezes onde houver pulso |
| Sair | véu, anel e cartão vão a `opacity 0` (`--motion-sheet-out`, `--ease-exit`); depois desmonta e restaura tudo |

- Uma troca leva de 0,9 a 1,1 s: devagar e clara.
- Sem FLIP e sem Web Animations API. Se alguma for usada no futuro, passa por `motionAllowed()`, porque a regra global de CSS não alcança a WAAPI.
- **Movimento reduzido:** tudo instantâneo. Sem transições, sem aceno, sem escala nem pulso do anel, rolagem instantânea e tempos zero.
- **Lite:** o furo pula sem deslizar, o anel não muda de escala nem pulsa, não há aceno e a rolagem é instantânea. O cartão mantém a entrada e a saída por opacidade, como a folha.

### Acessibilidade (lista de conferência)
- Cartão: `<section role="dialog" aria-modal="false" aria-labelledby={h2} aria-describedby={texto visível}>`. Véu, anel e seta são `aria-hidden`.
- A cada passo o foco vai para o `h2` (`preventScroll`), **sem aria-live**, como na apresentação.
- "Passo N de 5. " oculto dentro do `h2`; o contador visível é `aria-hidden`.
- Cor nunca é o único sinal: há a contagem, o contorno e as palavras de lugar.
- Alvos de toque:
  - Sair: 48 px;
  - Voltar, Próximo, Concluir e as cópias de "Ligar": 56 px;
  - oferta: 56 e 52 px;
  - "Como usar o app": ≥ 64 px.
- Funciona com texto em 125% (escada normal → compacto → curto), em 320 px, no tablet e no computador (trilho), nos temas claro e escuro e em cores forçadas.
- Contraste:
  - tinta do cartão sobre a superfície ≥ 12:1;
  - nota em ink-soft, cerca de 6,6:1;
  - anel ipê-4 sobre o véu ≥ 3:1.
- O foco nunca fica escondido: um controle vivo inteiramente sob o cartão vira inerte.
- Oferta: `BottomSheet` (modal nativo com título e apoio, foco inicial em "Mostrar o passeio", foco devolvido pelo navegador).
- As ilustrações continuam `aria-hidden` e `focusable="false"`; o movimento não carrega informação que o texto não diga.

### Desempenho e orçamento

Linha de base (dist atual, medida com `check-bundle.mjs`):
- JS inicial: 295,0 KB gzip (161,0 antes da primeira tela e 134,0 do Firebase);
- apresentação: 5,5 KB de JS e 2,3 KB de CSS;
- CSS do index: 32,5 KB.

| Parte | Hoje | Depois (estimado) | Teto (verificado no build) |
|---|---|---|---|
| JS inicial | 295,0 KB | ≤ 296,6 KB | 300 KB |
| CSS inicial | 32,5 KB | + 0,8 KB | 50 KB |
| Apresentação (`OnboardingPage.tsx`) | 5,5 JS / 2,3 CSS | cerca de 6,3 JS / 3,5 CSS | 9 KB JS (§9 F5) / 4 KB CSS |
| Passeio (`features/tour/HomeTour.tsx`) | — | cerca de 6,5 a 7 JS / 2 CSS | 8 KB JS / 3 KB CSS |

Composição do aumento no JS inicial:
- `tourState`: 0,5 KB;
- carregador no `CitizenLayout`: 0,25 KB;
- "Como usar o app", com o ícone: 0,45 KB;
- loader de `?passeio=1`: 0,1 KB;
- atributos e `data-home-intro`: 0,15 KB;
- mudanças no `onboardingState`: 0,15 KB.

**Dependências do passeio**
- Não usa componentes do Mantine (os botões são próprios) nem o Firebase.
- `useAuth` vem de `AuthContext.ts`, que só importa tipos do Firebase.
- `BottomSheet`, `AppLink` e `scrollLock` já estão no pacote inicial.

**Quando o pedaço do passeio baixa**
1. Pré-carga ociosa no último slide, para quem está no primeiro acesso, fora do lite.
2. Na Início, com `requestIdleCallback` (prazo de 2 s) depois da primeira pintura, quando `shouldOfferTour()` for verdadeiro.
3. No toque em "Como usar o app" ou no pedido vindo do Perfil.

O import é manual, com `catch` (o padrão do `DeferredNotifications`, nunca `React.lazy`):
- falha na oferta só limpa a oferta da sessão (sem laço);
- falha num pedido manual mostra o alerta da linha.

Usuários antigos, links diretos e o Lighthouse em `/?intro=0` nunca baixam o pedaço.

**Custo em execução**
- Início: até 9 animações curtas, uma vez por carga; nenhuma no lite.
- Passeio:
  - medidas só por evento;
  - um véu do tamanho da tela, cujo `clip-path` muda por passo;
  - um anel pequeno, que pulsa 2 vezes e para;
  - observadores desligados ao sair.
- Apresentação: transformações de SVG uma vez por slide, desligadas no lite.

**`scripts/check-bundle.mjs`** passa a:
- relatar e limitar os dois pedaços. O JS conta o pedaço mais as importações estáticas que estão fora do pacote inicial e do Firebase; o CSS conta os `css` do manifest;
- falhar se algum módulo de `src/features/tour/`, além de `tourState.ts`, cair no pacote inicial;
- falhar se o fechamento estático do `HomeTour` incluir `firebase`, `@firebase`, `auth/authRuntime` ou `data/*`.

### Ajustes nas seções anteriores
- **§3 Navegação:** o escopo `html[data-nav-scope="welcome"]` se soma ao `duty`. O passeio não é folha, e o mecanismo do Voltar continua único (`cancel`/`CloseWatcher`, sem `pushState`).
- **§4 Início:**
  - novo item 6, "Como usar o app", antes do convite (que passa a ser o item 7);
  - "Cabeçalho e serviços aparecem na hora" continua valendo (opacidade 1 desde o primeiro quadro), agora com o assentamento por `transform` na primeira abertura;
  - as linhas do plantão usam `key` = id da unidade.
- **§6 Perfil › Ajuda:** nova primeira linha, "Passeio pela tela inicial".
- **§7 Movimento:**
  - o lite também para o `.live-dot::after`;
  - entram os movimentos desta seção;
  - a trava de rolagem reserva a calha (`scrollbar-gutter`) só quando há barra clássica;
  - "Fica parado" não muda (inclui o cartão-postal).
- **§8 Apresentação:**
  - "Começar a usar" e "Entrar ou criar conta" deixam o passeio pendente;
  - usuário antigo e `?intro=0` gravam `rolim.passeio = "v1"`;
  - `withoutIntroParam` vira `withoutParams`;
  - o `storageState` do e2e ganha `rolim.passeio = "v1"`.
- **§9 F5:** o teto de 9 KB passa a ser verificado pelo `check-bundle`.

**Avaliado e recusado**
- Paralaxe no pager e pétalas.
- Poste piscando e flash de câmera.
- Sino e aparelho tocando (inclusive no "Ligar").
- Arte animada na oferta e comemorações com vibração.
- Indicador de páginas deslizante, botão virando o círculo de Solicitar e salto do ícone da aba.
- Dicas de primeira visita em Plantão e Pedidos e o cartão-convite "Primeira vez no app?".
- `scrollbar-gutter` global.
- Assentamento do cartão-postal: só com emenda de §7 aprovada pela prefeitura.

### Plano de testes (transversal)
- Esperas determinísticas, por papel, estado e `localStorage`; nenhum `waitForTimeout` nos specs novos. Os pulsos são finitos (2 vezes), o que mantém o `waitForSettled` rápido.
- Projetos do Playwright:
  - `celular`: todos os specs, menos o visual;
  - `movimento-reduzido`: `plantao`, `passeio`, `inicio` e `apresentacao`;
  - `iphone` (WebKit, para `clip-path`, View Transitions e `<dialog>`): `plantao`, `visual`, `atualizacao`, `passeio` e `apresentacao`;
  - `telas`: `visual`.
- Lighthouse:
  - acessibilidade 100 em `/?intro=0` e em `/boas-vindas`;
  - em `/?intro=0`, perfil móvel: LCP < 2,5 s, CLS < 0,1 e TBT < 200 ms.
- Manual, antes de publicar:
  - um Android de 2 GB (lite) e um iPhone com o app instalado;
  - TalkBack e VoiceOver no passeio inteiro;
  - 5 pessoas idosas, observando a oferta, o "Sair do passeio" e o "Ligar" durante o passeio.

### Plano de implementação

**Contratos.** São congelados no primeiro commit da peça 1, em cerca de meio dia; as outras peças programam contra eles desde o início.

1. **Chaves de armazenamento:** as da tabela "Persistência".
2. **`features/onboarding/onboardingState.ts`** passa a exportar, além do que já exporta: `BROWSER_ENV`, `storageWorks(local)`, `todayLocal()`, `TOUR_KEY = "rolim.passeio"` e `withoutParams(url, names)`. `withoutIntroParam` fica como atalho.
3. **`features/tour/tourState.ts`** (pacote inicial; importa só `onboardingState` e `react`):
```ts
export type TourMode = "oferta" | "manual";
export type TourOutcome = "concluido" | "saiu" | "acao" | "recusou" | "dispensou";
export interface TourRequest { source: "ajuda" | "perfil"; origin: HTMLElement | null; onFail?: () => void }
export function decideTourOffer(input: TourOfferInput): boolean;            // pura
export function shouldOfferTour(env?: OnboardingEnv, today?: string): boolean;
export function markTourPending(env?: OnboardingEnv): void;     // OnboardingPage
export function markTourOffered(env?: OnboardingEnv): void;     // TourOffer, ao abrir
export function markTourDone(env?: OnboardingEnv): void;        // começou, ou "Agora não"
export function requestTourFromLink(env?: OnboardingEnv): void;         // loader de /?passeio=1
export function consumeTourLinkRequest(env?: OnboardingEnv): boolean;   // CitizenLayout
export function requestTour(request: TourRequest): void;                // HomeHelp
export function useTourRequest(): TourRequest | null;                   // useSyncExternalStore
export function clearTourRequest(): void;
```
4. **Pedaço `@/features/tour/HomeTour`:** `export default function HomeTour(props: { mode: TourMode; request: TourRequest | null; onDone(outcome: TourOutcome): void })`. Ao desmontar (troca de rota), desfaz tudo sem chamar `onDone`.
5. **DOM.** O passeio só encontra alvos por atributos de dados, nunca por classes com hash:

| Atributo | Onde | Valores |
|---|---|---|
| `data-tour="servicos"` | `<ul>` da grade do ServiceGrid | — |
| `data-tour="plantao"` e `data-tour-state` | `<section>` do DutyNowCard | `ok` · `sem-ligar` · `carregando` · `erro` |
| `data-tour-part="linhas"` | `<ul>` das linhas do DutyNowCard | — |
| `data-tour="solicitar"` | `<button>` Solicitar da TabBar e do NavRail | — |
| `data-tour-part="fab"` | `<span class=fab>` da TabBar | — |
| `data-tour="abas"` | `<nav>` da TabBar; `<ul>` dos itens do NavRail | — |
| `data-tour="conta"` | link ou reserva do AccountButton; link Entrar/Perfil no pé do NavRail | — |
| `data-tour="ajuda"` | `<button>` do HomeHelp | — |
| `data-home-intro` | `.page` da HomePage | presente só na primeira montagem da carga |

6. **Classes e escopos globais:** `home-hero-vt` (`<header>` do HomeHeader), `onb-hero-vt` (`.art` do slide ativo), `app-bar-vt` (`.top` da apresentação) e `html[data-nav-scope="welcome"]`.
7. **e2e:**
   - `e2e/helpers.ts` ganha `firstVisit(page)`, `answerTourOffer(page, "Mostrar o passeio" | "Agora não")`, `waitForTourStep(page, n)` e `tourCard(page)`;
   - `playwright.config.ts` grava `rolim.passeio = "v1"` no `storageState` e inclui os specs novos nos projetos listados no plano de testes.

**Peça 1: estado, gatilhos, rotas e ferramentas**
- **Dona de:**
  - `features/onboarding/onboardingState.ts` e `onboardingState.test.ts`;
  - `features/tour/tourState.ts` e `tourState.test.ts` (novos);
  - `router.tsx`, `layouts/CitizenLayout.tsx` e `pages/profile/ProfilePage.tsx`;
  - `scripts/check-bundle.mjs` e `playwright.config.ts`;
  - `e2e/helpers.ts` e `e2e/onboarding.spec.ts`.
- **Faz:**
  - as exportações e as gravações de `v1` (usuário antigo e `?intro=0`) no `onboardingState`, mais o `withoutParams`;
  - o `tourState` completo, incluindo o armazém de pedidos com `useSyncExternalStore`;
  - no loader da rota index: `?passeio=1` → `requestTourFromLink()` e `redirect(withoutParams(url, ["intro", "passeio"]))`;
  - no `CitizenLayout`: `const [tourOffer, setTourOffer] = useState(shouldOfferTour)`, `useTourRequest()`, o consumo de `consumeTourLinkRequest()` quando `pathname === "/"` e um carregador manual do `HomeTour` (ocioso na oferta, imediato no modo manual; na falha, `onFail` ou desliga a oferta; no desenvolvimento, `console.error`). Renderiza `<HomeTour key={modo} …/>` só com `pathname === "/"` e `chrome === "home"`; o `onDone` limpa a oferta e o pedido;
  - a linha do Perfil;
  - no `check-bundle`, os tetos e as duas guardas;
  - os helpers do e2e e o `storageState`.
- **Testa:**
  - `tourState.test.ts`, escrito antes do código:
    - matriz do `decideTourOffer`: armazenamento quebrado; estado ausente, `v1` e `pendente`; entrada `/`, `/plantao/farmacias`, `/protocolos/x` e `/?passeio=1`; já oferecido; Novidade pendente; `firstSeen` com 0, 14 e 15 dias e ausente;
    - `markTourPending` não sobrescreve `v1`;
    - `markTourOffered` na 1ª e na 2ª vez (a 2ª vira `v1`);
    - `markTourDone` limpa `vezes`;
    - o pedido do link é consumido uma única vez;
    - `requestTour` notifica quem assina, e `clearTourRequest` limpa;
  - `onboardingState.test.ts`: usuário antigo grava o passeio como `v1`; `?intro=0` grava `v1`; `withoutParams` tira `intro` e `passeio` e mantém os outros parâmetros e o hash; os testes atuais continuam verdes;
  - `onboarding.spec.ts`:
    - "Começar a usar" mostra a oferta ("Quer conhecer a tela inicial?"), e "Agora não" leva à Início;
    - Pular e Esc não oferecem (`rolim.passeio` ausente e o pedaço do passeio nunca pedido);
    - "Tab e Enter" responde à oferta antes das conferências da Início;
    - `/boas-vindas?rever=1` seguido de "Começar a usar" volta ao Perfil, sem oferta;
    - `/?intro=0` grava `rolim.passeio = "v1"`;
  - build: os tetos e as guardas do `check-bundle`. A guarda deve falhar quando se faz, num ramo local, um import estático proposital do passeio (conferência manual).

**Peça 2: o passeio (pedaço sob demanda)**
- **Dona de:**
  - em `features/tour/`: `HomeTour.tsx`, `TourOffer.tsx`, `TourLayer.tsx`, `TourCard.tsx`, `tourSteps.ts` e `tourSteps.test.ts`, `tourGeometry.ts` e `tourGeometry.test.ts`, `tourDom.ts` e `HomeTour.module.css`;
  - `components/sheet/openDialogs.ts` (novo);
  - `features/onboarding/WhatsNewSheet.tsx`, só para trocar o import;
  - `e2e/passeio.spec.ts` (novo) e `e2e/a11y.spec.ts`.
- **Faz:**
  - `HomeTour`: a máquina de estados. Na oferta: espera → folha → passeio → fim. No modo manual: espera a transição → passeio. Cuida das escritas (`markTourOffered`, `markTourDone`), da pausa atrás da folha do Solicitar, do foco e da rolagem na saída, e do `onDone`;
  - `TourLayer`: portal, véu, anel e cartão; medida e aplicação no `useLayoutEffect`; trava de rolagem; observadores; `makeLive`; ouvinte de clique na captura; teclado, `CloseWatcher` e a guarda de 400 ms; o aceno;
  - `tourSteps`: a tabela pura de passos e textos;
  - `tourGeometry`, puro: `unionRect`, `inflate`, `clampToViewport`, `holeRadius`, `holePath(vw, vh, principal, [ligar1, ligar2])` e `chooseLayout(...)`. O `chooseLayout` devolve `{ typo, place, candidate, scrollDelta, hole, radius, card: {x, y}, caret, callCopies }`;
  - `tourDom`: `findTarget`, `candidateGroups`, `makeLive`, `telLinks`, `onCloseRequest` (com a declaração mínima de `CloseWatcher` em TS), `waitForScrollEnd` e `readMs`.
- **Testa:**
  - `tourGeometry.test.ts`:
    - os casos da tabela de medidas: 360×640 normal; 375×667 grande; 320×568 muito grande (centro com cópias no passo 2; 1º bloco com texto curto no passo 1); 768×1024 acima; 1024×768 ao lado, à esquerda; trilho com `x ≥ 104`;
    - Solicitar como união com o círculo, cartão em cima; conta no celular, cartão embaixo;
    - virada para cima no fim da página; espiada com ≥ 56 px à vista; centro abaixo disso e com alvo ausente;
    - teste de propriedade: em telas de 320 a 430 px de largura e 568 a 900 px de altura, nos 3 tamanhos de texto, o passo 2 nunca devolve cartão que cruze um "Ligar";
    - `holePath` mantém a mesma assinatura de comandos para qualquer entrada, inclusive furos de tamanho zero;
  - `tourSteps.test.ts`:
    - sempre 5 passos, na mesma ordem;
    - todas as combinações de passo, estado, conta e nav respeitam os limites, não usam "clique" e trazem palavra de lugar nos passos 3 a 5;
    - só `solicitar` e `conta` sem conta pulsam; o plantão nunca;
    - o último passo usa "Concluir" e a nota cita “Como usar o app”;
  - `passeio.spec.ts`:
    - fluxo completo: primeiro acesso → Começar a usar → oferta → Mostrar → título focado "Os serviços ficam aqui" → Próximo 4 vezes → Concluir → `main h1` focado e `rolim.passeio = "v1"`; depois de recarregar, sem oferta;
    - "Agora não" grava `v1`;
    - Esc na oferta: oferecida de novo numa página nova do mesmo contexto; no 2º Esc, `v1`;
    - "Entrar ou criar conta" com `cidadao@rolim.test` → oferta na Início → passo 5 "Seu perfil fica aqui";
    - link direto (`/plantao/farmacias`) e depois Início: sem oferta;
    - "Ligar" alcançável: no passo 2, `getByRole("link", { name: /^Ligar para/ }).first().click({ trial: true })` passa e o retângulo do cartão não cruza nenhum "Ligar"; nos outros passos, todo "Ligar" visível e fora do cartão também passa;
    - toque em "Problema na rua" no passo 1 sai do passeio e abre o fluxo (ou o login);
    - Solicitar no passo 3 abre a folha e esconde o passeio; Cancelar faz o passo 3 voltar com o foco no título;
    - Esc no passo 2: a camada some, o foco vai para "De plantão agora" e o `scrollY` não muda;
    - "Como usar o app" → passo 1 → Sair: o foco volta à linha;
    - Perfil › "Passeio pela tela inicial": a URL fica `/` e o passeio começa no passo 1;
    - ordem do Tab, setas e toque duplo (2 cliques em menos de 400 ms avançam um passo só);
    - AppBar com `inert` no passo 1;
    - 320×568 com "muito-grande": em cada passo, cartão dentro da tela, Próximo visível e nenhuma rolagem lateral;
    - 1024×768: o cartão dos passos 3 a 5 fica com `x ≥ 104`;
    - movimento reduzido: nenhuma animação rodando depois de cada troca;
    - CLS < 0,1 (PerformanceObserver) da carga ao fim do passeio;
    - capturas anexadas dos passos 1, 2 e 5 e da oferta, em 320, 768 e 1024, claro e escuro;
  - `a11y.spec.ts`: axe com a oferta aberta e com os passos 1, 2 e 5 abertos, nos temas claro e escuro.

**Peça 3: Início — alvos, movimento, ajuda e tokens**
- **Dona de:**
  - em `pages/home/`: `HomePage.tsx`, `HomePage.module.css`, `HomeHeader.tsx` (só a classe), `ServiceGrid.tsx`, `ServiceGrid.module.css`, `DutyNowCard.tsx`, `DutyNowCard.module.css`, `DutyNowRows.tsx`, `LatestNotice.module.css`, `MyRequestsPreview.tsx`, `HomeHelp.tsx` e `HomeHelp.module.css` (novos), `homeText.ts` e `homeText.test.ts`;
  - em `layouts/chrome/`: `TabBar.tsx`, `NavRail.tsx` e `AccountButton.tsx`;
  - `components/sheet/scrollLock.ts` e `scrollLock.test.ts`;
  - `theme/motion.css`, `theme/global.css` e `theme/motionLint.test.ts` (novo);
  - `e2e/inicio.spec.ts` (novo) e `e2e/visual.spec.ts`.
- **Faz:**
  - os atributos do contrato;
  - `dutyTourState({ loading, failed, callable })` em `homeText.ts`;
  - `data-home-intro`, `--i` nos `li` e `data-badge` nos selos;
  - as regras de movimento da tabela (com keyframes locais) e a `key` das linhas do plantão;
  - `.enter-rise` no convite de "Seus pedidos";
  - o `HomeHelp` na posição definida;
  - em `motion.css`, as regras do `welcome-hero` e a correção do `.live-dot` no lite;
  - a calha só com barra clássica (`scrollLock.ts` e `global.css`).
- **Testa:**
  - `homeText.test.ts`: os 4 estados do `dutyTourState`;
  - `motionLint.test.ts`:
    - nenhum `@keyframes` de `src/**/*.css` anima propriedade de layout (`width`, `height`, `min-*`, `max-*`, `top`, `right`, `bottom`, `left`, `inset*`, `margin*`, `padding*`, `border` e `border-*-width`, `font-size`, `line-height`, `gap`, `flex*`, `grid*`);
    - todo nome usado em `animation` ou `animation-name` de um `*.module.css` tem `@keyframes` no mesmo arquivo;
  - `scrollLock.test.ts`: a calha só entra com barra clássica e sai junto com a trava;
  - `inicio.spec.ts`:
    - `data-home-intro` existe na primeira montagem e não existe ao voltar pela aba;
    - o LCP (PerformanceObserver) é o `main h1` no celular ou a foto no computador, e o H1 não tem animação;
    - CLS < 0,1 numa carga de `/` em 360 e em 1024;
    - movimento reduzido: nenhuma animação na Início depois de assentar;
    - lite (`dataset.motion = "lite"` num script de início): o `.live-dot::after` sem animação e nenhuma animação de entrada;
    - o HomeHelp vem antes do ContextInvite no DOM e já existe no primeiro quadro;
    - os atributos `data-tour` estão presentes, com um só visível por id, em 360 e em 1024;
  - `visual.spec.ts`: a Início em 320 com texto em 125%, sem rolagem lateral, com "Como usar o app", nos temas claro e escuro.

**Peça 4: apresentação**
- **Dona de:**
  - em `features/onboarding/`: `OnboardingPage.tsx`, `OnboardingPage.module.css`, `slides.tsx`, `illustrations.tsx`, `illustrations.module.css` (novo), `SettingsPanel.tsx` e `SettingsPanel.module.css`;
  - `e2e/apresentacao.spec.ts` (novo).
- **Faz:**
  - o reagrupamento dos SVGs, com o `<g>` externo no `Pin`;
  - o `data-play` e o padrão `paused`/`running`;
  - os keyframes de cada slide;
  - o "Aa" em dois `<g>`;
  - o `data-touched`, o check e a mensagem de instalação concluída;
  - o rótulo com `key` dentro do botão estável;
  - `start("comecar" | "pular")`, o `navScope` "welcome", a classe `app-bar-vt` no `.top` e a `onb-hero-vt` no slide ativo;
  - `markTourPending()` nos dois pontos;
  - a pré-carga ociosa no último slide.
- **Testa** (`apresentacao.spec.ts`):
  - movimento reduzido: nenhuma animação nos 5 slides; capturas anexadas em 320, 375, 768, 1024 e 1440, claro e escuro;
  - movimento normal: as animações do slide ativo terminam em até 1,2 s e voltar ao slide não reinicia;
  - lite: nenhuma animação em partes do SVG;
  - nenhum elemento SVG animado tem o atributo `transform`;
  - só um `.onb-hero-vt` no DOM;
  - o check do tamanho só anima depois do primeiro toque;
  - a troca para "Começar a usar" não tira o foco do título;
  - no último slide, o pedaço do passeio é pedido (`waitForRequest(/HomeTour-.*\.js/)`); no lite, não;
  - o h2 do slide não anima.

**Ordem e aceite**
1. A peça 1 publica os contratos, com o `tourState` completo.
2. As peças 2, 3 e 4 trabalham em paralelo, em arquivos disjuntos. A peça 1 segue com `CitizenLayout`, `router`, Perfil, `check-bundle` e e2e.
3. Integração:
   - `npm run build` (tsc, vite e `check-bundle` com os tetos e as guardas);
   - `npm test`;
   - `npm run e2e` contra os emuladores, nos 4 projetos.
   Desvios encontrados atualizam esta seção.
4. Aceite:
   - tsc limpo e vitest verde;
   - Playwright verde em `celular`, `telas`, `movimento-reduzido` e `iphone`;
   - `check-bundle` ≤ 300 KB, com a apresentação ≤ 9 KB e o passeio ≤ 8 KB;
   - Lighthouse de acessibilidade 100 em `/?intro=0` e em `/boas-vindas`;
   - conferência manual no Android lite e no iPhone.