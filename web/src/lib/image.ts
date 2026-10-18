const MAX_SIDE = 1600;
const QUALITY = 0.8;

/**
 * Reduz a foto do celular (geralmente 3–8 MB) para ~200–400 KB antes do
 * envio, economizando o plano de dados do cidadão e o armazenamento.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("O arquivo selecionado não é uma imagem.");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível processar a imagem neste aparelho.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem."))),
      "image/jpeg",
      QUALITY,
    );
  });
}
