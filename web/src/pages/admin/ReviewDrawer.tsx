import { Anchor, Button, Divider, Drawer, Group, Paper, Stack, Text, Textarea, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandWhatsapp, IconMail } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { watchProfile } from "@/data/people";
import { addNote, watchHistory, watchNotes } from "@/data/requests";
import { formatPhone, whatsappLink } from "@/domain/documents";
import { formatDateTime } from "@/domain/format";
import type { CitizenRequest } from "@/domain/types";
import { useWatch } from "@/hooks/useWatch";
import { errorMessage } from "@/lib/errors";
import { RequestDetails } from "@/pages/requests/RequestDetails";
import { StatusChangeForm } from "./StatusChangeForm";

function CitizenContact({ uid, name }: { uid: string; name: string }) {
  const watcher = useMemo(() => watchProfile(uid), [uid]);
  const { data: profile } = useWatch(watcher);
  return (
    <Paper withBorder p="sm">
      <span className="eyebrow">Cidadão</span>
      <Text fw={600}>{profile?.fullName ?? name}</Text>
      {profile ? (
        <Group gap="md" mt={4}>
          <Anchor href={`mailto:${profile.email}`} size="sm">
            <IconMail size={14} style={{ verticalAlign: "-2px" }} /> {profile.email}
          </Anchor>
          <Anchor href={whatsappLink(profile.phone)} target="_blank" rel="noreferrer" size="sm">
            <IconBrandWhatsapp size={14} style={{ verticalAlign: "-2px" }} /> {formatPhone(profile.phone)}
          </Anchor>
        </Group>
      ) : (
        <Text size="xs" c="dimmed">
          Cadastro não disponível (conta excluída).
        </Text>
      )}
    </Paper>
  );
}

function InternalNotes({ request }: { request: CitizenRequest }) {
  const { actor } = useAuth();
  const watcher = useMemo(() => watchNotes(request.kind, request.id), [request.kind, request.id]);
  const { data } = useWatch(watcher);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!actor || !text.trim()) return;
    setBusy(true);
    try {
      await addNote(request.kind, request.id, text, actor);
      setText("");
    } catch (e: unknown) {
      notifications.show({ message: errorMessage(e), color: "barro" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="xs">
      <Title order={3} fz="md">
        Observações internas
      </Title>
      {(data ?? []).map((n) => (
        <Paper key={n.id} p="sm" withBorder bg="var(--app-paper)">
          <Text size="sm" style={{ whiteSpace: "pre-line" }}>
            {n.text}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {n.byName} · {formatDateTime(n.at)}
          </Text>
        </Paper>
      ))}
      <Textarea placeholder="Anotação para a equipe…" autosize minRows={2} maxLength={1000} value={text} onChange={(e) => setText(e.currentTarget.value)} />
      <Group justify="flex-end">
        <Button size="xs" variant="light" onClick={save} loading={busy} disabled={!text.trim()}>
          Adicionar observação
        </Button>
      </Group>
    </Stack>
  );
}

interface ReviewDrawerProps {
  request: CitizenRequest | null;
  onClose: () => void;
}

export function ReviewDrawer({ request, onClose }: ReviewDrawerProps) {
  const [current, setCurrent] = useState(request);
  useEffect(() => {
    if (request) setCurrent(request);
  }, [request]);
  const watcher = useMemo(() => (current ? watchHistory(current.kind, current.id) : null), [current?.kind, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const history = useWatch(watcher);

  return (
    <Drawer
      opened={request !== null}
      onClose={onClose}
      position="right"
      size="xl"
      title={
        current && (
          <Group gap="sm">
            <Text className="protocol">{current.protocol}</Text>
            <StatusBadge status={current.status} />
          </Group>
        )
      }
    >
      {current && (
        <Stack gap="lg">
          <Title order={2}>{current.title}</Title>
          <CitizenContact uid={current.citizenId} name={current.citizenName} />
          <StatusChangeForm key={`${current.id}-${current.status}`} request={current} />
          <div>
            <Title order={3} fz="md" mb="sm">
              Histórico
            </Title>
            <StatusTimeline request={current} history={history.data ?? []} showAuthor />
          </div>
          <Divider />
          <RequestDetails request={current} />
          <Divider />
          <InternalNotes request={current} />
        </Stack>
      )}
    </Drawer>
  );
}
