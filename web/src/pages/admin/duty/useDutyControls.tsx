import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useRef, useState } from "react";
import { confirmDutyState, setDutyState } from "@/data/buildings";
import type { Building } from "@/domain/types";
import { errorMessage } from "@/lib/errors";
import { dutyChangeNotice, sameDutyState, withDuty, withOpen, type DutyState } from "./dutyState";
import classes from "./dutyAdmin.module.css";

/** Tempo para desfazer a troca do plantão */
const UNDO_MS = 5000;

interface UndoNoticeProps {
  message: string;
  onUndo: () => void;
}

function UndoNotice({ message, onUndo }: UndoNoticeProps) {
  return (
    <span className={classes.undo}>
      <span>{message}</span>
      <Button size="compact-md" variant="light" onClick={onUndo}>
        Desfazer
      </Button>
    </span>
  );
}

/**
 * Liga e desliga "aberta" e "plantão" de forma otimista: a tela muda na hora
 * e volta ao que estava (com aviso) se a gravação falhar.
 */
export function useDutyControls(unit: Building) {
  const [optimistic, setOptimistic] = useState<DutyState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const ticket = useRef(0);
  const noticeId = useRef<string | null>(null);
  const state: DutyState = optimistic ?? { isOpen: unit.isOpen, isOnDuty: unit.isOnDuty };

  const apply = useCallback(
    async (next: DutyState, prev: DutyState, announce: boolean) => {
      if (sameDutyState(next, prev)) return;
      const current = ++ticket.current;
      setOptimistic(next);
      // Um aviso por vez para a mesma unidade
      if (noticeId.current) notifications.hide(noticeId.current);
      noticeId.current = null;

      const message = announce ? dutyChangeNotice(unit.name, prev, next) : null;
      const id = message ? `duty-${unit.id}-${current}` : null;
      if (message && id) {
        noticeId.current = id;
        const undo = () => {
          notifications.hide(id);
          void apply(prev, next, false);
        };
        notifications.show({ id, color: "mata", autoClose: UNDO_MS, message: <UndoNotice message={message} onUndo={undo} /> });
      }

      try {
        await setDutyState(unit.id, next);
      } catch (e: unknown) {
        if (id) notifications.hide(id);
        notifications.show({
          color: "barro",
          title: "Não foi possível atualizar",
          message: `${errorMessage(e)} A situação voltou ao que estava.`,
        });
      } finally {
        // O Firestore já mostra o valor gravado (ou o anterior, se falhou)
        if (current === ticket.current) setOptimistic(null);
      }
    },
    [unit.id, unit.name],
  );

  const setOpen = (isOpen: boolean) => void apply(withOpen(state, isOpen), state, true);
  const setOnDuty = (isOnDuty: boolean) => void apply(withDuty(state, isOnDuty), state, true);

  /** "Continua de plantão": renova só a data de atualização. */
  const confirm = async () => {
    setConfirming(true);
    try {
      await confirmDutyState(unit.id);
      notifications.show({ color: "mata", message: "Obrigado! A população vê que a informação está em dia." });
    } catch (e: unknown) {
      notifications.show({ color: "barro", title: "Não foi possível confirmar", message: errorMessage(e) });
    } finally {
      setConfirming(false);
    }
  };

  return { state, setOpen, setOnDuty, confirm, confirming };
}
