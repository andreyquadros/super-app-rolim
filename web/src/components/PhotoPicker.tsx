import { FileButton, Loader } from "@mantine/core";
import { IconCamera, IconPhoto, IconRefresh, IconTrash, IconWifiOff } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { compressImage } from "@/lib/image";
import classes from "./PhotoPicker.module.css";

interface PhotoPickerProps {
  value: Blob | null;
  onChange: (photo: Blob | null) => void;
  onError: (message: string) => void;
  /** Sem internet: a foto não pode ser enviada agora */
  offline?: boolean;
}

/** Endereço temporário para mostrar a foto escolhida (liberado ao trocar). */
export function usePhotoPreview(photo: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(photo);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  return url;
}

/** Foto opcional do problema: tirar na hora ou escolher da galeria. */
export function PhotoPicker({ value, onChange, onError, offline = false }: PhotoPickerProps) {
  const preview = usePhotoPreview(value);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setProcessing(true);
    try {
      onChange(await compressImage(file));
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : "Não foi possível usar esta foto. Tente outra.");
    } finally {
      setProcessing(false);
    }
  };

  if (preview) {
    return (
      <div className={classes.box} data-filled>
        <img src={preview} alt="Foto escolhida do problema" className={classes.image} />
        <div className={classes.actions}>
          <FileButton onChange={handleFile} accept="image/*">
            {(props) => (
              <button {...props} type="button" className={classes.action} disabled={processing} data-press>
                <IconRefresh size={20} aria-hidden />
                Trocar foto
              </button>
            )}
          </FileButton>
          <button type="button" className={classes.action} data-tone="danger" onClick={() => onChange(null)} data-press>
            <IconTrash size={20} aria-hidden />
            Remover foto
          </button>
        </div>
        {offline && (
          <p className={classes.offline}>
            <IconWifiOff size={20} aria-hidden />
            Sem internet não dá para enviar foto. Remova a foto ou espere a conexão voltar.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={classes.box}>
      <div className={classes.intro}>
        <span className={classes.badge} aria-hidden>
          <IconCamera size={26} stroke={1.7} />
        </span>
        <div>
          <p className={classes.title}>Foto do problema (opcional)</p>
          <p className={classes.hint}>Ajuda muito a equipe a encontrar e entender o problema.</p>
        </div>
      </div>
      {offline ? (
        <p className={classes.offline}>
          <IconWifiOff size={20} aria-hidden />
          Sem internet não dá para enviar foto. Você pode enviar o pedido sem foto agora.
        </p>
      ) : processing ? (
        <p className={classes.processing} role="status">
          <Loader size="sm" color="mata" aria-hidden />
          Preparando a foto…
        </p>
      ) : (
        <div className={classes.actions}>
          <FileButton onChange={handleFile} accept="image/*" capture="environment">
            {(props) => (
              <button {...props} type="button" className={classes.action} data-tone="primary" data-press>
                <IconCamera size={20} aria-hidden />
                Tirar foto
              </button>
            )}
          </FileButton>
          <FileButton onChange={handleFile} accept="image/*">
            {(props) => (
              <button {...props} type="button" className={classes.action} data-press>
                <IconPhoto size={20} aria-hidden />
                Escolher da galeria
              </button>
            )}
          </FileButton>
        </div>
      )}
    </div>
  );
}
