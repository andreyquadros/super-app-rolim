import { Alert, Button, Grid, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { IconCurrentLocation, IconMapPinExclamation } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { MapPicker } from "@/components/map";
import { CITY_NAME } from "@/config/city";
import { reverseGeocode } from "@/data/geocoding";
import { STREET_TYPES } from "@/domain/catalog";
import { isInsideMunicipality, type LatLng } from "@/domain/geo";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { IssueFormValues } from "./issueForm";

const AUTO_FIELDS = ["streetType", "streetName", "number", "neighborhood"] as const;
type AutoField = (typeof AUTO_FIELDS)[number];

interface LocationStepProps {
  form: UseFormReturnType<IssueFormValues>;
}

export function LocationStep({ form }: LocationStepProps) {
  const { locate, loading, error } = useGeolocation();
  const point = form.values.point;
  const lastGeocoded = useRef<string | null>(null);
  const autoFilled = useRef<Partial<Record<AutoField, string>>>({});

  // Preenche o endereço a partir do ponto marcado, sem sobrescrever o que a pessoa digitou
  useEffect(() => {
    if (!point || !isInsideMunicipality(point)) return undefined;
    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    if (lastGeocoded.current === key) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      reverseGeocode(point, controller.signal)
        .then((found) => {
          lastGeocoded.current = key;
          const current = form.getValues();
          AUTO_FIELDS.forEach((field) => {
            const value = found[field];
            const untouched = !current[field] || current[field] === autoFilled.current[field] || (field === "streetType" && current[field] === "Rua");
            if (value && untouched) {
              autoFilled.current[field] = value;
              form.setFieldValue(field, value);
            }
          });
        })
        .catch(() => undefined);
    }, 600);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // `form` é estável entre renderizações: reagimos apenas ao ponto marcado
  }, [point]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPoint = (p: LatLng) => form.setFieldValue("point", p);
  const outside = point !== null && !isInsideMunicipality(point);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed" maw={420}>
          Toque no mapa para marcar o local exato, ou use o GPS. Você pode arrastar o marcador.
        </Text>
        <Button
          variant="light"
          leftSection={<IconCurrentLocation size={18} />}
          loading={loading}
          onClick={async () => {
            const found = await locate();
            if (found) setPoint(found);
          }}
        >
          Usar minha localização
        </Button>
      </Group>
      {error && (
        <Alert color="ipe" variant="light">
          {error}
        </Alert>
      )}
      <MapPicker value={point} onChange={setPoint} height={300} />
      {form.errors.point && !outside && (
        <Text c="red" size="sm">
          {form.errors.point}
        </Text>
      )}
      {outside && (
        <Alert color="barro" icon={<IconMapPinExclamation size={18} />}>
          Este ponto fica fora do município de {CITY_NAME}. A prefeitura só pode atender dentro da linha tracejada.
        </Alert>
      )}
      <Grid gutter="sm">
        <Grid.Col span={{ base: 5, sm: 3 }}>
          <Select label="Tipo" data={[...STREET_TYPES]} allowDeselect={false} {...form.getInputProps("streetType")} />
        </Grid.Col>
        <Grid.Col span={{ base: 7, sm: 6 }}>
          <TextInput label="Logradouro" placeholder="Ex.: Norte Sul" {...form.getInputProps("streetName")} />
        </Grid.Col>
        <Grid.Col span={{ base: 4, sm: 3 }}>
          <TextInput label="Número" placeholder="S/N" {...form.getInputProps("number")} />
        </Grid.Col>
        <Grid.Col span={{ base: 8, sm: 6 }}>
          <TextInput label="Bairro" {...form.getInputProps("neighborhood")} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TextInput label="Ponto de referência" placeholder="Opcional" {...form.getInputProps("complement")} />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
