/**
 * Asset manifest.
 *
 * Declares every loadable asset bundle the game uses. Bundles are loaded
 * on demand by scenes through `AssetManager.loadBundle(name)`. Keep this
 * file flat and human-readable - it is the single source of truth for what
 * art/audio is shipped with the build.
 *
 * Pixi v8's `Assets` resolves these aliases globally, so any module can
 * call `Assets.get('logo')` once a bundle is loaded.
 *
 * Bundle naming convention:
 *   - `boot`        : tiny, blocking. Logo / loading screen art only.
 *   - `main-menu`   : main menu background, music, button sounds.
 *   - `<scene-id>`  : everything that scene needs.
 *
 * Place actual binary files under `public/assets/...` so Vite serves them
 * statically and they can be referenced by URL as below.
 */
export const assetManifest = {
  bundles: [
    {
      name: 'boot',
      assets: [
        // Example - uncomment once you add an icon to public/assets/
        // { alias: 'logo', src: 'assets/logo.png' },
      ],
    },
    {
      name: 'main-menu',
      assets: [
        // { alias: 'menu-bg', src: 'assets/menu/background.png' },
        // { alias: 'menu-music', src: 'assets/menu/theme.mp3' },
      ],
    },
    {
      name: 'office',
      assets: [
        { alias: 'character-1', src: 'assets/images/characters/character1.png' },
        { alias: 'character-2', src: 'assets/images/characters/character2.png' },
        { alias: 'character-3', src: 'assets/images/characters/character3.png' },
        { alias: 'character-4', src: 'assets/images/characters/character4.png' },
        // { alias: 'office-tileset', src: 'assets/office/tiles.png' },
        // { alias: 'employee-sheet', src: 'assets/office/employees.json' },
        // SFX — loaded directly by SoundManager (not via Pixi Assets).
        // { alias: 'sfx-modal-open',    src: 'assets/audio/sfx/ui_modal_open.mp3' },
        // { alias: 'sfx-project-claim', src: 'assets/audio/sfx/ui_project_claim.mp3' },
      ],
    },
  ],
};
