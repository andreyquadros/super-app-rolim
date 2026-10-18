import { Anchor, Button, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight, IconBell, IconMessages, IconPill, IconTools } from "@tabler/icons-react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { InstallCard } from "@/components/InstallCard";
import { RequestCard } from "@/components/RequestCard";
import { INSTITUTION } from "@/config/city";
import { firstName, greeting, relativeTime } from "@/domain/format";
import { isOpenStatus } from "@/domain/status";
import { useMyRequests, usePharmacies, useSentNotifications } from "@/hooks/useCitizenData";
import classes from "./HomePage.module.css";

function OnDutyTile() {
  const { data, loading } = usePharmacies();
  const onDuty = data.filter((p) => p.isOnDuty).length;
  return (
    <Link to="/farmacias" className={`${classes.tile} ${classes.tilePharmacy}`}>
      <IconPill size={28} stroke={1.6} />
      <div>
        <Text fw={700} fz="lg">
          Farmácias
        </Text>
        {loading ? (
          <Skeleton h={14} w={120} mt={6} />
        ) : (
          <Text size="sm" className={classes.live}>
            <span className={classes.liveDot} aria-hidden />
            {onDuty === 0 ? "Ver abertas agora" : `${onDuty} de plantão agora`}
          </Text>
        )}
      </div>
    </Link>
  );
}

function LatestNoticeTile() {
  const { data, loading } = useSentNotifications(1);
  const latest = data?.[0];
  return (
    <Link to="/comunicados" className={`${classes.tile} ${classes.tileNotice}`}>
      <IconBell size={26} stroke={1.6} />
      <div style={{ minWidth: 0 }}>
        <span className="eyebrow">Último comunicado {latest ? `· ${relativeTime(latest.sentAt)}` : ""}</span>
        {loading ? (
          <Skeleton h={16} w="80%" mt={6} />
        ) : (
          <Text fw={600} lineClamp={2} mt={2}>
            {latest?.title ?? "Nenhum comunicado por enquanto."}
          </Text>
        )}
      </div>
      <IconArrowRight size={18} className={classes.tileArrow} />
    </Link>
  );
}

function MyOpenRequests() {
  const { user, profile } = useAuth();
  const { data, loading } = useMyRequests();

  if (!user || !profile) {
    return (
      <div className={classes.signinCard}>
        <Text fw={700}>Acompanhe tudo em um só lugar</Text>
        <Text size="sm" c="dimmed">
          Entre para abrir solicitações e receber o andamento por aviso e e-mail.
        </Text>
        <Group mt="sm">
          <Button component={Link} to={user ? "/completar-cadastro" : "/entrar"}>
            {user ? "Completar cadastro" : "Entrar ou criar conta"}
          </Button>
        </Group>
      </div>
    );
  }

  const open = (data ?? []).filter((r) => isOpenStatus(r.status)).slice(0, 3);
  if (loading) return <Skeleton h={96} radius="lg" />;
  if (open.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        Você não tem solicitações em andamento.{" "}
        <Anchor component={Link} to="/protocolos">
          Ver histórico
        </Anchor>
      </Text>
    );
  }
  return (
    <Stack gap="sm">
      {open.map((r) => (
        <RequestCard key={`${r.kind}-${r.id}`} request={r} />
      ))}
    </Stack>
  );
}

export default function HomePage() {
  const { profile } = useAuth();
  const name = firstName(profile?.fullName);

  return (
    <Stack gap={36}>
      <section className={classes.hero} aria-labelledby="hero-title">
        <span className={classes.heroEyebrow}>{INSTITUTION}</span>
        <Title id="hero-title" order={1} className={classes.heroTitle}>
          {name ? `${greeting()}, ${name}.` : "A cidade na palma da sua mão."}
        </Title>
        <Text className={classes.heroText}>Registre problemas, fale com a ouvidoria e acompanhe cada protocolo — sem fila e sem loja de aplicativos.</Text>
      </section>

      <section className={classes.bento} aria-label="Serviços">
        <Link to="/zeladoria/nova" className={`${classes.tile} ${classes.tileMain}`}>
          <IconTools size={34} stroke={1.5} />
          <div>
            <Text ff="heading" fw={600} fz={26} lh={1.1}>
              Zeladoria
            </Text>
            <Text size="sm" mt={6} className={classes.tileMainText}>
              Buraco, poste apagado, lixo, mato alto. Marque no mapa e mande uma foto.
            </Text>
          </div>
          <span className={classes.tileCta}>
            Abrir solicitação <IconArrowRight size={16} />
          </span>
        </Link>
        <Link to="/ouvidoria/nova" className={`${classes.tile} ${classes.tileOmbudsman}`}>
          <IconMessages size={28} stroke={1.6} />
          <div>
            <Text fw={700} fz="lg">
              Ouvidoria
            </Text>
            <Text size="sm" c="dimmed">
              Elogie, sugira ou reclame
            </Text>
          </div>
        </Link>
        <OnDutyTile />
        <LatestNoticeTile />
      </section>

      <section aria-labelledby="mine-title">
        <Group justify="space-between" mb="sm">
          <Title order={2} id="mine-title" fz="xl">
            Suas solicitações
          </Title>
          {profile && (
            <Anchor component={Link} to="/protocolos" size="sm" fw={600}>
              Ver todas
            </Anchor>
          )}
        </Group>
        <MyOpenRequests />
      </section>

      <InstallCard />

      <footer className={classes.footer}>
        <Text size="xs" c="dimmed">
          {INSTITUTION} ·{" "}
          <Anchor component={Link} to="/privacidade" size="xs" c="dimmed" underline="always">
            Privacidade e uso de dados
          </Anchor>
        </Text>
      </footer>
    </Stack>
  );
}
