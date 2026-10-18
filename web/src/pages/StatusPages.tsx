import { Button } from "@mantine/core";
import { IconLock, IconMapQuestion } from "@tabler/icons-react";
import { Link } from "react-router";
import { EmptyState } from "@/components/EmptyState";

export function ForbiddenPage() {
  return (
    <EmptyState
      icon={<IconLock size={28} />}
      title="Acesso restrito"
      description="Esta área é da equipe da prefeitura. Se você deveria ter acesso, peça ao administrador para liberar seu CPF."
      action={
        <Button component={Link} to="/">
          Ir para o início
        </Button>
      }
    />
  );
}

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<IconMapQuestion size={28} />}
      title="Página não encontrada"
      description="O endereço pode ter mudado. Volte ao início para continuar."
      action={
        <Button component={Link} to="/">
          Ir para o início
        </Button>
      }
    />
  );
}
