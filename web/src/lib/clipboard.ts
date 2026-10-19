/**
 * Copia um texto para a área de transferência. Devolve false quando o
 * navegador não deixa (sem permissão ou sem HTTPS), para a tela avisar.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Sem permissão: tenta o caminho antigo abaixo
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
