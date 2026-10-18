import { FieldValue } from "firebase-admin/firestore";
import { onDocumentWrittenWithAuthContext, type FirestoreAuthEvent, type Change } from "firebase-functions/v2/firestore";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../admin";

type Action = "CREATE" | "UPDATE" | "DELETE";

function actionOf(change: Change<DocumentSnapshot>): Action {
  if (!change.before.exists) return "CREATE";
  if (!change.after.exists) return "DELETE";
  return "UPDATE";
}

/** Trilha de auditoria (substitui a tabela audit_logs do backend antigo). */
function auditTrail(resource: string) {
  return onDocumentWrittenWithAuthContext(
    `${resource}/{id}`,
    async (event: FirestoreAuthEvent<Change<DocumentSnapshot> | undefined, { id: string }>) => {
      const change = event.data;
      if (!change) return;
      await db().collection("audit").add({
        resource,
        resourceId: event.params.id,
        action: actionOf(change),
        actorType: event.authType,
        actorId: event.authId ?? null,
        before: change.before.exists ? change.before.data() : null,
        after: change.after.exists ? change.after.data() : null,
        at: FieldValue.serverTimestamp(),
      });
    },
  );
}

export const auditStaff = auditTrail("staff");
export const auditBuildings = auditTrail("buildings");
