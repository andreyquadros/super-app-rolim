import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { messaging } from "../admin";
import { setTopicSubscription } from "../push";

/** Inscreve/desinscreve o dispositivo no tópico de comunicados. */
export const onDeviceWritten = onDocumentWritten("devices/{token}", async (event) => {
  const existedBefore = event.data?.before.exists ?? false;
  const existsAfter = event.data?.after.exists ?? false;
  if (existedBefore === existsAfter) return;
  await setTopicSubscription(messaging(), event.params.token, existsAfter);
});
