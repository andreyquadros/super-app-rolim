import { IconRefresh } from "@tabler/icons-react";
import { useAuth } from "@/auth/AuthContext";
import classes from "./profile.module.css";

/**
 * O cadastro não pôde ser lido (servidor sem resposta e nada salvo no
 * aparelho). Fica no lugar do convite "complete seu cadastro", que seria falso.
 */
export function ProfileLoadError() {
  const { retryProfile } = useAuth();
  return (
    <div className={classes.loadError} role="alert">
      <p className={classes.loadErrorText}>Não foi possível carregar seu cadastro. Confira a internet.</p>
      <button type="button" className={classes.loadErrorRetry} onClick={retryProfile} data-press>
        <IconRefresh size={18} aria-hidden />
        Tentar de novo
      </button>
    </div>
  );
}
