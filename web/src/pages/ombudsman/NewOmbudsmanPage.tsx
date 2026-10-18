import { Alert, Button, Chip, Grid, Group, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconSend } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useOnline } from "@/hooks/useOnline";
import { PageHeader } from "@/components/PageHeader";
import { SubmittedPanel } from "@/components/SubmittedPanel";
import { CONTACTS } from "@/config/city";
import { watchBuildings } from "@/data/buildings";
import { createOmbudsman } from "@/data/requests";
import { OMBUDSMAN_TYPES, type OmbudsmanType } from "@/domain/catalog";
import { toIsoDate } from "@/domain/format";
import { useWatch } from "@/hooks/useWatch";
import { errorMessage } from "@/lib/errors";

interface Values {
  type: OmbudsmanType | "";
  buildingId: string | null;
  occurrenceDate: string;
  occurrenceTime: string;
  title: string;
  description: string;
}

export default function NewOmbudsmanPage() {
  const { user, profile } = useAuth();
  const online = useOnline();
  const watcher = useMemo(() => watchBuildings("PUBLIC"), []);
  const buildings = useWatch(watcher);
  const units = (buildings.data ?? []).filter((b) => b.active);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; protocol: string; pendingSync: boolean } | null>(null);
  const today = toIsoDate(new Date());

  const form = useForm<Values>({
    initialValues: { type: "", buildingId: null, occurrenceDate: today, occurrenceTime: "", title: "", description: "" },
    validate: {
      type: (v) => (v ? null : "Escolha o assunto"),
      buildingId: (v) => (v ? null : "Escolha a unidade"),
      occurrenceDate: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today ? null : "Informe uma data até hoje"),
      occurrenceTime: (v) => (!v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : "Horário inválido"),
      title: (v) => (v.trim().length >= 5 && v.trim().length <= 120 ? null : "Resuma em 5 a 120 caracteres"),
      description: (v) => (v.trim().length >= 10 ? null : "Descreva com pelo menos 10 caracteres"),
    },
  });

  if (result) {
    return <SubmittedPanel protocol={result.protocol} detailPath={`/protocolos/ouvidoria/${result.id}`} pendingSync={result.pendingSync} />;
  }

  const submit = form.onSubmit(async (values) => {
    if (!user || !profile || !values.type) return;
    const unit = units.find((b) => b.id === values.buildingId);
    if (!unit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = createOmbudsman(
        {
          title: values.title,
          description: values.description,
          type: values.type,
          buildingId: unit.id,
          buildingName: unit.name,
          occurrenceDate: values.occurrenceDate,
          occurrenceTime: values.occurrenceTime || null,
        },
        { uid: user.uid, name: profile.fullName },
      );
      if (online) await created.committed;
      else created.committed.catch(() => undefined);
      setResult({ id: created.id, protocol: created.protocol, pendingSync: !online });
    } catch (e: unknown) {
      setError(errorMessage(e, "Não foi possível enviar. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Stack gap="lg">
      <PageHeader
        eyebrow="Ouvidoria"
        title="Fale com a prefeitura"
        description="Registre elogios, sugestões ou reclamações sobre o atendimento em uma unidade pública."
        back="/"
      />
      <form onSubmit={submit} noValidate>
        <Stack gap="lg">
          <div>
            <Text fw={600} mb="xs">
              Assunto
            </Text>
            <Chip.Group value={form.values.type} onChange={(v) => form.setFieldValue("type", v as OmbudsmanType)}>
              <Group gap="xs">
                {OMBUDSMAN_TYPES.map((t) => (
                  <Chip key={t.value} value={t.value} color={t.tone === "positive" ? "mata" : t.tone === "negative" ? "barro" : "slate"} variant="light">
                    {t.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            {form.errors.type && (
              <Text c="red" size="sm" mt={6}>
                {form.errors.type}
              </Text>
            )}
          </div>
          <Select
            label="Unidade"
            placeholder={buildings.loading ? "Carregando unidades…" : "Escola, UBS, secretaria…"}
            data={units.map((b) => ({ value: b.id, label: b.name }))}
            searchable
            nothingFoundMessage="Nenhuma unidade encontrada"
            size="md"
            {...form.getInputProps("buildingId")}
          />
          <Grid gutter="sm">
            <Grid.Col span={7}>
              <TextInput label="Data do ocorrido" type="date" max={today} {...form.getInputProps("occurrenceDate")} />
            </Grid.Col>
            <Grid.Col span={5}>
              <TextInput label="Horário" type="time" description="Opcional" {...form.getInputProps("occurrenceTime")} />
            </Grid.Col>
          </Grid>
          <TextInput label="Título" placeholder="Ex.: Ótimo atendimento na recepção" maxLength={120} {...form.getInputProps("title")} />
          <Textarea label="Relato" autosize minRows={5} maxLength={2000} placeholder="Conte o que aconteceu com o máximo de detalhes." {...form.getInputProps("description")} />
          {error && (
            <Alert color="barro" variant="light">
              {error}
            </Alert>
          )}
          <Button type="submit" size="md" rightSection={<IconSend size={16} />} loading={submitting}>
            Enviar para a ouvidoria
          </Button>
          {(CONTACTS.ouvidoriaPhone || CONTACTS.ouvidoriaEmail) && (
            <Text size="sm" c="dimmed" ta="center">
              Prefere outro canal? {CONTACTS.ouvidoriaPhone} {CONTACTS.ouvidoriaEmail}
            </Text>
          )}
        </Stack>
      </form>
    </Stack>
  );
}
