export type ChannelLayout = 'grayscale' | 'rgb';

export type ImageNormalize = 'unit' | 'imagenet' | 'centered' | 'caffe';

export type ImageTensorOptions = {
  width: number;
  height: number;
  layout: ChannelLayout;
  // 'unit'     : scale pixels to [0, 1]
  // 'imagenet' : subtract [0.485, 0.456, 0.406] / divide [0.229, 0.224, 0.225]
  //              after a [0,1] scale (Pillow / PyTorch convention)
  // 'centered' : pixels mapped to [-1, 1]
  // 'caffe'    : subtract per-channel mean from raw [0,255], BGR ordering
  normalize?: ImageNormalize;
};

export async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

function getImageData(
  img: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

export function imageToNCHW(
  img: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  opts: ImageTensorOptions,
): { data: Float32Array; dims: number[] } {
  const { width, height, layout } = opts;
  const normalize = opts.normalize ?? 'unit';
  const pixels = getImageData(img, width, height);

  if (layout === 'grayscale') {
    const out = new Float32Array(width * height);
    for (let p = 0, i = 0; i < pixels.length; i += 4, p++) {
      const y =
        0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      out[p] = normalize === 'centered' ? y / 127.5 - 1 : y / 255;
    }
    return { data: out, dims: [1, 1, height, width] };
  }

  const out = new Float32Array(3 * width * height);
  const hw = width * height;

  if (normalize === 'imagenet') {
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    for (let p = 0, i = 0; i < pixels.length; i += 4, p++) {
      const r01 = pixels[i] / 255;
      const g01 = pixels[i + 1] / 255;
      const b01 = pixels[i + 2] / 255;
      out[p] = (r01 - mean[0]) / std[0];
      out[hw + p] = (g01 - mean[1]) / std[1];
      out[2 * hw + p] = (b01 - mean[2]) / std[2];
    }
  } else if (normalize === 'centered') {
    for (let p = 0, i = 0; i < pixels.length; i += 4, p++) {
      out[p] = pixels[i] / 127.5 - 1;
      out[hw + p] = pixels[i + 1] / 127.5 - 1;
      out[2 * hw + p] = pixels[i + 2] / 127.5 - 1;
    }
  } else if (normalize === 'caffe') {
    const mean = [123.68, 116.779, 103.939];
    for (let p = 0, i = 0; i < pixels.length; i += 4, p++) {
      out[p] = pixels[i + 2] - mean[2];
      out[hw + p] = pixels[i + 1] - mean[1];
      out[2 * hw + p] = pixels[i] - mean[0];
    }
  } else {
    for (let p = 0, i = 0; i < pixels.length; i += 4, p++) {
      out[p] = pixels[i] / 255;
      out[hw + p] = pixels[i + 1] / 255;
      out[2 * hw + p] = pixels[i + 2] / 255;
    }
  }

  return { data: out, dims: [1, 3, height, width] };
}
