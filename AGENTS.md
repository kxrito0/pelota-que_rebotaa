# AGENTS.md

## What this repo is
A single-page p5.js sketch ("pelota loca"). There is **no** package manager, build step, test suite, linter, or dev server — do not invent `npm`/`pnpm` commands.

Source files:
- `index.html` — loads p5.js, p5.sound, and the sketch.
- `sketch.js` — the sketch itself (global-mode p5).

## Running it
Open `index.html` directly in a browser. Both libraries load from CDNs, so it needs internet access, and load order matters: p5 → p5.sound → `sketch.js` as classic (non-module) scripts.

## Sound (easy to get wrong)
- p5.js 2.x does **not** bundle p5.sound. It is a separate package (`p5.sound@0.4.1` via jsDelivr) and must be loaded as its own `<script>` after p5.
- p5.sound 0.4.x is a Tone.js wrapper and dropped legacy APIs. In particular `p5.Envelope` has no `setRange()`; use the constructor args or `setADSR()`, then `play()`.
- Browsers block audio until a user gesture. `osc.start()` runs in `setup()`, but sound only becomes audible after `userStartAudio()`, which is wired to `mousePressed`/`touchStarted`/`keyPressed`.

## Sketch behavior / gotchas
- Colors are **HSB with alpha 0..100** (`colorMode(HSB, 360, 100, 100, 100)`); the background is black (`background(0)`) and text/glow are HSB too, not RGB. Bounces and sparkles track a raw `huePelota`, not a `p5.Color`.
- Neon glow and both particle systems use **`blendMode(ADD)`**. p5 blend mode is stateful, so every `blendMode(ADD)` block must restore `blendMode(BLEND)` before drawing the core/text.
- Two particle systems: `destellos` (16 short-lived sparks per bounce, in the ball's new hue) and `particulas` (2 spawned per frame at the mouse, **10 s lifetime** via `millis()`, hard-capped at 2200). Mouse particles only emit after `mouseMoved`/`mousePressed` set `mouseActivo`.
- The ball is normally round. A damped spring (`deform`/`deformVel`) deforms it on **floor** contact, and while the cursor is over it `deform` eases toward `0.8`, turning it into an irregular "paint stain" (see `dibujarPelota`). Don't reintroduce continuous velocity-based stretch.
- The ball is drawn anchored at its **base** (`translate(posX, posY + radio)`) so it doesn't sink into the floor when squashed.
- The ball bounces off all four edges. Bottom bounces re-randomize vertical speed (`random(10, 22)`), so bounce height varies each time.
- The ball freezes while the cursor is over it and resumes with the saved velocity when the cursor leaves.
- Comments and UI text are in Spanish — keep new text consistent.
- No per-frame `console.log`; don't re-add one.
