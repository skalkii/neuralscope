'use client';

import { useScopeStore } from '@/lib/store/useScopeStore';
import { MnistInput } from './MnistInput';
import { ImageInput } from './ImageInput';
import { TensorInput } from './TensorInput';

type Mode =
  | { kind: 'mnist' }
  | {
      kind: 'image';
      layout: 'grayscale' | 'rgb';
      width: number;
      height: number;
    }
  | { kind: 'tensor'; dims: number[] }
  | { kind: 'unknown' };

function classify(shape: number[] | null | undefined): Mode {
  if (!shape || shape.length === 0) return { kind: 'unknown' };
  if (shape.length === 4) {
    const [, c, h, w] = shape;
    if (c === 1 && h === 28 && w === 28) return { kind: 'mnist' };
    const H = h > 0 ? h : 224;
    const W = w > 0 ? w : 224;
    if (c === 1)
      return { kind: 'image', layout: 'grayscale', width: W, height: H };
    if (c === 3)
      return { kind: 'image', layout: 'rgb', width: W, height: H };
  }
  return { kind: 'tensor', dims: shape };
}

export function InputPanel() {
  const graph = useScopeStore((s) => s.graph);
  const sessionStatus = useScopeStore((s) => s.sessionStatus);
  const sessionError = useScopeStore((s) => s.sessionError);
  if (!graph) return null;

  const primary = graph.inputs[0];
  const shape = primary ? graph.inputShapes[primary] : null;
  const mode = classify(shape);

  if (sessionStatus === 'initializing') {
    return (
      <section className="rounded border border-zinc-800 p-3 text-[11px] text-zinc-400">
        Initializing inference session…
      </section>
    );
  }

  if (sessionStatus === 'error' && sessionError) {
    return (
      <section className="rounded border border-red-700 bg-red-950/40 p-3 text-[11px] text-red-200">
        <div className="font-semibold mb-1">Session failed</div>
        <div>{sessionError}</div>
      </section>
    );
  }

  if (mode.kind === 'mnist') return <MnistInput />;
  if (mode.kind === 'image')
    return (
      <ImageInput
        layout={mode.layout}
        width={mode.width}
        height={mode.height}
      />
    );
  if (mode.kind === 'tensor') return <TensorInput dims={mode.dims} />;

  return (
    <section className="rounded border border-zinc-800 p-3 text-[11px] text-zinc-400">
      Model has no declared input shape; runs need to be triggered
      programmatically.
    </section>
  );
}
