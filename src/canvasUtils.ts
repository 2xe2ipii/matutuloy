// canvasUtils.ts

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  // FORCE RESIZE: We fix the output size to 200x200 to keep the Base64 string small (~15kb)
  // This is essential for storing images in Realtime Database
  canvas.width = 200; 
  canvas.height = 200;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0, // Destination X
    0, // Destination Y
    200, // Destination Width (Forced)
    200  // Destination Height (Forced)
  );

  // Use JPEG with 0.8 quality for better compression
  return canvas.toDataURL('image/jpeg', 0.8); 
}