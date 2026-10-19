import { IconBuildingCommunity } from "@tabler/icons-react";
import { useId } from "react";
import { formatDateTime } from "@/domain/format";
import type { OfficialResponse } from "./requestModel";
import classes from "./detail.module.css";

/** Resposta mais recente da prefeitura, como um balão de conversa. */
export function ResponseBubble({ response }: { response: OfficialResponse }) {
  const headingId = useId();
  return (
    <section className={classes.answer} aria-labelledby={headingId}>
      <span className={classes.answerAvatar} aria-hidden>
        <IconBuildingCommunity size={22} stroke={1.8} />
      </span>
      <div className={classes.answerBody}>
        <h2 id={headingId} className={classes.answerTitle}>
          Resposta da prefeitura
        </h2>
        <div className={classes.bubble}>
          <p className={classes.bubbleText}>{response.text}</p>
          {response.at && <p className={classes.bubbleWhen}>{formatDateTime(response.at)}</p>}
        </div>
      </div>
    </section>
  );
}
