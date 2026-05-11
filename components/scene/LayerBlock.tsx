'use client';

import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { paletteFor, collapsedPalette } from '@/lib/onnx/opPalette';
import { extractWeights } from '@/lib/onnx/inferenceClient';
import {
  registerBlock,
  unregisterBlock,
} from '@/lib/scene/animationRegistry';
import { NeuronGrid } from './NeuronGrid';
import { WeightHeatmap } from './WeightHeatmap';
import type { LayerGroup, LayerLayoutItem } from '@/lib/onnx/types';
import { NEURON_GRID } from '@/lib/config';

type Props = { group: LayerGroup; item: LayerLayoutItem };

export function LayerBlock({ group, item }: Props) {
  const selectedId = useScopeStore((s) => s.selectedLayerId);
  const selectLayer = useScopeStore((s) => s.selectLayer);
  const summary = useScopeStore((s) => s.summariesByGroup[group.id]);
  const lod = useScopeStore((s) => s.lodByGroup[group.id] ?? 'far');
  const weights = useScopeStore((s) => s.weightsByGroup[group.id]);
  const setWeightsForGroup = useScopeStore((s) => s.setWeightsForGroup);

  const isCollapsed = group.id === '__collapsed__';
  const palette = isCollapsed
    ? collapsedPalette()
    : paletteFor(group.primary.op);
  const selected = selectedId === group.id;

  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const baseIntensity = selected ? 1.2 : 0.5;

  // Register / update / unregister in the central animation registry.
  // BlockAnimator iterates this map once per frame instead of each
  // block running its own useFrame.
  useEffect(() => {
    registerBlock(group.id, {
      material: matRef,
      x: item.position.x,
      baseIntensity,
      summary,
    });
    return () => unregisterBlock(group.id);
  }, [group.id, item.position.x, baseIntensity, summary]);

  const isNear = lod === 'near';
  const shouldExtractWeights =
    isNear && selected && !isCollapsed && weights == null;

  useEffect(() => {
    if (!shouldExtractWeights) return;
    const inputs = group.primary.inputs;
    let cancelled = false;
    extractWeights(inputs)
      .then((w) => {
        if (cancelled) return;
        setWeightsForGroup(group.id, w ?? 'missing');
      })
      .catch(() => {
        if (cancelled) return;
        setWeightsForGroup(group.id, 'missing');
      });
    return () => {
      cancelled = true;
    };
  }, [shouldExtractWeights, group.id, group.primary.inputs, setWeightsForGroup]);

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isCollapsed) selectLayer(group.id);
  };

  const showGrid =
    summary &&
    summary.values.length > 0 &&
    (lod === 'mid' || lod === 'near');
  const gridCell = isNear ? NEURON_GRID.NEAR_CELL : NEURON_GRID.MID_CELL;
  const gridSpacing = isNear
    ? NEURON_GRID.NEAR_SPACING
    : NEURON_GRID.MID_SPACING;
  const gridOriginY = item.size.height / 2 + (isNear ? 1.1 : 0.7);
  const labelOffset =
    item.size.height / 2 + (showGrid ? (isNear ? 3.2 : 1.6) : 0.4);

  return (
    <group position={[item.position.x, item.position.y, item.position.z]}>
      <mesh
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <boxGeometry
          args={[item.size.width, item.size.height, item.size.depth]}
        />
        <meshStandardMaterial
          ref={matRef}
          color={palette.color}
          emissive={palette.emissive}
          emissiveIntensity={baseIntensity}
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {showGrid && (
        <NeuronGrid
          groupId={group.id}
          summary={summary}
          originY={gridOriginY}
          cellSize={gridCell}
          spacing={gridSpacing}
          interactive={isNear}
        />
      )}

      {isNear && selected && weights && weights !== 'missing' && (
        <WeightHeatmap
          weights={weights}
          originY={-(item.size.height / 2) - 0.8}
        />
      )}

      <Html
        distanceFactor={10}
        position={[0, labelOffset, 0]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className={`px-1.5 py-0.5 text-[10px] rounded whitespace-nowrap font-mono ${
            selected
              ? 'bg-cyan-400 text-black'
              : isNear
                ? 'bg-cyan-900/80 text-cyan-100 border border-cyan-700'
                : 'bg-zinc-900/80 text-zinc-200 border border-zinc-700'
          }`}
        >
          {group.label}
        </div>
      </Html>
    </group>
  );
}
