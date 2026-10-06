# Groove Quip: Product Requirements

> Working name: **Groove Quip** (Groovepad was rejected because an existing music app uses it; a web search found no existing "Groove Quip", but GitHub, app stores, domain and trademark checks are still pending).
> Purpose of this document: a single source of requirements, to be turned into technical specs. Items marked **[Decided]** were stated by the product owner. Items marked **[Proposed]** are suggestions that have not been confirmed. Items marked **[Open]** need a decision.

---

## 1. Vision

An open-source, very easy to use, mobile-compatible web app for **writing music notation**, starting with standard sheet music and later adding tablature. Similar apps exist (MuseScore, Flat.io), but Groove Quip must be **fully open source** and optimized for **quick writing** of notation. Link sharing is deferred and is not a current priority.

## 2. Product principles

1. **Writing notation is the core.** Playback and MIDI export are secondary.
2. **Fast note entry** is the thing to prove first, especially on an **iPad with Apple Pencil**.
3. **Everyone should be able to use it.** There is no single target persona, so the UI must not require music-software expertise.
4. **Readable over beautiful.** Rendering must be easily readable; it does not need to be engraving-grade.
5. **Open source.** All code is public. **[Decided for now]** The project uses the GPL-3.0 license.
6. **Simple to run and host.** Prefer static hosting; avoid backend dependencies until sharing needs them.

## 3. Scope

### 3.1 Modes (all P0)
| Mode | Description |
|---|---|
| Melody | Single melodic line on one treble staff |
| Piano | Grand staff: treble and bass staves |
| Drums | Percussion staff, entered through a tap grid |

Notes:
- "Melody + chords" was originally a separate mode. **[Decided]** It was removed. Chord symbols are available in Melody and Piano; the current approved Drums design does not include chord entry (see FR-CHORD).
- Tablature is a later phase, but a first auto-tab for guitar/bass already exists in Melody mode (see FR-TAB).

### 3.2 Out of scope for the first prototype (deferred, not rejected)
- Link sharing is **not a priority for now**. No sharing behavior or backend requirements are established in this spec.
- Playback is **not a priority for now**. It can be considered later; no playback requirements are established in this spec.
- MIDI export (secondary)
- Engraving-quality rendering

---

## 4. Functional requirements

Priority: **P0** = required for the prototype, **P1** = next, **P2** = later.

### 4.1 Note entry (FR-ENTRY)
- **FR-ENTRY-1 (P0)** Entry must be fast on iPad with Apple Pencil, and also work with finger and mouse.
- **FR-ENTRY-2 (P0)** In pitched modes the user picks a duration (whole, half, quarter, eighth, sixteenth) and taps the staff. A single tap sets both beat position and pitch; it snaps to the duration grid and to staff lines and spaces.
- **FR-ENTRY-3 (P0)** Tapping an existing note again removes it.
- **FR-ENTRY-4 (P0)** Accidentals: natural, sharp, flat, chosen before placing a note.
- **FR-ENTRY-5 (P0)** Notes of the same start and length but different pitch stack into a chord. A new note overwrites any overlapping notes of other lengths.
- **FR-ENTRY-6 (P0)** Undo (at least 40 steps).
- **FR-ENTRY-7 (P0)** Add and delete measures. Clear the current mode.
- **FR-ENTRY-8 (P1)** Copy and duplicate a measure (the drum reference app has this).
- **FR-ENTRY-9 (P1)** Dotted notes, ties, triplets, key signatures, time signatures other than 4/4, beaming.

### 4.2 Rests (FR-REST)
- **FR-REST-1 (P0)** Gaps in a measure display as rests automatically (largest aligned rest values first).
- **FR-REST-2 (P0)** A **Rest tool** lets the user place an explicit rest of the chosen length. It replaces any notes in that span. The user said they could not find a way to add pauses before this tool existed, so it must be visible and obvious.

