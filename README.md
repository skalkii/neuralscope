# NeuralScope

> Drop an `.onnx` file into your browser. Watch the network light up as
> inference flows through it, layer by layer, neuron by neuron.

NeuralScope is a **local-first, browser-based 3D inspector** for small
ONNX neural networks. No backend. No uploads. The model never leaves
your machine. Built for students and engineers who want to _see_ what
their model is doing instead of staring at loss curves.

> **Screenshots / demo:** drop a GIF + still frames into a `docs/` folder
> and link them here once the project is deployed. A live demo URL goes
> in the GitHub repo `homepage` field too.

[![CI](https://github.com/skalkii/neuralscope/actions/workflows/ci.yml/badge.svg)](https://github.com/skalkii/neuralscope/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fskalkii%2Fneuralscope)

---

## What it does

|                |                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loads**      | `.onnx` files up to 50 MB (drag-drop or one-click examples)                                                                                        |
| **Parses**     | Every node, every initializer, every shape — into a clean `Graph`                                                                                  |
| **Lays out**   | Topological 3D layout: depth on X, branches fan out on Z, size from log-params                                                                     |
| **Runs**       | `onnxruntime-web` inference in a Web Worker, with _every intermediate tensor_ returned                                                             |
| **Visualises** | Layer blocks light up by activation magnitude. Neuron grids (instanced) above each block, colored magma. Glowing signal packet sweeps the network. |
| **Zooms**      | Three LOD tiers: far (blocks only) · mid (neuron grids) · near (one focused layer with clickable cubes)                                            |
| **Inspects**   | Per-layer activation stats, per-neuron values, fused-op chains                                                                                     |

Inputs auto-route by shape:

- `1×1×28×28` → drawable canvas (MNIST)
- `1×{1|3}×H×W` → image drop-zone with `unit / imagenet / centered / caffe BGR` normalize presets
- anything else → raw JSON tensor textarea with shape validation

---

## Quickstart

```bash
git clone https://github.com/skalkii/neuralscope.git
cd neuralscope
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

`pnpm install` runs a postinstall hook that copies the
`onnxruntime-web` WASM artifacts into `public/ort-wasm/` (74 MB,
git-ignored). Subsequent `pnpm dev` / `pnpm build` re-run the same
copy via `predev` / `prebuild` so the WASM is always in place.

### Requirements

- Node **20+** (tested on 22)
- pnpm **9+** (Corepack ships it)
- A browser with **WebGL2** (Chrome, Safari, Firefox, Edge — all current versions)

### Production build

```bash
pnpm build
pnpm start
```

The app is a pure static-friendly Next.js app — `next export` works
once you're ready to host it on GitHub Pages, Cloudflare Pages, or any
static CDN.

---

## Try it without your own model

Three small ONNX models ship in `public/examples/` and load with a
single click from the sidebar:

| Model                | Input       | Size   | Notes                                                                                     |
| -------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------- |
| **MNIST CNN**        | 1×1×28×28   | 26 KB  | LeCun-style digit classifier. Draw on the canvas, see top-3 softmax.                      |
| **Super-Resolution** | 1×1×224×224 | 234 KB | Sub-pixel CNN, grayscale Y-channel input. Shows feature maps growing through the network. |
| **SqueezeNet 1.0**   | 1×3×224×224 | 4.7 MB | ImageNet classifier with fire modules. Exercises the layer-fusion + branch-lane layout.   |

Bring your own — drop any `.onnx` ≤ 50 MB. Convert from PyTorch:

```python
import torch
dummy = torch.randn(1, 3, 224, 224)
torch.onnx.export(model, dummy, "model.onnx",
                  input_names=["input"], output_names=["output"],
                  opset_version=17)
```

---

## How it works

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Browser tab                                │
│                                                                       │
│  ModelLoader / ExampleModels                                          │
│       │                                                               │
│       ▼                                                               │
│  parseOnnxBytes ──► Graph (layers, fused groups, shapes, params)     │
│       │                                                               │
│       ▼                                                               │
│  computeLayout ──► 3D positions (Kahn topo depth + branch lanes)     │
│       │                                                               │
│       ▼                                                               │
│  Zustand store ◄──── LODController (camera-distance, far/mid/near)   │
│       │                                                               │
│       ├──► R3F Scene                                                 │
│       │     • LayerBlock (emissive ramps with activation)             │
│       │     • NeuronGrid (InstancedMesh, magma colormap)              │
│       │     • SignalPacket (animated sphere + light)                  │
│       │     • Postprocessing (Bloom + Vignette + SMAA)                │
│       │                                                               │
│       └──► InputPanel (auto-routed by input shape)                    │
│             • MnistInput · ImageInput · TensorInput                   │
│                  │                                                    │
│                  ▼                                                    │
│         runWithFeed ──► inferenceClient ──► Web Worker               │
│                                                  │                    │
│                                  patchAllOutputs (every intermediate  │
│                                  tensor added to graph.output)        │
│                                                  │                    │
│                                  ort.InferenceSession.run             │
│                                                  │                    │
│                              summarize ─► per-group summaries        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

The non-obvious trick: by default `onnxruntime-web` only returns the
model's natural outputs. `lib/onnx/patchOutputs.ts` decodes the
`ModelProto`, appends every node's output tensor to `graph.output`
(re-using `value_info` entries when present), and re-encodes. After
that, a single `session.run()` returns every intermediate — which is
what makes the per-layer visualization possible at all.

---

## Stack

- **Next.js 16** (app router) + **TypeScript** + **Turbopack**
- **React Three Fiber** + **drei** + **three.js** for the 3D scene
- **@react-three/postprocessing** for bloom / vignette / SMAA
- **onnxruntime-web 1.26** in a single-threaded WASM Web Worker
- **onnx-proto** for protobuf graph parsing
- **Zustand 5** for state
- **Tailwind CSS 4**

---

## Project layout

```
app/                  Next.js app router (page.tsx, layout.tsx, globals.css)
components/scene/     R3F scene
  Scene.tsx           Canvas, lights, stars, Bounds, OrbitControls, postprocessing
  LayerBlock.tsx      Single layer's box + animated emissive + label
  NeuronGrid.tsx      InstancedMesh of per-neuron cubes (magma colormap)
  SignalPacket.tsx    Sphere + trail + point-light that sweeps on each run
  LODController.tsx   Per-frame camera-distance → LOD per group
  HeroNetwork.tsx     Animated idle-state network shown before any model loads
  SceneEffects.tsx    EffectComposer (Bloom + Vignette + SMAA)
components/panels/    Sidebar + canvas-overlay UI
  ModelLoader.tsx     Drag-drop .onnx file picker
  ExampleModels.tsx   One-click bundled models
  InputPanel.tsx      Shape-aware router → Mnist / Image / Tensor
  MnistInput.tsx      28×28 drawable canvas
  ImageInput.tsx      Image drop-zone with normalize presets
  TensorInput.tsx     JSON textarea + random/zero fill
  SessionManager.tsx  Inference session lifecycle
  HeroOverlay.tsx     Gradient title + hint chip on empty state
lib/onnx/
  parseGraph.ts       ONNX protobuf → Graph + LayerGroup fusion
  patchOutputs.ts     Append every node-output to graph.output
  inferenceWorker.ts  ort-web in a Web Worker
  inferenceClient.ts  Main-thread RPC wrapper
  summarize.ts        Tensor → per-channel / per-neuron mean-abs
  imageToTensor.ts    File → Float32Array NCHW with normalize presets
  runHelpers.ts       Shared run / summarize / softmax helper
  loadModel.ts        Bytes-to-store orchestration
  opPalette.ts        Op → color map
  types.ts            Graph / Layer / LayerGroup / Layout types
lib/layout/
  topologicalLayout.ts  Kahn topo depth → 3D positions + bounds
lib/store/
  useScopeStore.ts    Zustand store
lib/colormaps.ts      Magma + viridis 16-stop palettes
scripts/
  copy-ort-wasm.mjs   postinstall / predev / prebuild WASM copy
public/examples/      Bundled demo .onnx models + manifest
public/ort-wasm/      onnxruntime-web WASM artifacts (gitignored)
```

---

## Performance budget

NeuralScope targets a mid-range laptop with integrated graphics at 60 fps:

- `<InstancedMesh>` everywhere — under 100 draw calls per frame
- **4 096 instances max** per neuron grid; larger layers stride-sample
- **500 logical layers max** per graph; bigger graphs keep head 100 + collapsed middle + tail 100
- Activation summaries reduce 4D tensors to per-channel scalars (length = channel count)
- Inference runs in a Web Worker so the render thread stays smooth
- WASM is single-threaded by default; SIMD is on
- 50 MB model cap is enforced before parse

---

## Threat model

NeuralScope is local-first by design. **The model file never leaves your
machine** — there is no upload endpoint, no telemetry, no third-party
fetch beyond the bundled `/labels/imagenet-1k.json` lookup and the
`/ort-wasm/` artefacts copied from `node_modules` into `public/` at
install time.

What that gives you:

- **No data exfiltration vector.** All inference, weight extraction, and
  visualisation happens in your browser. A network sniff during a run
  shows nothing leaving the origin.
- **Hostile-ONNX resilience.** Parse errors are caught in
  `parseGraph` (`ParseError`) and surfaced in the sidebar with an opset
  hint. Worker faults bubble up through `inferenceClient.onerror`. The
  React `<ErrorBoundary>` wraps the `<Scene>` so a runtime crash in
  three.js or postprocessing doesn't take down the page; "try again"
  clears runtime state without dropping the loaded model.
- **Hard 50 MB cap** is enforced **before** the ONNX bytes hit the
  protobuf decoder, limiting decode-bomb blast radius. The decoder also
  caps at 500 logical layers; bigger graphs collapse the middle.
- **No `eval`, no `Function`, no dynamic import from user input.** The
  worker only ever processes ArrayBuffers; the ORT session is the only
  thing that interprets the model.

What it does **not** protect against:

- A malicious ONNX file that _exploits a vulnerability inside ORT itself_
  (out of our scope — we ship whatever `onnxruntime-web@1.26` ships).
- WebGPU driver bugs when the WebGPU EP is enabled.
- Extensions you've installed reading the page's DOM.

## Honest limitations

Raw activations are **not concepts**. "Neuron 47 lit up" does not mean
"this is the cat detector" — it's a polysemantic superposition of many
features. Real interpretability needs sparse autoencoders or circuit
tracing. NeuralScope labels things `neuron 47`, never `the cat
detector`.

A few other things to know:

- **Predictions show class names for ImageNet models** (1 000 or 1 001
  logits → bundled `imagenet-1k.json` lookup). Other classifiers still
  show raw indices unless their output length matches.
- **SqueezeNet 1.0** expects Caffe-BGR preprocessing — flip the
  normalize dropdown to `caffe BGR` for accurate predictions.
- **Super-resolution** wants the Y channel of a YCbCr image and a
  specific spatial size; visualization still works on any grayscale
  input, but the "prediction" is the upscaled image, not a label.
- **No tokenizer is bundled**. Transformer-style `[1, seq_len]` inputs
  fall back to the JSON tensor textarea — you supply token IDs.
- **No attention view yet**. Attention activations render as ordinary
  feature grids.

---

## Roadmap

- [x] WebGPU execution provider opt-in (Engine toggle, auto-falls-back
      to WASM if init throws; sidebar shows `active:` provider with a
      `fallback` chip when they diverge)
- [x] Bundled ImageNet 1k class labels lookup (auto-applied when the
      final output has 1 000 or 1 001 logits)
- [x] React Error Boundary around the Canvas with retry button
- [x] Weight tensor heatmap on the near-LOD layer (lazy-decodes the
      ONNX initializer for the selected group; renders a viridis
      heatmap of up to 64×64 sampled cells with a "showing N×M of P×Q"
      sub-sample chip when the tensor is bigger)
- [ ] GPT-2 BPE tokenizer for transformer text inputs
- [ ] Dedicated attention view (heads × tokens)
- [ ] Side-by-side comparison of two models on the same input
- [ ] dagre / d3-dag layout for very branchy graphs (U-Nets, GNNs)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, style, commit
conventions, and performance budgets. The full architecture overview
lives in [ARCHITECTURE.md](./ARCHITECTURE.md).

Before opening a PR, run:

```bash
pnpm typecheck && pnpm test && pnpm format:check && pnpm build
```

End-to-end tests live in `e2e/` and run via Playwright:

```bash
pnpm test:e2e:install  # one-time chromium install
pnpm test:e2e
```

Bundle analyzer:

```bash
pnpm analyze           # writes .next/analyze/*.html
```

---

## License

MIT. See [LICENSE](./LICENSE).
