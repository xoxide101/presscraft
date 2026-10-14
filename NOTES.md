# PressCraft – development notes

How PressCraft is built and what to keep in mind when changing it. For what it does and how to use it, see [README.md](README.md).

## How it is built

- **No build step.** `index.html` loads `css/presscraft.css`, `fonts/fonts.css` and the scripts in order: `lib/fabric.min.js` (Fabric.js 5.3.1), `js/craft-titlebar.js`, `js/art.js`, `js/core.js`, `js/output.js`, `js/ui.js`.
- **Fonts:** `fetch_fonts.py` downloads the Google fonts (Latin and Latin Extended) into `fonts/` and writes `fonts/fonts.css`. Italic files get their own names.
- **Title bar and ribbon:** this app's own copy of `craft-titlebar.js` (`CraftTitlebar`, `CraftRibbon`, `CraftIcons`). It started from the other Craft apps' copy and is changed here on its own; changes are not copied between apps.

## Files

| File | What is in it |
| --- | --- |
| `js/art.js` (`window.PressArt`) | Clip art (`ART`: id, name, category, SVG on a 100 × 100 grid), `clipSvg(id, mode, tint)` for colour / outline / one-colour versions, `borderSvg(style, w, h, size, color, inset)` and `magicSvg(model, w, h)` (seeded patterns). |
| `js/core.js` (`window.PC`) | Units, the project model, object builders, newspaper text flow, the retro renderer, history and autosave, rendering pages and laying out sheets for printing. |
| `js/output.js` | `PC.layout()` (which panel goes where on which sheet), drawing sheets as pixels or as SVG, the PDF and ZIP writers, and the Print and export dialog. |
| `js/ui.js` | The canvas, pages list, library tabs, properties panel (built from short field lists), start screen and set-up, example designs, saving and opening, print dialog, menus, ribbon, title bar and keyboard. |

## Model

- **Units:** the canvas works in pixels at **150 DPI** (`PC.px(mm)`); pages print at 300 DPI.
- **Project** (`PC.doc`): `{ app: 'PressCraft', version, kind, paper, orient, fold, bannerPages, retro, retroMode, retroDot, stories, panels }`. Each panel is `{ name, w, h (mm), bg, json }` where `json` is Fabric JSON. Only the panel being edited is live on the canvas; `PC.saveLive()` writes it back before switching, saving, undo snapshots and printing.
- **Panels per kind** (`panelsFor`): cards have four panels (quarter-fold: half the sheet each way; half-fold: half of a landscape sheet), banners one long panel (`pages × (page length − 12.7 mm)` by `page width − 25.4 mm`), newsletters one per page.
- **Object kinds** (`kind`, saved through `PROPS`): `title` (model `title`: text, font, size, fill, effect, shade, depth…), `clip` (`clip`: id, mode, tint), `border` (`border`: style, size, color, inset; locked in place, always at the back), `magic` (`magic`: seed, style, palette, sym, weight, w, h), `cal` (`cal`: year, month, start, notes…), `art` (newspaper frame, `art`: story, order, cols, gutter), `shape`, `text` (Fabric IText), `image`. Generated objects are rebuilt from their model on every change (`PC.swap` keeps the centre, angle and stacking order); scaling a title, pattern or calendar changes its model instead of stretching it.
- **Fonts with digits** (Press Start 2P) are quoted for the canvas with `fam()`; `unfam()` strips the quotes for display.

## Newspaper text flow

- Stories live in `doc.stories` (`text, font, size, lead, align, color, indent, gap`). Frames (`kind: 'art'`) show them; text runs through the frames in page order, then frame `order`.
- `PC.flow(canvas, panelIndex)` rebuilds the frames on that canvas. Frames on other pages are only measured from their saved JSON, so the text that reaches this page is right.
- Each line takes the widest gap that objects with `wrap: true` do not cover (plus 1.8 mm); gaps narrower than a quarter of the column are skipped. Justified lines are built word by word.
- `doc.overflow[story]` counts words that do not fit; the screen shows "▼ more text" on the last frame. Frame outlines and column guides are a DOM overlay, so they never print.

## Retro look

- `PC.retroize(canvas, dotPx, mode)` shrinks the picture to one pixel per dot, dithers it (Atkinson to black and white, or error diffusion to the 8-colour ribbon palette `RETRO_PALETTE`) and scales it back up without smoothing.
- On screen it is a second canvas between Fabric's lower and upper canvases (the lower one is hidden), redrawn shortly after each render, so selection handles stay sharp. Printing and PNG export use the same function at 300 DPI.

