'use client';

import { useEffect, useRef } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';
import {
  disposeInference,
  initInference,
  switchProvider,
} from '@/lib/onnx/inferenceClient';

export function SessionManager() {
  const modelBytes = useScopeStore((s) => s.modelBytes);
  const executionProvider = useScopeStore((s) => s.executionProvider);
  const setSessionStatus = useScopeStore((s) => s.setSessionStatus);
  const prevBytesRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!modelBytes) {
      disposeInference();
      setSessionStatus('idle');
      prevBytesRef.current = null;
      return;
    }
    const bytesChanged = prevBytesRef.current !== modelBytes;
    prevBytesRef.current = modelBytes;
    let cancelled = false;

    if (bytesChanged) {
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
    } else {
      // Hot-swap the EP without re-decoding the ModelProto or
      // re-patching outputs. Worker reuses its cached ModelProto.
      setSessionStatus('initializing');
      switchProvider(executionProvider)
        .then((active) => {
          if (cancelled) return;
          if (active == null) {
            // No worker yet — fall back to full init.
            return initInference(modelBytes, executionProvider).then((info) => {
              if (cancelled) return;
              setSessionStatus('ready', {
                inputNames: info.inputNames,
                outputNames: info.outputNames,
                activeProvider: info.activeProvider,
              });
            });
          }
          const prev = useScopeStore.getState();
          setSessionStatus('ready', {
            inputNames: prev.inputNames,
            outputNames: prev.outputNames,
            activeProvider: active,
          });
          console.log(`[NeuralScope] provider switched · active=${active}`);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setSessionStatus('error', {
            error: e instanceof Error ? e.message : String(e),
          });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [modelBytes, executionProvider, setSessionStatus]);

  return null;
}
