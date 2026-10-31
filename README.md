# Mergent

**An impossible cabinet in your hand.** Point your phone's rear camera at a physical MERGE Cube. Mergent detects its six patterns and places a hollow CGI cube over it, with a different animated curiosity inside whichever face is currently tracked.

**App:** https://udeudeude.github.io/Mergent/

## Start on iPhone

1. Open the app in Safari.
2. Tap **SCAN MERGE CUBE**. The first time, choose **USE OFFICIAL MERGE PDF**.
3. The app downloads the [original MERGE paper cube PDF](https://res.cloudinary.com/apsphysics/image/upload/merge-paper-cube_mizj2k.pdf) from its publisher, extracts six face images **in the browser**, and compiles local image-target tracking data. This can be slow on mobile on the first run.
4. When requested, allow rear-camera access. Aim at a well-lit face of your physical cube and rotate it.
5. If automatic PDF loading fails (for example, cross-origin network restrictions), download the publisher's PDF and choose **IMPORT PDF FROM FILES** instead. You can also import a six-target MindAR `.mind` file.

Your camera images and PDF are not uploaded to our servers. A compact target database is stored in IndexedDB on the device. Once prepared, tap **SCAN MERGE CUBE** on subsequent visits to enter camera mode directly.

## What to expect

- **Physical cube mode:** The camera recognizes a face and anchors a CGI replacement cube to that real face. Only the detected outward face is rendered as a hollow opening. Rotate the real cube to show different chambers.
- **Virtual preview:** The app still works without a physical cube. Drag the CGI cube to rotate it; only the most camera-facing side is hollow.
- **Disturb:** Agitate the creature/device in the current chamber.
- **Breach:** Introduce a neighboring chamber's specimen into the opening.
- **Improbability:** Change the animated behavior.
- **Collect Postcard:** Save or share a graphic of the current view, including camera imagery when possible.
- **Sound:** Optional audio synthesized locally.

### Limitations

Tracking is **experimental, face-by-face MindAR image tracking**, not MERGE's proprietary full-cube tracking engine. Moving quickly, partially obscuring a face, glare, or using an older phone may cause it to lose the target temporarily. There can be visual pose jumps when switching between recognized faces. Camera access requires HTTPS. The CGI overlay may not perfectly mask the physical cube around its edges, especially at oblique angles. First-run target compilation is potentially demanding on older phones. If the remote PDF host doesn't support browser CORS, download and import the publisher's PDF locally.

### Source

- `index.html`, `styles.css`: interface, camera setup dialog, and responsive styling
- `app.js`: virtual preview, interaction, postcards, mode switching
- `ar.js`: MindAR image tracking, local PDF target compilation, camera CGI overlay
- `cube.js`: shared CGI cube faces, framing, and hollow chamber implementation
- `worlds.js`: six procedural animated specimens
- `archive/anomaly-six-merge-cube.html`: preserved first-generation prototype
- `.github/workflows/pages.yml`: syntax checks and automatic GitHub Pages deployment

The app does **not** ship, rehost, or republish MERGE's copyrighted printed marker graphics. The separate, original CGI geometry and app code are MIT-licensed.

## Deployment

In **Settings → Pages**, select **GitHub Actions** for Source. Changes to `main` trigger the Pages workflow.
