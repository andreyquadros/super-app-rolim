import { Avatar } from "@mantine/core";
import { useAuth } from "@/auth/AuthContext";
import { AppLink } from "@/components/AppLink";
import classes from "./AppBar.module.css";

/** Avatar (link para o Perfil) ou a pílula "Entrar". */
export function AccountButton() {
  const { user, profile, loading } = useAuth();
  if (loading) return <span className={classes.accountPlaceholder} aria-hidden />;
  if (!user) {
    return (
      <AppLink to="/entrar" nav="flow" className={classes.signIn} data-press>
        Entrar
      </AppLink>
    );
  }
  return (
    <AppLink to="/perfil" nav="tab" className={classes.avatarLink} aria-label="Meu perfil" data-press>
      <Avatar name={profile?.fullName ?? user.email ?? "?"} color="initials" size={40} className={classes.avatar} />
    </AppLink>
  );
}