### 4.3 Drums (FR-DRUM)
- **FR-DRUM-1 (P0)** Grid entry uses 16 steps per measure below the staff; the staff above updates live. A Grid/Pen selector sits immediately above the grid and remains visible in either input mode. In Pen mode, the grid is hidden and the user draws annotations on the score. Reference: the "Groove Studio" app (see section 8).
- **FR-DRUM-2 (P0)** The grid shows **only the measure being edited**. The user selects the measure by tapping it on the staff or with previous/next buttons. A label shows "Measure N of M". This keeps the UI manageable with many measures.
- **FR-DRUM-3 (P0)** The kit is extensible: the user can **add and remove parts**. Available parts and their staff positions: hi-hat (above top line, x head), crash (ledger line above, x head), ride (top line, x head), tom (4th space), snare (3rd space), floor tom (2nd space), kick (1st space). Default kit: hi-hat, snare, kick.
- **FR-DRUM-4 (P0)** Cymbal parts use stems up; drums use stems down; beams join hits within each beat. The grid records hit onsets, and the staff derives note values from the gap to the next onset in the same stem group, or to the beat boundary for the last onset in a beat. For example, hits at steps 1 and 4 in the same beat render as a dotted eighth followed by a sixteenth. The grid itself remains a 16-step onset editor; it has no separate duration selector.
- **FR-DRUM-5 (P1)** Accents (tap again, as in the reference app), open hi-hat, other percussion, triplet and non-16th grids, per-measure copy.

### 4.4 Chord symbols (FR-CHORD)
- **FR-CHORD-1 (P0)** Available in Melody and Piano, stored separately per mode. Drum mode has no chord-symbol tool in the approved design.
- **FR-CHORD-2 (P0)** The user types a symbol, selects the Chords tool, and taps where it starts. Position snaps to the quarter-note grid. Tapping the same spot with the same text removes it.
- **FR-CHORD-3 (P0)** Style: larger font than other text, placed noticeably above the top staff (extra padding from the staff lines), in a handwritten/Comic Sans style (`Comic Sans MS`, `Comic Neue`, `Chalkboard SE`, `Marker Felt`, cursive).

### 4.5 Pen annotations (FR-PEN)
- **FR-PEN-1 (P0)** With the **Apple Pencil** (and mouse) the user can draw freehand annotations over the score. When Pen mode is active, scrolling anywhere on the page requires a two-finger pan; a single finger must not scroll the page. When Pen mode is inactive, normal one-finger page scrolling works. Two-finger scrolling while Pen mode is active is implemented through pointer-event tracking.
- **FR-PEN-2 (P0)** Annotations are **anchored to a measure** (stored relative to that measure), so they follow it when the layout reflows.
- **FR-PEN-3 (P0)** An eraser tool removes a stroke by tapping near it.
- **FR-PEN-4 (P0)** A Show/Hide Annotations control toggles annotations in the score and in PNG/PDF exports. Hiding annotations must not delete them; they remain in the saved score and reappear when shown again.
- **FR-PEN-5 (P1)** Colors, stroke widths, palm rejection tuning, text annotations.

### 4.6 Tablature (FR-TAB)
- **FR-TAB-1 (P0 for the first cut)** In Melody mode the user can turn on a tab staff under the notation for **guitar (6 strings)** or **bass (4 strings)**.
- **FR-TAB-2 (P0)** Tab is generated automatically from the notation. By default each note uses the string that gives the lowest fret (frets 0 to 22).
- **FR-TAB-3 (P0)** Tab is **editable**, because one pitch can be played on several strings. Tapping a fret number cycles that note through the other valid strings.
- **FR-TAB-4 (P1)** Alternate tunings and more instruments (5/6-string bass, ukulele, 7-string guitar); capo; tab-first entry mode; tab for Piano is not applicable.
- **Tuning assumption:** pitches are *written* pitch. Guitar open strings (low to high): E3 A3 D4 G4 B4 E5 (written, sounding an octave lower). Bass: E2 A2 D3 G3 (written, sounding an octave lower).

