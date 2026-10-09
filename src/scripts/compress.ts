// Preparazione dei file nel browser: le foto vengono ridimensionate (lato lungo max 2000 px)
// e ricompresse in JPEG, così l'invio da telefono è più veloce e leggero.

const MAX_SIDE = 2000;
const QUALITY = 0.82;
/** Sotto questa soglia una foto già piccola non viene ricompressa */
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;
const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp'];

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

function extension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

/** Alcuni browser non indicano il tipo (es. HEIC su Android): lo ricaviamo dall'estensione. */
export function detectType(file: File): string {
  return (file.type || EXTENSION_TYPES[extension(file.name)] || '').toLowerCase();
}

function withExtension(name: string, ext: string): string {
  const base = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
  return `${base}.${ext}`;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
}

export async function prepareFile(file: File): Promise<File> {
  const type = detectType(file);
  const typed = type === file.type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
  if (!COMPRESSIBLE.includes(type)) return typed;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < SKIP_BELOW_BYTES) {
      bitmap.close();
      return typed;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return typed;
    }
    // Sfondo bianco: i PNG trasparenti in JPEG altrimenti diventano neri
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await canvasToBlob(canvas);
    if (!blob || (scale === 1 && blob.size >= file.size)) return typed;
    return new File([blob], withExtension(file.name, 'jpg'), { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    // Formato non decodificabile dal browser: si invia l'originale
    return typed;
  }
}
