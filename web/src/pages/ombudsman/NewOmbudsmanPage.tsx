import { useForm } from "@mantine/form";
import { IconAlertTriangle, IconWifiOff } from "@tabler/icons-react";
import { useCallback, useId, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { SubmittedPanel } from "@/components/SubmittedPanel";
import { CONTACTS } from "@/config/city";
import { watchBuildings } from "@/data/buildings";
import { createOmbudsman } from "@/data/requests";
import type { OmbudsmanType } from "@/domain/catalog";
import { onlyDigits } from "@/domain/documents";
import { toIsoDate } from "@/domain/format";
import { useOnline } from "@/hooks/useOnline";
import { useWatch } from "@/hooks/useWatch";
import { useChrome } from "@/layouts/chrome/chromeContext";
import { errorMessage } from "@/lib/errors";
import { DiscardSheet, FlowFooter, focusFirstError, StepHeading } from "@/pages/issues/flow/FlowParts";
import flow from "@/pages/issues/flow/flow.module.css";
import { useStepFlow } from "@/pages/issues/flow/useStepFlow";
import classes from "./NewOmbudsman.module.css";
import { OmbudsmanReview, PlaceStep, StoryStep } from "./OmbudsmanSteps";
import {
  initialOmbudsman,
  OMBUDSMAN_STEP_FIELDS,
  OMBUDSMAN_TOTAL_STEPS,
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

interface Submitted {
  id: string;
  protocol: string;
  pendingSync: boolean;
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

/** /ouvidoria/nova: elogio, sugestão ou reclamação em 4 passos (?passo=N). */
export default function NewOmbudsmanPage() {
  const { user, profile } = useAuth();
  const online = useOnline();
  const headingId = useId();
  const [today] = useState(() => toIsoDate(new Date()));
  const validators = useMemo(() => ombudsmanValidators(today), [today]);
  const watcher = useMemo(() => watchBuildings("PUBLIC"), []);
  const buildings = useWatch(watcher);
  const units = useMemo(() => (buildings.data ?? []).filter((b) => b.active), [buildings.data]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Submitted | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const form = useForm<OmbudsmanFormValues>({ initialValues: initialOmbudsman(today), validate: validators });
  const { step, direction, headingRef, goTo, exit, rewind } = useStepFlow(
    OMBUDSMAN_TOTAL_STEPS,
    ombudsmanReachableStep(form.values, today),
  );

  // X da barra: confirma antes de jogar fora o que foi preenchido
  const dirty = form.isDirty();
  const requestClose = useCallback(() => (dirty ? setDiscardOpen(true) : exit()), [dirty, exit]);
  const keepEditing = useCallback(() => setDiscardOpen(false), []);
  useChrome({
    progress: { step: result ? OMBUDSMAN_TOTAL_STEPS : step, total: OMBUDSMAN_TOTAL_STEPS },
    onClose: result ? exit : requestClose,
  });

  const move = (target: number) => {
    setError(null);
    goTo(target);
  };

  const next = () => {
    const fields = OMBUDSMAN_STEP_FIELDS[step - 1] ?? [];
    const invalid = fields.map((field) => form.validateField(field).hasError).some(Boolean);
    if (invalid) {
      focusFirstError();
      return;
    }
    move(step + 1);
  };

  const selectType = (type: OmbudsmanType) => {
    form.setFieldValue("type", type);
    move(2);
  };

  const unit = units.find((b) => b.id === form.values.buildingId) ?? null;

  const submit = async () => {
    if (!user || !profile) {
      setError("Sua sessão terminou. Entre de novo para enviar o pedido.");
      return;
    }
    const { values } = form;
    if (form.validate().hasErrors || !values.type) {
      setError("Revise os campos destacados antes de enviar.");
      return;
    }
    if (!unit) {
      setError("Escolha a unidade de novo antes de enviar.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = createOmbudsman(
        {
          title: values.title,
          description: values.description,
          type: values.type,
          buildingId: unit.id,
          buildingName: unit.name,
          occurrenceDate: values.occurrenceDate,
          occurrenceTime: values.occurrenceTime || null,
        },
        { uid: user.uid, name: profile.fullName },
      );
      if (online) await created.committed;
      else created.committed.catch(() => undefined);
      setResult({ id: created.id, protocol: created.protocol, pendingSync: !online });
      // O Voltar depois do envio sai do fluxo em vez de refazer os passos
      rewind();
    } catch (e: unknown) {
      setError(errorMessage(e, "Não foi possível enviar. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <SubmittedPanel
        protocol={result.protocol}
        detailPath={`/protocolos/ouvidoria/${result.id}`}
        pendingSync={result.pendingSync}
        kindLabel="Ouvidoria"
      />
    );
  }

  const last = step === OMBUDSMAN_TOTAL_STEPS;

  return (
    <div className={flow.page}>
      <div key={step} className={flow.step} data-dir={direction === "none" ? undefined : direction}>
        <StepHeading
          id={headingId}
          step={step}
          total={OMBUDSMAN_TOTAL_STEPS}
          title={QUESTIONS[step - 1]}
          lead={LEADS[step - 1]}
          headingRef={headingRef}
        />
        {step === 1 && <TypeStep value={form.values.type} onSelect={selectType} />}
        {step === 2 && (
          <PlaceStep
            form={form}
            units={units}
            loading={buildings.loading}
            error={buildings.error}
            onRetry={buildings.retry}
            today={today}
          />
        )}
        {step === 3 && <StoryStep form={form} />}
        {last && <OmbudsmanReview values={form.values} unitName={unit?.name ?? null} onEdit={move} />}
        {last && !online && (
          <p className={flow.note}>
            <IconWifiOff size={20} aria-hidden />
            Você está sem internet. O pedido fica guardado no celular e é enviado sozinho quando a conexão voltar.
          </p>
        )}
        {(step === 1 || last) && <OtherChannels />}
      </div>

      {error && (
        <p className={flow.error} role="alert">
          <IconAlertTriangle size={20} aria-hidden />
          {error}
        </p>
      )}

      {step > 1 && <FlowFooter onBack={() => move(step - 1)} onNext={last ? submit : next} submit={last} loading={submitting} />}
      <DiscardSheet open={discardOpen} onCancel={keepEditing} onDiscard={exit} />
    </div>
  );
}
