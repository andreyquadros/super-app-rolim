import { useMantineColorScheme, type MantineColorScheme } from "@mantine/core";
import { IconBrightnessAuto, IconCircleHalf2, IconMoon, IconSun, IconTextSize } from "@tabler/icons-react";
import { useState } from "react";
import { getTextSize, setTextSize, TEXT_SIZE_LABEL, TEXT_SIZES, type TextSize } from "@/lib/preferences";
import { ChoiceGroup, type ChoiceOption } from "./ChoiceGroup";

// Prévia em px: mostra a diferença entre as opções mesmo com o texto já aumentado
const PREVIEW_PX: Record<TextSize, number> = { normal: 18, grande: 22, "muito-grande": 26 };

const TEXT_OPTIONS: readonly ChoiceOption<TextSize>[] = TEXT_SIZES.map((size) => ({
  value: size,
  label: TEXT_SIZE_LABEL[size],
  preview: <span style={{ fontSize: PREVIEW_PX[size] }}>Aa</span>,
}));

const SCHEME_OPTIONS: readonly ChoiceOption<MantineColorScheme>[] = [
  { value: "auto", label: "Automático", preview: <IconBrightnessAuto size={24} stroke={1.8} /> },
  { value: "light", label: "Claro", preview: <IconSun size={24} stroke={1.8} /> },
  { value: "dark", label: "Escuro", preview: <IconMoon size={24} stroke={1.8} /> },
];

/** "Tamanho do texto": vale na hora para o app inteiro. */
export function TextSizeChoice() {
  const [size, setSize] = useState<TextSize>(getTextSize);
  const choose = (next: TextSize) => {
    setTextSize(next);
    setSize(next);
  };
  return (
    <li>
      <ChoiceGroup
        legend="Tamanho do texto"
        icon={<IconTextSize size={22} stroke={1.8} />}
        hint="Muda as letras do app inteiro, na hora."
        name="tamanho-do-texto"
        options={TEXT_OPTIONS}
        value={size}
        onChange={choose}
      />
    </li>
  );
}

/** "Aparência": automático segue o tema do celular. */
export function AppearanceChoice() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  return (
    <li>
      <ChoiceGroup
        legend="Aparência"
        icon={<IconCircleHalf2 size={22} stroke={1.8} />}
        hint="No automático, o app fica claro ou escuro junto com o celular."
        name="aparencia"
        options={SCHEME_OPTIONS}
        value={colorScheme}
        onChange={setColorScheme}
      />
    </li>
  );
}
