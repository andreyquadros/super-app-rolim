import { List, Stack, Text, Title } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { INSTITUTION } from "@/config/city";

export default function PrivacyPage() {
  return (
    <Stack gap="md" maw={640}>
      <PageHeader eyebrow="LGPD" title="Privacidade e uso de dados" back />
      <Text>
        Este aplicativo é mantido pela {INSTITUTION} para receber e responder solicitações dos cidadãos. Tratamos dados pessoais com base na
        execução de políticas públicas e no atendimento ao cidadão (Lei nº 13.709/2018, art. 7º, III, e art. 23).
      </Text>
      <Title order={2} fz="lg">
        Quais dados coletamos
      </Title>
      <List spacing="xs">
        <List.Item>Nome, CPF, e-mail e celular — para identificar quem abriu cada solicitação e responder.</List.Item>
        <List.Item>Local, fotos e relatos que você envia — para que a equipe encontre e resolva o problema.</List.Item>
        <List.Item>Identificador do aparelho para avisos (somente se você ativar as notificações).</List.Item>
      </List>
      <Title order={2} fz="lg">
        Quem tem acesso
      </Title>
      <Text>
        Apenas você e os servidores responsáveis pelo atendimento. Observações internas da equipe não são públicas. Os dados não são vendidos
        nem compartilhados para fins comerciais.
      </Text>
      <Title order={2} fz="lg">
        Onde os dados ficam
      </Title>
      <List spacing="xs">
        <List.Item>
          <b>No Brasil</b> (Google Cloud, São Paulo): seu cadastro (nome, CPF, celular) e as solicitações, com o histórico e as respostas.
        </List.Item>
        <List.Item>
          <b>Nos Estados Unidos</b> (Google Cloud): as fotos anexadas às solicitações, a conta de acesso (e-mail e senha protegida) e o
          serviço de envio de avisos.
        </List.Item>
      </List>
      <Text>
        O Google atua como operador e trata esses dados apenas para prestar o serviço à prefeitura, sob as cláusulas de proteção de dados do
        contrato do Google Cloud, conforme as regras de transferência internacional da LGPD (art. 33).
      </Text>
      <Title order={2} fz="lg">
        Seus direitos
      </Title>
      <Text>
        Você pode corrigir seus dados no perfil e excluir sua conta a qualquer momento. Ao excluir, o cadastro é apagado; as solicitações
        abertas permanecem como registro do serviço público prestado.
      </Text>
    </Stack>
  );
}