## Printing and saving

- **`PC.layout()`** returns sheets `{ w, h (mm), items: [{ i (panel), x, y, w, h, rot, crop, merge, cut }], marks, note }`:
  - **Quarter-fold card:** front bottom right, back bottom left, the inside top half turned 180°.
  - **Half-fold card and bi-fold brochure:** two sheets (outside, inside).
  - **Tri-fold brochure:** outside is flap | back | front; inside is left | middle | right.
  - **Repeating items** (`grid()` with the `LABEL_STOCK`, `BCARD`, `POSTCARD` and `DISC` tables): labels, business cards, postcards and discs. Backs mirror the columns so they line up when printed on the other side.
  - **Labels with addresses:** one slot per address (`merge`), starting at `labelStart`, continuing onto more sheets.
  - **CD case:** front and back inserts on one sheet, with cut and spine marks. **Stationery:** letterhead, envelope (its own page size) and a sheet of cards.
  - **Banner:** slices (`crop`) turned 90°.
- **Pixels** (150 to 600 DPI, the retro look, PNG, JPEG and PDF files): `PC.renderPanel` (with `merge` text and the disc cut-out) drawn onto sheet canvases. Browsers cap a sheet at about 64 million pixels, so very high DPI pictures are limited (`maxDpi`).
- **Vectors** (1200 to 4800 DPI, SVG files): `PC.renderPanelSVG` puts each panel's Fabric SVG inside the sheet with transforms, clip paths for discs and banner slices, and the marks. For printing it is placed inline in `#print-area`, so the page's fonts are used; saved SVG files refer to fonts by name.
- **Mixed sheet sizes** (stationery) use CSS named pages (`page: s0`, `@page s0 { size: … }`).
- **Iron-on transfers** mirror every sheet. The browser cannot set the printer's own media type or quality, so the dialog gives tips for the printer settings.
- **PDF and ZIP** are written by small built-in writers (JPEG pages with DCTDecode; ZIP without compression, since the pictures are compressed already).

## Decisions

- **Shapes, text boxes and shadows (same features in every Craft app that places objects):** box, circle/oval, triangle, diamond, pentagon, hexagon, octagon, star and arrow (plus lines), with corners from sharp to round (`shapePath`: 100% rounds each corner to half the shortest side), words inside, text boxes with wrapping, border, background, corners and padding, a drop shadow and opacity. Each app has its own copy of the shape geometry.

- **All artwork is original.** Do not add pictures, borders or fonts copied from Print Shop, The Newsroom or other commercial programs.
- **The retro look never changes the design.** It is applied when drawing, so switching back is lossless.
- **Example designs** use made-up names and addresses only.

## History

| Version | Changes |
| --- | --- |
| 2026-10-14 | v0.2: flyers, postcards, mailing and shipping labels with mail merge, CD/DVD labels and cases, brochures, stationery sets, business cards, business forms (tables), certificates; print quality 150 to 4800 DPI (vectors above 600), media types, PDF/PNG/JPEG/SVG export, several pictures at once |
| 2026-10-14 | First version: cards (quarter and half fold), signs, letterhead, banners, calendars, newsletters with flowing columns, titles with effects, 62 pictures, 18 borders, Screen Magic, retro B&W and colour-ribbon looks, imposed printing |

## Roadmap

- **Phase 2, drawing and design:** freehand and shape drawing, gradients, text and picture effects, kerning and spacing, master pages, alignment tools.
- **Phase 3, pictures:** bundled vector clip art (Microsoft Fluent Emoji, MIT) and an online public-domain search (Openverse) for photos, black-and-white photos, illustrations, frames and ornaments, keeping each picture's licence and credit.
- **LogoCraft:** a separate logo maker whose SVG/PNG logos can be brought into PressCraft.

## Ideas for later

- More pictures and a picture editor (draw your own on a dot grid, like the old graphic editors).
- Mail merge for cards and letterhead.
- Drop caps and pull quotes in newsletters.
- A font editor for retro bitmap fonts.

**2026-10-14:** Curved text (`kind: arc`, own centre `cx, cy`; words typed in a window, then built once), Word-style Text tab, rotation angle on curved text.
