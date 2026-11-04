// Passos e textos do "Passeio pela tela inicial" (tabela pura, sem DOM).
// Regras: "toque" e "você", e cada texto diz onde a coisa fica.

export const STEP_IDS = ["servicos", "plantao", "solicitar", "abas", "conta"] as const;
export type StepId = (typeof STEP_IDS)[number];
export const STEP_COUNT = STEP_IDS.length;

/** TabBar (celular) ou NavRail (tablet e computador) */
export type NavVariant = "barra" | "menu";
export type AccountVariant = "anon" | "user" | "carregando";
/** data-tour-state do cartão "De plantão agora" */
export type DutyVariant = "ok" | "sem-ligar" | "carregando" | "erro";

export interface StepContext {
  nav: NavVariant;
  account: AccountVariant;
  duty: DutyVariant;
}

export interface StepContent {
  title: string;
  text: string;
  /** Usado no tipo "curto" (telas apertadas) */
  short: string;
  /** Só no último passo */
  note: string | null;
  /** O anel pulsa 2 vezes */
  pulse: boolean;
  primary: "Próximo" | "Concluir";
}

/** [título, texto, texto curto] */
type Copy = readonly [string, string, string];
/** [texto, texto curto] na barra e no menu */
type Where = readonly [string, string];

const DUTY: Record<DutyVariant, Where> = {
  ok: [
    "Aqui aparece quem está de plantão agora. O botão “Ligar” chama direto, sem precisar de conta.",
    "O botão “Ligar” chama direto, sem precisar de conta.",
  ],
  "sem-ligar": ["Aqui aparece quem está de plantão agora. Toque no nome para ver a lista completa.", "Toque no nome para ver a lista completa."],
  carregando: ["Aqui aparece quem está de plantão agora, com o botão “Ligar” para chamar direto.", "Aqui aparece quem atende agora."],
  erro: ["Aqui aparece quem está de plantão agora. Se não carregar, toque em “Tentar de novo”.", "Se não carregar, toque em “Tentar de novo”."],
};

/** Solicitar: onde fica (barra, menu); a segunda frase depende da conta */
const REQUEST: readonly Where[] = [
  ["Toque em “Solicitar”, o botão verde no meio da barra de baixo.", "Toque em “Solicitar”, na barra de baixo."],
  ["Toque em “Solicitar”, no alto do menu verde à esquerda.", "Toque em “Solicitar”, no alto do menu."],
];

/** Conta: título e, na barra e no menu, [texto, curto] */
const ACCOUNT: Record<AccountVariant, readonly [string, Where, Where]> = {
  anon: [
    "Entre quando quiser",
    ["Toque em “Entrar”, no alto da tela, para criar sua conta ou entrar nela. Plantão e avisos funcionam sem conta.", "Toque em “Entrar”, no alto da tela."],
    [
      "Toque em “Entrar”, no pé do menu verde, para criar sua conta ou entrar nela. Plantão e avisos funcionam sem conta.",
      "Toque em “Entrar”, no pé do menu verde.",
    ],
  ],
  user: [
    "Seu perfil fica aqui",
    [
      "Toque no círculo com suas iniciais, no alto da tela, para aumentar as letras, ligar os avisos e achar a Ajuda.",
      "É o círculo com suas iniciais, no alto da tela.",
    ],
    ["Toque em “Perfil”, no pé do menu verde, para aumentar as letras, ligar os avisos e achar a Ajuda.", "Toque em “Perfil”, no pé do menu verde."],
  ],
  carregando: [
    "Sua conta fica aqui",
    ["Aqui, no alto da tela, você entra na conta ou abre o seu perfil.", "Fica no alto da tela."],
    ["No pé do menu verde, você entra na conta ou abre o seu perfil.", "Fica no pé do menu verde."],
  ],
};

function copyFor(index: number, { nav, account, duty }: StepContext): Copy {
  const menu = nav === "menu" ? 1 : 0;
  const [title, ...where] = ACCOUNT[account];
  const request = REQUEST[menu];
  const table: Copy[] = [
    [
      "Os serviços ficam aqui",
      "Cada quadro abre um serviço. “Problema na rua” serve para avisar de buraco, poste apagado ou lixo.",
      "Cada quadro abre um serviço da prefeitura.",
    ],
    ["De plantão agora", ...DUTY[duty]],
    [
      "Para pedir algo à prefeitura",
      `${request[0]} ${account === "anon" ? "Para enviar, é preciso entrar na conta." : "Ele aparece em todas as telas."}`,
      request[1],
    ],
    [
      menu ? "Este menu leva você pelo app" : "Esta barra leva você pelo app",
      "“Início” sempre volta para esta tela. “Pedidos”, “Plantão” e “Avisos” abrem as outras partes.",
      "“Início” sempre volta para esta tela.",
    ],
    [title, ...where[menu]],
  ];
  return table[index];
}

export function stepContent(step: number, ctx: StepContext): StepContent {
  const last = step === STEP_COUNT - 1;
  const [title, text, short] = copyFor(step, ctx);
  return {
    title,
    text,
    short,
    note: last
      ? ctx.account === "user"
        ? "Para ver de novo: “Como usar o app”, no fim da Início, ou Perfil › Ajuda."
        : "Para ver de novo, toque em “Como usar o app”, no fim da Início."
      : null,
    pulse: step === 2 || (last && ctx.account === "anon"),
    primary: last ? "Concluir" : "Próximo",
  };
}

export const stepLabel = (index: number): string => `Passo ${index + 1} de ${STEP_COUNT}`;

/** data-tour-state do plantão; sem o atributo, decide pelos "Ligar" visíveis. */
export const toDutyVariant = (value: string | null | undefined, hasCalls: boolean): DutyVariant =>
  // Só as chaves do próprio DUTY (nada herdado, como "toString")
  value && Object.hasOwn(DUTY, value) ? (value as DutyVariant) : value == null && hasCalls ? "ok" : "carregando";

export const toAccountVariant = ({ loading, signedIn }: { loading: boolean; signedIn: boolean }): AccountVariant =>
  loading ? "carregando" : signedIn ? "user" : "anon";
