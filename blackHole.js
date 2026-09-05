(() => {
  const G = 6.6743e-11;
  const c = 299792458.0;
  const M_sun = 1.98847e30;

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = canvas.width,
    H = canvas.height;
  const CENTER = { x: W / 2, y: H / 2 };

  const massSlider = document.getElementById("mass");
  const massVal = document.getElementById("massVal");
  const zoomSlider = document.getElementById("zoom");
  const zoomVal = document.getElementById("zoomVal");
  const timeSlider = document.getElementById("timescale");
  const timeVal = document.getElementById("timeVal");
  const partSlider = document.getElementById("particles");
  const partVal = document.getElementById("partVal");
  const imagingSel = document.getElementById("imaging");
  const pauseBtn = document.getElementById("pauseBtn");
  const status = document.getElementById("status");
  const rsMetric = document.getElementById("rsMetric");
  const iscoMetric = document.getElementById("iscoMetric");
  const particleMetric = document.getElementById("particleMetric");
  const speedMetric = document.getElementById("speedMetric");
  const trailsChk = document.getElementById("trails");
  const gridChk = document.getElementById("grid");
  const resetBtn = document.getElementById("resetBtn");
  const addStarsBtn = document.getElementById("addStars");
  const resetViewBtn = document.getElementById("resetView");
  const toggleHelp = document.getElementById("toggleHelp");
  const helpBox = document.getElementById("helpBox");
  const labelsChk = document.getElementById("labels");
  const legend = document.getElementById("legend");

  const PRESETS = [
    { id: "stellar", name: "Stellar mass", mass: 10 },
    { id: "cygx1", name: "Cygnus X-1", mass: 21 },
    { id: "sgra", name: "Sagittarius A*", mass: 4.15e6 },
    { id: "m87", name: "M87*", mass: 6.5e9 },
    { id: "ton618", name: "TON 618", mass: 6.6e10 },
    { id: "custom", name: "Custom", mass: null },
  ];

  let mass_solar = Math.pow(10, parseFloat(massSlider.value) / 100);
  let metersPerPixel = Math.pow(10, parseFloat(zoomSlider.value) / 100 - 2);
  let timeScale = Math.pow(10, parseFloat(timeSlider.value) / 100);
  let paletteId = 0;
  let targetParticles = parseInt(partSlider.value);
  let imagingMode = imagingSel.value;
  let trailsOn = trailsChk.checked;
  let showGrid = gridChk.checked;
  let showLabels = labelsChk.checked;
  let showHelp = true;
  let panOffset = { x: 0, y: 0 };
  let activePreset = "stellar";

  function schwarzschildRadius(mass_kg) {
    return (2.0 * G * mass_kg) / (c * c);
  }
  let mass_kg = mass_solar * M_sun;
  let r_s = schwarzschildRadius(mass_kg);

  class Particle {
    constructor(pos_m, vel_m, color) {
      this.pos = pos_m;
      this.vel = vel_m;
      this.color = color;
      this.life = 0;
      this.alpha = 255;
    }
  }
  let particles = [];

  let stars = [];
  const STAR_COUNT = 450;
  function makeStarfield() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      let x = Math.random() * W;
      let y = Math.random() * H;
      if (Math.hypot(x - CENTER.x, y - CENTER.y) < 60) {
        i--;
        continue;
      }
      stars.push({ x, y });
    }
  }

  function palette(radiusNorm, id) {
    radiusNorm = Math.max(0, Math.min(1, radiusNorm));
    if (id === 0) {
      if (radiusNorm < 0.5) {
        let t = radiusNorm / 0.5;
        let r = Math.round(50 + (240 - 50) * t);
        let g = Math.round(120 + (240 - 120) * t);
        let b = Math.round(255 + (240 - 255) * t);
        return `rgb(${r},${g},${b})`;
      } else {
        let t = (radiusNorm - 0.5) / 0.5;
        let r = Math.round(240 + (255 - 240) * t);
        let g = Math.round(240 + (165 - 240) * t);
        let b = Math.round(240 + (0 - 240) * t);
        return `rgb(${r},${g},${b})`;
      }
    } else if (id === 1) {
      if (radiusNorm < 0.5) {
        let t = radiusNorm / 0.5;
        let r = Math.round(0 + (220 - 0) * t);
        let g = Math.round(200 + (220 - 200) * t);
        let b = Math.round(255 + (220 - 255) * t);
        return `rgb(${r},${g},${b})`;
      } else {
        let t = (radiusNorm - 0.5) / 0.5;
        let r = Math.round(220 + (255 - 220) * t);
        let g = Math.round(220 + (0 - 220) * t);
        let b = Math.round(220 + (255 - 220) * t);
        return `rgb(${r},${g},${b})`;
      }
    } else {
      if (radiusNorm < 0.5) {
        let t = radiusNorm / 0.5;
        let r = Math.round(255 + (255 - 255) * t);
        let g = Math.round(215 + (255 - 215) * t);
        let b = Math.round(0 + (255 - 0) * t);
        return `rgb(${r},${g},${b})`;
      } else {
        let t = (radiusNorm - 0.5) / 0.5;
        let r = Math.round(255 + (255 - 255) * t);
        let g = Math.round(255 + (80 - 255) * t);
        let b = Math.round(255 + (20 - 255) * t);
        return `rgb(${r},${g},${b})`;
      }
    }
  }

  function metersToPixels(vec) {
    return { x: vec.x / metersPerPixel, y: vec.y / metersPerPixel };
  }
  function toScreen(pos_m) {
    let p = metersToPixels(pos_m);
    return { x: CENTER.x + panOffset.x + p.x, y: CENTER.y + panOffset.y - p.y };
  }
  function fromScreen(px, py) {
    return {
      x: (px - CENTER.x - panOffset.x) * metersPerPixel,
      y: (CENTER.y + panOffset.y - py) * metersPerPixel,
    };
  }

  function accPw(pos_m, massKg, rs) {
    let rx = pos_m.x,
      ry = pos_m.y;
    let r = Math.hypot(rx, ry) + 1e-12;
    if (r <= rs * 1.001) r = rs * 1.001;
    let mag = -(G * massKg) / Math.pow(r - rs, 2);
    return { x: (mag / r) * rx, y: (mag / r) * ry };
  }

  function vCircular(massKg, r, rs) {
    let rEff = Math.max(r, 1.01 * rs);
    return Math.sqrt(G * massKg * rEff) / (rEff - rs);
  }

  function spawnParticle(massKg, rs, rMin, rMax) {
    let r = rMin + Math.random() * (rMax - rMin);
    let angle = Math.random() * Math.PI * 2;
    let pos = { x: r * Math.cos(angle), y: r * Math.sin(angle) };
    let v_c = vCircular(massKg, r, rs);
    let tHat = { x: -Math.sin(angle), y: Math.cos(angle) };
    let vel = { x: tHat.x * v_c, y: tHat.y * v_c };
    vel.x += (Math.random() - 0.5) * v_c * 0.02;
    vel.y += (Math.random() - 0.5) * v_c * 0.02;
    pos.x += (Math.random() - 0.5) * r * 0.005;
    pos.y += (Math.random() - 0.5) * r * 0.005;
    let color = palette((r - rMin) / Math.max(1e-6, rMax - rMin), paletteId);
    return new Particle(pos, vel, color);
  }

  function ensureParticles() {
    let r_isco = 3.0 * r_s;
    let rMin = 1.2 * r_isco;
    let rMax = 8.0 * r_isco;
    while (particles.length < targetParticles) {
      particles.push(spawnParticle(mass_kg, r_s, rMin, rMax));
    }
  }

  function resetParticles() {
    particles = [];
    ensureParticles();
  }

  function drawStarfield() {
    ctx.fillStyle = "#000000";
    for (let s of stars) {
      let rx = s.x - CENTER.x - panOffset.x,
        ry = s.y - CENTER.y - panOffset.y;
      let b_px = Math.hypot(rx, ry);
      if (b_px < 1e-6) continue;
      let b_m = b_px * metersPerPixel;
      let denom = Math.max(b_m, r_s);
      let alpha = (4.0 * G * mass_kg) / (c * c * denom);
      let scale = Math.max(0, Math.min(30, alpha * 1.2e5));
      let offx = (rx / b_px) * scale;
      let offy = (ry / b_px) * scale;
      ctx.fillRect(
        Math.round(s.x + panOffset.x + offx),
        Math.round(s.y + panOffset.y + offy),
        1,
        1,
      );
    }
  }

  function drawGlow(cx, cy, rs_px) {
    let radius = Math.round(1.5 * rs_px);
    for (let w = 40; w > 0; w--) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,190,120,${0.03 * (w / 40)})`;
      ctx.lineWidth = 2;
      ctx.arc(cx, cy, radius + w, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawDashedCircle(x, y, r, color, width = 1, dash = true) {
    if (!dash) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      if (i % 2 !== 0) continue;
      let a0 = (i / segments) * Math.PI * 2;
      let a1 = ((i + 1) / segments) * Math.PI * 2;
      let p0x = x + r * Math.cos(a0);
      let p0y = y + r * Math.sin(a0);
      let p1x = x + r * Math.cos(a1);
      let p1y = y + r * Math.sin(a1);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.moveTo(p0x, p0y);
      ctx.lineTo(p1x, p1y);
      ctx.stroke();
    }
  }

  const trailCanvas = document.createElement("canvas");
  trailCanvas.width = W;
  trailCanvas.height = H;
  const trailCtx = trailCanvas.getContext("2d", { alpha: true });
  trailCtx.globalCompositeOperation = "source-over";

  function drawParticles(rs_px) {
    if (trailsOn) {
      trailCtx.fillStyle = "rgba(0,0,0,0.18)";
      trailCtx.fillRect(0, 0, W, H);
    } else {
      trailCtx.clearRect(0, 0, W, H);
    }

    for (let p of particles) {
      let s = toScreen(p.pos);
      if (s.x < -10 || s.x > W + 10 || s.y < -10 || s.y > H + 10) continue;
      const radiusPx = Math.hypot(p.pos.x, p.pos.y) / metersPerPixel;
      const distance = Math.max(0, Math.min(1, (radiusPx - 1.5 * rs_px) / (24 * rs_px)));
      const color = palette(distance, paletteId);
      const intensity = Math.max(0.15, (p.alpha / 255) * (1 - distance * 0.35));
      const size = radiusPx < 3 * rs_px ? 2 : 1;

      if (radiusPx < 9 * rs_px) {
        const glow = Math.max(0.015, 0.07 * (1 - distance));
        trailCtx.fillStyle = color.replace("rgb", "rgba").replace(")", `,${glow})`);
        trailCtx.beginPath();
        trailCtx.arc(s.x, s.y, size + 2.5, 0, Math.PI * 2);
        trailCtx.fill();
      }

      trailCtx.fillStyle = color.replace("rgb", "rgba").replace(")", `,${intensity})`);
      trailCtx.fillRect(Math.round(s.x - size / 2), Math.round(s.y - size / 2), size, size);
    }

    ctx.drawImage(trailCanvas, 0, 0);
  }

  let lastTime = performance.now();
  let running = true;
  let subDtBase = 0.02;
  function step() {
    if (!running) return;
    let now = performance.now();
    let dtReal = (now - lastTime) / 1000;
    lastTime = now;
    dtReal = Math.min(0.05, dtReal);
    let simDt = subDtBase * timeScale;
    let stepsCount = 1;
    for (let s = 0; s < stepsCount; s++) {
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        let a = accPw(p.pos, mass_kg, r_s);
        p.vel.x += a.x * simDt;
        p.vel.y += a.y * simDt;
        p.pos.x += p.vel.x * simDt;
        p.pos.y += p.vel.y * simDt;
        p.life += simDt;
        if (p.life < 0.6) p.alpha = Math.round(255 * (p.life / 0.6));
        else p.alpha = 255;

        let r = Math.hypot(p.pos.x, p.pos.y);
        let r_isco = 3.0 * r_s;
        let rMax = 8.0 * r_isco;
        if (!isFinite(r) || r <= r_s * 1.02 || r > rMax * 1.2) {
          particles[i] = spawnParticle(mass_kg, r_s, 1.2 * r_isco, rMax);
        }
      }

      if (particles.length < targetParticles) ensureParticles();
      else if (particles.length > targetParticles)
        particles.length = targetParticles;
    }

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, W, H);

    drawStarfield();

    drawParticles(r_s / metersPerPixel);

    const cx = CENTER.x + panOffset.x;
    const cy = CENTER.y + panOffset.y;
    const rs_px = Math.max(2, Math.round(r_s / metersPerPixel));
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, rs_px, 0, Math.PI * 2);
    ctx.fill();

    drawGlow(cx, cy, rs_px);

    const r_isco_px = Math.round((3.0 * r_s) / metersPerPixel);
    const r_ph_px = Math.round((1.5 * r_s) / metersPerPixel);
    if (showGrid) {
      for (let k = 1; k <= 7; k++) {
        let rp = r_isco_px * k;
        if (rp > 0)
          drawDashedCircle(
            cx,
            cy,
            rp,
            k % 2 ? "rgba(80,80,90,0.12)" : "rgba(60,60,70,0.10)",
            1,
            true,
          );
      }
    }
    if (r_isco_px > 1)
      drawDashedCircle(
        cx,
        cy,
        r_isco_px,
        "rgba(255,170,80,0.9)",
        1,
        true,
      );
    if (r_ph_px > 1)
      drawDashedCircle(
        cx,
        cy,
        r_ph_px,
        "rgba(255,230,180,0.6)",
        1,
        false,
      );

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,160,60,0.08)";
    ctx.lineWidth = 2;
    ctx.arc(
      cx,
      cy,
      Math.max(1, Math.round(1.8 * r_isco_px)),
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    if (showLabels) {
      ctx.font = '11px "DM Mono", monospace';
      ctx.fillStyle = "rgba(255,230,180,0.85)";
      ctx.fillText("photon sphere", cx + r_ph_px * 0.72, cy - r_ph_px * 0.72 - 6);
      ctx.fillStyle = "rgba(255,170,80,0.9)";
      ctx.fillText("ISCO", cx + r_isco_px * 0.72, cy - r_isco_px * 0.72 - 6);
    }

    ctx.fillStyle = "rgba(230,240,255,0.95)";
    ctx.font = "13px monospace";
    ctx.fillText(
      `M = ${mass_solar.toLocaleString()} M☉    r_s = ${Math.round(r_s)} m`,
      12,
      18,
    );
    ctx.fillText(
      `Zoom: ${formatMetersPerPixel(
        metersPerPixel,
      )} m/px    Time: ${timeScale}×`,
      12,
      36,
    );
    ctx.fillText(
      `Particles: ${particles.length}/${targetParticles}    Trails: ${
        trailsOn ? "ON" : "OFF"
      }`,
      12,
      54,
    );

    requestAnimationFrame(step);
  }

  function formatMetersPerPixel(v) {
    if (v >= 1000) return (v / 1000).toFixed(1) + "k";
    return Math.round(v);
  }

  function updateDerived() {
    mass_kg = mass_solar * M_sun;
    r_s = schwarzschildRadius(mass_kg);
    const radiusLabel = formatDistance(r_s);
    rsMetric.textContent = radiusLabel;
    iscoMetric.textContent = formatDistance(3 * r_s);
    speedMetric.textContent = `${(vCircular(mass_kg, 9 * r_s, r_s) / c).toFixed(2)} c`;
  }

  function formatDistance(meters) {
    if (meters >= 1e9) return `${(meters / 1e9).toFixed(2)} Gm`;
    if (meters >= 1e6) return `${(meters / 1e6).toFixed(2)} Mm`;
    if (meters >= 1e3) return `${(meters / 1e3).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  }

  function massToSlider(mass) {
    return Math.max(0, Math.min(1100, Math.round(Math.log10(Math.max(1, mass)) * 100)));
  }
  function sliderToMass(value) {
    return Math.pow(10, value / 100);
  }
  function mppToSlider(value) {
    return Math.max(0, Math.min(1400, Math.round((Math.log10(Math.max(0.1, value)) + 2) * 100)));
  }
  function sliderToMpp(value) {
    return Math.pow(10, value / 100 - 2);
  }
  function tsToSlider(value) {
    return Math.max(0, Math.min(700, Math.round(Math.log10(Math.max(0.001, value)) * 100)));
  }
  function sliderToTs(value) {
    return Math.pow(10, value / 100);
  }

  function applyPreset(preset) {
    activePreset = preset.id;
    if (preset.mass !== null) {
      mass_solar = preset.mass;
      updateDerived();
      metersPerPixel = (24 * r_s) / Math.min(W, H);
      timeScale = 500;
    }
    massSlider.value = massToSlider(mass_solar);
    zoomSlider.value = mppToSlider(metersPerPixel);
    timeSlider.value = tsToSlider(timeScale);
    massVal.textContent = `${mass_solar.toLocaleString()} M☉`;
    zoomVal.textContent = `${formatMetersPerPixel(metersPerPixel)} m/px`;
    timeVal.textContent = `${Math.round(timeScale)}×`;
    presetGrid.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.id === preset.id);
    });
    updateDerived();
    resetParticles();
  }

  PRESETS.forEach((preset) => {
    const button = document.createElement("button");
    button.className = "preset-btn";
    button.dataset.id = preset.id;
    button.innerHTML = `<strong>${preset.name}</strong>${preset.mass ? `${preset.mass.toLocaleString()} M☉` : "Set manually"}`;
    button.addEventListener("click", () => applyPreset(preset));
    presetGrid.appendChild(button);
  });

  massSlider.addEventListener("input", () => {
    mass_solar = sliderToMass(parseFloat(massSlider.value));
    massVal.textContent = `${mass_solar.toLocaleString()} M☉`;
    activePreset = "custom";
    presetGrid.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.id === "custom");
    });
    updateDerived();
    resetParticles();
  });
  zoomSlider.addEventListener("input", () => {
    metersPerPixel = sliderToMpp(parseFloat(zoomSlider.value));
    zoomVal.textContent = `${formatMetersPerPixel(metersPerPixel)} m/px`;
  });
  timeSlider.addEventListener("input", () => {
    timeScale = sliderToTs(parseFloat(timeSlider.value));
    timeVal.textContent = `${Math.round(timeScale)}×`;
  });
  partSlider.addEventListener("input", () => {
    targetParticles = parseInt(partSlider.value);
    partVal.textContent = targetParticles.toLocaleString();
    ensureParticles();
    particleMetric.textContent = particles.length.toLocaleString();
  });
  imagingSel.addEventListener("change", () => {
    paletteId = imagingSel.value === "radio" ? 2 : imagingSel.value === "xray" ? 1 : 0;
    resetParticles();
  });
  trailsChk.addEventListener("change", () => {
    trailsOn = trailsChk.checked;
  });
  gridChk.addEventListener("change", () => {
    showGrid = gridChk.checked;
  });
  labelsChk.addEventListener("change", () => {
    showLabels = labelsChk.checked;
    legend.style.display = showLabels ? "grid" : "none";
  });
  resetViewBtn.addEventListener("click", () => {
    panOffset = { x: 0, y: 0 };
    metersPerPixel = (24 * r_s) / Math.min(W, H);
    zoomSlider.value = mppToSlider(metersPerPixel);
    zoomVal.textContent = `${formatMetersPerPixel(metersPerPixel)} m/px`;
  });

  resetBtn.addEventListener("click", () => {
    resetParticles();
    trailCtx.clearRect(0, 0, W, H);
  });
  addStarsBtn.addEventListener("click", () => {
    makeStarfield();
  });
  toggleHelp.addEventListener("click", () => {
    showHelp = !showHelp;
    helpBox.hidden = !showHelp;
    toggleHelp.textContent = showHelp ? "Hide guide" : "Show guide";
    toggleHelp.setAttribute("aria-expanded", String(showHelp));
  });

  pauseBtn.addEventListener("click", () => {
    running = !running;
    pauseBtn.textContent = running ? "Pause simulation" : "Resume simulation";
    status.textContent = running ? "● Running" : "Ⅱ Paused";
    if (running) {
      lastTime = performance.now();
      requestAnimationFrame(step);
    }
  });

  let suppressClick = false;
  canvas.addEventListener("click", (ev) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    let rect = canvas.getBoundingClientRect();
    let x = ev.clientX - rect.left,
      y = ev.clientY - rect.top;
    let mpos = fromScreen(x, y);
    for (let i = 0; i < 120; i++) {
      let p = spawnParticle(mass_kg, r_s, 1.2 * 3.0 * r_s, 8.0 * 3.0 * r_s);
      p.pos.x = mpos.x + (Math.random() - 0.5) * r_s * 0.6;
      p.pos.y = mpos.y + (Math.random() - 0.5) * r_s * 0.6;
      particles.push(p);
    }
  });

  let isDragging = false;
  let dragStart = null;
  let panStart = null;
  canvas.addEventListener("mousedown", (ev) => {
    isDragging = true;
    suppressClick = false;
    dragStart = { x: ev.clientX, y: ev.clientY };
    panStart = { ...panOffset };
  });
  window.addEventListener("mousemove", (ev) => {
    if (!isDragging) return;
    if (Math.hypot(ev.clientX - dragStart.x, ev.clientY - dragStart.y) > 4) {
      suppressClick = true;
    }
    panOffset.x = panStart.x + ev.clientX - dragStart.x;
    panOffset.y = panStart.y + ev.clientY - dragStart.y;
  });
  window.addEventListener("mouseup", () => {
    isDragging = false;
  });
  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 1.12 : 1 / 1.12;
    metersPerPixel = Math.max(0.05, Math.min(1e14, metersPerPixel * factor));
    zoomSlider.value = mppToSlider(metersPerPixel);
    zoomVal.textContent = `${formatMetersPerPixel(metersPerPixel)} m/px`;
  }, { passive: false });

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "[") {
      massSlider.value = Math.max(1, Math.round(massSlider.value * 0.9));
      massSlider.dispatchEvent(new Event("input"));
    }
    if (ev.key === "]") {
      massSlider.value = Math.min(1e9, Math.round(massSlider.value * 1.1));
      massSlider.dispatchEvent(new Event("input"));
    }
    if (ev.key === "z" || ev.key === "Z") {
      zoomSlider.value = Math.min(parseInt(zoomSlider.max), parseFloat(zoomSlider.value) + 15);
      zoomSlider.dispatchEvent(new Event("input"));
    }
    if (ev.key === "x" || ev.key === "X") {
      zoomSlider.value = Math.max(parseInt(zoomSlider.min), parseFloat(zoomSlider.value) - 15);
      zoomSlider.dispatchEvent(new Event("input"));
    }
    if (ev.key === "-") {
      timeSlider.value = Math.max(parseInt(timeSlider.min), parseFloat(timeSlider.value) - 15);
      timeSlider.dispatchEvent(new Event("input"));
    }
    if (ev.key === "+" || ev.key === "=") {
      timeSlider.value = Math.min(parseInt(timeSlider.max), parseFloat(timeSlider.value) + 15);
      timeSlider.dispatchEvent(new Event("input"));
    }
    if (ev.key === "t" || ev.key === "T") {
      trailsChk.checked = !trailsChk.checked;
      trailsChk.dispatchEvent(new Event("change"));
    }
    if (ev.key === "g" || ev.key === "G") {
      gridChk.checked = !gridChk.checked;
      gridChk.dispatchEvent(new Event("change"));
    }
    if (ev.key === "l" || ev.key === "L") {
      labelsChk.checked = !labelsChk.checked;
      labelsChk.dispatchEvent(new Event("change"));
    }
    if (ev.key === "d" || ev.key === "D") {
      imagingSel.selectedIndex = (imagingSel.selectedIndex + 1) % imagingSel.options.length;
      imagingSel.dispatchEvent(new Event("change"));
    }
    if (ev.key === "r" || ev.key === "R") {
      resetBtn.click();
    }
    if (ev.key === " ") {
      ev.preventDefault();
      pauseBtn.click();
    }
    if (ev.key === "1") {
      partSlider.value = Math.max(
        200,
        Math.round(parseInt(partSlider.value) * 0.8),
      );
      partSlider.dispatchEvent(new Event("input"));
    }
    if (ev.key === "2") {
      partSlider.value = Math.min(
        8000,
        Math.round(parseInt(partSlider.value) * 1.25),
      );
      partSlider.dispatchEvent(new Event("input"));
    }
  });

  makeStarfield();
  updateDerived();
  applyPreset(PRESETS[0]);
  legend.style.display = showLabels ? "grid" : "none";
  particleMetric.textContent = particles.length.toLocaleString();
  lastTime = performance.now();
  requestAnimationFrame(step);

  window._blackhole = {
    particles,
    makeStarfield,
    resetParticles,
    toScreen,
    fromScreen,
  };
})();
