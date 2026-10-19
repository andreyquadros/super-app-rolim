import { useForm } from "@mantine/form";
import { IconAlertTriangle, IconWifiOff } from "@tabler/icons-react";
import { useCallback, useId, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { SubmittedPanel } from "@/components/SubmittedPanel";
import { uploadIssuePhoto } from "@/data/files";
import { createIssue, newIssueId } from "@/data/requests";
import type { IssueCategory } from "@/domain/catalog";
import { useOnline } from "@/hooks/useOnline";
import { useChrome } from "@/layouts/chrome/chromeContext";
import { errorMessage } from "@/lib/errors";
import { CategoryStep } from "./CategoryStep";
import { DetailsStep } from "./DetailsStep";
import { DiscardSheet, FlowFooter, focusFirstError, StepHeading } from "./flow/FlowParts";
import flow from "./flow/flow.module.css";
import { useStepFlow } from "./flow/useStepFlow";
import { INITIAL_ISSUE, ISSUE_TOTAL_STEPS, issueReachableStep, issueValidators, STEP_FIELDS, type IssueFormValues } from "./issueForm";
import { LocationStep } from "./LocationStep";
import { ReviewStep } from "./ReviewStep";

const QUESTIONS = ["Qual é o problema?", "Onde fica?", "Conte o que aconteceu", "Confira e envie"] as const;
const LEADS = [
  "Toque no tipo que mais combina. Na dúvida, escolha “Outro problema”.",
  "Toque no mapa para marcar o lugar exato, ou use sua localização. Dá para arrastar o marcador.",
  "Quanto mais detalhes, mais fácil para a equipe resolver.",
  "Veja se está tudo certo antes de enviar.",
] as const;

interface Submitted {
  id: string;
  protocol: string;
  pendingSync: boolean;
}

/** /zeladoria/nova: problema na rua em 4 passos (?passo=N). */
export default function NewIssuePage() {
  const { user, profile } = useAuth();
  const online = useOnline();
  const issueId = useMemo(() => newIssueId(), []);
  const headingId = useId();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Submitted | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const form = useForm<IssueFormValues>({ initialValues: INITIAL_ISSUE, validate: issueValidators });
  const { step, direction, headingRef, goTo, exit, rewind } = useStepFlow(ISSUE_TOTAL_STEPS, issueReachableStep(form.values));

  // X da barra: confirma antes de jogar fora o que foi preenchido
  const dirty = form.isDirty() || photo !== null;
  const requestClose = useCallback(() => (dirty ? setDiscardOpen(true) : exit()), [dirty, exit]);
  const keepEditing = useCallback(() => setDiscardOpen(false), []);
  useChrome({
    progress: { step: result ? ISSUE_TOTAL_STEPS : step, total: ISSUE_TOTAL_STEPS },
    onClose: result ? exit : requestClose,
  });

  const move = (target: number) => {
    setError(null);
    goTo(target);
  };

  const next = () => {
    const fields = STEP_FIELDS[step - 1] ?? [];
    const invalid = fields.map((field) => form.validateField(field).hasError).some(Boolean);
    if (invalid) {
      focusFirstError();
      return;
    }
    move(step + 1);
  };

  const selectCategory = (category: IssueCategory) => {
    form.setFieldValue("category", category);
    move(2);
  };

  const submit = async () => {
    if (!user || !profile) {
      setError("Sua sessão terminou. Entre de novo para enviar o pedido.");
      return;
    }
    const { values } = form;
    if (form.validate().hasErrors || !values.category || !values.point) {
      setError("Revise os campos destacados antes de enviar.");
      return;
    }
    if (photo && !online) {
      setError("Para enviar foto é preciso estar conectado. Remova a foto ou tente quando tiver internet.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const photoPath = photo ? await uploadIssuePhoto(user.uid, issueId, photo) : null;
      const created = createIssue(
        {
          id: issueId,
          title: values.title,
          description: values.description,
          category: values.category,
          lat: values.point.lat,
          lng: values.point.lng,
          address: {
            streetType: values.streetType,
            streetName: values.streetName,
            number: values.number || null,
            neighborhood: values.neighborhood,
            complement: values.complement || null,
          },
          photoPath,
        },
        { uid: user.uid, name: profile.fullName },
      );
      if (online) await created.committed;
      else created.committed.catch(() => undefined);
      setResult({ id: created.id, protocol: created.protocol, pendingSync: !online });
      // O Voltar depois do envio sai do fluxo em vez de refazer os passos
      rewind();
    } catch (e: unknown) {
      setError(errorMessage(e, "Não foi possível enviar. Verifique a conexão e tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <SubmittedPanel
        protocol={result.protocol}
        detailPath={`/protocolos/zeladoria/${result.id}`}
        pendingSync={result.pendingSync}
        kindLabel="Problema na rua"
      />
    );
  }

  const last = step === ISSUE_TOTAL_STEPS;

  return (
    <div className={flow.page}>
      <div key={step} className={flow.step} data-dir={direction === "none" ? undefined : direction}>
        <StepHeading id={headingId} step={step} total={ISSUE_TOTAL_STEPS} title={QUESTIONS[step - 1]} lead={LEADS[step - 1]} headingRef={headingRef} />
        {step === 1 && <CategoryStep value={form.values.category} onSelect={selectCategory} labelledBy={headingId} />}
        {step === 2 && <LocationStep form={form} />}
        {step === 3 && <DetailsStep form={form} photo={photo} onPhotoChange={setPhoto} onError={setError} online={online} />}
        {last && <ReviewStep values={form.values} photo={photo} onEdit={move} />}
        {last && !online && (
          <p className={flow.note}>
            <IconWifiOff size={20} aria-hidden />
            {photo ? (
              <span>
                Sem internet não dá para enviar foto.{" "}
                <button type="button" className={flow.inlineLink} onClick={() => setPhoto(null)}>
                  Remover a foto
                </button>{" "}
                ou espere a conexão voltar.
              </span>
            ) : (
              "Você está sem internet. O pedido fica guardado no celular e é enviado sozinho quando a conexão voltar."
            )}
          </p>
        )}
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
