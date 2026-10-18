import { Alert, Button, Paper, SegmentedControl, Stack, Text, Textarea, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { changeStatus } from "@/data/requests";
import { nextStatuses, requiresResponse, STATUS_META, type RequestStatus } from "@/domain/status";
import type { CitizenRequest } from "@/domain/types";
import { errorMessage } from "@/lib/errors";

/** Avança a solicitação no fluxo, com resposta ao cidadão e nota interna. */
export function StatusChangeForm({ request }: { request: CitizenRequest }) {
  const { actor } = useAuth();
  const options = nextStatuses(request.status);
  const [to, setTo] = useState<RequestStatus | null>(options[0] ?? null);
  const [response, setResponse] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0 || !to) {
    return (
      <Alert color="gray" variant="light">
        Esta solicitação está finalizada ({STATUS_META[request.status].label.toLowerCase()}).
      </Alert>
    );
  }

  const needsResponse = requiresResponse(to);
  const responseError = needsResponse && response.trim().length < 10 ? "Explique ao cidadão o motivo (mínimo 10 caracteres)." : null;

  const submit = async () => {
    if (!actor || responseError) {
      setError(responseError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changeStatus(request, { to, officialResponse: response || null, internalNote: note || null }, actor);
      notifications.show({ message: `Situação alterada para "${STATUS_META[to].label}". O cidadão será avisado.`, color: "mata" });
      setResponse("");
      setNote("");
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper withBorder p="md" bg="var(--app-surface)">
      <Stack gap="sm">
        <Title order={3} fz="md">
          Atualizar situação
        </Title>
        <SegmentedControl
          value={to}
          onChange={(v) => setTo(v as RequestStatus)}
          data={options.map((s) => ({ value: s, label: STATUS_META[s].label }))}
          color={STATUS_META[to].color}
        />
        <Textarea
          label="Resposta ao cidadão"
          description={needsResponse ? "Obrigatória ao indeferir. Aparece no app e no e-mail." : "Opcional. Aparece no app e no e-mail."}
          autosize
          minRows={3}
          maxLength={2000}
          value={response}
          onChange={(e) => setResponse(e.currentTarget.value)}
          error={error && responseError ? responseError : undefined}
        />
        <Textarea
          label="Observação interna"
          description="Visível somente para a equipe."
          autosize
          minRows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        {error && !responseError && <Alert color="barro">{error}</Alert>}
        <Button onClick={submit} loading={busy} color={STATUS_META[to].color === "barro" ? "barro" : "mata"}>
          Confirmar: {STATUS_META[to].label}
        </Button>
        <Text size="xs" c="dimmed">
          O fluxo não permite voltar etapas. Confira antes de confirmar.
        </Text>
      </Stack>
    </Paper>
  );
}
