import { Image, Skeleton, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { photoUrl } from "@/data/files";

export function RequestPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    photoUrl(path)
      .then((u) => active && setUrl(u))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [path]);

  if (failed) return <Text size="sm" c="dimmed">Não foi possível carregar a foto.</Text>;
  if (!url) return <Skeleton h={240} radius="lg" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <Image src={url} alt="Foto enviada pelo cidadão" radius="lg" mah={360} fit="cover" />
    </a>
  );
}
