'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { viridis } from '@/lib/colormaps';
import type { WeightTensor } from '@/lib/onnx/extractWeights';
import { WEIGHT_HEATMAP } from '@/lib/config';
import { instancedMeshArgs } from '@/lib/scene/instancedMeshArgs';

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

const { MAX_DIM, CELL, SPACING } = WEIGHT_HEATMAP;

function sliceToMatrix(weights: WeightTensor): {
  rows: number;
  cols: number;
  values: Float32Array;
  rowDim: number;
  colDim: number;
  sub: boolean;
} {
  const dims = weights.dims;
  const data = weights.data;
  let rowDim: number;
  let colDim: number;

  if (dims.length === 4) {
    rowDim = dims[0];
    colDim = dims[1] * dims[2] * dims[3];
  } else if (dims.length === 2) {
    rowDim = dims[0];
    colDim = dims[1];
  } else {
    const flat = data.length;
    rowDim = Math.ceil(Math.sqrt(flat));
    colDim = Math.ceil(flat / rowDim);
  }

  const rows = Math.min(rowDim, MAX_DIM);
  const cols = Math.min(colDim, MAX_DIM);
  const stride = colDim;
  const rowStep = Math.max(1, Math.floor(rowDim / rows));
  const colStep = Math.max(1, Math.floor(colDim / cols));
  const out = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * rowStep * stride + c * colStep;
      out[r * cols + c] = i < data.length ? data[i] : 0;
    }
  }
  return {
    rows,
    cols,
    values: out,
    rowDim,
    colDim,
    sub: rowDim > rows || colDim > cols,
  };
}

type Props = { weights: WeightTensor; originY: number };

export function WeightHeatmap({ weights, originY }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const sliced = useMemo(() => sliceToMatrix(weights), [weights]);
  const { rows, cols, values, rowDim, colDim, sub } = sliced;
  const count = rows * cols;

  const max = useMemo(() => {
    let m = 0;
    for (let i = 0; i < values.length; i++) {
      const a = Math.abs(values[i]);
      if (a > m) m = a;
    }
    return m || 1;
  }, [values]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = (c - (cols - 1) / 2) * SPACING;
        const y = -(r - (rows - 1) / 2) * SPACING;
        tmpObj.position.set(x, y, 0);
        tmpObj.rotation.set(0, 0, 0);
        tmpObj.scale.setScalar(CELL);
        tmpObj.updateMatrix();
        mesh.setMatrixAt(idx, tmpObj.matrix);
        const v = Math.abs(values[idx]) / max;
        const [rr, gg, bb] = viridis(v);
        tmpColor.setRGB(rr, gg, bb);
        mesh.setColorAt(idx, tmpColor);
      }
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [rows, cols, values, max, count]);

  return (
    <group position={[0, originY, 0]}>
      <instancedMesh
        ref={meshRef}
        args={instancedMeshArgs(count)}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <Html
        distanceFactor={10}
        position={[0, -(rows * SPACING) / 2 - 0.4, 0]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div className="rounded border border-purple-700 bg-purple-950/80 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-purple-100">
          W [{weights.dims.join('×')}]
          {sub && (
            <span className="text-purple-300/70">
              {' '}
              · showing {rows}×{cols} of {rowDim}×{colDim}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
