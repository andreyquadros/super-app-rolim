import { Avatar } from "@mantine/core";
import { useAuth } from "@/auth/AuthContext";

interface ProfileAvatarProps {
  size: number;
  className?: string;
}

/**
 * Iniciais do nome cadastrado. Sem nome (perfil ainda não lido ou cadastro
 * incompleto), o boneco neutro do Mantine: nunca as letras do e-mail.
 * Decorativo: o link em volta já diz "Perfil".
 */
export function ProfileAvatar({ size, className }: ProfileAvatarProps) {
  const { profile } = useAuth();
  const name = profile?.fullName?.trim() || undefined;
  return <Avatar name={name} color="mata" variant="white" size={size} className={className} aria-hidden />;
}
