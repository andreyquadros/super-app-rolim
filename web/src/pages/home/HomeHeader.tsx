import { IconChevronRight, IconLayoutDashboard } from "@tabler/icons-react";
import { useAuth } from "@/auth/AuthContext";
import { AppLink } from "@/components/AppLink";
import { firstName, toIsoDate } from "@/domain/format";
import { homeGreeting, longDate } from "./homeText";
import classes from "./HomeHeader.module.css";

interface HomeHeaderProps {
  now: Date;
}

/** Saudação, data por extenso e o cartão-postal da cidade (continua o verde da barra). */
export function HomeHeader({ now }: HomeHeaderProps) {
  const { user, profile, staff, loading } = useAuth();
  const name = firstName(profile?.fullName ?? user?.displayName);
  const title = homeGreeting({ loading, signedIn: user !== null, name }, now);

  return (
    <header className={classes.header}>
      <h1 className={classes.title} tabIndex={-1}>
        {title}
      </h1>
      <img src="/ilustracoes/cidade.svg" width={220} height={120} alt="" aria-hidden className={classes.art} />
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
