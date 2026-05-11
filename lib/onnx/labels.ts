let cachedImagenet: string[] | null = null;
let cachedImagenetPromise: Promise<string[]> | null = null;

export async function loadImagenetLabels(): Promise<string[]> {
  if (cachedImagenet) return cachedImagenet;
  if (cachedImagenetPromise) return cachedImagenetPromise;
  cachedImagenetPromise = (async () => {
    const res = await fetch('/labels/imagenet-1k.json');
    if (!res.ok) throw new Error(`labels fetch ${res.status}`);
    const arr = (await res.json()) as string[];
    cachedImagenet = arr;
    return arr;
  })();
  return cachedImagenetPromise;
}

export function labelLookupFor(
  outputLen: number,
  labels: string[] | null,
): ((idx: number) => string) | null {
  if (!labels) return null;
  if (outputLen === labels.length) {
    return (idx: number) => labels[idx] ?? String(idx);
  }
  if (outputLen === labels.length + 1) {
    // background class at index 0 (some ONNX zoo models)
    return (idx: number) =>
      idx === 0 ? 'background' : (labels[idx - 1] ?? String(idx));
  }
  return null;
}
