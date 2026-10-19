import { useAuth } from "@/auth/AuthContext";
import { CompleteProfileInvite } from "./CompleteProfileInvite";
import { DeleteAccount } from "./DeleteAccount";
import { EmailStatus } from "./EmailStatus";
import { ProfileForm } from "./ProfileForm";
import { ProfileLoadError } from "./ProfileLoadError";
import classes from "./data.module.css";

/** /perfil/dados: conferir e corrigir o cadastro; excluir a conta no fim. */
export default function ProfileDataPage() {
  const { user, profile, profileError } = useAuth();

  return (
    <div className={classes.page}>
      <header className={classes.intro}>
        <h1 className={classes.h1}>Meus dados</h1>
        <p className={classes.lead}>Confira se está tudo certo. A equipe da prefeitura usa o celular para falar com você sobre seus pedidos.</p>
      </header>

      {user && profile ? (
        <ProfileForm key={user.uid} uid={user.uid} profile={profile} />
      ) : profileError ? (
        <ProfileLoadError />
      ) : (
        <CompleteProfileInvite next="/perfil/dados" />
      )}
      <EmailStatus />
      <DeleteAccount />
    </div>
  );
}
