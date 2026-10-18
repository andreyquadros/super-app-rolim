import { Alert, Anchor, Avatar, Button, Divider, Group, Modal, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconLayoutDashboard, IconLogout, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { InstallCard } from "@/components/InstallCard";
import { PushToggle } from "@/components/PushToggle";
import { updateProfile } from "@/data/people";
import { formatPhone, isValidPhone, maskCpf } from "@/domain/documents";
import { errorMessage } from "@/lib/errors";

function DeleteAccount() {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [opened, { open, close }] = useDisclosure(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      navigate("/", { replace: true });
      notifications.show({ message: "Sua conta foi excluída.", color: "gray" });
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="subtle" color="barro" leftSection={<IconTrash size={16} />} onClick={open}>
        Excluir minha conta
      </Button>
      <Modal opened={opened} onClose={close} title="Excluir conta?">
        <Stack>
          <Text size="sm">
            Seus dados de cadastro (nome, CPF, telefone) serão apagados e o CPF ficará livre. As solicitações já abertas continuam registradas
            na prefeitura como histórico público. Esta ação não pode ser desfeita.
          </Text>
          {error && <Alert color="barro">{error}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Voltar
            </Button>
            <Button color="barro" loading={busy} onClick={confirm}>
              Excluir definitivamente
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export default function ProfilePage() {
  const { user, profile, staff, signOut } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: { fullName: profile?.fullName ?? "", phone: formatPhone(profile?.phone ?? "") },
    validate: {
      fullName: (v) => (v.trim().length >= 5 ? null : "Informe nome e sobrenome"),
      phone: (v) => (isValidPhone(v) ? null : "Telefone inválido"),
    },
  });

  if (!user) return <Navigate to="/entrar" replace />;
  if (!profile) return <Navigate to="/completar-cadastro?next=/perfil" replace />;

  const save = form.onSubmit(async (values) => {
    setSaving(true);
    try {
      await updateProfile(user.uid, { ...values, email: profile.email });
      form.resetDirty();
      notifications.show({ message: "Cadastro atualizado.", color: "mata" });
    } catch (e: unknown) {
      notifications.show({ title: "Não foi possível salvar", message: errorMessage(e), color: "barro" });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Stack gap="lg">
      <Group gap="md">
        <Avatar name={profile.fullName} color="initials" size={64} />
        <div>
          <Title order={1} fz={28}>
            {profile.fullName}
          </Title>
          <Text c="dimmed" size="sm">
            {profile.email} · CPF {maskCpf(profile.cpf)}
          </Text>
        </div>
      </Group>

      {staff && (
        <Button component={Link} to="/painel" variant="light" leftSection={<IconLayoutDashboard size={18} />} size="md">
          Abrir painel da prefeitura
        </Button>
      )}

      <Paper withBorder p="md">
        <PushToggle />
      </Paper>

      <InstallCard force />

      <Paper withBorder p="md">
        <form onSubmit={save} noValidate>
          <Stack>
            <Title order={2} fz="lg">
              Meus dados
            </Title>
            <TextInput label="Nome completo" {...form.getInputProps("fullName")} />
            <TextInput
              label="Celular"
              type="tel"
              {...form.getInputProps("phone")}
              onChange={(e) => form.setFieldValue("phone", formatPhone(e.currentTarget.value))}
            />
            <Text size="xs" c="dimmed">
              Para corrigir o CPF, procure a prefeitura.
            </Text>
            <Group>
              <Button type="submit" loading={saving} disabled={!form.isDirty()}>
                Salvar
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      <Divider />
      <Group justify="space-between">
        <Button variant="default" leftSection={<IconLogout size={16} />} onClick={() => { navigate("/", { replace: true }); void signOut(); }}>
          Sair
        </Button>
        <DeleteAccount />
      </Group>
      <Anchor component={Link} to="/privacidade" size="sm" c="dimmed">
        Privacidade e uso de dados
      </Anchor>
    </Stack>
  );
}
