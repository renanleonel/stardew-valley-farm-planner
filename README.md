# Stardew Farm Planner

Plan a Stardew Valley farm tile by tile in your browser.

**[Open the planner](https://stardew-valley-farm-planner-jet.vercel.app/)**

## What you can do

- Switch between the eight farm maps and four seasons.
- Place buildings, crops, soil, trees, fences, paths, furniture, and other items from a searchable library.
- Plan building interiors and preview placement before committing it.
- Draw across tiles, move placed items, erase, and use Undo and Redo.
- See connected soil, fences, and flooring as they appear next to matching tiles.
- Toggle the tile grid, buildable area, and item coverage overlays.
- Export the current view as a PNG or export and import planner data as JSON.
- Reset the current farm to its starting layout. Reset asks for confirmation and can be undone.
- Open a prefilled email draft from **Report issue** in the tools drawer.

Plans save automatically in your browser on this device. Export a JSON backup before clearing browser data or moving to another device. The JSON format is for this planner; it is not a Stardew Valley save file.

## Run locally

Install Node.js and pnpm, then run:

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. The generated assets in `public/game-assets/` are tracked, so running the planner does not require an installed copy of the game.

## Editor controls

| Action                            | Control                                                 |
| --------------------------------- | ------------------------------------------------------- |
| Place the selected item           | Left click or drag across the map                       |
| Select or move a placed item      | Select tool, then left click or drag                    |
| Stop placing or clear a selection | Right click the map                                     |
| Pan the map                       | Pan tool, or drag with the middle or right mouse button |
| Zoom                              | Mouse wheel or the tools drawer controls                |
| Select, erase, or pan tool        | `V`, `E`, or `P`                                        |
| Toggle the tile grid              | `G`                                                     |
| Undo or redo                      | `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, or `Ctrl+Y`           |
| Remove selected items             | `Delete`                                                |

The item library is on the left, and map, season, display, file, reset, and issue reporting controls are on the right. Both drawers can be collapsed.

## Regenerate game assets

This step is optional and currently uses Windows PowerShell. It requires a local Stardew Valley installation with SMAPI. The import script downloads StardewXnbHack, unpacks the game's `Content` folder, verifies the extraction, and copies it to the ignored `local-assets/unpacked/` directory.

```powershell
.\scripts\import-game-assets.ps1 -GamePath "C:\path\to\Stardew Valley"
pnpm assets:generate
pnpm assets:audit
```

The import script stops if `local-assets/unpacked/` already exists; review that directory before running it again. Asset generation writes the smaller browser-ready maps, catalog, and textures to `public/game-assets/`. Raw extracted files and downloaded tools stay outside Git. The generated browser assets are tracked so a fresh checkout can run without repeating the extraction.

## Project structure

| Path                                 | Purpose                                        |
| ------------------------------------ | ---------------------------------------------- |
| `src/containers/planner/components/` | Editor UI, canvas, library, and tools          |
| `src/containers/planner/domain/`     | Plan state, schemas, and repositories          |
| `src/containers/planner/lib/`        | Placement, tile connections, and map rendering |
| `scripts/`                           | Asset import, generation, and audit tools      |
| `public/game-assets/`                | Generated assets served by the app             |

The frontend uses React, TypeScript, Vite, and Tailwind CSS. Plans are stored locally in the browser; the planner does not require a backend.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

This is an unofficial fan project. The game artwork in `public/game-assets/` was generated from a Stardew Valley installation; it is separate from the planner's source code.
