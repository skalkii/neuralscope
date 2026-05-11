# Contributing

Thanks for taking the time. NeuralScope is intentionally small — the
roadmap in the README is the project's scope. PRs outside that scope
will be closed unless we agree first.

## Local setup

```bash
git clone https://github.com/skalkii/neuralscope.git
cd neuralscope
pnpm install
pnpm dev
```

You need:

- Node 20+ (tested on 22)
- pnpm 9+ (Corepack ships it)
- A browser with WebGL2; WebGPU optional

## Workflow

Before opening a PR, run the same gate CI runs:

```bash
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm build          # next build
```

All three must be green. The CI job in `.github/workflows/ci.yml`
will block the merge otherwise.

## Style

- **TypeScript strict.** No `any`. `as unknown as X` casts only at
  type-system boundaries (Three.js InstancedMesh args, transferable
  ArrayBuffer slices) — document them with a one-line comment when
  non-obvious.
- **Default to no comments.** Only add one when the _why_ is
  non-obvious. Don't explain _what_ the code does; well-named
  identifiers do that.
- **No new files unless necessary.** Prefer editing existing
  modules.
- **Magic numbers** live in `lib/config.ts`. If you find yourself
  typing a constant in a component, ask whether it belongs there.

## Tests

Pure functions in `lib/` get a sibling `*.test.ts`. R3F /
DOM-heavy code is not unit-tested (yet). If you add new tensor
math, animation math, or graph traversal, write at least one
table test.

Run a single file: `pnpm vitest run lib/onnx/summarize.test.ts`.
Run in watch mode: `pnpm test:watch`.

## Commit messages

Body explains the _why_, not the _what_ — the diff already shows
the what.

```
type(scope): short summary

Longer paragraph if needed. State the problem and the chosen
solution. Reference any incidents, RFCs, or external docs.

If the commit changes any runtime behaviour, name the user-visible
effect explicitly.
```

Types we use: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`,
`test`. Subject ≤ 72 chars.

## Performance budget

Treat these as hard limits unless you can show a workload that
justifies relaxing them:

- `<InstancedMesh>` everywhere — under 100 draw calls per frame
- 4096 instances max per neuron grid
- 500 logical layers max per graph (`MODEL.MAX_LOGICAL_LAYERS`)
- 50 MB model cap (`MODEL.MAX_BYTES`)
- One `useFrame` per concern (currently three: BlockAnimator,
  LODController, SignalPacket). Don't add a fourth without a reason.

## Things we will not merge

- A backend.
- A request to relax the 50 MB cap to "support larger models."
- A telemetry / analytics integration.
- Anything that uploads user models to a third party.
- Sweeping refactors landed without prior agreement.

## Where to look first

- `app/page.tsx` — top-level layout
- `components/scene/Scene.tsx` — root R3F mount, lights, controls
- `lib/onnx/parseGraph.ts` — protobuf → Graph
- `lib/onnx/inferenceWorker.ts` — the Web Worker entry
- `ARCHITECTURE.md` — full module map and data-flow diagrams
