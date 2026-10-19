import { useLocation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { AppLink } from "@/components/AppLink";
import { withNext } from "@/pages/auth/nextPath";
import classes from "./AppBar.module.css";
import { ProfileAvatar } from "./ProfileAvatar";

/** Avatar (link para o Perfil) ou a pílula "Entrar", que volta para esta tela depois do login. */
export function AccountButton() {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return <span className={classes.accountPlaceholder} aria-hidden />;
  if (!user) {
    return (
      <AppLink to={withNext("/entrar", pathname + search)} nav="flow" className={classes.signIn} data-press>
        Entrar
      </AppLink>
    );
  }
  return (
    // Nome pelo texto (não por aria-label): as iniciais são só imagem
    <AppLink to="/perfil" nav="tab" className={classes.avatarLink} data-press>
      <ProfileAvatar size={40} className={classes.avatar} />
      <span className="visually-hidden">Meu perfil</span>
    </AppLink>
  );
}
