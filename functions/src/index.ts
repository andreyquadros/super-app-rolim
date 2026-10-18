import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "./config";

setGlobalOptions({ region: REGION, maxInstances: 5, memory: "256MiB" });

export { onIssueCreated, onOmbudsmanCreated, onIssueStatusChanged, onOmbudsmanStatusChanged } from "./triggers/requests";
export { onNotificationQueued, sweepStuckNotifications } from "./triggers/notifications";
export { onDeviceWritten } from "./triggers/devices";
export { auditStaff, auditBuildings } from "./triggers/audit";
export { onAccountDeleted } from "./triggers/accounts";
