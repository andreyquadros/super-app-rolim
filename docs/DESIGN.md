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