import type { ComponentType, ReactNode } from "react";
import { StepBar } from "@/components/ui/StepBar";
import { CityArt, DutyArt, SettingsArt, StreetArt } from "./illustrations";
import classes from "./OnboardingPage.module.css";

interface ArtProps {
  /** O slide está na tela (reinicia a animação da barra de etapas) */
  active: boolean;
}

export interface SlideCopy {
  id: string;
  title: string;
  text: string;
  Art: ComponentType<ArtProps>;
  /** Faixa verde mais baixa (slide de preferências, que tem mais conteúdo) */
  compactArt?: boolean;
}

/** Slide 3: a mesma barra de 4 etapas que aparece nos pedidos. */
function TrackArt({ active }: ArtProps) {
  return (
    <div className={classes.mockStack}>
      <div className={classes.mock}>
        <span className={`protocol ${classes.mockProtocol}`}>ZEL-2026-K7Q2MX9P</span>
        <span className={classes.mockTitle}>Poste apagado na Rua das Flores</span>
        <StepBar key={active ? "on" : "off"} status="IN_PROGRESS" size="lg" />
      </div>
    </div>
  );
}

export const SLIDES: readonly SlideCopy[] = [
  {
    id: "bem-vindo",
    title: "Bem-vindo ao SUPER APP Rolim de Moura",
    text: "Os serviços da prefeitura num só lugar, no seu celular. É grátis.",
    Art: CityArt,
  },
  {
    id: "problema",
    title: "Viu um problema na rua? Avise.",
    text: "Buraco, poste apagado, lixo ou mato alto: tire uma foto, marque o local e envie.",
    Art: StreetArt,
  },
  {
    id: "acompanhe",
    title: "Acompanhe cada passo",
    text: "Cada pedido ganha um número de protocolo. Você vê quando a prefeitura recebe, analisa e resolve.",
    Art: TrackArt,
  },
  {
    id: "plantao",
    title: "Farmácia e funerária de plantão",
    text: "Veja quem está de plantão, ligue com um toque ou trace a rota. Não precisa entrar na conta.",
    Art: DutyArt,
  },
  {
    id: "seu-jeito",
    title: "Deixe do seu jeito",
    text: "Ajuste o app para você. Dá para mudar tudo depois, no Perfil.",
    Art: SettingsArt,
    compactArt: true,
  },
];

interface SlideProps {
  copy: SlideCopy;
  position: number;
  total: number;
  active: boolean;
  titleRef: (element: HTMLHeadingElement | null) => void;
  children?: ReactNode;
}

/** Um slide do pager: fora da tela fica inerte (sem foco nem leitor de tela). */
export function Slide({ copy, position, total, active, titleRef, children }: SlideProps) {
  const { Art } = copy;
  return (
    <section
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} de ${total}`}
      className={classes.slide}
      inert={!active}
      tabIndex={active ? 0 : -1}
    >
      <div className={classes.art} data-compact={copy.compactArt || undefined} aria-hidden>
        <Art active={active} />
      </div>
      <div className={classes.sheet}>
        <div className={classes.inner}>
          <h2 ref={titleRef} tabIndex={-1} className={classes.title}>
            {copy.title}
          </h2>
          <p className={classes.text}>{copy.text}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
