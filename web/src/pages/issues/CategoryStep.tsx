import { SimpleGrid, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { CATEGORY_ICONS } from "@/components/icons";
import { ISSUE_CATEGORIES, type IssueCategory } from "@/domain/catalog";
import classes from "./NewIssue.module.css";

interface CategoryStepProps {
  value: IssueCategory | null;
  onSelect: (category: IssueCategory) => void;
}

export function CategoryStep({ value, onSelect }: CategoryStepProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm" role="radiogroup" aria-label="Tipo de problema">
      {ISSUE_CATEGORIES.map((c) => {
        const Icon = CATEGORY_ICONS[c.value];
        const selected = value === c.value;
        return (
          <UnstyledButton
            key={c.value}
            className={classes.category}
            data-selected={selected || undefined}
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(c.value)}
          >
            <ThemeIcon size={44} radius="md" variant={selected ? "filled" : "light"} color="mata">
              <Icon size={24} stroke={1.6} />
            </ThemeIcon>
            <Text fw={700} mt="sm" lh={1.2}>
              {c.label}
            </Text>
            <Text size="xs" c="dimmed" mt={4} lh={1.35}>
              {c.hint}
            </Text>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );
}
