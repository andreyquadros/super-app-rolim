import { IconChevronRight, IconMapPin } from "@tabler/icons-react";
import { useId, type ReactNode } from "react";
import { AppLink } from "@/components/AppLink";
import { INSTITUTION } from "@/config/city";
import classes from "./PrivacyPage.module.css";

const COLLECTED = [
  { what: "Nome, CPF, e-mail e celular", why: "para identificar quem abriu cada solicitação e responder." },
  { what: "Local, fotos e relatos que você envia", why: "para que a equipe encontre e resolva o problema." },
  { what: "Identificador do aparelho para avisos", why: "somente se você ligar as notificações." },
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className={classes.section} aria-labelledby={id}>
      <h2 id={id} className={classes.h2}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** /privacidade: como o app trata os dados pessoais (LGPD). */
export default function PrivacyPage() {
  return (
    <article className={classes.page}>
      <header className={classes.intro}>
        <h1 className={classes.h1}>Privacidade e uso de dados</h1>
        <p className={classes.lead}>
          Este aplicativo é mantido pela {INSTITUTION} para receber e responder solicitações dos cidadãos. Tratamos dados pessoais com base
          na execução de políticas públicas e no atendimento ao cidadão (Lei nº 13.709/2018, art. 7º, III, e art. 23).
        </p>
      </header>

      <Section title="Quais dados coletamos">
        <ul className={classes.list}>
          {COLLECTED.map((item) => (
            <li key={item.what}>
              <strong>{item.what}</strong>, {item.why}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Quem tem acesso">
        <p>
          Apenas você e os servidores responsáveis pelo atendimento. Observações internas da equipe não são públicas. Os dados não são
          vendidos nem compartilhados para fins comerciais.
        </p>
      </Section>

      <Section title="Onde os dados ficam">
        <ul className={classes.places}>
          <li className={classes.place}>
            <span className={classes.placeIcon} aria-hidden>
              <IconMapPin size={20} stroke={1.8} />
            </span>
            <div>
              <p className={classes.placeName}>No Brasil (Google Cloud, São Paulo)</p>
              <p className={classes.placeText}>Seu cadastro (nome, CPF, celular) e as solicitações, com o histórico e as respostas.</p>
            </div>
          </li>
          <li className={classes.place}>
            <span className={classes.placeIcon} aria-hidden>
              <IconMapPin size={20} stroke={1.8} />
            </span>
            <div>
              <p className={classes.placeName}>Nos Estados Unidos (Google Cloud)</p>
              <p className={classes.placeText}>
                As fotos anexadas às solicitações, a conta de acesso (e-mail e senha protegida) e o serviço de envio de avisos.
              </p>
            </div>
          </li>
        </ul>
        <p>
          O Google atua como operador e trata esses dados apenas para prestar o serviço à prefeitura, sob as cláusulas de proteção de dados
          do contrato do Google Cloud, conforme as regras de transferência internacional da LGPD (art. 33).
        </p>
      </Section>

      <Section title="Seus direitos">
        <p>
          Você pode corrigir seus dados no perfil e excluir sua conta a qualquer momento. Ao excluir, o cadastro é apagado; as solicitações
          abertas permanecem como registro do serviço público prestado.
        </p>
        <AppLink to="/perfil/dados" className={classes.link} data-press>
          <span>Ver e corrigir meus dados</span>
          <IconChevronRight size={20} aria-hidden />
        </AppLink>
      </Section>
    </article>
  );
}
