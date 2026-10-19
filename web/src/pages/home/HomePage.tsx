import { useAuth } from "@/auth/AuthContext";
import { useDutyUnits, useMyRequests } from "@/hooks/useCitizenData";
import { ContextInvite } from "./ContextInvite";
import { DutyNowCard } from "./DutyNowCard";
import { HomeHeader } from "./HomeHeader";
import { useNow, useWideLayout } from "./homeHooks";
import { LatestNotice } from "./LatestNotice";
import { MyRequestsPreview } from "./MyRequestsPreview";
import { ServiceGrid } from "./ServiceGrid";
import classes from "./HomePage.module.css";

/**
 * Início. No celular: saudação, serviços, plantão agora, seus pedidos, último
 * aviso e um convite. No computador: cabeçalho em cartão e duas colunas.
 */
export default function HomePage() {
  const { user, profile } = useAuth();
  const pharmacies = useDutyUnits("PHARMACY");
  const funerals = useDutyUnits("FUNERAL");
  const requests = useMyRequests();
  const now = useNow();
  const wide = useWideLayout();

  const services = <ServiceGrid pharmacies={pharmacies} funerals={funerals} />;
  const duty = <DutyNowCard pharmacies={pharmacies} funerals={funerals} now={now} />;
  const mine = <MyRequestsPreview requests={requests} />;
  const notice = <LatestNotice now={now} />;
  const invite = <ContextInvite signedIn={user !== null && profile !== null} hasRequests={(requests.data?.length ?? 0) > 0} />;

  return (
    <div className={classes.page}>
      <HomeHeader now={now} />
      {wide ? (
        <div className={classes.columns}>
          <div className={classes.column}>
            {services}
            {mine}
          </div>
          <div className={classes.column}>
            {duty}
            {notice}
            {invite}
          </div>
        </div>
      ) : (
        <div className={classes.stack}>
          {services}
          {duty}
          {mine}
          {notice}
          {invite}
        </div>
      )}
    </div>
  );
}
