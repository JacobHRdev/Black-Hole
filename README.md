# Black Hole

An interactive browser-based black hole simulator for exploring accretion disks, orbital motion, event horizons, photon spheres, and the innermost stable circular orbit.

## Features

- Real-time accretion-disk particle simulation.
- Presets for real black holes and systems:
  - Stellar-mass black hole
  - Cygnus X-1
  - Sagittarius A*
  - M87*
  - TON 618
  - Custom mass
- Logarithmic controls for mass, zoom, and time scale.
- Optical, radio-inspired, and X-ray-inspired disk imaging modes.
- Thermal color variation across the accretion disk.
- Subtle particle glow and motion trails.
- Simplified gravitational lensing of the background star field.
- Optional radial grid and physical labels.
- Mouse and keyboard interaction.
- Responsive interface for desktop and mobile screens.

## Project Structure

```text
Black Hole/
├── blackHole.html   # Page structure and controls
├── blackHole.css    # Visual design and responsive layout
├── blackHole.js     # Simulation engine and interactions
└── README.md        # Project documentation
```

## Run Locally

No installation or build step is required.

1. Open `blackHole.html` directly in a modern browser.
2. Or serve the folder with a local web server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/blackHole.html
```

The project loads Google Fonts over the network. The simulator itself does not require external JavaScript libraries.

## Controls

### Interface

- **Choose a black hole**: Load a real-object preset or select Custom.
- **Mass**: Change the black hole mass in solar masses.
- **Field of view**: Change the simulation scale in meters per pixel.
- **Time compression**: Speed up or slow down the simulated orbital motion.
- **Disk density**: Change the number of orbiting particles.
- **Imaging mode**: Switch between Optical, Radio-inspired, and X-ray-inspired colors.
- **Trails**: Toggle particle motion trails.
- **Grid**: Toggle radial reference circles.
- **Labels**: Show or hide Photon sphere and ISCO labels.
- **Reset disk**: Recreate the accretion disk using the current parameters.
- **New starfield**: Generate a new background star field.
- **Reset view**: Return the camera to the default centered zoom.
- **Pause simulation**: Freeze or resume the simulation.

### Canvas

- Click inside the simulation to inject a local group of particles.
- Drag to pan the view.
- Scroll to zoom in or out.

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `[` / `]` | Decrease / increase mass |
| `Z` / `X` | Zoom out / zoom in |
| `-` / `+` | Decrease / increase time scale |
| `T` | Toggle trails |
| `G` | Toggle radial grid |
| `L` | Toggle physical labels |
| `D` | Cycle imaging modes |
| `R` | Reset the disk |
| `Space` | Pause or resume |

## Physics Model

The simulator uses the Paczynski-Wiita pseudo-Newtonian potential:

```text
Phi = -GM / (r - r_s)
```

The Schwarzschild radius is calculated with:

```text
r_s = 2GM / c^2
```

The visualization marks two important reference radii:

- **Event horizon**: `r_s`
- **Photon sphere**: `1.5 r_s`
- **ISCO**: `3 r_s`

Particles are initialized with approximate circular velocities and are integrated over time using the pseudo-Newtonian acceleration field.

## Scientific Scope

This is an educational visualization, not a full general-relativity renderer. It does not solve Einstein's field equations or perform physically complete relativistic ray tracing. The photon sphere, ISCO, disk colors, particle trails, and background lensing are visual and explanatory approximations built around a Schwarzschild black hole model.

The goal is to make the relationships between mass, orbital scale, accretion-disk motion, and black hole structure easy to explore interactively.

## Browser Support

Use a current version of Chrome, Edge, Firefox, or Safari with support for:

- HTML Canvas 2D
- ES6 JavaScript
- Pointer and wheel events
- CSS Grid and responsive media queries

## License

No license has been specified for this educational project yet.
