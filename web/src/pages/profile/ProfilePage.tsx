import { Avatar } from "@mantine/core";
import { IconDeviceMobileDown, IconId, IconInfoCircle, IconLayoutDashboard, IconPresentation, IconShieldLock } from "@tabler/icons-react";
import { useId } from "react";
import { useAuth } from "@/auth/AuthContext";
import { InstallHowToSheet } from "@/components/install/InstallHowToSheet";
import { PushToggle, pushAvailable } from "@/components/PushToggle";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { APP_NAME, HOME_PHOTO_CREDIT, MAINTAINER_LINE, PARTNER } from "@/config/city";
import { version as APP_VERSION } from "../../../package.json";
import { CompleteProfileInvite } from "./CompleteProfileInvite";
import { ProfileLoadError } from "./ProfileLoadError";
import { AppearanceChoice, TextSizeChoice } from "./ReadingPrefs";
import { SignOut } from "./SignOut";
import { useInstallAction } from "./useInstallAction";
import classes from "./profile.module.css";

function ProfileHeader() {
  const { user, profile } = useAuth();
  const titleId = useId();
  const fullName = profile?.fullName || user?.displayName || "";
  const email = profile?.email || user?.email || "";
  return (
    <section className={classes.header} aria-labelledby={titleId}>
      <Avatar name={fullName || email} color="mata" variant="filled" size={64} className={classes.avatar} />
      <div className={classes.headerText}>
        <h2 id={titleId} className={classes.name}>
          {fullName || "Sua conta"}
        </h2>
        {email && <p className={classes.email}>{email}</p>}
      </div>
    </section>
  );
}

/** /perfil: conta, celular, leitura e ajuda, no estilo dos ajustes do celular. */
export default function ProfilePage() {
  const { profile, profileError, staff } = useAuth();
  const install = useInstallAction();
  const showPush = pushAvailable();

  return (
    <div className={classes.page}>
      <ProfileHeader />

      {!profile && (profileError ? <ProfileLoadError /> : <CompleteProfileInvite next="/perfil" />)}

      <ListGroup title="Minha conta">
        <ListRow icon={<IconId size={22} stroke={1.8} />} label="Meus dados" description="Nome, celular, e-mail e CPF" to="/perfil/dados" />
        {staff && (
          <ListRow
            icon={<IconLayoutDashboard size={22} stroke={1.8} />}
            label="Painel da equipe"
            description="Atender pedidos e publicar avisos"
            to="/painel"
          />
        )}
      </ListGroup>

      {(showPush || install.visible) && (
        <ListGroup title="Celular">
          {showPush && <PushToggle variant="row" />}
          {install.visible && (
            <ListRow
              icon={<IconDeviceMobileDown size={22} stroke={1.8} />}
              label="Colocar na tela inicial"
              description="Abra o app com um toque, como os outros do celular"
              onClick={install.run}
            />
          )}
        </ListGroup>
      )}

      <ListGroup title="Leitura">
        <TextSizeChoice />
        <AppearanceChoice />
      </ListGroup>

      <ListGroup title="Ajuda">
        <ListRow
          icon={<IconPresentation size={22} stroke={1.8} />}
          label="Ver a apresentação de novo"
          description="Um passeio rápido pelo que o app faz"
          to="/boas-vindas?rever=1"
          nav="flow"
        />
        <ListRow icon={<IconShieldLock size={22} stroke={1.8} />} label="Privacidade e uso de dados" to="/privacidade" />
        <ListRow
          icon={<img src={PARTNER.logo} alt="" width={28} height={28} />}
          label={PARTNER.name}
          description="Conheça o projeto parceiro do app"
          href={PARTNER.url}
        />
        <ListRow
          icon={<IconInfoCircle size={22} stroke={1.8} />}
          label="Sobre o app"
          description={
            <>
              <span className={classes.aboutLine}>
                {APP_NAME}, versão {APP_VERSION}
              </span>
              <span className={classes.aboutLine}>{MAINTAINER_LINE}</span>
              <span className={classes.aboutLine}>{HOME_PHOTO_CREDIT.text}</span>
            </>
          }
        />
      </ListGroup>

      <SignOut />

      <InstallHowToSheet open={install.howToOpen} onClose={install.closeHowTo} />
    </div>
  );
}
