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

## Run it locally

### 1. Prerequisites

| Tool        | Version        | Install                                                      |
| ----------- | -------------- | ------------------------------------------------------------ |
| **Node**    | 20+ (22 ideal) | <https://nodejs.org> or `nvm install 22`                     |
| **pnpm**    | 9+             | `corepack enable && corepack prepare pnpm@latest --activate` |
| **Git**     | any            | <https://git-scm.com>                                        |
| **Browser** | WebGL2         | Chrome, Safari, Firefox, or Edge (all current versions)      |

WebGPU is optional and detected at runtime — Chrome / Edge ship it,
Safari has it behind a flag, Firefox doesn't yet. The app falls back
to WASM automatically.

### 2. Clone + install

```bash
git clone https://github.com/skalkii/neuralscope.git
cd neuralscope
pnpm install
```

`pnpm install` triggers a postinstall hook (`scripts/copy-ort-wasm.mjs`)
that copies `onnxruntime-web`'s WASM artefacts into
`public/ort-wasm/` (74 MB, git-ignored). The hook is idempotent —
re-running `pnpm install` skips files whose `size + mtime` already
match.

You should see, near the end of install output:

```
[copy-ort-wasm] 8 copied, 0 up-to-date → /…/public/ort-wasm
```

### 3. Dev server

```bash
pnpm dev
```

Expect `✓ Ready in ~350ms` and visit <http://localhost:3000>. The
`predev` hook re-runs the WASM copy first.

### 4. Verify everything works before exploring

```bash
pnpm typecheck       # tsc --noEmit
pnpm test            # vitest, 16 unit tests
pnpm format:check    # prettier --check
```

All three should be green. If any fails, file an issue.

### 5. Production build (optional)

```bash
pnpm build
pnpm start
```

Or for static hosting (GitHub Pages, Cloudflare Pages, S3+CloudFront):

```bash
pnpm build
# .next/ contains the production bundle; deploy via your platform
```

Bundle composition:

```bash
pnpm analyze         # ANALYZE=true next build → .next/analyze/*.html
```

---

## Feature walk-through

