import { Button, Switch } from "@mantine/core";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { DutyPills } from "@/components/duty/DutyPills";
import { DUTY_COPY, DUTY_META, isDutyType, isStale } from "@/domain/duty";
import { relativeTime } from "@/domain/format";
import type { Building, DutyType } from "@/domain/types";
import type { DutyState } from "./dutyState";
import classes from "./dutyAdmin.module.css";
import { useDutyControls } from "./useDutyControls";

/** Linha de 56 px clicável inteira: o rótulo e a descrição também ligam o Switch. */
const ROW_CLASSES = {
  root: classes.toggle,
  body: classes.toggleBody,
  input: classes.toggleInput,
  labelWrapper: classes.toggleText,
  label: classes.toggleLabel,
  description: classes.toggleHint,
};

/** Explica o que a população vê e quando desligar. */
function openHint(type: DutyType, state: DutyState): string {
  if (state.isOpen) return type === "FUNERAL" ? "Desligue quando encerrar o atendimento no local." : "Desligue quando fechar as portas.";
  if (state.isOnDuty) return "Desligado: a população vê que atende só por telefone.";
  return `Desligado: a população vê “${DUTY_COPY[type].closedLabel}”.`;
}

interface DutyUnitCardProps {
  unit: Building;
}

export function DutyUnitCard({ unit }: DutyUnitCardProps) {
  const { state, setOpen, setOnDuty, confirm, confirming } = useDutyControls(unit);
  if (!isDutyType(unit.type)) return null;
  const type = unit.type;
  const copy = DUTY_COPY[type];
  const who = DUTY_META[type].singular.toLowerCase();
  const stale = isStale(unit.updatedAt);

  return (
    <li className={classes.card} data-duty={state.isOnDuty || undefined}>
      <div className={classes.head}>
        <h3 className={classes.name}>{unit.name}</h3>
        {unit.address && <p className={classes.address}>{unit.address}</p>}
        {!unit.active && <p className={classes.inactive}>Desativada pela prefeitura: não aparece no app.</p>}
      </div>

      {stale && (
        <div className={classes.stale}>
          <p className={classes.staleText}>
            <IconAlertTriangle size={20} aria-hidden />
            <span>Faz tempo que você não atualiza. A população vê um aviso.</span>
          </p>
          <Button
            className={classes.staleButton}
            color="ipe.4"
            c="#3a2a00"
            h={48}
            leftSection={<IconCheck size={18} aria-hidden />}
            loading={confirming}
            onClick={() => void confirm()}
          >
            {state.isOnDuty ? "Continua de plantão" : "Está certo assim"}
          </Button>
        </div>
      )}

      <div className={classes.toggles}>
        <Switch
          size="lg"
          labelPosition="left"
          classNames={ROW_CLASSES}
          label={copy.openLabel}
          description={openHint(type, state)}
          checked={state.isOpen}
          onChange={(e) => setOpen(e.currentTarget.checked)}
        />
        <Switch
          size="lg"
          labelPosition="left"
          color="ipe.6"
          classNames={ROW_CLASSES}
          label="De plantão"
          description="Aparece em destaque para toda a cidade."
          checked={state.isOnDuty}
          onChange={(e) => setOnDuty(e.currentTarget.checked)}
        />
      </div>

      <figure className={classes.preview}>
        <figcaption className={classes.previewLabel}>A população vê assim:</figcaption>
        <div className={classes.previewCard} data-duty={state.isOnDuty || undefined}>
          <DutyPills type={type} isOpen={state.isOpen} isOnDuty={state.isOnDuty} />
          <p className={classes.previewName}>{unit.name}</p>
          <p className={classes.previewUpdated}>
            Atualizado {relativeTime(unit.updatedAt)} pela {who}
          </p>
          {stale && <p className={classes.previewStale}>Faz tempo que não atualizam. Confirme por telefone.</p>}
        </div>
      </figure>
    </li>
  );
}
