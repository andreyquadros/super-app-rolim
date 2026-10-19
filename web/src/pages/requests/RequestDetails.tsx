import type { ReactNode } from "react";
import { Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { MapView, STATUS_HEX } from "@/components/map";
import { RequestPhoto } from "@/components/RequestPhoto";
import { categoryOf, ombudsmanTypeOf } from "@/domain/catalog";
import { formatAddressLine, formatDateTime, formatOccurrence } from "@/domain/format";
import type { CitizenRequest } from "@/domain/types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <Text mt={2}>{children}</Text>
    </div>
  );
}

/** Dados da solicitação no painel da equipe (o cidadão usa DetailsList). */
export function RequestDetails({ request }: { request: CitizenRequest }) {
  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          {request.kind === "issues" ? (
            <>
              <Field label="Tipo">{categoryOf(request.category).label}</Field>
              <Field label="Setor responsável">{request.department}</Field>
              <Field label="Endereço">{formatAddressLine(request.address)}</Field>
              {request.address.complement && <Field label="Referência">{request.address.complement}</Field>}
            </>
          ) : (
            <>
              <Field label="Assunto">{ombudsmanTypeOf(request.type).label}</Field>
              <Field label="Unidade">{request.buildingName}</Field>
              <Field label="Quando ocorreu">{formatOccurrence(request.occurrenceDate, request.occurrenceTime)}</Field>
            </>
          )}
          <Field label="Aberta em">{formatDateTime(request.createdAt)}</Field>
        </SimpleGrid>
        <Group mt="md">
          <div>
            <span className="eyebrow">Relato</span>
            <Text mt={2} style={{ whiteSpace: "pre-line" }}>
              {request.description}
            </Text>
          </div>
        </Group>
      </Paper>
      {request.kind === "issues" && request.photoPath && <RequestPhoto path={request.photoPath} />}
      {request.kind === "issues" && (
        <MapView
          height={220}
          markers={[{ id: request.id, lat: request.lat, lng: request.lng, color: STATUS_HEX[request.status], label: request.title }]}
        />
      )}
    </Stack>
  );
}
