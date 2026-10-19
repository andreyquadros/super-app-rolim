import { IconChevronRight, IconLayoutDashboard } from "@tabler/icons-react";
import { useAuth } from "@/auth/AuthContext";
import { AppLink } from "@/components/AppLink";
import { firstName, toIsoDate } from "@/domain/format";
import { greetingParts, homeGreeting, longDate } from "./homeText";
import classes from "./HomeHeader.module.css";

interface HomeHeaderProps {
  now: Date;
}

/** Saudação, data por extenso e a foto da cidade em cartão-postal (continua o verde da barra). */
export function HomeHeader({ now }: HomeHeaderProps) {
  const { user, profile, staff, loading } = useAuth();
  const name = firstName(profile?.fullName ?? user?.displayName);
  const title = greetingParts(homeGreeting({ loading, signedIn: user !== null, name }, now));

  return (
    <header className={classes.header}>
      <h1 className={classes.title} tabIndex={-1}>
        <span className={classes.lead}>{title.lead}</span>
        {title.rest}
      </h1>
      {/* Foto: Franklin Baldo, CC BY 2.5, via Wikimedia Commons (créditos em Perfil › Sobre o app) */}
      <picture className={classes.artFrame}>
        <source srcSet="/ilustracoes/rolim-de-moura.webp" type="image/webp" />
        <img
          src="/ilustracoes/rolim-de-moura.jpg"
          width={220}
          height={120}
          alt="Rotatória no centro de Rolim de Moura"
          decoding="async"
          className={classes.art}
        />
      </picture>
      <p className={classes.date}>
        <time dateTime={toIsoDate(now)}>{longDate(now)}</time>
      </p>
      {staff && (
        <AppLink to="/painel" className={classes.staff} data-press>
          <IconLayoutDashboard size={20} stroke={1.8} aria-hidden />
          <span>
            Você é da equipe · <strong>Abrir painel</strong>
          </span>
          <IconChevronRight size={18} aria-hidden className={classes.chevron} />
        </AppLink>
      )}
    </header>
  );
}