A scripted tour of every UI capability. Boot the dev server first
(`pnpm dev` → <http://localhost:3000>).

### A. Empty state (~5 s)

On first load, with no model selected:

- Big gradient `NeuralScope` title floats over the canvas
- 6-block animated hero network shimmers, each block topped with a
  small grid of magma-tinted cubes
- A cyan signal packet loops left-to-right with a sine-pulsing
  point-light
- Camera auto-orbits

**Action:** drag the canvas or scroll-zoom. Auto-rotate stops on
the first pointer event. Title remains until a model loads.

### B. Load a bundled model (~10 s)

Sidebar → **Example models** → click **MNIST CNN**.

- Button gets cyan border (active indicator)
- Console (open DevTools) logs:
  `[NeuralScope] session ready · provider=wasm · inputs=Input3 · added N intermediate outputs`
- Hero scene replaced by the real model's layers
- Camera reframes via drei's `<Bounds>`
- Sidebar shows `8 layers · 12 nodes · 0.02 M params`
- Auto-rotate stays off

### C. Run inference on MNIST (~5 s)

Sidebar → **Input · MNIST 28×28** → draw a digit on the 280×280 canvas
(mouse / touch). Feathered stamp leaves grayscale falloff.

Click **Run inference**:

- Button briefly says `Running…`
- Console expands a group:
  `[NeuralScope] run 12.3ms · 8 layer summaries`
  with one line per layer: `dims=[…] kind=conv mean|x|=0.42 max=2.1 sparsity=18.3%`
- Cyan packet sweeps the network L→R over 1.8 s
- Each layer block flares its emissive proportionally to that
  layer's activation magnitude
- Top-3 softmax bars appear under the canvas with class indices
- `last run: 12.3 ms` chip beneath the bars

Click **clear** to reset the canvas. Click **copy** on the
predictions list to put a TSV onto the clipboard.

### D. Image input (Super-Resolution) (~20 s)

Sidebar → **Example models** → **Super-Resolution**.

- Sidebar switches to `Input · grayscale 224×224`
- Click the drop-zone or drag any JPG/PNG onto it
- Preview shows the image **downscaled to 224×224 with
  `image-rendering: pixelated`** — that's exactly what the model
  sees, not the raw thumbnail
- Caption: `model sees 224×224 grayscale`
- Click **Run inference** → console summaries appear; no
  predictions list (output is an image, not a classifier)

### E. Image input with ImageNet labels (SqueezeNet) (~30 s)

Sidebar → **SqueezeNet 1.0**.

- Drop a cat / dog / car JPG into the drop-zone
- Normalize dropdown defaults to `imagenet`. For accurate top-3
  results on SqueezeNet 1.0 specifically, flip to **caffe BGR**
  (the model's training preprocessing)
- Click **Run inference**
- Top-3 bars now show **class names** like `Egyptian cat`,
  `tabby`, `tiger cat` instead of raw indices (auto-applied
  when output length is 1000 or 1001)

### F. Drag-drop your own `.onnx` (~10 s)

Sidebar → **Drop .onnx here** drop-zone (top of sidebar).

- Drag any `.onnx` file ≤ 50 MB
- Or click the zone to open a file picker
- Or focus the zone via `Tab` and press `Enter` / `Space` (keyboard accessible)
- Wrong extension → red error chip
- > 50 MB → red error with size delta
- Parse failure → red chip + opset hint (`try opset_version=17`)

PyTorch export snippet:

```python
import torch
dummy = torch.randn(1, 3, 224, 224)
torch.onnx.export(model, dummy, "model.onnx",
                  input_names=["input"], output_names=["output"],
                  opset_version=17)
```

### G. Tensor input (transformers, custom shapes) (~15 s)

If your model's input shape doesn't match MNIST or a standard image
(e.g. `[1, seq_len]` for transformers, audio buffers, etc.), the
sidebar shows a JSON textarea.

- Click **random** to fill with random floats
- Click **zeros** for a baseline
- Or paste a JSON array — exact length is validated against
  `prod(dims)`
- **Run inference** feeds the bytes to the worker as before

### H. Semantic zoom (LOD) (~20 s)

After loading any model and running inference once:

- Scroll **out** far → blocks render as plain colored slabs, no
  neuron grids (`LOD: far`)
- Scroll **in** to mid distance → small neuron grids appear above
  each block (`LOD: mid`)
- Scroll **in** close to one specific block → that block's grid
  enlarges 2×, its label turns cyan + gains a `◎` glyph
  (`LOD: near`)
- Sidebar LOD chip updates: `LOD: near · near: ConvLayerName`

Only **one** block can be `near` at a time — the closest to the
camera. Others fall to `mid`.

### I. Per-neuron selection (~15 s)

While a block is near-LOD:

- Click any cube in its grid
- Cube gets a **white wireframe outline** (color-blind safe;
  doesn't overwrite the magma value)
- Sidebar inspector shows `neuron N · value: 0.4218`
- Click another cube to switch; click empty canvas to clear

### J. Weight heatmap (~10 s)

While a block is near-LOD AND selected (click the block first):

- A **viridis heatmap** appears below the block
- Conv weights laid out as `[OutC, InC·kH·kW]`; Gemm as `[in, out]`
- Capped at 64×64 cells; chip says `showing N×M of P×Q` when
  bigger
- Sidebar inspector gains a `weights:` block with tensor name,
  shape, value count
- Activation-only ops (Relu, Add) show `no float-32 weight
initializer found`

### K. Reframe camera (~3 s)

Sidebar LOD chip → **reframe** button.

- Camera animates back to fit the entire network via drei
  `<Bounds>`
- Works at any LOD; useful after getting lost zoomed in

### L. WebGPU toggle (~5 s)

Sidebar → **Engine** card → click **WebGPU**.

- Console: `[NeuralScope] provider switched · active=webgpu`
- `active:` chip in the panel reads `webgpu`
- If WebGPU init fails (unsupported / broken driver), chip
  shows `active: wasm (fallback)` in amber
- Toggle reuses the worker's cached `ModelProto` — no
  protobuf decode round-trip on subsequent flips

### M. Error boundary (~5 s)

Force an error to see the boundary (DevTools console):

```js
useScopeStore.getState().setSummaries(null, NaN);
```

(or load a deliberately broken `.onnx`)

- Red `Scene crashed` panel appears with the error message
- Click **try again** → runtime state clears (summaries,
  weights, selection) but the model + graph stay loaded
- Scene remounts cleanly

### N. Mobile layout (~10 s)

Resize the browser narrower than 768 px wide.

- Sidebar collapses behind a `NeuralScope hide ▴ / show ▾`
  header bar
- Click the bar to toggle
- Canvas takes the full remaining height
- All features work identically; the drop-zone, image picker,
  and run buttons all meet WCAG 2.5.5 44×44 touch targets

### O. Keyboard accessibility (~15 s)

- `Tab` through the page — every interactive element gets a
  cyan focus ring
- Drop-zones (model + image) are reachable; `Enter` or `Space`
  opens the file picker
- Engine toggle buttons expose `aria-pressed`
- Example-model buttons expose `aria-current="true"` when
  active
- Canvas has `aria-label` describing the visualization

---

## Bundled example models

Three small ONNX models ship in `public/examples/` and load with a
single click from the sidebar:

| Model                | Input       | Size   | Notes                                                                                     |
| -------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------- |
| **MNIST CNN**        | 1×1×28×28   | 26 KB  | LeCun-style digit classifier. Draw on the canvas, see top-3 softmax.                      |
| **Super-Resolution** | 1×1×224×224 | 234 KB | Sub-pixel CNN, grayscale Y-channel input. Shows feature maps growing through the network. |
| **SqueezeNet 1.0**   | 1×3×224×224 | 4.7 MB | ImageNet classifier with fire modules. Exercises the layer-fusion + branch-lane layout.   |

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
