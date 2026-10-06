export const MAX_INPUT = 15 * 1024 * 1024;
export function validateImage(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "אפשר להעלות JPEG, PNG או WebP. תמונות HEIC יש להמיר תחילה ל-JPEG.",
    );
  if (file.size > MAX_INPUT || file.size === 0)
    throw new Error("יש לבחור תמונה עד 15 MB.");
}
export function dimensions(width: number, height: number) {
  const scale = Math.min(1, 2048 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export async function optimizeImage(file: File) {
  validateImage(file);
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const size = dimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    Object.assign(canvas, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("לא ניתן להכין את התמונה.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("לא ניתן להכין את התמונה."))),
        "image/jpeg",
        0.86,
      ),
    );
    return { blob, ...size };
  } finally {
    bitmap.close();
  }
}
