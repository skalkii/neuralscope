import { useScopeStore } from '@/lib/store/useScopeStore';
import { parseOnnxBytes, ParseError } from './parseGraph';
import { computeLayout } from '@/lib/layout/topologicalLayout';

export const MAX_MODEL_BYTES = 50 * 1024 * 1024;

export class LoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoadError';
  }
}

export function loadOnnxFromBytes(bytes: Uint8Array, name: string): void {
  if (bytes.byteLength > MAX_MODEL_BYTES) {
    throw new LoadError(
      `File too large: ${(bytes.byteLength / 1e6).toFixed(1)} MB > 50 MB limit`,
    );
  }
  let graph;
  try {
    graph = parseOnnxBytes(bytes, name);
  } catch (e) {
    if (e instanceof ParseError) throw new LoadError(e.message);
    throw e;
  }
  const { layout, bounds } = computeLayout(graph);
  const { setModel, setGraph } = useScopeStore.getState();
  setModel(bytes, name);
  setGraph(graph, layout, bounds);
}

export async function loadOnnxFromUrl(
  url: string,
  name: string,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new LoadError(
      `Fetch failed for ${url}: ${res.status} ${res.statusText}`,
    );
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  loadOnnxFromBytes(buf, name);
}

export type ExampleModelManifest = {
  file: string;
  title: string;
  description: string;
  input: string;
  sizeBytes: number;
  source: string;
};

export async function fetchExampleManifest(): Promise<ExampleModelManifest[]> {
  const res = await fetch('/examples/index.json');
  if (!res.ok) {
    throw new LoadError(`Failed to load examples manifest: ${res.status}`);
  }
  const json = (await res.json()) as { models: ExampleModelManifest[] };
  return json.models;
}
