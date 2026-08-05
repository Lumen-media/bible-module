import { readableColor } from 'polished';

export async function analyzeBackgroundColor(src: string): Promise<'#FFFFFF' | '#000000'> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('#FFFFFF');
          return;
        }
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0;
        let g = 0;
        let b = 0;
        const count = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        resolve(readableColor(hex, '#FFFFFF', '#000000', false) as '#FFFFFF' | '#000000');
      } catch {
        resolve('#FFFFFF');
      }
    };
    img.onerror = () => resolve('#FFFFFF');
    img.src = src;
  });
}
