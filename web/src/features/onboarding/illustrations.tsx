// Ilustrações planas da apresentação (inline, decorativas, até 2 KB cada).
// Desenhadas sobre a faixa verde: claros em branco/papel, sombras em preto
// translúcido, para funcionar no verde claro e no verde escuro do tema.

const PAPER = "#f6f4ee";
const IPE = "#ffbb36";
const MATA = "#0d7a49";
const INK = "#17241c";

/** Pino do logo (branco com miolo ipê), em coordenadas 0–64. */
function Pin({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M32 2C17 2 6 13 6 27c0 19 26 37 26 37s26-18 26-37C58 13 47 2 32 2z" fill="#fff" />
      <circle cx="32" cy="26" r="11" fill={IPE} />
      <circle cx="32" cy="26" r="4" fill={MATA} />
    </g>
  );
}

/** Slide 1: a cidade com um ipê e o pino descendo. */
export function CityArt() {
  return (
    <svg viewBox="0 0 320 180" aria-hidden focusable="false">
      <path d="M0 150c60-34 118-30 168-14s104 16 152-8v52H0z" fill="#fff" fillOpacity=".1" />
      <circle cx="46" cy="46" r="13" fill={IPE} fillOpacity=".85" />
      <path d="M60 162V96a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v66zm52 0V70a4 4 0 0 1 4-4h48a4 4 0 0 1 4 4v92zm60 0v-58a4 4 0 0 1 4-4h34a4 4 0 0 1 4 4v58z" fill={PAPER} />
      <path d="M70 104h8v8h-8zm18 0h8v8h-8zm-18 18h8v8h-8zm18 0h8v8h-8zm36-42h8v8h-8zm22 0h8v8h-8zm-22 20h8v8h-8zm22 0h8v8h-8zm-22 20h8v8h-8zm22 0h8v8h-8zm38-8h8v8h-8zm16 0h8v8h-8zm-16 18h8v8h-8zm16 0h8v8h-8z" fill={MATA} fillOpacity=".4" />
      <path d="M132 162v-22h16v22z" fill={MATA} />
      <path d="M252 162v-40" stroke="#3a2a00" strokeWidth="5" strokeLinecap="round" />
      <circle cx="238" cy="112" r="17" fill={IPE} />
      <circle cx="266" cy="108" r="19" fill={IPE} />
      <circle cx="252" cy="90" r="17" fill="#ffca62" />
      <rect y="160" width="320" height="20" fill="#000" fillOpacity=".14" />
      <path d="M140 6v8m-9-4v6m18-6v6" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="140" cy="64" rx="11" ry="3" fill="#000" fillOpacity=".18" />
      <Pin x={120} y={14} scale={0.62} />
    </svg>
  );
}

/** Slide 2: rua com buraco e poste apagado; o celular marca o local. */
export function StreetArt() {
  return (
    <svg viewBox="0 0 320 180" aria-hidden focusable="false">
      <rect y="148" width="320" height="32" fill="#000" fillOpacity=".16" />
      <path d="M8 165h304" stroke="#fff" strokeOpacity=".4" strokeWidth="3" strokeDasharray="16 12" />
      <ellipse cx="96" cy="163" rx="24" ry="6" fill="#000" fillOpacity=".32" />
      <path d="M50 150V58h24" stroke={PAPER} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M66 56h22l-5 9H71z" fill={PAPER} />
      <path d="M266 150l4-24 4 24m3 0l6-30 2 30m4 0l5-20 2 20" stroke="#fff" strokeOpacity=".4" strokeWidth="3" fill="none" strokeLinejoin="round" />
      <rect x="150" y="20" width="96" height="156" rx="14" fill={INK} />
      <rect x="157" y="32" width="82" height="124" rx="6" fill={PAPER} />
      <rect x="157" y="98" width="82" height="34" fill="#e3e0d6" />
      <ellipse cx="198" cy="116" rx="22" ry="6" fill="#4d5d53" />
      <path d="M198 50c-9 0-15 6-15 14 0 11 15 22 15 22s15-11 15-22c0-8-6-14-15-14z" fill={MATA} />
      <circle cx="198" cy="64" r="5" fill={IPE} />
      <rect x="170" y="140" width="56" height="10" rx="5" fill={MATA} />
    </svg>
  );
}

/** Slide 4: farmácia e funerária, plantão (ipê), telefone e rota. */
export function DutyArt() {
  return (
    <svg viewBox="0 0 320 180" aria-hidden focusable="false">
      <rect y="156" width="320" height="24" fill="#000" fillOpacity=".14" />
      <path d="M18 172c44-8 70-2 108 0s92 6 176-6" stroke={IPE} strokeWidth="3" strokeDasharray="1 9" strokeLinecap="round" fill="none" />
      <path d="M40 158V94h108v64z" fill={PAPER} />
      <path d="M32 78h124l-8 18H40z" fill="#fff" />
      <path d="M77 106h12v10h10v12H89v10H77v-10H67v-12h10z" fill={MATA} />
      <path d="M112 158v-38a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v38z" fill={MATA} fillOpacity=".3" />
      <circle cx="150" cy="72" r="20" fill={IPE} />
      <path d="M150 61v11l8 5" stroke="#3a2a00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M182 158v-56h80v56z" fill="#dfe5ea" />
      <path d="M174 104l48-28 48 28z" fill="#3d5c78" />
      <path d="M210 158v-24a12 12 0 0 1 24 0v24z" fill="#3d5c78" fillOpacity=".4" />
      <circle cx="282" cy="46" r="20" fill="#fff" />
      <path d="M274 37a3 3 0 0 1 3-3h3l3 7-3 3a14 14 0 0 0 6 6l3-3 7 3v3a3 3 0 0 1-3 3c-11 0-19-8-19-19z" fill={MATA} />
    </svg>
  );
}

/** Slide 5: tamanho do texto, o app na tela do celular e os avisos. */
export function SettingsArt() {
  return (
    <svg viewBox="0 0 320 120" aria-hidden focusable="false">
      <text x="44" y="86" fill="#fff" fontFamily="'Fraunces Variable', Georgia, serif" fontSize="56" fontWeight="600">
        Aa
      </text>
      <rect x="128" y="10" width="64" height="106" rx="12" fill={INK} />
      <rect x="134" y="20" width="52" height="84" rx="5" fill={PAPER} />
      <path d="M140 28h12v12h-12zm16 0h12v12h-12zm-16 16h12v12h-12zm16 16h12v12h-12zm-16 0h12v12h-12z" fill="#e3e0d6" />
      <rect x="156" y="44" width="12" height="12" rx="3" fill={MATA} />
      <circle cx="162" cy="50" r="3" fill={IPE} />
      <path d="M248 76V58a16 16 0 0 1 32 0v18l6 8h-44z" fill="#fff" />
      <circle cx="264" cy="90" r="5" fill="#fff" />
      <circle cx="280" cy="44" r="7" fill={IPE} />
    </svg>
  );
}
