import { ActionIcon, Alert, Badge, Button, Card, Group, SegmentedControl, Skeleton, Stack, Text, Tooltip } from "@mantine/core";
import { IconBrandWhatsapp, IconCurrentLocation, IconMap, IconPhone, IconPill, IconRoute } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { MapView } from "@/components/map";
import { PageHeader } from "@/components/PageHeader";
import { formatPhone, onlyDigits, whatsappLink } from "@/domain/documents";
import { directionsUrl, distanceMeters, formatDistance } from "@/domain/geo";
import type { Building } from "@/domain/types";
import { usePharmacies } from "@/hooks/useCitizenData";
import { useGeolocation } from "@/hooks/useGeolocation";

type Filter = "duty" | "open" | "all";

function PharmacyCard({ pharmacy, distance }: { pharmacy: Building; distance: number | null }) {
  const whatsapp = pharmacy.phones.find((p) => p.type === "WHATSAPP");
  const phone = pharmacy.phones.find((p) => p.type !== "WHATSAPP") ?? whatsapp;
  return (
    <Card padding="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Text fw={700} fz="lg" lineClamp={1}>
            {pharmacy.name}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={2}>
            {pharmacy.address}
          </Text>
          {pharmacy.openingHours && (
            <Text size="xs" c="dimmed" mt={2}>
              {pharmacy.openingHours}
            </Text>
          )}
        </div>
        <Stack gap={4} align="flex-end">
          {pharmacy.isOnDuty && (
            <Badge color="barro" variant="filled">
              Plantão
            </Badge>
          )}
          <Badge color={pharmacy.isOpen ? "mata" : "gray"}>{pharmacy.isOpen ? "Aberta" : "Fechada"}</Badge>
          {distance !== null && (
            <Text size="xs" fw={600} c="dimmed">
              {formatDistance(distance)}
            </Text>
          )}
        </Stack>
      </Group>
      <Group gap="xs" mt="md">
        {phone && (
          <Button component="a" href={`tel:${onlyDigits(phone.number)}`} size="sm" variant="light" leftSection={<IconPhone size={16} />}>
            {formatPhone(phone.number)}
          </Button>
        )}
        {whatsapp && (
          <Tooltip label="WhatsApp">
            <ActionIcon component="a" href={whatsappLink(whatsapp.number)} target="_blank" rel="noreferrer" size="lg" variant="light" color="mata" aria-label="Abrir WhatsApp">
              <IconBrandWhatsapp size={20} />
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label="Como chegar">
          <ActionIcon component="a" href={directionsUrl(pharmacy)} target="_blank" rel="noreferrer" size="lg" variant="light" color="slate" aria-label="Como chegar">
            <IconRoute size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Card>
  );
}

export default function PharmaciesPage() {
  const { data, loading, error } = usePharmacies();
  const geo = useGeolocation();
  const [filter, setFilter] = useState<Filter>("duty");
  const [showMap, setShowMap] = useState(false);

  const list = useMemo(() => {
    const filtered = data.filter((p) => (filter === "duty" ? p.isOnDuty : filter === "open" ? p.isOpen || p.isOnDuty : true));
    const withDistance = filtered.map((p) => ({ pharmacy: p, distance: geo.position ? distanceMeters(geo.position, p) : null }));
    return withDistance.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return Number(b.pharmacy.isOnDuty) - Number(a.pharmacy.isOnDuty) || a.pharmacy.name.localeCompare(b.pharmacy.name, "pt-BR");
    });
  }, [data, filter, geo.position]);

  return (
    <Stack gap="md">
      <PageHeader
        eyebrow="Saúde"
        title="Farmácias"
        description="Situação informada pelas próprias farmácias. Ligue antes para confirmar."
        actions={
          <ActionIcon size="xl" variant={showMap ? "filled" : "light"} onClick={() => setShowMap((v) => !v)} aria-label="Alternar mapa" aria-pressed={showMap}>
            <IconMap size={22} />
          </ActionIcon>
        }
      />
      <SegmentedControl
        fullWidth
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        data={[
          { value: "duty", label: "De plantão" },
          { value: "open", label: "Abertas" },
          { value: "all", label: "Todas" },
        ]}
      />
      <Button variant="default" leftSection={<IconCurrentLocation size={18} />} loading={geo.loading} onClick={() => geo.locate()}>
        {geo.position ? "Atualizar distância" : "Ordenar pela mais perto de mim"}
      </Button>
      {geo.error && <Alert color="ipe">{geo.error}</Alert>}
      {error && <Alert color="barro">{error}</Alert>}
      {showMap && list.length > 0 && (
        <MapView
          height={280}
          center={geo.position ?? undefined}
          markers={list.map(({ pharmacy }) => ({
            id: pharmacy.id,
            lat: pharmacy.lat,
            lng: pharmacy.lng,
            color: pharmacy.isOnDuty ? "#cf4623" : pharmacy.isOpen ? "#14874c" : "#868e96",
            label: pharmacy.name,
          }))}
        />
      )}
      {loading ? (
        <Stack gap="sm">
          {[0, 1].map((i) => (
            <Skeleton key={i} h={140} radius="lg" />
          ))}
        </Stack>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<IconPill size={28} />}
          title={filter === "duty" ? "Nenhuma farmácia de plantão informada" : "Nenhuma farmácia encontrada"}
          description="Veja a lista completa para ligar e confirmar o atendimento."
          action={filter !== "all" ? <Button onClick={() => setFilter("all")}>Ver todas</Button> : undefined}
        />
      ) : (
        <Stack gap="sm">
          {list.map(({ pharmacy, distance }) => (
            <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} distance={distance} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
