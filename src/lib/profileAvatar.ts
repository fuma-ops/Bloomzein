/**
 * Profile avatar — a photo the user can set for herself, kept ONLY on her own
 * device. It lives in localStorage as a small compressed data URL (never sent to
 * a server), so it stays private and works offline. The Me hero shows it in
 * place of the brand flower when set.
 */
export const AVATAR_KEY = "bloom:profile-avatar";
export const AVATAR_EVENT = "bloom:avatar-updated";

/** The stored avatar data URL, or null if she hasn't set one. */
export function readAvatar(): string | null {
  try {
    return localStorage.getItem(AVATAR_KEY);
  } catch {
    return null;
  }
}

/** Save (or clear, with null) the avatar; notifies every open view. */
export function setAvatar(dataUrl: string | null): void {
  try {
    if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
    else localStorage.removeItem(AVATAR_KEY);
    window.dispatchEvent(new Event(AVATAR_EVENT));
  } catch {
    /* ignore (e.g. storage full) */
  }
}

/** Load a picked File, downscale to a small square-ish thumbnail and return a
 *  compact JPEG data URL — so the avatar stays tiny in localStorage. */
export async function fileToAvatarDataUrl(file: File, maxPx = 256): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
