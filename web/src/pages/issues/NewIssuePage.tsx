import { useForm, type UseFormReturnType } from "@mantine/form";
import { IconWifiOff } from "@tabler/icons-react";
import { useId, useMemo, useState } from "react";
import { SubmittedPanel } from "@/components/SubmittedPanel";
import { uploadIssuePhoto } from "@/data/files";
import { createIssue, newIssueId } from "@/data/requests";
import { useOnline } from "@/hooks/useOnline";
import { CategoryStep } from "./CategoryStep";
import { DetailsStep } from "./DetailsStep";
import { FlowFrame } from "./flow/FlowFrame";
import flowCss from "./flow/flow.module.css";
import { REVIEW_FIELDS, useFlow, type Flow, type Prepared } from "./flow/useFlow";
import { INITIAL_ISSUE, ISSUE_TOTAL_STEPS, issueDraft, issueReachableStep, issueValidators, STEP_FIELDS, type IssueDraft, type IssueFormValues } from "./issueForm";
import { LocationStep } from "./LocationStep";
import { ReviewStep } from "./ReviewStep";

const QUESTIONS = ["Qual é o problema?", "Onde fica?", "Conte o que aconteceu", "Confira e envie"] as const;
const LEADS = [
  "Toque no tipo que mais combina. Na dúvida, escolha “Outro problema”.",
  "Toque no mapa para marcar o lugar exato, ou use sua localização. Dá para arrastar o marcador.",
  "Quanto mais detalhes, mais fácil para a equipe resolver.",
  "Veja se está tudo certo antes de enviar.",
] as const;

const PHOTO_NEEDS_ONLINE = "Para enviar foto é preciso estar conectado. Remova a foto ou tente quando tiver internet.";
const SEND_FAILED = "Não foi possível enviar. Verifique a conexão e tente novamente.";

type IssueForm = UseFormReturnType<IssueFormValues>;

/** Checagem final: campos válidos e, com foto, internet para enviá-la. */
function prepareIssue(form: IssueForm, id: string, photo: Blob | null, online: boolean): Prepared<IssueDraft> {
  if (form.validate().hasErrors) return { error: REVIEW_FIELDS };
  const draft = issueDraft(form.values, id);
  if (!draft) return { error: REVIEW_FIELDS };
  if (photo && !online) return { error: PHOTO_NEEDS_ONLINE };
  return { payload: draft };
}

function OfflineNote({ photo, onRemovePhoto }: { photo: Blob | null; onRemovePhoto: () => void }) {
  return (
    <p className={flowCss.note}>
      <IconWifiOff size={20} aria-hidden />
      {photo ? (
        <span>
          Sem internet não dá para enviar foto.{" "}
          <button type="button" className={flowCss.inlineLink} onClick={onRemovePhoto}>
            Remover a foto
          </button>{" "}
          ou espere a conexão voltar.
        </span>
      ) : (
        "Você está sem internet. O pedido fica guardado no celular e é enviado sozinho quando a conexão voltar."
      )}
    </p>
  );
}

interface IssueStepsProps {
  wizard: Flow;
  form: IssueForm;
  headingId: string;
  photo: Blob | null;
  onPhotoChange: (photo: Blob | null) => void;
  online: boolean;
}

/** Conteúdo do passo atual. */
function IssueSteps({ wizard, form, headingId, photo, onPhotoChange, online }: IssueStepsProps) {
  const { step, move } = wizard;
  const last = step === ISSUE_TOTAL_STEPS;
  return (
    <>
      {step === 1 && (
        <CategoryStep
          value={form.values.category}
          onSelect={(category) => {
            form.setFieldValue("category", category);
            move(2);
          }}
          labelledBy={headingId}
        />
      )}
      {step === 2 && <LocationStep form={form} />}
      {step === 3 && <DetailsStep form={form} photo={photo} onPhotoChange={onPhotoChange} onError={wizard.setError} online={online} />}
      {last && <ReviewStep values={form.values} photo={photo} onEdit={move} />}
      {last && !online && <OfflineNote photo={photo} onRemovePhoto={() => onPhotoChange(null)} />}
    </>
  );
}

/** /zeladoria/nova: problema na rua em 4 passos (?passo=N). */
export default function NewIssuePage() {
  const online = useOnline();
  const headingId = useId();
  const issueId = useMemo(() => newIssueId(), []);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const form = useForm<IssueFormValues>({ initialValues: INITIAL_ISSUE, validate: issueValidators });
  const wizard = useFlow({
    form,
    total: ISSUE_TOTAL_STEPS,
    reachable: issueReachableStep(form.values),
    stepFields: STEP_FIELDS,
    dirty: form.isDirty() || photo !== null,
    online,
  });

  const submit = () =>
    void wizard.send(
      () => prepareIssue(form, issueId, photo, online),
      async (draft, author) => {
        const photoPath = photo ? await uploadIssuePhoto(author.uid, issueId, photo) : null;
        return createIssue({ ...draft, photoPath }, author);
      },
      SEND_FAILED,
    );

  if (wizard.sent) {
    const { id, protocol, pendingSync } = wizard.sent;
    return <SubmittedPanel protocol={protocol} detailPath={`/protocolos/zeladoria/${id}`} pendingSync={pendingSync} kindLabel="Problema na rua" />;
  }

  return (
    <FlowFrame flow={wizard} headingId={headingId} question={QUESTIONS[wizard.step - 1]} lead={LEADS[wizard.step - 1]} onSubmit={submit}>
      <IssueSteps wizard={wizard} form={form} headingId={headingId} photo={photo} onPhotoChange={setPhoto} online={online} />
    </FlowFrame>
  );
}
