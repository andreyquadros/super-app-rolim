import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { isRouteErrorResponse, useRouteError } from "react-router";

/** Falha inesperada (ex.: versão antiga em cache após atualização). */
export function RouteError() {
  const error = useRouteError();
  // Chrome/Firefox citam o pedaço; o Safari diz "Importing a module script
  // failed"; o CSS de uma tela que não chegou vem do Vite ("Unable to preload CSS")
  const chunkFailed =
    error instanceof Error && /dynamically imported module|Importing a module script failed|Unable to preload CSS|Failed to fetch/i.test(error.message);
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <Center mih="80dvh" p="md">
      <Stack align="center" ta="center" maw={420}>
        <Title order={1}>{notFound ? "Página não encontrada" : "Algo deu errado"}</Title>
        <Text c="dimmed">
          {chunkFailed
            ? "O app foi atualizado ou você está sem internet. Recarregue para continuar."
            : "Tente novamente. Se o problema continuar, avise a prefeitura."}
        </Text>
        <Button onClick={() => window.location.assign("/")}>Recarregar o app</Button>
      </Stack>
    </Center>
  );
}
