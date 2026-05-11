'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import type { GroupSummary } from '@/lib/onnx/summarize';
import { magma } from '@/lib/colormaps';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { NEURON_GRID } from '@/lib/config';
import { instancedMeshArgs } from '@/lib/scene/instancedMeshArgs';

const { MAX_INSTANCES } = NEURON_GRID;

type Props = {
  groupId: string;
  summary: GroupSummary;
  originY: number;
  cellSize?: number;
  spacing?: number;
  interactive?: boolean;
};

export function NeuronGrid({
  groupId,
  summary,
  originY,
  cellSize = NEURON_GRID.MID_CELL,
  spacing = NEURON_GRID.MID_SPACING,
  interactive = false,
}: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tmpObjRef = useRef(new THREE.Object3D());
  const tmpColorRef = useRef(new THREE.Color());
  const selectedNeuronIndex = useScopeStore((s) =>
    s.selectedLayerId === groupId ? s.selectedNeuronIndex : null,
  );
  const selectNeuron = useScopeStore((s) => s.selectNeuron);
  const selectLayer = useScopeStore((s) => s.selectLayer);

  const count = Math.min(summary.values.length, MAX_INSTANCES);
  const cols = useMemo(() => Math.max(1, Math.ceil(Math.sqrt(count))), [count]);
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
    const tmpObj = tmpObjRef.current;
    const tmpColor = tmpColorRef.current;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = (col - (cols - 1) / 2) * spacing;
      const y = (row - (rows - 1) / 2) * spacing;
      tmpObj.position.set(x, y, 0);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.scale.setScalar(cellSize);
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
  }, [count, cols, rows, localMax, summary, cellSize, spacing]);

  const selectedPos =
    selectedNeuronIndex != null && selectedNeuronIndex < count
      ? {
          x: ((selectedNeuronIndex % cols) - (cols - 1) / 2) * spacing,
          y:
            (Math.floor(selectedNeuronIndex / cols) - (rows - 1) / 2) * spacing,
        }
      : null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx == null) return;
    selectLayer(groupId);
    selectNeuron(idx);
  };

  return (
    <group position={[0, originY, 0]}>
      <instancedMesh
        ref={meshRef}
        args={instancedMeshArgs(MAX_INSTANCES)}
        frustumCulled={false}
        onClick={interactive ? handleClick : undefined}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {selectedPos && (
        <mesh position={[selectedPos.x, selectedPos.y, 0]}>
          <boxGeometry
            args={[cellSize * 1.9, cellSize * 1.9, cellSize * 1.9]}
          />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}
