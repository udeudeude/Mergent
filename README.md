# Mergent

An impossible, entirely virtual cabinet of curiosities. The cube's six exterior faces are solid except for whichever face is pointed toward the viewer: that face becomes a hollow window into one of six animated specimens.

**App:** https://udeudeude.github.io/Mergent/ (GitHub Pages must be enabled in this repository).

## Use

- Drag/swipe the 3D cube. The outward-facing wall becomes the only open wall; the others remain solid.
- Tap a chamber symbol for quick navigation to its side.
- **Disturb** agitates the current specimen.
- **Breach** admits a neighboring chamber's inhabitant into the same room, with an additional recursive cube.
- **Improbability** alters animation behavior.
- **Collect Postcard** makes an illustrated PNG that can be saved or shared.
- **Sound** synthesizes optional audio locally.

Everything works in a normal modern WebGL browser, including Safari on iPhone. No physical Merge Cube, camera access, calibration, server processing, account or assets download (beyond JavaScript/fonts) is required.

## Contents

- `index.html`: interface and accessible controls
- `styles.css`: responsive layout
- `app.js`: 3D CGI cube, viewpoint-selected aperture, Breach mode, postcard export
- `worlds.js`: the six procedurally generated exhibits, retained from Anomaly Six
- `archive/anomaly-six-merge-cube.html`: earlier camera-based Merge Cube experiment, preserved for reference
- `.github/workflows/pages.yml`: automated GitHub Pages publishing

The original AR prototype is archived, not the default app. Source code is MIT-licensed (see LICENSE); the app does not bundle any MERGE cube face designs.

## Deploy

In repository **Settings → Pages**, set **Source** to **GitHub Actions** if not already selected. The included workflow deploys on pushes to `main`.

## Limitations

The cube is CGI, not a geometric reconstruction of all six physically visible interior chambers. At the seam between two faces, the opening changes to whichever face more directly faces the camera. Browser/device GPU performance varies. PNG export requires the browser to support WebGL canvas capture.
