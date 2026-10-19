import { IconExternalLink, IconPhotoOff } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { photoUrl } from "@/data/files";
import classes from "./RequestPhoto.module.css";

interface RequestPhotoProps {
  path: string;
  /** Legenda abaixo da foto (ex.: "Foto que você enviou") */
  caption?: string;
}

type PhotoState = { status: "loading" } | { status: "ready"; url: string } | { status: "failed" };

/** Foto anexada ao pedido; tocar abre em tamanho grande. */
export function RequestPhoto({ path, caption = "Foto enviada com o pedido" }: RequestPhotoProps) {
  const [state, setState] = useState<PhotoState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    photoUrl(path)
      .then((url) => active && setState({ status: "ready", url }))
      .catch(() => active && setState({ status: "failed" }));
    return () => {
      active = false;
    };
  }, [path]);

  if (state.status === "failed") {
    return (
      <p className={classes.failed}>
        <IconPhotoOff size={20} aria-hidden />
        Não foi possível carregar a foto. Confira a internet e abra o pedido de novo.
      </p>
    );
  }
  if (state.status === "loading") {
    return <div className={`${classes.frame} shimmer`} role="status" aria-label="Carregando a foto" />;
  }
  return (
    <figure className={classes.figure}>
      <a href={state.url} target="_blank" rel="noreferrer" className={classes.link}>
        <img src={state.url} alt={caption} className={classes.frame} width={720} height={540} loading="lazy" decoding="async" />
        <span className={classes.open}>
          <IconExternalLink size={18} aria-hidden />
          Abrir foto
        </span>
      </a>
      <figcaption className={classes.caption}>{caption}</figcaption>
    </figure>
  );
}
