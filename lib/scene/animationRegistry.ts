import type { MutableRefObject } from 'react';
import type { MeshStandardMaterial } from 'three';
import type { GroupSummary } from '@/lib/onnx/summarize';

export type AnimEntry = {
  material: MutableRefObject<MeshStandardMaterial | null>;
  x: number;
  baseIntensity: number;
  summary: GroupSummary | undefined;
};

const reg = new Map<string, AnimEntry>();

export function registerBlock(id: string, entry: AnimEntry): void {
  reg.set(id, entry);
}

export function unregisterBlock(id: string): void {
  reg.delete(id);
}

export function getRegistry(): Map<string, AnimEntry> {
  return reg;
}
