import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

function app() {
  return getApps()[0] ?? initializeApp();
}

export function db(): Firestore {
  return getFirestore(app());
}

export function messaging(): Messaging {
  return getMessaging(app());
}