### 4.7 Zoom and navigation (FR-ZOOM)
- **FR-ZOOM-1 (P0)** A toggle shows the **current measure zoomed in** (one measure fills the width). Previous/Next buttons move between measures. A normal "all measures" view remains available.
- **FR-ZOOM-2 (P1)** Pinch zoom and a fit-to-screen option (the drum reference app has "Fit screen" and "Full screen").

### 4.8 Layout and rendering (FR-RENDER)
- **FR-RENDER-1 (P0)** Each named pattern renders on its own horizontal score line. Its measures stay on that line at every viewport width; narrow screens use horizontal scrolling rather than wrapping or shrinking the notation.
- **FR-RENDER-2 (P0)** Output includes title and author, clefs, 4/4 time signature, measure numbers, final barline.
- **FR-RENDER-3 (P0)** Renderer is shared by all modes; each mode only supplies its own entry method.
- **FR-RENDER-4 (P1)** Self-hosted music font (e.g. Noto Music) so clefs and glyphs render consistently offline and align correctly. The prototype relies on system fonts and clef alignment may vary by device.

### 4.9 Patterns (FR-PATTERN)
- **FR-PATTERN-1 (P0)** A score contains one or more named patterns. Each pattern renders on its own line and retains independent measures, notes, chords, and pen annotations.
- **FR-PATTERN-2 (P0)** New patterns start with 2 measures. Users can add or remove measures within each pattern.
- **FR-PATTERN-3 (P0)** Patterns share the score's selected mode. Users can select, rename, duplicate, reorder, and delete patterns. Deleting a non-empty pattern requires confirmation; at least one pattern remains.
- **FR-PATTERN-4 (P0)** Pattern names and line breaks appear in PNG/PDF exports.
- **FR-PATTERN-5 (P0)** Existing saved scores open as one pattern named "Pattern 1" with their existing content preserved.

### 4.10 Export, save, load (FR-IO)
- **FR-IO-1 (P0)** Export the score as **PNG** and as **PDF** (the prototype produces a one-page PDF with the score as an image).
- **FR-IO-2 (P0)** Save and open scores as JSON files using the current state format. A format-version field and compatibility with older formats are not required.
- **FR-IO-3 (P0)** Autosave in the browser (local storage).
- **FR-IO-4 (P1)** Vector PDF with real pagination, MusicXML export/import, MIDI export.

### 4.11 Playback (FR-PLAY)
Playback is **not a priority for now**. Playback requirements can be defined later if it becomes a priority.

### 4.12 Sharing (FR-SHARE)
Link sharing is **not a priority for now**. Sharing requirements can be defined later if it becomes a priority.

---

## 5. Data model (as implemented in the prototype)

- Time resolution: **16 units per measure** (sixteenth notes), 4/4 only.
- Note event: `[startUnit, durationUnits, diatonicStep, accidental, tabStringOverride?]`
  - `diatonicStep`: C4 = 0, D4 = 1, B3 = -1, and so on. `null` means an explicit rest.
  - `accidental`: 1 sharp, -1 flat, 0 natural.
  - Durations: 16, 8, 4, 2, 1.
- Drum hit: `[startUnit, 1, laneIndex]`; lanes are indexes into the kit table (see FR-DRUM-3). The duration value `1` marks a grid onset, not necessarily the engraved note value; the renderer derives that value as specified in FR-DRUM-4.
- Score state: title, author, mode, page width, active pattern ID, ordered patterns (each with name, measure count, current measure, per-mode note data (melody: 1 staff; piano: 2 staves; drums: 1), per-mode chords keyed `"measure:unit"`, and per-mode pen strokes `{measure, points relative to the measure}`), kit, tab setting, zoom flag, and annotation visibility.
- Chords and pen strokes are stored per mode.

## 6. Non-functional requirements

