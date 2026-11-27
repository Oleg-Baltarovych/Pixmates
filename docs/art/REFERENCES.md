# Reference board — HD pixel-art quality bar (M-ART, owner decision Q4)

Links and technique notes only. **No third-party images are stored in this repo** (ADR 005). These works set a
quality bar; we never copy their characters, costumes, palettes or poses. The owner reviews and prunes this list.

Note: compiled from well-known public sources; licences are those stated by each source (games are commercial,
all rights reserved; nothing here is used as an asset). Links were not re-fetched in this run, so the owner should
check them while pruning.

| # | Work / source | Artist / studio | Licence note | What to learn |
|---|---|---|---|---|
| 1 | [Pixel art tutorials](https://saint11.art/blog/pixel-art-tutorials/) | Pedro Medeiros (saint11) | Free tutorials, artist's site | Short, readable rules for AA on curves, selective outline and squash and stretch at small sizes. Our `antiAlias` pass follows his "mid tone on the step" rule. |
| 2 | [Pixelblog catalogue](https://www.slynyrd.com/pixelblog-catalogue) | Raymond Schlitter (Slynyrd) | Free blog | Hue-shifted ramps (cool shadows, warm lights) and 4–7-tone material ramps. This is the basis of `master.json`. |
| 3 | [Celeste](https://www.celestegame.com/) | Maddy Makes Games (art: Pedro Medeiros, Amora Bettany) | Commercial game | A small character that reads through anticipation, squash on landing and hair as secondary motion (our verlet chain). |
| 4 | [Eastward](https://store.steampowered.com/app/977950/Eastward/) | Pixpil | Commercial game | Dense modern HD detail with clear silhouettes: material texture never fights the read of the shape. |
| 5 | [Sea of Stars](https://seaofstarsgame.co/) | Sabotage Studio | Commercial game | Many-frame character animation with soft modelling, rim light and coloured outlines that hold on dark scenes. |
| 6 | [Owlboy](https://store.steampowered.com/app/115800/Owlboy/) | D-Pad Studio | Commercial game | Hand-made detail and lively idles: breathing, cloth and hair follow-through, sub-pixel colour shifts. |
| 7 | [Blasphemous](https://store.steampowered.com/app/774361/Blasphemous/) | The Game Kitchen | Commercial game | High-detail sprites that stay legible on very dark backgrounds: local contrast and edge light. Shows why we need the rim pass. |
| 8 | [Hyper Light Drifter](https://store.steampowered.com/app/257850/Hyper_Light_Drifter/) | Heart Machine | Commercial game | Silhouette first, limited ramps and bold colour accents. The quality bar for the Crisp variant. |
| 9 | [Pixel art tutorials index](https://lospec.com/pixel-art-tutorials) | Lospec (community) | Links to third-party tutorials, each with its own terms | A curated index of tutorials on outlines, dithering as texture (not as gradient) and animation. |
| 10 | [BJGpixel channel](https://www.youtube.com/@BJGpixel) | Brandon James Greer | Free videos | Readability at real size: judge sprites at 1× and at real scale, never only zoomed in. This is the reason for our real-size APNG previews. |

How art-director uses this board: each spike note names the technique (for example "AA like #1" or "rim like #5"),
never a character.
