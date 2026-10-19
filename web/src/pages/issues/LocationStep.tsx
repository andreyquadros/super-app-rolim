import { Autocomplete, Button, Select, TextInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { IconAlertTriangle, IconCurrentLocation, IconMapPinExclamation } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { CITY_NAME, NEIGHBORHOODS } from "@/config/city";
import { reverseGeocode } from "@/data/geocoding";
import { STREET_TYPES } from "@/domain/catalog";
import { isInsideMunicipality, type LatLng } from "@/domain/geo";
import { useGeolocation } from "@/hooks/useGeolocation";
import flow from "./flow/flow.module.css";
import type { IssueFormValues } from "./issueForm";
import classes from "./NewIssue.module.css";
import { PointPicker } from "./PointPicker";

const AUTO_FIELDS = ["streetType", "streetName", "number", "neighborhood"] as const;
type AutoField = (typeof AUTO_FIELDS)[number];

type IssueForm = UseFormReturnType<IssueFormValues>;

/** Preenche o endereço a partir do ponto marcado, sem sobrescrever o que a pessoa digitou. */
function useAutoAddress(form: IssueForm, point: LatLng | null): void {
  const lastGeocoded = useRef<string | null>(null);
  const autoFilled = useRef<Partial<Record<AutoField, string>>>({});

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
}

function GpsButton({ onFound }: { onFound: (point: LatLng) => void }) {
  const { locate, loading, error } = useGeolocation();
  return (
    <>
      <Button
        variant="light"
        size="lg"
        radius="xl"
        className={classes.gps}
        leftSection={<IconCurrentLocation size={22} aria-hidden />}
        loading={loading}
        onClick={async () => {
          const found = await locate();
          if (found) onFound(found);
        }}
      >
        Usar minha localização
      </Button>
      {error && (
        <p className={flow.note} role="alert">
          <IconAlertTriangle size={20} aria-hidden />
          {error}
        </p>
      )}
    </>
  );
}

function PointError({ form, point }: { form: IssueForm; point: LatLng | null }) {
  const outside = point !== null && !isInsideMunicipality(point);
  if (outside) {
    return (
      <p className={flow.error} data-flow-error tabIndex={-1} role="alert">
        <IconMapPinExclamation size={20} aria-hidden />
        Este ponto fica fora do município de {CITY_NAME}. A prefeitura só pode atender dentro da linha tracejada.
      </p>
    );
  }
  if (!form.errors.point) return null;
  return (
    <p className={flow.error} data-flow-error tabIndex={-1}>
      <IconMapPinExclamation size={20} aria-hidden />
      {form.errors.point}
    </p>
  );
}

function AddressFields({ form }: { form: IssueForm }) {
  return (
    <section className={flow.fields} aria-labelledby="endereco-titulo">
      <h2 id="endereco-titulo" className={flow.sectionTitle}>
        Endereço
      </h2>
      <div className={flow.fieldRow}>
        <div data-narrow>
          <Select label="Tipo" data={[...STREET_TYPES]} allowDeselect={false} size="lg" {...form.getInputProps("streetType")} />
        </div>
        <TextInput label="Logradouro" placeholder="Ex.: Norte Sul" size="lg" {...form.getInputProps("streetName")} />
      </div>
      <div className={flow.fieldRow}>
        <div data-narrow>
          <TextInput label="Número" placeholder="S/N" size="lg" {...form.getInputProps("number")} />
        </div>
        <Autocomplete label="Bairro" data={[...NEIGHBORHOODS]} limit={8} size="lg" {...form.getInputProps("neighborhood")} />
      </div>
      <TextInput label="Ponto de referência" description="Opcional. Ex.: em frente à escola" size="lg" {...form.getInputProps("complement")} />
    </section>
  );
}

/** Passo 2: ponto no mapa (ou GPS) e endereço, preenchido sozinho quando possível. */
export function LocationStep({ form }: { form: IssueForm }) {
  const point = form.values.point;
  useAutoAddress(form, point);
  const setPoint = (p: LatLng) => form.setFieldValue("point", p);

  return (
    <>
      <GpsButton onFound={setPoint} />
      <PointPicker value={point} onChange={setPoint} />
      <PointError form={form} point={point} />
      <AddressFields form={form} />
    </>
  );
}
