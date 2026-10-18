import { getStorageLazy } from "@/lib/firebase";

/**
 * Envia a foto já comprimida. Cada tentativa usa um nome novo porque as
 * regras não permitem sobrescrever uma foto já enviada.
 */
export async function uploadIssuePhoto(uid: string, issueId: string, photo: Blob): Promise<string> {
  const [{ ref, uploadBytes }, storage] = await Promise.all([import("firebase/storage"), getStorageLazy()]);
  const path = `issues/${uid}/${issueId}/foto-${Date.now()}.jpg`;
  await uploadBytes(ref(storage, path), photo, { contentType: "image/jpeg", cacheControl: "private, max-age=86400" });
  return path;
}

const urlCache = new Map<string, Promise<string>>();

export function photoUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  if (cached) return cached;
  const pending = Promise.all([import("firebase/storage"), getStorageLazy()])
    .then(([{ getDownloadURL, ref }, storage]) => getDownloadURL(ref(storage, path)))
    .catch((error: unknown) => {
      urlCache.delete(path);
      throw error;
    });
  urlCache.set(path, pending);
  return pending;
}
