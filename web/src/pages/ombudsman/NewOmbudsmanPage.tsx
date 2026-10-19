import { useForm, type UseFormReturnType } from "@mantine/form";
import { IconWifiOff } from "@tabler/icons-react";
import { useId, useMemo, useState } from "react";
import { SubmittedPanel } from "@/components/SubmittedPanel";
import { CONTACTS } from "@/config/city";
import { watchBuildings } from "@/data/buildings";
import { createOmbudsman, type NewOmbudsmanInput } from "@/data/requests";
import { onlyDigits } from "@/domain/documents";
import { toIsoDate } from "@/domain/format";
import type { Building } from "@/domain/types";
import { useOnline } from "@/hooks/useOnline";
import { useWatch } from "@/hooks/useWatch";
import { FlowFrame } from "@/pages/issues/flow/FlowFrame";
import flowCss from "@/pages/issues/flow/flow.module.css";
import { REVIEW_FIELDS, useFlow, type Flow, type Prepared } from "@/pages/issues/flow/useFlow";
import classes from "./NewOmbudsman.module.css";
import { OmbudsmanReview, PlaceStep, StoryStep } from "./OmbudsmanSteps";
import {
  initialOmbudsman,
  OMBUDSMAN_STEP_FIELDS,
  OMBUDSMAN_TOTAL_STEPS,
  ombudsmanDraft,
  ombudsmanReachableStep,
  ombudsmanValidators,
  type OmbudsmanFormValues,
} from "./ombudsmanForm";
import { TypeStep } from "./TypeStep";

const QUESTIONS = ["Sobre o que você quer falar?", "Onde foi o atendimento?", "Conte o que aconteceu", "Confira e envie"] as const;
const LEADS = [
  "Elogios, sugestões e reclamações sobre o atendimento numa unidade pública.",
  "Escolha a unidade e o dia em que aconteceu.",
  "A ouvidoria lê cada relato e encaminha para o setor responsável.",
  "Veja se está tudo certo antes de enviar.",
] as const;

const UNIT_AGAIN = "Escolha a unidade de novo antes de enviar.";
const SEND_FAILED = "Não foi possível enviar. Tente novamente.";

type OmbudsmanForm = UseFormReturnType<OmbudsmanFormValues>;

interface Units {
  units: Building[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** Unidades públicas ativas, para escolher onde foi o atendimento. */
function usePublicUnits(): Units {
  const watcher = useMemo(() => watchBuildings("PUBLIC"), []);
  const { data, loading, error, retry } = useWatch(watcher);
  const units = useMemo(() => (data ?? []).filter((b) => b.active), [data]);
  return { units, loading, error, retry };
}

/** Checagem final: campos válidos e a unidade ainda na lista. */
function prepareOmbudsman(form: OmbudsmanForm, unit: Building | null): Prepared<NewOmbudsmanInput> {
  if (form.validate().hasErrors || !form.values.type) return { error: REVIEW_FIELDS };
  if (!unit) return { error: UNIT_AGAIN };
  const draft = ombudsmanDraft(form.values, unit);
  return draft ? { payload: draft } : { error: REVIEW_FIELDS };
}

function OtherChannels() {
  const { ouvidoriaPhone: phone, ouvidoriaEmail: email } = CONTACTS;
  if (!phone && !email) return null;
  return (
    <p className={classes.contact}>
      Prefere outro canal?{" "}
      {phone && <a href={`tel:${onlyDigits(phone)}`}>{phone}</a>}
      {phone && email && " · "}
      {email && <a href={`mailto:${email}`}>{email}</a>}
    </p>
  );
}

interface OmbudsmanStepsProps {
  wizard: Flow;
  form: OmbudsmanForm;
  units: Units;
  unit: Building | null;
  today: string;
  online: boolean;
}

/** Conteúdo do passo atual. */
function OmbudsmanSteps({ wizard, form, units, unit, today, online }: OmbudsmanStepsProps) {
  const { step, move } = wizard;
  const last = step === OMBUDSMAN_TOTAL_STEPS;
  return (
    <>
      {step === 1 && (
        <TypeStep
          value={form.values.type}
          onSelect={(type) => {
            form.setFieldValue("type", type);
            move(2);
          }}
        />
      )}
      {step === 2 && <PlaceStep form={form} units={units.units} loading={units.loading} error={units.error} onRetry={units.retry} today={today} />}
      {step === 3 && <StoryStep form={form} />}
      {last && <OmbudsmanReview values={form.values} unitName={unit?.name ?? null} onEdit={move} />}
      {last && !online && (
        <p className={flowCss.note}>
          <IconWifiOff size={20} aria-hidden />
          Você está sem internet. O pedido fica guardado no celular e é enviado sozinho quando a conexão voltar.
        </p>
      )}
      {(step === 1 || last) && <OtherChannels />}
    </>
  );
}

/** /ouvidoria/nova: elogio, sugestão ou reclamação em 4 passos (?passo=N). */
export default function NewOmbudsmanPage() {
  const online = useOnline();
  const headingId = useId();
  const [today] = useState(() => toIsoDate(new Date()));
  const validators = useMemo(() => ombudsmanValidators(today), [today]);
  const units = usePublicUnits();
  const form = useForm<OmbudsmanFormValues>({ initialValues: initialOmbudsman(today), validate: validators });
  const wizard = useFlow({
    form,
    total: OMBUDSMAN_TOTAL_STEPS,
    reachable: ombudsmanReachableStep(form.values, today),
    stepFields: OMBUDSMAN_STEP_FIELDS,
    dirty: form.isDirty(),
    online,
  });
  const unit = units.units.find((b) => b.id === form.values.buildingId) ?? null;

  const submit = () => void wizard.send(() => prepareOmbudsman(form, unit), createOmbudsman, SEND_FAILED);

  if (wizard.sent) {
    const { id, protocol, pendingSync } = wizard.sent;
    return <SubmittedPanel protocol={protocol} detailPath={`/protocolos/ouvidoria/${id}`} pendingSync={pendingSync} kindLabel="Ouvidoria" />;
  }

  return (
    <FlowFrame flow={wizard} headingId={headingId} question={QUESTIONS[wizard.step - 1]} lead={LEADS[wizard.step - 1]} onSubmit={submit}>
      <OmbudsmanSteps wizard={wizard} form={form} units={units} unit={unit} today={today} online={online} />
    </FlowFrame>
  );
}
