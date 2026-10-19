// Sem importar o SDK: este arquivo está na primeira tela, que abre antes do Firebase.

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
  "auth/missing-password": "Digite sua senha.",
  "auth/cancelled-popup-request": "A janela de login foi fechada antes de concluir.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-disabled": "Esta conta foi desativada. Procure a prefeitura.",
  "auth/email-already-in-use": "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
  "auth/weak-password": "A senha precisa ter pelo menos 8 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com a internet.",
  "auth/popup-closed-by-user": "A janela de login foi fechada antes de concluir.",
  "auth/popup-blocked": "O navegador bloqueou a janela de login. Permita pop-ups e tente novamente.",
  "auth/requires-recent-login": "Por segurança, entre novamente antes de continuar.",
  "auth/credential-already-in-use": "Esta conta Google já abre outra conta do app.",
  "auth/provider-already-linked": "Esta conta já tem um Google ligado.",
  "permission-denied": "Você não tem permissão para esta ação ou algum dado está inválido.",
  unavailable: "Serviço indisponível no momento. Verifique sua conexão.",
  "storage/unauthorized": "Sem permissão para enviar este arquivo.",
  "storage/retry-limit-exceeded": "A conexão caiu durante o envio da foto. Tente novamente.",
};

/** Erro do Firebase (Auth, Firestore, Storage, Messaging): o mesmo que `instanceof FirebaseError`. */
export function isFirebaseError(error: unknown): error is Error & { code: string } {
  return error instanceof Error && error.name === "FirebaseError" && typeof (error as { code?: unknown }).code === "string";
}

export function errorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (isFirebaseError(error)) return MESSAGES[error.code] ?? fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function errorCode(error: unknown): string | null {
  return isFirebaseError(error) ? error.code : null;
}
