import type { MapImage } from "../model/types";

// Turn a picked image file into a self-contained MapImage (a downscaled data URL
// plus a sensible on-canvas display size). Data URLs keep maps offline and
// portable — a .json export carries its images with it. Browser-only (FileReader
// + canvas), so this is verified in-browser rather than unit-tested.

const MAX_STORE_PX = 800; // cap the stored bitmap so saves/exports stay small
const MAX_DISPLAY_PX = 220; // cap the on-node display width so layout stays sane

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

export async function fileToMapImage(file: File): Promise<MapImage> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const natural = Math.max(img.naturalWidth, img.naturalHeight) || 1;

  // Downscale the stored bitmap when it's larger than MAX_STORE_PX.
  const storeScale = Math.min(1, MAX_STORE_PX / natural);
  const storeW = Math.max(1, Math.round(img.naturalWidth * storeScale));
  const storeH = Math.max(1, Math.round(img.naturalHeight * storeScale));
  let url = original;
  if (storeScale < 1) {
    const canvas = document.createElement("canvas");
    canvas.width = storeW;
    canvas.height = storeH;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, storeW, storeH);
      url = canvas.toDataURL("image/png");
    }
  }

  // Display size: cap the width so a big image doesn't blow up the node.
  const displayScale = Math.min(1, MAX_DISPLAY_PX / storeW);
  return {
    url,
    width: Math.max(1, Math.round(storeW * displayScale)),
    height: Math.max(1, Math.round(storeH * displayScale)),
  };
}
