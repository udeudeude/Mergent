# Mergent

Mergent is an experimental **augmented-reality experience for the physical MERGE Cube**. It is not a standalone virtual cube simulator.

**App:** https://udeudeude.github.io/Mergent/

## Use the real cube

1. Open Mergent in Safari on your iPhone with a physical MERGE Cube nearby.
2. Mergent automatically prepares and locally caches its six standard face targets on first load, using the publisher's PDF. You don't need to select, import, or photograph anything when automatic retrieval works.
3. Tap **Start Cube Camera**, then allow normal iOS rear-camera permission when asked. If automatic PDF retrieval is blocked, the app displays a recovery panel with a downloadable-PDF import option.
4. Point the rear camera at a marked face of the physical cube. Use steady, diffuse light.
5. Mergent estimates one rigid cube pose from up to two simultaneously visible face markers. The forward-facing side of that CGI cube appears hollow. Rotate the physical cube to visit its different interiors.

The six face symbols are *status indicators*, not controls. Mergent contains no independent rotate-by-touch preview or simulated cube mode.

### Controls

- **Disturb:** agitate the current chamber's contents.
- **Breach:** introduce an intruder from another chamber.
- **Improbability:** change the intensity of the animations.
- **Postcard:** capture and save the phone-camera view with the CGI artwork.
- **Sound:** optional locally synthesized audio.

Controls that require a tracked face are disabled when the physical cube cannot be seen.

### Important technical limitations

This uses open-source **MindAR image tracking of up to two faces simultaneously** and their known geometric relationships to estimate and smooth one rigid cube pose, an approach analogous to Vuforia's Multi Target technique. It does **not** use MERGE's native Vuforia/Unity engine or provide identical tracking quality. The superimposed CGI cube may not precisely obscure the physical cube, particularly at steep viewing angles. Face switches can jump and tracking can be lost due to glare, movement, or partial occlusion. Camera access requires HTTPS. The app automatically compiles reference targets on first use and saves them to IndexedDB. Initial compilation is CPU-intensive and has not yet been validated on the user's actual device.

The standard face shapes are extracted directly *on the user's device* from the publisher's PDF. No face artwork is shipped in this repository and no camera imagery is uploaded. MERGE's printable artwork carries its own restrictive terms; refer to the linked source document. The app is an unofficial experiment, not an official MERGE product.

### Source files

- `index.html`: camera-only user interface, setup, and dialog controls
- `styles.css`: mobile AR overlay and interfaces
- `app.js`: cube recognition state, interactions, camera lifecycle, postcards
- `ar.js`: MindAR anchors, PDF target compilation, on-device tracking cache
- `cube.js`: CGI replacement cube with opening only on the detected face
- `worlds.js`: six procedural animated interiors
- `archive/anomaly-six-merge-cube.html`: archived predecessor, preserved for development history
- `.github/workflows/pages.yml`: GitHub Pages deployment and JS syntax validation

GitHub Pages is served from the `main` branch via the included Actions workflow when repository **Settings → Pages → Source** is set to **GitHub Actions**.
