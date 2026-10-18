import { Alert, Button, Checkbox, Group, Modal, MultiSelect, Paper, Stack, Switch, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { findCitizen, saveStaff, type FoundCitizen } from "@/data/people";
import { maskCpf } from "@/domain/documents";
import { ROLE_LABEL } from "@/domain/roles";
import type { Role, StaffMember } from "@/domain/types";
import { useManagedUnits } from "@/hooks/useAdminData";
import { errorMessage } from "@/lib/errors";

const ROLE_HELP: Record<Role, string> = {
  ROOT: "Acesso total: unidades, equipe e todas as solicitações.",
  CIVIL_SERVANT: "Atende zeladoria e a ouvidoria/comunicados das unidades marcadas.",
  PHARMACY_MANAGER: "Atualiza aberta/plantão das farmácias em que for responsável.",
};

interface Person {
  uid: string;
  fullName: string;
  email: string;
  cpf: string;
}

interface StaffEditorProps {
  editing: StaffMember | "new" | null;
  onClose: () => void;
}

export function StaffEditor({ editing, onClose }: StaffEditorProps) {
  const { actor, isRoot } = useAuth();
  const { units } = useManagedUnits();
  const existing = editing === "new" ? null : editing;
  const [person, setPerson] = useState<Person | null>(existing ? { uid: existing.id, fullName: existing.fullName, email: existing.email, cpf: existing.cpf } : null);
  const [term, setTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>(existing?.roles ?? ["CIVIL_SERVANT"]);
  const [buildingIds, setBuildingIds] = useState<string[]>(existing?.buildingIds ?? []);
  const [active, setActive] = useState(existing?.active ?? true);
  const [busy, setBusy] = useState(false);

  const grantable: Role[] = isRoot ? ["ROOT", "CIVIL_SERVANT", "PHARMACY_MANAGER"] : ["CIVIL_SERVANT", "PHARMACY_MANAGER"];

  const search = async () => {
    setSearching(true);
    setSearchError(null);
    try {
      const found: FoundCitizen | null = await findCitizen(term);
      if (!found) setSearchError("Nenhum cadastro encontrado. A pessoa precisa criar a conta no app antes.");
      else setPerson({ uid: found.uid, fullName: found.fullName, email: found.email, cpf: found.cpf });
    } catch (e: unknown) {
      setSearchError(errorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const save = async () => {
    if (!actor || !person || roles.length === 0) return;
    setBusy(true);
    try {
      await saveStaff(person.uid, { roles, buildingIds, fullName: person.fullName, email: person.email, cpf: person.cpf, active }, actor, existing === null);
      notifications.show({ message: `Acesso de ${person.fullName} salvo.`, color: "mata" });
      onClose();
    } catch (e: unknown) {
      notifications.show({ title: "Não foi possível salvar", message: errorMessage(e), color: "barro" });
    } finally {
      setBusy(false);
    }
  };

  const isSelf = person?.uid === actor?.uid;

  return (
    <Modal opened={editing !== null} onClose={onClose} title={existing ? "Editar acesso" : "Adicionar pessoa à equipe"} size="lg">
      <Stack>
        {!person && (
          <>
            <Text size="sm" c="dimmed">
              Busque pelo CPF ou e-mail de quem já tem conta no app.
            </Text>
            <Group align="flex-end" wrap="nowrap">
              <TextInput style={{ flex: 1 }} label="CPF ou e-mail" value={term} onChange={(e) => setTerm(e.currentTarget.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
              <Button leftSection={<IconSearch size={16} />} onClick={search} loading={searching} disabled={term.trim().length < 5}>
                Buscar
              </Button>
            </Group>
            {searchError && <Alert color="ipe">{searchError}</Alert>}
          </>
        )}
        {person && (
          <>
            <Paper withBorder p="sm">
              <Text fw={700}>{person.fullName}</Text>
              <Text size="sm" c="dimmed">
                {person.email} · CPF {maskCpf(person.cpf)}
              </Text>
            </Paper>
            {isSelf && <Alert color="ipe">Você não pode alterar o próprio acesso. Peça a outro administrador.</Alert>}
            <Checkbox.Group label="Perfis de acesso" value={roles} onChange={(v) => setRoles(v as Role[])}>
              <Stack gap="xs" mt="xs">
                {grantable.map((r) => (
                  <Checkbox key={r} value={r} label={ROLE_LABEL[r]} description={ROLE_HELP[r]} disabled={isSelf} />
                ))}
              </Stack>
            </Checkbox.Group>
            {roles.includes("CIVIL_SERVANT") && (
              <MultiSelect
                label="Unidades que atende"
                description="Define a ouvidoria e os comunicados que a pessoa vê."
                data={units.map((u) => ({ value: u.id, label: u.name }))}
                value={buildingIds}
                onChange={setBuildingIds}
                searchable
                maxValues={30}
                disabled={isSelf}
              />
            )}
            {existing && <Switch label="Acesso ativo" checked={active} onChange={(e) => setActive(e.currentTarget.checked)} disabled={isSelf} />}
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={save} loading={busy} disabled={isSelf || roles.length === 0}>
                Salvar acesso
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
