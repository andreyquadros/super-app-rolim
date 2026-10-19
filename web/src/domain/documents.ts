export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Valida CPF pelos dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split("")
      .reduce((acc, char, index) => acc + Number(char) * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/** Exibe apenas o miolo do CPF (padrão de mascaramento da LGPD). */
export function maskCpf(value: string): string {
  const d = onlyDigits(value);
  if (d.length !== 11) return "—";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  return /^[1-9]{2}9?\d{8}$/.test(d) && (d.length === 10 || d.length === 11);
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Link de WhatsApp com DDI do Brasil e, opcionalmente, mensagem pronta. */
export function whatsappLink(phone: string, text?: string): string {
  const base = `https://wa.me/55${onlyDigits(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
