'use client';

import { useFrame } from '@react-three/fiber';
import { useScopeStore } from '@/lib/store/useScopeStore';
import { getRegistry } from '@/lib/scene/animationRegistry';
import { ANIMATION } from '@/lib/config';

const { SWEEP_DURATION_S, FADE_WIDTH } = ANIMATION;

/**
 * Single useFrame loop that drives every LayerBlock's emissive
 * intensity. Replaces per-block useFrame callbacks (one per layer)
 * with one batched iteration over a module-level registry.
 */
export function BlockAnimator() {
  useFrame(() => {
    const { firingStartedAt, bounds, globalMaxActivation } =
      useScopeStore.getState();
    const entries = getRegistry();
    if (entries.size === 0) return;

    let packetX = -Infinity;
    let sweepActive = false;
    if (firingStartedAt && bounds) {
      const elapsed = (performance.now() - firingStartedAt) / 1000;
      if (elapsed <= SWEEP_DURATION_S + 0.5) {
        const t = Math.min(1, elapsed / SWEEP_DURATION_S);
        const eased = 1 - Math.pow(1 - t, 3);
        packetX = bounds.minX - 1 + eased * (bounds.maxX - bounds.minX + 2);
        sweepActive = true;
      }
    }

    const gmax = globalMaxActivation || 1;
    for (const entry of entries.values()) {
      const mat = entry.material.current;
      if (!mat) continue;
      let intensity = entry.baseIntensity;
      const s = entry.summary;
      if (s) {
        const normalized = Math.min(1, s.scalar / gmax);
        if (sweepActive) {
          const arrival = Math.max(
            0,
            Math.min(1, (packetX - (entry.x - FADE_WIDTH)) / FADE_WIDTH),
          );
          const overshoot = Math.max(0, packetX - (entry.x + FADE_WIDTH));
          const decay = Math.max(0, 1 - overshoot / (FADE_WIDTH * 4));
          intensity = entry.baseIntensity + 3.0 * arrival * decay * normalized;
        } else {
          intensity = entry.baseIntensity + 0.7 * normalized;
        }
      }
      mat.emissiveIntensity = intensity;
    }
  });

  return null;
}
