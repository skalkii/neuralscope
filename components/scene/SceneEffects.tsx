'use client';

import { useState, type ReactElement } from 'react';
import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export function SceneEffects() {
  // High-DPR displays already supersample at the raster level, so SMAA
  // adds cost for negligible perceptual gain. Skip the pass on retina+.
  const [highDpr] = useState(
    () => typeof window !== 'undefined' && window.devicePixelRatio >= 2,
  );

  const effects: ReactElement[] = [
    <Bloom
      key="bloom"
      mipmapBlur
      intensity={0.85}
      luminanceThreshold={0.18}
      luminanceSmoothing={0.3}
      radius={0.78}
    />,
    <Vignette
      key="vignette"
      eskil={false}
      offset={0.22}
      darkness={0.85}
      blendFunction={BlendFunction.NORMAL}
    />,
  ];
  if (!highDpr) effects.push(<SMAA key="smaa" />);

  return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
}
