# Final evidence: Aether Blowpipe

## Delivered game

Original offline desktop action roguelike with three realms, eight waves, two two-phase bosses, five creature families, three elemental glass types, three mixed-element reactions, sixteen refits, twelve relics, a forge economy, four persistent starting tools, eight milestones, three difficulties, local saves, pause, reduced camera motion, synthesized SFX and music, victory, defeat and immediate retry.

Playable with `node serve.ts` at http://127.0.0.1:5188. Keyboard/mouse controls and full reproduction commands are in the root README. Source is split by simulation, navigation, elemental rules, economy, persistence, art, renderer, UI, audio and input ownership.

## Checks actually run

| Check | Result |
| --- | --- |
| Node prerequisites | Node.js 24.15.0; desktop Chromium 147.0.7727.15 launches and opens the game |
| Native session preflight | Official bundle finds the current OpenCode 1.19.5 database session |
| Real-input browser scenarios | 11 passing scenarios; no console errors, page errors or outside requests |
| Simulation rules | 19 tests pass: capture/expiry, damage, one-time rewards, pause, cover, pathing, elements, forge, relic limits, Phoenix, persistence, retry and floating-label separation |
| Full intent-controller descents | 4 runs, 3 victories and 1 defeat, no combat stat overrides |
| Standard Glasswright runs | Victories at 235.77 s with 111 HP and 173.97 s with 51 HP; 112 kills each |
| Live performance after polish | 59.390 FPS, 2.158 ms average render, 371 advanced frames during input sequence, up to 317 particles, 0 errors |
| Viewport fit | 1280×800 and 1024×768 fit; targeted visible headings, controls and metrics have no clipping |
| Pixel inspection after polish | Canvas contrast 240.18; edge density 0.133; coarse 64-bin color entropy 3.20 bits; dominant-bin share 0.251 |
| Static interface detector | anti-slop PASS, severity 0, 0 findings; external stylesheet count 1 means style-rule coverage is partial |
| Dossier determinism | Two complete builds have identical output manifests; bytes match the official builder |
| Dossier size | 936,685 bytes, below 950,000 bytes |

The bot is an automated controller, not a claim that every player wins. It tests actual simulation rules through movement, aim, blow, release, shatter and forge intents. The browser suite separately exercises real physical keyboard and mouse events. Test setup for boss-phase/defeat assertions changes state explicitly; the full-run controller does not.

## Four dossier captures, in order

| Image | State | Dimensions | Size |
| --- | --- | --- | --- |
| `screenshots/01-combat.png` | Wave 8, Glacier Vault, traps, chain, boss, upgrades and relics | 1280×800 | 212,905 B |
| `screenshots/02-title.png` | Title, elemental cards, difficulty, route and start | 1280×800 | 115,508 B |
| `screenshots/03-upgrade.png` | Forge refits and merchant services | 1280×800 | 124,708 B |
| `screenshots/04-gameover.png` | Victory S rank, run statistics, final build and restart | 1280×800 | 126,197 B |

All four are browser screenshots of the actual renderer. The shots use opt-in deterministic editorial run snapshots. Compression only quantizes the PNG palette: no resize, cropping, paint, compositing or outside art. Uncompressed originals remain in `artifacts/raw/`, ignored by git. Screenshots are a presentation of possible game states; gameplay correctness is established by separate tests.

## Renderer and resource evidence

The renderer is custom Canvas 2D with oblique character/prop art; Three.js triangle and draw-call budgets do not apply. Simulation runs at 60 Hz with clamped frame accumulation. Six circular cover colliders, player/enemy circles and finite laser segments implement collision. A cached 38×19 navigation grid routes enemies around cover. The static arena is cached per realm (4.096 MB per full-resolution canvas, at most three), and one 320×200 light target adds 0.256 MB. Two additive blur passes supply bloom after painter-sorted moving objects. Effects cap at 450 shards and glass at twelve released spheres. No third-party runtime assets, network fetches or audio decoding.

Motion evidence is recorded as three unpaused browser frames in ignored `artifacts/motion/`. Raw generated measurements are in ignored `artifacts/qa-report.json`, `bot-report.json`, `performance.json` and `screenshots.json`; run their scripts to regenerate. These are generated evidence, not source, and are not claimed as authored code.

## Visual review boundary

The requested single visual polish pass adds a branching molten fault network across the middle/right floor, cyan left-side frost and drifting mist, rising embers, iridescent spectrum glass rims and molten interiors, stronger specular caustics, a hooded bronze/blue artisan with glowing alchemist goggles and an animated scarf, and an animated molten blowpipe thread. Helios now has counter-rotating copper astrolabes, pulsing molten convection, solar prominences and laser heat-shimmer contours. These change presentation, not combat hitboxes or damage rules.

All floating world labels share a measured-bounds layout stage after bloom. Chain, damage, trapped markers and player identity are positioned without intersections; overload drops the lowest-priority transient label. Forge, victory, defeat and pause suppress all world typography. Browser assertions check every combat label pair and zero visible world labels in noncombat captures. The curated combat explicitly separates CHAIN x2! from +325 and the player identity from +95.

This session's model cannot consume image inputs. Direct aesthetic inspection and the skill's calibrated premium visual scorecard therefore cannot be completed honestly here. No invented visual score or claim of beating the current leaderboard is attached. Programmatic checks establish rendering, layout, contrast, content, motion and performance; the four images are supplied for the requested human visual audit.

The implementation uses carefully drawn procedural 2.5D art rather than external generated models. It is an ambitious finished browser game, but the requested “AAA indie” quality and a 95% competition win rate remain matters for visual review and the platform judge, not something local checks certify.

## Account and release boundary

make.fun confirmed `@argaromit` using existing credentials. The requested payout wallet is already an agent wallet on that account. No login, account replacement, private-key publication or submission was performed. MIT LICENSE and the wallet claim are committed at the root/`.makefun` paths. README has all three live make.fun badges; repository About points to the bounty and includes topic `makefun`.

The final step is the unmodified official `makefun check` against the pushed commit and the native session bundle. Site-only repository/account checks remain deferred to intake by the CLI. Stop before `makefun submit` for the visual audit.