- **NFR-1 Platform:** modern Safari on iPad and iPhone first; also Chrome, Firefox, Edge. Touch targets are at least 44 px except for the compact 16-step drum grid cells, which may shrink below 44 px on narrow screens to keep one measure visible at once, matching the approved current layout.
- **NFR-2 Zero backend** for the first release; everything runs client-side.
- **NFR-3 Offline:** installable and usable offline (web app manifest + service worker). (P1)
- **NFR-4 Privacy:** scores stay on the device unless the user exports or shares them.
- **NFR-5 Performance:** entry feedback should feel instant, with the full re-render completing within a frame or two on an iPad for scores of at least 32 measures.
- **NFR-6 Accessibility:** readable contrast, light and dark UI themes (score area stays white).

## 7. Repository, hosting and process

- **GitHub organization:** VandroiyLabs. Suggested repo: `groove-quip` (if the name is kept). **[Decided]** Create it under that org.
- **Hosting [Decided: preferred]:** static site on **GitHub Pages**; the owner liked the idea of GitHub handling the publishing. A `.nojekyll` file at the root serves files as-is. Jekyll itself is not required; it can be added later for docs or a landing page. Cloudflare Pages is an acceptable alternative and the better fit once link sharing needs Workers/KV.
- **Layout [Proposed]:** `index.html`, `css/app.css`, `js/` split into modules (`model`, `render`, `input`, `export`), plus `README.md`, `LICENSE`, `CONTRIBUTING.md`, `docs/`.
- **First version delivered:** a repo zip with `index.html`, `css/app.css`, one `js/app.js`, `.nojekyll`, `README.md`, MIT `LICENSE`. Splitting `app.js` into modules is the first follow-up.
- **Tests:** `npm test` runs the current Node test suite. It covers score swipe handling, pen strokes, dotted drum notation and beaming, and Grid/Pen/annotation visibility controls. Expand coverage as score logic grows.

## 8. Reference app: "Groove Studio"

A drum notation app that someone built with Claude, shown by the owner as a design reference ("a design similar to this is more than enough"). Elements to emulate: dark UI; BPM and swing sliders with a play button; title and author fields; a white score area; a measure selector with add, copy and delete; a per-instrument step grid below the score; "+ Add to kit"; Clear all; Share link; Download PDF; Save file; Open file; Fit screen; Full screen; hint text ("Tap a circle to place a note. Tap again for an accent.").
Differences wanted: Groove Quip is not drum-only, uses staff-tap entry for pitched modes, and starts without playback or link sharing.

## 9. Known limitations of the current prototype

- No dotted notes in Melody or Piano, ties, triplets, key signatures or alternate time signatures. Drum note values are derived from grid-hit spacing as specified in FR-DRUM-4.
- Clef glyphs depend on system fonts and can misalign.
- PDF is a single page containing a raster image.
- Very high notes may sit close to chord symbols.
- Eighth and sixteenth rests are simplified shapes.
- Pen strokes anchor to the measure where they start.
- While Pen mode is active, two-finger page scrolling uses pointer-event tracking; Pencil behavior still needs validation on a real iPad.
- Tab assumes standard tuning and written pitch.
- App logic remains in a single JavaScript file (`js/app.js`); an automated Node test suite exists, but real-iPad layout and Pencil behavior still need validation.
- Mobile layout and Pencil feel are **untested on a real iPad** and are the first things to validate.

## 10. Open questions

1. **Name:** confirm Groove Quip after GitHub, app-store, domain and trademark checks.

## 11. Suggested acceptance criteria for the prototype

- A user can write a 4-measure melody on an iPad with Apple Pencil in under a minute without instructions.
- A user can write a drum groove of 2 measures with a custom kit (including crash) and edit measure 2 without seeing the others.
- Chords can be added in Melody and Piano modes and appear large, high and handwritten-style.
- A guitar tab appears under a melody and any fret number can be moved to another string.
- Pen marks drawn with Pencil survive a layout change and appear in PNG/PDF exports when annotations are shown; hiding them does not delete them.
- A score can be saved to a file, reopened, and exported to PNG and PDF.
