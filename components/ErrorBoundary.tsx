'use client';

import { Component, type ReactNode } from 'react';
import { useScopeStore } from '@/lib/store/useScopeStore';

type Props = { children: ReactNode; fallback?: (error: Error) => ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[NeuralScope] ErrorBoundary caught:', error, info);
  }

  reset = () => {
    // Wipe runtime state (summaries, weights, selection, packet) so the
    // remounted Scene doesn't inherit ghost layers from before the crash.
    // Keep the loaded model + graph so the user can retry without re-loading.
    useScopeStore.setState({
      summaries: null,
      summariesByGroup: {},
      firingStartedAt: null,
      lastRunMs: null,
      selectedLayerId: null,
      selectedNeuronIndex: null,
      weightsByGroup: {},
    });
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error);
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black p-6 text-center text-zinc-300">
          <div className="text-sm font-semibold text-red-300">
            Scene crashed
          </div>
          <pre className="max-w-lg text-[11px] whitespace-pre-wrap text-zinc-400">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.reset}
            className="rounded border border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-200 hover:bg-zinc-900"
          >
            try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
