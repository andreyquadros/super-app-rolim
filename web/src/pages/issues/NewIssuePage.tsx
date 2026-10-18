import { Alert, Button, Group, Paper, SimpleGrid, Stack, Stepper, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNetwork } from "@mantine/hooks";
import { IconArrowLeft, IconArrowRight, IconSend } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { PhotoPicker } from "@/components/PhotoPicker";
import { SubmittedPanel } from "@/components/SubmittedPanel";
import { uploadIssuePhoto } from "@/data/files";
import { createIssue, newIssueId } from "@/data/requests";
import { categoryOf } from "@/domain/catalog";
import { errorMessage } from "@/lib/errors";
import { CategoryStep } from "./CategoryStep";
import { INITIAL_ISSUE, issueValidators, STEP_FIELDS, type IssueFormValues } from "./issueForm";
import { LocationStep } from "./LocationStep";
import classes from "./NewIssue.module.css";

interface Result {
  id: string;
  protocol: string;
  pendingSync: boolean;
}

function Summary({ values, hasPhoto }: { values: IssueFormValues; hasPhoto: boolean }) {
  const rows = [
    ["Tipo", values.category ? categoryOf(values.category).label : "—"],
    ["Setor responsável", values.category ? categoryOf(values.category).department : "—"],
    ["Endereço", `${values.streetType} ${values.streetName}${values.number ? `, ${values.number}` : ""} — ${values.neighborhood}`],
    ["Referência", values.complement || "—"],
    ["Título", values.title],
    ["Foto", hasPhoto ? "Anexada" : "Sem foto"],
  ];
  return (
    <Paper withBorder p="md">
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span className="eyebrow">{label}</span>
            <Text>{value}</Text>
          </div>
        ))}
      </SimpleGrid>
      <span className="eyebrow" style={{ display: "block", marginTop: 12 }}>
        Descrição
      </span>
      <Text style={{ whiteSpace: "pre-line" }}>{values.description}</Text>
    </Paper>
  );
}

export default function NewIssuePage() {
  const { user, profile } = useAuth();
  const { online } = useNetwork();
  const issueId = useMemo(() => newIssueId(), []);
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const form = useForm<IssueFormValues>({ initialValues: INITIAL_ISSUE, validate: issueValidators });

  if (result) {
    return <SubmittedPanel protocol={result.protocol} detailPath={`/protocolos/zeladoria/${result.id}`} pendingSync={result.pendingSync} />;
  }

  const next = () => {
    const fields = STEP_FIELDS[step] ?? [];
    const invalid = fields.map((f) => form.validateField(f).hasError).some(Boolean);
    if (!invalid) setStep((s) => s + 1);
  };

  const submit = async () => {
    if (!user || !profile) return;
    const { values } = form;
    if (form.validate().hasErrors || !values.category || !values.point) {
      setError("Revise os campos destacados antes de enviar.");
      return;
    }
    if (photo && !online) {
      setError("Para enviar foto é preciso estar conectado. Remova a foto ou tente quando tiver internet.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const photoPath = photo ? await uploadIssuePhoto(user.uid, issueId, photo) : null;
      const created = createIssue(
        {
          id: issueId,
          title: values.title,
          description: values.description,
          category: values.category,
          lat: values.point.lat,
          lng: values.point.lng,
          address: {
            streetType: values.streetType,
            streetName: values.streetName,
            number: values.number || null,
            neighborhood: values.neighborhood,
            complement: values.complement || null,
          },
          photoPath,
        },
        { uid: user.uid, name: profile.fullName },
      );
      if (online) await created.committed;
      else created.committed.catch(() => undefined);
      setResult({ id: created.id, protocol: created.protocol, pendingSync: !online });
    } catch (e: unknown) {
      setError(errorMessage(e, "Não foi possível enviar. Verifique a conexão e tente novamente."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap="lg">
      <PageHeader eyebrow="Zeladoria" title="Nova solicitação" back="/" />
      <Stepper active={step} onStepClick={(s) => s < step && setStep(s)} size="sm" allowNextStepsSelect={false}>
        <Stepper.Step label="O quê">
          <Text mb="md" fw={600}>
            Qual é o problema?
          </Text>
          <CategoryStep
            value={form.values.category}
            onSelect={(c) => {
              form.setFieldValue("category", c);
              setStep(1);
            }}
          />
          {form.errors.category && (
            <Text c="red" size="sm" mt="sm">
              {form.errors.category}
            </Text>
          )}
        </Stepper.Step>
        <Stepper.Step label="Onde">
          <LocationStep form={form} />
        </Stepper.Step>
        <Stepper.Step label="Detalhes">
          <Stack>
            <TextInput label="Título" placeholder="Ex.: Poste apagado em frente à escola" maxLength={120} {...form.getInputProps("title")} />
            <Textarea
              label="Descrição"
              placeholder="Conte o que está acontecendo, desde quando e qualquer detalhe que ajude a equipe."
              autosize
              minRows={4}
              maxLength={2000}
              {...form.getInputProps("description")}
            />
            <PhotoPicker value={photo} onChange={setPhoto} onError={setError} />
          </Stack>
        </Stepper.Step>
        <Stepper.Step label="Enviar">
          <Summary values={form.values} hasPhoto={photo !== null} />
        </Stepper.Step>
      </Stepper>

      {error && (
        <Alert color="barro" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {step > 0 && (
        <Group justify="space-between" className={classes.stickyActions}>
          <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => setStep((s) => s - 1)} disabled={submitting}>
            Voltar
          </Button>
          {step < 3 ? (
            <Button rightSection={<IconArrowRight size={16} />} onClick={next}>
              Continuar
            </Button>
          ) : (
            <Button rightSection={<IconSend size={16} />} onClick={submit} loading={submitting}>
              Enviar solicitação
            </Button>
          )}
        </Group>
      )}
    </Stack>
  );
}
