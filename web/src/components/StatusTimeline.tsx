import { Paper, Text, ThemeIcon, Timeline } from "@mantine/core";
import { IconCheck, IconCircleDashed, IconX } from "@tabler/icons-react";
import { formatDateTime } from "@/domain/format";
import { HAPPY_PATH, STATUS_META, type RequestStatus } from "@/domain/status";
import type { CitizenRequest, HistoryEntry } from "@/domain/types";

interface Step {
  status: RequestStatus;
  done: boolean;
  at: Date | null;
  response: string | null;
  by: string | null;
}

/** Monta as etapas a partir do histórico (exportado para testes). */
export function buildSteps(request: CitizenRequest, history: HistoryEntry[], showAuthor: boolean): Step[] {
  const byStatus = new Map(history.map((h) => [h.to, h]));
  const step = (status: RequestStatus): Step => {
    const entry = byStatus.get(status);
    return {
      status,
      done: status === "RECEIVED" || entry !== undefined,
      at: status === "RECEIVED" ? request.createdAt : (entry?.at ?? null),
      response: entry?.officialResponse ?? null,
      by: showAuthor && entry ? entry.byName : null,
    };
  };

  if (request.status === "CANCELED") {
    return [step("RECEIVED"), { status: "CANCELED", done: true, at: request.statusChangedAt, response: null, by: null }];
  }
  if (request.status === "REJECTED") {
    const reached = HAPPY_PATH.filter((s) => s === "RECEIVED" || byStatus.has(s)).map(step);
    return [...reached, step("REJECTED")];
  }
  return HAPPY_PATH.map(step);
}

interface StatusTimelineProps {
  request: CitizenRequest;
  history: HistoryEntry[];
  showAuthor?: boolean;
}

export function StatusTimeline({ request, history, showAuthor = false }: StatusTimelineProps) {
  const steps = buildSteps(request, history, showAuthor);
  const active = steps.reduce((last, s, i) => (s.done ? i : last), 0);

  return (
    <Timeline active={active} bulletSize={28} lineWidth={3} color={STATUS_META[request.status].color}>
      {steps.map((s) => {
        const negative = s.status === "REJECTED" || s.status === "CANCELED";
        return (
          <Timeline.Item
            key={s.status}
            title={
              <Text fw={600} c={s.done ? undefined : "dimmed"}>
                {STATUS_META[s.status].label}
              </Text>
            }
            bullet={
              <ThemeIcon size={28} radius="xl" color={s.done ? STATUS_META[s.status].color : "gray"} variant={s.done ? "filled" : "light"}>
                {negative ? <IconX size={16} /> : s.done ? <IconCheck size={16} /> : <IconCircleDashed size={16} />}
              </ThemeIcon>
            }
          >
            <Text size="sm" c="dimmed">
              {s.done ? formatDateTime(s.at) : STATUS_META[s.status].description}
              {s.by ? ` · ${s.by}` : ""}
            </Text>
            {s.response && (
              <Paper mt="xs" p="sm" radius="md" bg="var(--mantine-color-ipe-light)" style={{ borderLeft: "4px solid var(--mantine-color-ipe-6)" }}>
                <span className="eyebrow">Resposta da prefeitura</span>
                <Text size="sm" mt={4} style={{ whiteSpace: "pre-line" }}>
                  {s.response}
                </Text>
              </Paper>
            )}
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
