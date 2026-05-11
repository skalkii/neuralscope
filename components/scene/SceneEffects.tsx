'use client';

import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export function SceneEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={0.85}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.3}
        radius={0.78}
      />
      <Vignette
        eskil={false}
        offset={0.22}
        darkness={0.85}
        blendFunction={BlendFunction.NORMAL}
      />
      <SMAA />
    </EffectComposer>
  );
}
