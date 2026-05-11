import { useScopeStore } from '@/lib/store/useScopeStore';
import { runInference } from './inferenceClient';
import { summarizeRun } from './summarize';
import { loadImagenetLabels, labelLookupFor } from './labels';

export type Prediction = { label: string; score: number };

export type RunOutcome = {
  predictions: Prediction[] | null;
  elapsedMs: number;
};

function topKSoftmax(
  logits: Float32Array,
  k = 3,
  label?: (idx: number) => string,
): Prediction[] {
  if (logits.length < 2) return [];
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }
  let sum = 0;
  const probs = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    const e = Math.exp(logits[i] - max);
    probs[i] = e;
    sum += e;
  }
  for (let i = 0; i < probs.length; i++) probs[i] /= sum;
  const top: Prediction[] = [];
  for (let i = 0; i < probs.length; i++) {
    top.push({ label: label ? label(i) : String(i), score: probs[i] });
  }
  top.sort((a, b) => b.score - a.score);
  return top.slice(0, k);
}

export async function runWithFeed(
  inputName: string,
  data: Float32Array,
  dims: number[],
): Promise<RunOutcome | null> {
  const { graph, setInferring, setSummaries } = useScopeStore.getState();
  if (!graph) return null;
  setInferring(true);
  try {
    const { outputs, elapsedMs } = await runInference({
      [inputName]: { data, dims },
    });
    const summaries = summarizeRun(graph, outputs);
    setSummaries(summaries, elapsedMs);

    console.groupCollapsed(
      `[NeuralScope] run ${elapsedMs.toFixed(1)}ms · ${summaries.length} layer summaries`,
    );
    for (const s of summaries) {
      console.log(
        `${s.groupLabel.padEnd(28)} dims=[${s.dims.join(',')}] kind=${s.kind} mean|x|=${s.scalar.toFixed(4)} max=${s.max.toFixed(4)} sparsity=${(s.sparsity * 100).toFixed(1)}%`,
      );
    }
    console.groupEnd();

    let predictions: Prediction[] | null = null;
    const finalName = graph.outputs[0];
    const final = finalName ? outputs[finalName] : undefined;
    if (final && final.data.length >= 2 && final.data.length <= 50000) {
      let labels: string[] | null = null;
      if (final.data.length === 1000 || final.data.length === 1001) {
        try {
          labels = await loadImagenetLabels();
        } catch {
          labels = null;
        }
      }
      const labeler = labelLookupFor(final.data.length, labels);
      predictions = topKSoftmax(final.data, 3, labeler ?? undefined);
    }
    return { predictions, elapsedMs };
  } finally {
    setInferring(false);
  }
}
