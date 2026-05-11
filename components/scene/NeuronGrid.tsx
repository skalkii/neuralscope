'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GroupSummary } from '@/lib/onnx/summarize';
import { magma } from '@/lib/colormaps';

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

const CELL = 0.06;
const SPACING = 0.08;
const MAX_INSTANCES = 4096;

type Props = { summary: GroupSummary; originY: number };

export function NeuronGrid({ summary, originY }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = Math.min(summary.values.length, MAX_INSTANCES);
  const cols = useMemo(
    () => Math.max(1, Math.ceil(Math.sqrt(count))),
    [count],
  );
  const rows = useMemo(() => Math.ceil(count / cols), [count, cols]);

  const localMax = useMemo(() => {
    let m = 0;
    for (let i = 0; i < summary.values.length; i++) {
      if (summary.values[i] > m) m = summary.values[i];
    }
    return m || 1;
  }, [summary]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = (col - (cols - 1) / 2) * SPACING;
      const y = (row - (rows - 1) / 2) * SPACING;
      tmpObj.position.set(x, y, 0);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.scale.setScalar(CELL);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
      const v = summary.values[i] / localMax;
      const [r, g, b] = magma(v);
      tmpColor.setRGB(r, g, b);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, cols, rows, localMax, summary]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        undefined as unknown as THREE.BufferGeometry,
        undefined as unknown as THREE.Material,
        MAX_INSTANCES,
      ]}
      position={[0, originY, 0]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
