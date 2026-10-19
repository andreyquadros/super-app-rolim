import { IconMapPin, IconMessage2, IconPhoto } from "@tabler/icons-react";
import { usePhotoPreview } from "@/components/PhotoPicker";
import { CATEGORY_ICONS } from "@/components/icons";
import { categoryOf } from "@/domain/catalog";
import { formatAddressLine } from "@/domain/format";
import { ReviewList, type ReviewEntry } from "./flow/Choices";
import review from "./flow/choices.module.css";
import type { IssueFormValues } from "./issueForm";

interface ReviewStepProps {
  values: IssueFormValues;
  photo: Blob | null;
  onEdit: (step: number) => void;
}

/** Passo 4: tudo o que vai ser enviado, com "Alterar" em cada parte. */
export function ReviewStep({ values, photo, onEdit }: ReviewStepProps) {
  const preview = usePhotoPreview(photo);
  const category = values.category ? categoryOf(values.category) : null;
  const CategoryIcon = values.category ? CATEGORY_ICONS[values.category] : IconMessage2;

  const entries: ReviewEntry[] = [
    {
      key: "problema",
      label: "Problema",
      icon: <CategoryIcon size={20} />,
      step: 1,
      editName: "o problema",
      value: category ? (
        <>
          <p className={review.reviewStrong}>{category.label}</p>
          <p className={review.reviewSoft}>Vai para: {category.department}</p>
        </>
      ) : (
        <p>—</p>
      ),
    },
    {
      key: "local",
      label: "Local",
      icon: <IconMapPin size={20} />,
      step: 2,
      editName: "o local",
      value: (
        <>
          <p>{formatAddressLine(values)}</p>
          {values.complement.trim() && <p className={review.reviewSoft}>Referência: {values.complement.trim()}</p>}
        </>
      ),
    },
    {
      key: "relato",
      label: "O que aconteceu",
      icon: <IconMessage2 size={20} />,
      step: 3,
      editName: "o que aconteceu",
      value: (
        <>
          <p className={review.reviewStrong}>{values.title.trim()}</p>
          <p className={review.reviewText}>{values.description.trim()}</p>
        </>
      ),
    },
    {
      key: "foto",
      label: "Foto",
      icon: <IconPhoto size={20} />,
      step: 3,
      editName: "a foto",
      value: preview ? <img src={preview} alt="Foto que será enviada" className={review.thumb} /> : <p className={review.reviewSoft}>Sem foto</p>,
    },
  ];

  return <ReviewList entries={entries} onEdit={onEdit} />;
}
