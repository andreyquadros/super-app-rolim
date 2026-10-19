import { Select, Textarea, TextInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { IconAlertTriangle, IconBuildingCommunity, IconMessage2, IconRefresh } from "@tabler/icons-react";
import { OMBUDSMAN_ICONS } from "@/components/icons";
import { ombudsmanTypeOf } from "@/domain/catalog";
import type { Building } from "@/domain/types";
import { ReviewList, type ReviewEntry } from "@/pages/issues/flow/Choices";
import review from "@/pages/issues/flow/choices.module.css";
import flow from "@/pages/issues/flow/flow.module.css";
import { formatOccurrence, type OmbudsmanFormValues } from "./ombudsmanForm";
import classes from "./NewOmbudsman.module.css";

type Form = UseFormReturnType<OmbudsmanFormValues>;

interface PlaceStepProps {
  form: Form;
  units: readonly Building[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  today: string;
}

/** Passo 2: a unidade pública e quando aconteceu. */
export function PlaceStep({ form, units, loading, error, onRetry, today }: PlaceStepProps) {
  return (
    <div className={flow.fields}>
      {error ? (
        <div className={flow.error} role="alert">
          <IconAlertTriangle size={20} aria-hidden />
          <div className={classes.retry}>
            <span>Não foi possível carregar as unidades.</span>
            <button type="button" className={classes.retryButton} onClick={onRetry} data-press>
              <IconRefresh size={18} aria-hidden />
              Tentar de novo
            </button>
          </div>
        </div>
      ) : (
        <Select
          label="Unidade"
          description="Escola, posto de saúde, secretaria… Dá para digitar para procurar."
          placeholder={loading ? "Carregando unidades…" : "Escolha a unidade"}
          data={units.map((b) => ({ value: b.id, label: b.name }))}
          searchable
          nothingFoundMessage="Nenhuma unidade com esse nome"
          size="lg"
          disabled={loading}
          {...form.getInputProps("buildingId")}
        />
      )}
      <div className={flow.fieldRow}>
        <TextInput label="Dia" type="date" max={today} size="lg" {...form.getInputProps("occurrenceDate")} />
        <div data-narrow>
          <TextInput
            label="Horário"
            description="Opcional"
            inputWrapperOrder={["label", "input", "description", "error"]}
            type="time"
            size="lg"
            {...form.getInputProps("occurrenceTime")}
          />
        </div>
      </div>
    </div>
  );
}

/** Passo 3: resumo e relato. */
export function StoryStep({ form }: { form: Form }) {
  return (
    <div className={flow.fields}>
      <TextInput
        label="Resumo"
        description="Em poucas palavras, como um título."
        placeholder="Ex.: Ótimo atendimento na recepção"
        maxLength={120}
        size="lg"
        {...form.getInputProps("title")}
      />
      <Textarea
        label="Relato"
        description="Conte o que aconteceu com o máximo de detalhes: quem, o quê e como."
        autosize
        minRows={5}
        maxLength={2000}
        size="lg"
        {...form.getInputProps("description")}
      />
    </div>
  );
}

interface OmbudsmanReviewProps {
  values: OmbudsmanFormValues;
  unitName: string | null;
  onEdit: (step: number) => void;
}

/** Passo 4: tudo o que vai para a ouvidoria, com "Alterar" em cada parte. */
export function OmbudsmanReview({ values, unitName, onEdit }: OmbudsmanReviewProps) {
  const type = values.type ? ombudsmanTypeOf(values.type) : null;
  const TypeIcon = values.type ? OMBUDSMAN_ICONS[values.type] : IconMessage2;

  const entries: ReviewEntry[] = [
    {
      key: "assunto",
      label: "Assunto",
      icon: <TypeIcon size={20} />,
      step: 1,
      editName: "o assunto",
      value: <p className={review.reviewStrong}>{type?.label ?? "—"}</p>,
    },
    {
      key: "onde",
      label: "Onde e quando",
      icon: <IconBuildingCommunity size={20} />,
      step: 2,
      editName: "onde e quando",
      value: (
        <>
          <p>{unitName ?? "—"}</p>
          <p className={review.reviewSoft}>{formatOccurrence(values.occurrenceDate, values.occurrenceTime)}</p>
        </>
      ),
    },
    {
      key: "relato",
      label: "Relato",
      icon: <IconMessage2 size={20} />,
      step: 3,
      editName: "o relato",
      value: (
        <>
          <p className={review.reviewStrong}>{values.title.trim()}</p>
          <p className={review.reviewText}>{values.description.trim()}</p>
        </>
      ),
    },
  ];

  return <ReviewList entries={entries} onEdit={onEdit} />;
}
