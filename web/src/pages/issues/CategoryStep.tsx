import { CATEGORY_ICONS } from "@/components/icons";
import { ISSUE_CATEGORIES, type IssueCategory } from "@/domain/catalog";
import { ChoiceList, type ChoiceOption } from "./flow/Choices";

const OPTIONS: ReadonlyArray<ChoiceOption<IssueCategory>> = ISSUE_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
  hint: c.hint,
  icon: CATEGORY_ICONS[c.value],
}));

interface CategoryStepProps {
  value: IssueCategory | null;
  onSelect: (category: IssueCategory) => void;
  /** id do H1 "Qual é o problema?" */
  labelledBy: string;
}

/** Passo 1: tocar no tipo de problema escolhe e já avança. */
export function CategoryStep({ value, onSelect, labelledBy }: CategoryStepProps) {
  return <ChoiceList options={OPTIONS} value={value} onSelect={onSelect} labelledBy={labelledBy} />;
}
