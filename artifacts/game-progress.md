# Aether Blowpipe: Glacier & Furnace

## Intent and constraints
Original desktop action roguelike, authored from an empty repository in this session. Offline static ES modules; no runtime services or third-party art. Target 1280 × 800, 60 Hz simulation, detailed hand-authored procedural 2.5D rendering. Stop after passing makefun check and showing four captures; never submit in this session.

## Design brief
You are the last Aether Glassblower, using an artisan's blowpipe to imprison the ancient foundry's creatures in elemental glass. Breathe a fragile sphere into existence, corral enemies into it, then shatter the connected glass at the right moment. The feeling is controlled danger becoming a spectacular release. Every 5–20 seconds, manage breath, charge glass, capture enemies, dodge telegraphed attacks, and cash in a chain. Every wave grants a forge decision; every realm changes the arena and pressure. Zero health or a furnace meltdown ends the run. A clean retry takes one button. Better players alternate cold and hot glass, group enemies, use cover against the boss, and choose synergistic refits.

## Core loop contract
Hold left mouse to blow elemental glass toward the cursor and trap enemies; right mouse shatters linked bubbles for damage, score and cullet while enemy attacks and heat create risk. Cullet purchases upgrades between waves. Victory means clearing eight waves across three realms and defeating both wardens. Failure reports its cause and permits an immediate retry.

## Encounter plan
Fixed overhead oblique arena, completely filling the viewport. HUD lives on the perimeter; combat occupies x=190..1050, y=240..680. Six physical cover props form flanking lanes around a central solar furnace. Supply crates encourage moving out of the safest circuit. Waves 1–2: Hot Shop and basic pursuit/spitters. Waves 3–5: Frost Yard, chargers, shielded enemies and the first boss. Waves 6–8: Glacier Vault, mixed enemies and two-phase solar core boss. Each boss laser telegraphs before becoming lethal; cover intercepts it. Between waves: choose one of three refits, one free choice, optional cullet reroll. Three difficulties alter damage, enemy counts and heat pressure. Persistent workshop records best score and earned mastery, never a mandatory grind.

## Decisions
- Procedural 2.5D Canvas renderer, layered stone/metal/ice materials and cached static arena, no external assets.
- SPACE dashes and shatters simultaneously. RMB only shatters. This resolves the prompt's two SPACE roles.
- Deterministic screenshot scenes use the actual renderer and simulation state, clearly documented as curated run snapshots.
- OpenCode log found by official CLI; model pricing pattern gpt-6[-.]1-sol matches current model.

## Progress
Preflight: empty folder confirmed; Node 24.15.0; OpenCode 1.19.5; GitHub argaromit-lab active; make.fun argaromit confirmed. Native session found by bundle dry run. System prompt must be supplied in privacy-redacted form, effort default, no MCP servers used.

## Completed implementation and tests
Full simulation, 3 elements, 3 reactions, 5 enemy families, cover, 2 two-phase bosses, 16 functional refits, 12 relics, 3 difficulties, forge merchant, 4 persistent starting tools, 8 milestones, field guide and codex. Original procedural art and event-driven sound.

Browser: 10 checks pass, no page/console errors or outside requests. Unit tests: 18 pass. Four intent-bot descents: three victories, one defeat. A* steering fixes cover deadlocks. Baseline active-render duration is around 1.2 ms; full moving performance pass pending.

Authorship diagnostic: all original game modules and test modules are fully authored. Generated JSON QA reports were being included as unwritten source, despite being outputs of authored tests. These remain on disk and are reproducible; ignore them in git like other generated outputs. Do not modify logs or the official checker. Official dossier library is byte-identical and excluded as kit content.

## Final preparation
Live moving browser scenario: 59.998 FPS, 1.954 ms render, zero errors. Eleven browser scenarios and eighteen rules tests pass. Final PNGs are 209881 / 128649 / 124707 / 126198 bytes, 1280×800, with combat first. Dossier is 936880 bytes and repeats byte for byte (sha256 eadf7e2b64337dd0d1bb7c35fd065d82ec6bddb2eff62ca057583a3222625a80).

Public repository created: argaromit-lab/celestial-glassforge-01, with required About URL, makefun topic and MIT license. Requested payout wallet confirmed already attached to argaromit. Final commit/push and official native-session check pending. No submission authorized before audit.
