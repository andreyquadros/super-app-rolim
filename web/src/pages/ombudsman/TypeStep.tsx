import { useId } from "react";
import { OMBUDSMAN_ICONS } from "@/components/icons";
import { ombudsmanTypeOf, type OmbudsmanType } from "@/domain/catalog";
import { ChoiceList, type ChoiceOption } from "@/pages/issues/flow/Choices";
import choices from "@/pages/issues/flow/choices.module.css";

const HINTS: Record<OmbudsmanType, string> = {
  compliment: "Conte o que foi bem feito",
  suggestion: "Uma ideia para melhorar um serviço",
  service_delay: "Espera longa, fila ou atraso",
  poor_service: "Descaso, grosseria ou nada resolvido",
  employee_conduct: "Comportamento de um servidor",
  infrastructure: "Prédio, limpeza ou equipamentos",
  accessibility: "Rampa, banheiro adaptado, acesso",
  administrative: "Documentos, prazos e processos",
  others: "Algo que não está na lista",
};

const TONES = { positive: "mata", neutral: "slate", negative: "barro" } as const;

function option(value: OmbudsmanType): ChoiceOption<OmbudsmanType> {
  const type = ombudsmanTypeOf(value);
  return { value, label: type.label, hint: HINTS[value], icon: OMBUDSMAN_ICONS[value], tone: TONES[type.tone] };
}

const GROUPS = [
  { title: "Elogio ou sugestão", options: (["compliment", "suggestion"] as const).map(option) },
  {
    title: "Reclamação",
    options: (["service_delay", "poor_service", "employee_conduct", "infrastructure", "accessibility"] as const).map(option),
  },
  { title: "Outros assuntos", options: (["administrative", "others"] as const).map(option) },
] as const;

/** Posição do primeiro bloco de cada grupo na entrada escalonada */
const OFFSETS = GROUPS.map((_, i) => GROUPS.slice(0, i).reduce((sum, group) => sum + group.options.length, 0));

interface TypeStepProps {
  value: OmbudsmanType | "";
  onSelect: (type: OmbudsmanType) => void;
}

/** Passo 1: o assunto em blocos grandes; tocar escolhe e já avança. */
export function TypeStep({ value, onSelect }: TypeStepProps) {
  const baseId = useId();
  return (
    <div className={choices.groups}>
      {GROUPS.map((group, i) => {
        const titleId = `${baseId}-${i}`;
        return (
          <section key={group.title} className={choices.group} aria-labelledby={titleId}>
            <h2 id={titleId} className={choices.groupTitle}>
              {group.title}
            </h2>
            <ChoiceList options={group.options} value={value} onSelect={onSelect} labelledBy={titleId} offset={OFFSETS[i]} />
          </section>
        );
      })}
    </div>
  );
}
