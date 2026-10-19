import { Textarea, TextInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { PhotoPicker } from "@/components/PhotoPicker";
import flow from "./flow/flow.module.css";
import type { IssueFormValues } from "./issueForm";

interface DetailsStepProps {
  form: UseFormReturnType<IssueFormValues>;
  photo: Blob | null;
  onPhotoChange: (photo: Blob | null) => void;
  onError: (message: string) => void;
  online: boolean;
}

/** Passo 3: resumo, descrição e foto opcional. */
export function DetailsStep({ form, photo, onPhotoChange, onError, online }: DetailsStepProps) {
  return (
    <div className={flow.fields}>
      <TextInput
        label="Resumo do problema"
        description="Em poucas palavras, como um título."
        placeholder="Ex.: Poste apagado na esquina"
        maxLength={120}
        size="lg"
        {...form.getInputProps("title")}
      />
      <Textarea
        label="O que está acontecendo?"
        description="Conte desde quando acontece e qualquer detalhe que ajude a equipe."
        autosize
        minRows={4}
        maxLength={2000}
        size="lg"
        {...form.getInputProps("description")}
      />
      <PhotoPicker value={photo} onChange={onPhotoChange} onError={onError} offline={!online} />
    </div>
  );
}
