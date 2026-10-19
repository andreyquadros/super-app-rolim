/** A pessoa já liberou a localização antes? (consulta sem perguntar nada) */
export async function locationAlreadyGranted(): Promise<boolean> {
  try {
    if (!navigator.permissions || !("geolocation" in navigator)) return false;
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state === "granted";
  } catch {
    return false;
  }
}
