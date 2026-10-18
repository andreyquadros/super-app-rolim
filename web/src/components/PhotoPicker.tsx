import { ActionIcon, Box, Button, FileButton, Group, Image, Text } from "@mantine/core";
import { IconCamera, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { compressImage } from "@/lib/image";

interface PhotoPickerProps {
  value: Blob | null;
  onChange: (photo: Blob | null) => void;
  onError: (message: string) => void;
}

export function PhotoPicker({ value, onChange, onError }: PhotoPickerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setProcessing(true);
    try {
      onChange(await compressImage(file));
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : "Não foi possível usar esta foto.");
    } finally {
      setProcessing(false);
    }
  };

  if (preview) {
    return (
      <Box pos="relative">
        <Image src={preview} alt="Foto do problema" radius="lg" mah={280} fit="cover" />
        <ActionIcon
          variant="filled"
          color="dark"
          size="lg"
          pos="absolute"
          top={10}
          right={10}
          onClick={() => onChange(null)}
          aria-label="Remover foto"
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Box>
    );
  }

  return (
    <FileButton onChange={handleFile} accept="image/*" capture="environment">
      {(props) => (
        <Button {...props} variant="default" size="lg" fullWidth h={96} loading={processing} radius="lg" style={{ borderStyle: "dashed" }}>
          <Group gap="sm">
            <IconCamera size={26} stroke={1.5} />
            <div style={{ textAlign: "left" }}>
              <Text fw={600}>Tirar ou escolher foto</Text>
              <Text size="xs" c="dimmed">
                Opcional, mas ajuda muito a equipe
              </Text>
            </div>
          </Group>
        </Button>
      )}
    </FileButton>
  );
}
