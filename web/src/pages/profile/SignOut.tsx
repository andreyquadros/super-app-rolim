import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLogout } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { errorMessage } from "@/lib/errors";
import classes from "./profile.module.css";

/** "Sair" com confirmação: entrar de novo exige e-mail e senha. */
export function SignOut() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    setBusy(true);
    try {
      // Apaga os dados locais e recarrega o app na Início
      await signOut();
    } catch (error: unknown) {
      setBusy(false);
      notifications.show({ title: "Não foi possível sair", message: errorMessage(error), color: "barro" });
    }
  };

  return (
    <>
      <ListGroup>
        <ListRow icon={<IconLogout size={22} stroke={1.8} />} label="Sair" description="Desconectar a conta deste celular" onClick={() => setOpen(true)} />
      </ListGroup>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Sair da conta?"
        description="Para entrar de novo, você vai precisar do seu e-mail e da senha."
      >
        <div className={classes.sheetActions}>
          <Button size="lg" radius="xl" fullWidth loading={busy} onClick={() => void leave()}>
            Sair
          </Button>
          <Button size="lg" radius="xl" fullWidth variant="default" onClick={() => setOpen(false)} disabled={busy}>
            Continuar conectado
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
