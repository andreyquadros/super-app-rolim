import { ActionIcon, Button, Group, MultiSelect, SegmentedControl, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { MapPicker } from "@/components/map";
import { saveBuilding } from "@/data/buildings";
import { formatPhone, isValidPhone, onlyDigits } from "@/domain/documents";
import { isInsideMunicipality, type LatLng } from "@/domain/geo";
import { isDutyType } from "@/domain/duty";
import type { Building, BuildingType, PhoneType, StaffMember } from "@/domain/types";
import { errorMessage } from "@/lib/errors";

const PHONE_TYPES: Array<{ value: PhoneType; label: string }> = [
  { value: "LANDLINE", label: "Fixo" },
  { value: "MOBILE", label: "Celular" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

interface Values {
  name: string;
  type: BuildingType;
  address: string;
  point: LatLng | null;
  phones: Array<{ type: PhoneType; number: string }>;
  openingHours: string;
  ownerIds: string[];
  isOpen: boolean;
  isOnDuty: boolean;
  active: boolean;
}

interface BuildingFormProps {
  building: Building | null;
  dutyManagers: StaffMember[];
  /** Tipo sugerido ao criar (aba aberta no painel) */
  defaultType?: BuildingType;
  onDone: () => void;
}

export function BuildingForm({ building, dutyManagers, defaultType = "PUBLIC", onDone }: BuildingFormProps) {
  const [busy, setBusy] = useState(false);
  const form = useForm<Values>({
    initialValues: {
      name: building?.name ?? "",
      type: building?.type ?? defaultType,
      address: building?.address ?? "",
      point: building ? { lat: building.lat, lng: building.lng } : null,
      phones: building?.phones.map((p) => ({ type: p.type, number: formatPhone(p.number) })) ?? [],
      openingHours: building?.openingHours ?? "",
      ownerIds: building?.ownerIds ?? [],
      isOpen: building?.isOpen ?? true,
      isOnDuty: building?.isOnDuty ?? false,
      active: building?.active ?? true,
    },
    validate: {
      name: (v) => (v.trim().length >= 2 ? null : "Informe o nome"),
      address: (v) => (v.trim().length >= 3 ? null : "Informe o endereço"),
      point: (v) => (v && isInsideMunicipality(v) ? null : "Marque a localização dentro do município"),
      phones: { number: (v) => (isValidPhone(v) ? null : "Telefone inválido") },
    },
  });

  const submit = form.onSubmit(async (v) => {
    if (!v.point) return;
    setBusy(true);
    try {
      await saveBuilding(building?.id ?? null, {
        name: v.name,
        type: v.type,
        address: v.address,
        lat: v.point.lat,
        lng: v.point.lng,
        phones: v.phones.map((p) => ({ type: p.type, number: onlyDigits(p.number) })),
        openingHours: v.openingHours || null,
        ownerIds: v.ownerIds,
        isOpen: v.isOpen,
        isOnDuty: v.isOnDuty,
        active: v.active,
      });
      notifications.show({ message: "Unidade salva.", color: "mata" });
      onDone();
    } catch (e: unknown) {
      notifications.show({ title: "Não foi possível salvar", message: errorMessage(e), color: "barro" });
    } finally {
      setBusy(false);
    }
  });

  const isDuty = isDutyType(form.values.type);
  const isFuneral = form.values.type === "FUNERAL";

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <SegmentedControl
          value={form.values.type}
          onChange={(v) => form.setFieldValue("type", v as BuildingType)}
          data={[
            { value: "PUBLIC", label: "Unidade pública" },
            { value: "PHARMACY", label: "Farmácia" },
            { value: "FUNERAL", label: "Funerária" },
          ]}
        />
        <TextInput label="Nome" placeholder={isFuneral ? "Funerária…" : isDuty ? "Farmácia…" : "UBS Centro, Escola…"} {...form.getInputProps("name")} />
        <TextInput label="Endereço" {...form.getInputProps("address")} />
        <div>
          <Text size="sm" fw={500} mb={4}>
            Localização no mapa
          </Text>
          <MapPicker value={form.values.point} onChange={(p) => form.setFieldValue("point", p)} height={260} />
          {form.errors.point && (
            <Text c="red" size="xs" mt={4}>
              {form.errors.point}
            </Text>
          )}
        </div>
        <TextInput label="Horário de funcionamento" placeholder={isFuneral ? "Atendimento 24 horas" : "Seg–Sex 7h às 19h"} {...form.getInputProps("openingHours")} />
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Telefones
          </Text>
          {form.values.phones.map((_, index) => (
            <Group key={index} gap="xs" wrap="nowrap" align="flex-start">
              <Select w={130} data={PHONE_TYPES} allowDeselect={false} {...form.getInputProps(`phones.${index}.type`)} />
              <TextInput
                style={{ flex: 1 }}
                type="tel"
                {...form.getInputProps(`phones.${index}.number`)}
                onChange={(e) => form.setFieldValue(`phones.${index}.number`, formatPhone(e.currentTarget.value))}
              />
              <ActionIcon size="lg" color="gray" mt={4} onClick={() => form.removeListItem("phones", index)} aria-label="Remover telefone">
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          {form.values.phones.length < 5 && (
            <Button variant="subtle" size="xs" leftSection={<IconPlus size={14} />} onClick={() => form.insertListItem("phones", { type: "LANDLINE", number: "" })} style={{ alignSelf: "flex-start" }}>
              Adicionar telefone
            </Button>
          )}
        </Stack>
        {isDuty && (
          <>
            <MultiSelect
              label={isFuneral ? "Responsáveis pela funerária" : "Responsáveis pela farmácia"}
              description="Pessoas com acesso “Plantão” que podem atualizar aberta e plantão."
              data={dutyManagers.map((s) => ({ value: s.id, label: `${s.fullName} (${s.email})` }))}
              searchable
              {...form.getInputProps("ownerIds")}
            />
            <Group>
              <Switch label="Aberta agora" {...form.getInputProps("isOpen", { type: "checkbox" })} />
              <Switch label="De plantão" color="barro" {...form.getInputProps("isOnDuty", { type: "checkbox" })} />
            </Group>
          </>
        )}
        <Switch label="Ativa (aparece no app)" {...form.getInputProps("active", { type: "checkbox" })} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
