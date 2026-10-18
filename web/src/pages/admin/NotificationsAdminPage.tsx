import { ActionIcon, Alert, Badge, Button, Group, Menu, Modal, Paper, Select, Skeleton, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications as toast } from "@mantine/notifications";
import { IconBell, IconDots, IconPencil, IconPlus, IconSend, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { deleteNotification, queueNotification, saveNotificationDraft, watchAdminNotifications } from "@/data/notifications";
import { formatDateTime } from "@/domain/format";
import type { CityNotification, NotificationStatus } from "@/domain/types";
import { useManagedUnits } from "@/hooks/useAdminData";
import { useWatch } from "@/hooks/useWatch";
import { errorMessage } from "@/lib/errors";

const STATUS: Record<NotificationStatus, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "gray" },
  QUEUED: { label: "Na fila", color: "ipe" },
  SENDING: { label: "Enviando", color: "ipe" },
  SENT: { label: "Enviado", color: "mata" },
  FAILED: { label: "Falhou", color: "barro" },
};

const editable = (n: CityNotification) => n.status === "DRAFT" || n.status === "FAILED";

function EditorModal({ editing, onClose }: { editing: CityNotification | "new" | null; onClose: () => void }) {
  const { actor } = useAuth();
  const { units } = useManagedUnits();
  const [busy, setBusy] = useState(false);
  const current = editing === "new" ? null : editing;
  const form = useForm({
    initialValues: { title: current?.title ?? "", body: current?.body ?? "", buildingId: current?.buildingId ?? units[0]?.id ?? null },
    validate: {
      title: (v) => (v.trim().length >= 3 ? null : "Informe um título"),
      body: (v) => (v.trim().length >= 3 ? null : "Escreva a mensagem"),
      buildingId: (v) => (v ? null : "Escolha a unidade responsável"),
    },
  });

  const save = form.onSubmit(async (values) => {
    const unit = units.find((u) => u.id === values.buildingId);
    if (!actor || !unit) return;
    setBusy(true);
    try {
      await saveNotificationDraft(current?.id ?? null, { title: values.title, body: values.body, buildingId: unit.id, buildingName: unit.name }, actor);
      toast.show({ message: "Rascunho salvo.", color: "mata" });
      onClose();
    } catch (e: unknown) {
      toast.show({ title: "Não foi possível salvar", message: errorMessage(e), color: "barro" });
    } finally {
      setBusy(false);
    }
  });

  return (
    <Modal opened={editing !== null} onClose={onClose} title={current ? "Editar comunicado" : "Novo comunicado"} size="lg">
      <form onSubmit={save} noValidate>
        <Stack>
          <Select label="Unidade responsável" data={units.map((u) => ({ value: u.id, label: u.name }))} searchable allowDeselect={false} {...form.getInputProps("buildingId")} />
          <TextInput label="Título" maxLength={120} description={`${form.values.title.length}/120 — aparece em destaque no aviso`} {...form.getInputProps("title")} />
          <Textarea label="Mensagem" autosize minRows={4} maxLength={2000} {...form.getInputProps("body")} />
          <Paper withBorder p="sm" bg="var(--app-paper)">
            <span className="eyebrow">Prévia do aviso</span>
            <Group gap="sm" mt={6} wrap="nowrap" align="flex-start">
              <img src="/pwa-64x64.png" alt="" width={32} height={32} style={{ borderRadius: 8 }} />
              <div>
                <Text fw={700} size="sm">
                  {form.values.title || "Título do comunicado"}
                </Text>
                <Text size="sm" lineClamp={2}>
                  {form.values.body || "Mensagem que será exibida no celular."}
                </Text>
              </div>
            </Group>
          </Paper>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy}>
              Salvar rascunho
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default function NotificationsAdminPage() {
  const { buildingScope } = useAuth();
  const scopeKey = buildingScope === null ? "*" : buildingScope.join(",");
  const watcher = useMemo(() => watchAdminNotifications(scopeKey === "*" ? null : scopeKey.split(",").filter(Boolean)), [scopeKey]);
  const { data, loading, error } = useWatch(watcher);
  const [editing, setEditing] = useState<CityNotification | "new" | null>(null);
  const [sending, setSending] = useState<CityNotification | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.show({ message: success, color: "mata" });
      setSending(null);
    } catch (e: unknown) {
      toast.show({ message: errorMessage(e), color: "barro" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="md">
      <PageHeader
        eyebrow="Comunicação"
        title="Comunicados"
        description="Avisos enviados para todos os celulares com notificações ativas e publicados no app."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing("new")}>
            Novo
          </Button>
        }
      />
      {error && <Alert color="barro">{error}</Alert>}
      {loading ? (
        <Skeleton h={200} radius="lg" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<IconBell size={28} />} title="Nenhum comunicado" description="Crie um rascunho, revise e envie quando estiver pronto." />
      ) : (
        <Stack gap="sm">
          {(data ?? []).map((n) => (
            <Paper key={n.id} withBorder p="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Group gap="xs">
                    <Badge color={STATUS[n.status].color}>{STATUS[n.status].label}</Badge>
                    <Text size="xs" c="dimmed">
                      {n.buildingName} · {n.status === "SENT" ? `enviado ${formatDateTime(n.sentAt)}` : `criado por ${n.createdByName}`}
                    </Text>
                  </Group>
                  <Text fw={700} mt={6}>
                    {n.title}
                  </Text>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {n.body}
                  </Text>
                  {n.status === "FAILED" && n.error && (
                    <Text size="xs" c="barro" mt={4}>
                      Erro: {n.error}
                    </Text>
                  )}
                </div>
                {editable(n) && (
                  <Group gap={4} wrap="nowrap">
                    <Button size="xs" leftSection={<IconSend size={14} />} onClick={() => setSending(n)}>
                      Enviar
                    </Button>
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon aria-label="Mais ações">
                          <IconDots size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => setEditing(n)}>
                          Editar
                        </Menu.Item>
                        <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => run(() => deleteNotification(n.id), "Rascunho excluído.")}>
                          Excluir
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {editing !== null && <EditorModal editing={editing} onClose={() => setEditing(null)} />}

      <Modal opened={sending !== null} onClose={() => setSending(null)} title="Enviar comunicado agora?">
        <Stack>
          <Text size="sm">
            <b>{sending?.title}</b> será enviado como aviso para todos os celulares cadastrados e ficará público no app. Não é possível desfazer.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSending(null)}>
              Revisar
            </Button>
            <Button leftSection={<IconSend size={16} />} loading={busy} onClick={() => sending && run(() => queueNotification(sending.id), "Comunicado na fila de envio.")}>
              Enviar para todos
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
