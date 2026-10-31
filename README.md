# Mergent

Mergent is an experimental **augmented-reality experience for the physical MERGE Cube**. It is not a standalone virtual cube simulator.

**App:** https://udeudeude.github.io/Mergent/

## Use the real cube

1. Open Mergent in Safari on your iPhone, with the physical MERGE Cube at hand.
2. Tap **Start Cube Camera**. Grant rear-camera permission.
3. On first use, select **Use Official MERGE PDF** to attempt to generate six local image-tracking targets. If the remote PDF cannot be loaded, download it using the provided link and select **Import Downloaded PDF**. A six-face MindAR `.mind` file can also be imported.
4. Point the camera toward a marked face of your MERGE Cube. Keep it in good light and in focus.
5. When a face is recognized, the cube is overlaid with CGI and the camera-facing side becomes a hollow window into an animated impossible interior. Rotate the **physical** cube to visit a different interior.

The six face symbols are *status indicators*, not controls. Mergent contains no independent rotate-by-touch preview or simulated cube mode.

### Controls

- **Disturb:** agitate the current chamber's contents.
- **Breach:** introduce an intruder from another chamber.
- **Improbability:** change the intensity of the animations.
- **Postcard:** capture and save the phone-camera view with the CGI artwork.
- **Sound:** optional locally synthesized audio.

Controls that require a tracked face are disabled when the physical cube cannot be seen.

### Important technical limitations

This uses open-source **MindAR image tracking, one face at a time**, not MERGE's proprietary six-degree-of-freedom cube tracker. The superimposed CGI cube may not precisely obscure the physical cube, particularly at steep viewing angles. Face switches can jump and tracking can be lost due to glare, movement, or partial occlusion. Camera access requires HTTPS. Generating tracking data on a phone is CPU-intensive and has not yet been validated on the user's actual device.

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
