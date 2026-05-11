'use client';

import { useEffect } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import {
  disposeInference,
  initInference,
} from '@/lib/onnx/inferenceClient';

export function SessionManager() {
  const modelBytes = useScopeStore((s) => s.modelBytes);
  const executionProvider = useScopeStore((s) => s.executionProvider);
  const setSessionStatus = useScopeStore((s) => s.setSessionStatus);

  useEffect(() => {
    if (!modelBytes) {
      disposeInference();
      setSessionStatus('idle');
      return;
    }
    let cancelled = false;
    disposeInference();
    setSessionStatus('initializing');
    initInference(modelBytes, executionProvider)
      .then((info) => {
        if (cancelled) return;
        setSessionStatus('ready', {
          inputNames: info.inputNames,
          outputNames: info.outputNames,
          activeProvider: info.activeProvider,
        });
        console.log(
          `[NeuralScope] session ready · provider=${info.activeProvider} · inputs=${info.inputNames.join(',')} · added ${info.addedCount} intermediate outputs`,
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSessionStatus('error', {
          error: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [modelBytes, executionProvider, setSessionStatus]);

  return null;
}
