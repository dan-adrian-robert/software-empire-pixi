# Software Empire

A 2D management / tycoon simulation game built with **PixiJS v8**, **Vite** and plain **modern JavaScript** (ES modules, no TypeScript).

This repository contains the initial project scaffold: build tooling, project structure, and a runnable Pixi application with a basic scene system, main menu and placeholder office scene.

---

## Quick start

```bash
npm install
npm run dev
```

The dev server opens at <http://localhost:5173>.

### Available scripts

| Command           | Description                                         |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR                  |
| `npm run build`   | Produce a production build in `dist/`               |
| `npm run preview` | Preview the production build locally                |
| `npm run lint`    | Run ESLint on the source                            |
| `npm run lint:fix`| ESLint with `--fix`                                 |
| `npm run format`  | Format the codebase with Prettier                   |

---

## Project structure

```
software-empire/
├── index.html              # HTML shell + loading overlay
├── vite.config.js          # Vite config + path aliases
├── eslint.config.js        # Flat ESLint config
├── .prettierrc.json        # Prettier formatting rules
├── public/
│   └── assets/             # Static, served as-is (drop art/audio here)
└── src/
    ├── main.js             # App entry point
    ├── Game.js             # Top-level game class (Pixi App + managers)
    ├── config.js           # Central, designer-facing configuration
    ├── assets/
    │   └── manifest.js     # Pixi Assets bundle declarations
    ├── scenes/             # Self-contained gameplay screens
    │   ├── BaseScene.js
    │   ├── MainMenuScene.js
    │   └── OfficeScene.js
    ├── ui/                 # Reusable UI widgets (buttons, panels, ...)
    │   └── Button.js
    ├── systems/            # Cross-cutting systems (scene mgr, save, AI, ...)
    │   └── SceneManager.js
    ├── entities/           # In-world objects (employees, desks, ...)
    │   └── Entity.js
    ├── managers/           # Stateful global services (assets, input, audio)
    │   ├── AssetManager.js
    │   └── InputManager.js
    └── utils/              # Pure helpers (math, event bus, ...)
        ├── EventBus.js
        └── math.js
```

### What goes where?

- **`scenes/`** — A scene is a screen of gameplay (Main Menu, Office, World Map, Hire Screen). Scenes own their own scene graph and are mounted/unmounted by the `SceneManager`. **One scene is active at a time.**
- **`ui/`** — Reusable visual widgets that don't care which scene they live in (buttons, modals, tooltips, panels, HUD elements).
- **`systems/`** — Cross-cutting logic that operates on many entities or scenes (`SceneManager`, future `SaveSystem`, `EconomySystem`, `AISystem`, ...).
- **`entities/`** — Things that exist *in the world* (employees, desks, plants, computers). Each entity owns a Pixi `Container`. Designed to grow into an ECS later.
- **`managers/`** — Long-lived global services that wrap a side-effectful resource (`AssetManager` wraps Pixi `Assets`; `InputManager` wraps DOM events; future `AudioManager`, `SaveManager`, ...).
- **`utils/`** — Stateless, framework-agnostic helpers. Easy to unit test.
- **`assets/`** (under `src/`) — Code that *describes* assets (the manifest). Actual binary files live in `public/assets/`.
- **`public/`** — Anything in here is copied to the build root verbatim and can be referenced by URL.

### Path aliases

Vite is configured with the following aliases so imports stay short as the codebase grows:

| Alias        | Resolves to     |
| ------------ | --------------- |
| `@/`         | `src/`          |
| `@assets/`   | `src/assets/`   |
| `@scenes/`   | `src/scenes/`   |
| `@ui/`       | `src/ui/`       |
| `@systems/`  | `src/systems/`  |
| `@entities/` | `src/entities/` |
| `@managers/` | `src/managers/` |
| `@utils/`    | `src/utils/`    |

---

## Architecture overview

```
                ┌──────────────────────────────┐
                │           Game               │
                │  (owns Pixi.Application)     │
                └──────────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐      ┌─────────────────┐    ┌──────────────────┐
│  Managers    │      │  SceneManager   │    │  EventBus        │
│  (Assets,    │      │  (active scene) │    │  (loose coupling)│
│   Input)     │      └────────┬────────┘    └──────────────────┘
└──────────────┘               │
                               ▼
                       ┌────────────────┐
                       │  Active Scene  │   <- e.g. OfficeScene
                       │  (BaseScene)   │
                       └───────┬────────┘
                               │
                  ┌────────────┴───────────┐
                  ▼                        ▼
           ┌─────────────┐          ┌──────────────┐
           │  Entities   │          │   UI / HUD   │
           └─────────────┘          └──────────────┘
```

- The **`Game`** class owns the Pixi `Application`, the global event bus and the long-lived managers, and drives the ticker.
- The **`SceneManager`** swaps scenes through a clean `preload → enter → update → exit` lifecycle.
- A **scene** owns its display objects, entities and per-scene UI. When the scene is replaced, everything it created is destroyed.
- **Managers** are global services. **Systems** operate on game state. **Entities** live inside scenes. **UI widgets** are reusable view components. **Utils** are pure helpers.

This split keeps the codebase scalable: adding a new screen means adding a file in `scenes/`; adding a new in-world object means adding a file in `entities/`; adding a global service (audio, save, analytics) means adding a file in `managers/`. Existing files rarely need to change.

---

## Adding a new asset

1. Drop the file into `public/assets/...` (e.g. `public/assets/office/desk.png`).
2. Register it in `src/assets/manifest.js` under the appropriate bundle:

   ```js
   { alias: 'desk', src: 'assets/office/desk.png' }
   ```

3. In the scene that needs it, load the bundle and use the asset:

   ```js
   await this.game.assets.loadBundle('office');
   const tex = this.game.assets.get('desk');
   const sprite = new Sprite(tex);
   ```

---

## Adding a new scene

1. Create `src/scenes/MyScene.js` extending `BaseScene`.
2. Register an id for it in `GameConfig.scenes` (`src/config.js`).
3. Register it in `Game._registerScenes()`.
4. Transition to it from anywhere with:

   ```js
   game.scenes.changeTo(GameConfig.scenes.MY_SCENE);
   ```

---

## Tech stack

- [PixiJS v8](https://pixijs.com/) – WebGL/WebGPU 2D renderer
- [Vite](https://vitejs.dev/) – dev server & bundler
- [ESLint 9](https://eslint.org/) – linting (flat config)
- [Prettier](https://prettier.io/) – formatting
