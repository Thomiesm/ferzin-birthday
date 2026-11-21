document.addEventListener("DOMContentLoaded", () => {
  function haptic(pattern) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
  }

  // --- 1. Populate Content dari data.js ---
  document.getElementById("headerSubtitle").textContent = BIRTHDAY_DATA.headerSubtitle;

  const bgMusic = document.getElementById("bgMusic");
  bgMusic.src = BIRTHDAY_DATA.musicPath;

  const balloonsContainer = document.getElementById("balloonsContainer");
  const totalBalloons = BIRTHDAY_DATA.balloons.length;
  const openedSet = new Set();
  let activeBalloonIndex = null;

  document.getElementById("progressText").textContent = `0 dari ${totalBalloons} balon kenangan terbuka`;

  BIRTHDAY_DATA.balloons.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = "balloon-item";
    el.dataset.index = index;
    el.innerHTML = `
      <div class="balloon-orb">${item.label}</div>
      <div class="balloon-string"></div>
    `;
    el.addEventListener("click", () => {
      haptic(25);
      openScratchModal(index);
    });
    balloonsContainer.appendChild(el);
  });

  // --- 2. Web Audio API: Suara Gemeretak Api Unggun & Chime Perayaan ---
  let audioCtx = null;
  let fireNode = null;
  let fireGain = null;
  let isFireAudioOn = true;
  let isMusicOn = false;

  function initCampfireSound() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    const bufferSize = audioCtx.sampleRate * 3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      const crackle = Math.random() > 0.9965 ? Math.random() * 0.55 - 0.27 : 0;
      data[i] = lastOut * 1.8 + crackle;
    }

    fireNode = audioCtx.createBufferSource();
    fireNode.buffer = buffer;
    fireNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 620;

    fireGain = audioCtx.createGain();
    fireGain.gain.value = 0.22;

    fireNode.connect(filter);
    filter.connect(fireGain);
    fireGain.connect(audioCtx.destination);
    fireNode.start();
  }

  function playFireworkPopSound() {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520 + Math.random() * 320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_) {}
  }

  const fireAudioToggle = document.getElementById("fireAudioToggle");
  const musicToggle = document.getElementById("musicToggle");

  fireAudioToggle.addEventListener("click", () => {
    haptic(20);
    initCampfireSound();
    isFireAudioOn = !isFireAudioOn;
    if (fireGain) {
      fireGain.gain.setTargetAtTime(isFireAudioOn ? 0.22 : 0, audioCtx.currentTime, 0.2);
    }
    fireAudioToggle.classList.toggle("active", isFireAudioOn);
  });

  musicToggle.addEventListener("click", () => {
    haptic(20);
    if (isMusicOn) {
      bgMusic.pause();
      isMusicOn = false;
      musicToggle.classList.remove("active");
    } else {
      bgMusic.play().then(() => {
        isMusicOn = true;
        musicToggle.classList.add("active");
      }).catch(() => {});
    }
  });

  // --- 3. Layar Pembuka & Sensor Miring HP ---
  const introOverlay = document.getElementById("introOverlay");
  let tiltX = 0;
  let tiltY = 0;

  function enableTiltSensor() {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          if (state === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener("deviceorientation", handleOrientation);
    }
  }

  function handleOrientation(e) {
    if (e.gamma === null || e.beta === null) return;
    tiltX = Math.max(-25, Math.min(25, e.gamma)) * 0.65;
    tiltY = Math.max(-25, Math.min(25, e.beta - 45)) * 0.45;
  }

  document.getElementById("startBtn").addEventListener("click", () => {
    haptic([30, 40, 50]);
    introOverlay.classList.add("fade-out");
    initCampfireSound();
    enableTiltSensor();
    bgMusic.volume = 0.55;
    bgMusic.play().then(() => {
      isMusicOn = true;
      musicToggle.classList.add("active");
    }).catch(() => {});
  });

  // --- 4. Canvas Langit Malam, Jejak Cahaya Jari & Bintang ---
  const bgCanvas = document.getElementById("bgCanvas");
  const ctx = bgCanvas.getContext("2d");
  let width = (bgCanvas.width = window.innerWidth);
  let height = (bgCanvas.height = window.innerHeight);

  const stars = Array.from({ length: 85 }, () => ({
    x: Math.random() * width,
    y: Math.random() * (height * 0.65),
    r: Math.random() * 1.5 + 0.4,
    depth: Math.random() * 0.8 + 0.2,
    alpha: Math.random(),
    speed: Math.random() * 0.015 + 0.005
  }));

  const embers = [];
  const shootingStars = [];
  const touchSparks = [];

  function spawnEmber(burst = false, customX = null, customY = null) {
    const centerX =
      customX !== null ? customX : width / 2 + (Math.random() - 0.5) * (burst ? 95 : 45);
    const startY = customY !== null ? customY : height * 0.66;
    embers.push({
      x: centerX,
      y: startY,
      vx: (Math.random() - 0.5) * (burst ? 3.2 : 0.9),
      vy: -(Math.random() * (burst ? 3.8 : 1.5) + 0.8),
      size: Math.random() * 2.6 + 1,
      life: 1,
      decay: Math.random() * 0.013 + 0.007
    });
  }

  function spawnTouchTrail(x, y, count = 2) {
    for (let i = 0; i < count; i++) {
      touchSparks.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.4,
        vy: (Math.random() - 0.5) * 1.4 - 0.4,
        size: Math.random() * 2.4 + 1,
        life: 1,
        decay: 0.028
      });
    }
  }

  let lastStarTime = 0;
  function triggerShootingStar(targetX, targetY) {
    const now = Date.now();
    if (now - lastStarTime < 900) return;
    lastStarTime = now;

    haptic(20);
    shootingStars.push({
      x: targetX - 110,
      y: targetY - 70,
      vx: 8.5,
      vy: 5.2,
      life: 1
    });

    const wish =
      BIRTHDAY_DATA.starWishes[Math.floor(Math.random() * BIRTHDAY_DATA.starWishes.length)];
    showWishToast(wish);
  }

  function showWishToast(text) {
    const existing = document.querySelector(".wish-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "wish-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  window.addEventListener(
    "touchmove",
    (e) => {
      if (!introOverlay.classList.contains("fade-out")) return;
      if (e.target.closest("#scratchCanvas") || e.target.closest(".modal-card")) return;
      const t = e.touches[0];
      if (!t) return;
      spawnTouchTrail(t.clientX, t.clientY, 2);
      if (t.clientY < height * 0.38 && Math.random() < 0.08) {
        triggerShootingStar(t.clientX, t.clientY);
      }
    },
    { passive: true }
  );

  let lastTapTime = 0;
  document.body.addEventListener("click", (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest(".balloon-item") ||
      e.target.closest(".campfire") ||
      e.target.closest(".envelope-card") ||
      e.target.closest(".modal-card") ||
      !introOverlay.classList.contains("fade-out")
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastTapTime < 320) {
      haptic([30, 55, 45]);
      for (let i = 0; i < 18; i++) {
        spawnEmber(true, e.clientX, e.clientY);
      }
      spawnTouchTrail(e.clientX, e.clientY, 12);
      lastTapTime = 0;
      return;
    }
    lastTapTime = now;

    if (e.clientY < height * 0.45) {
      triggerShootingStar(e.clientX, e.clientY);
    }
  });

  function animateBackground() {
    ctx.clearRect(0, 0, width, height);

    stars.forEach((s) => {
      s.alpha += s.speed;
      if (s.alpha > 1 || s.alpha < 0.2) s.speed *= -1;
      const drawX = (s.x + tiltX * s.depth + width) % width;
      const drawY = s.y + tiltY * s.depth;

      ctx.beginPath();
      ctx.arc(drawX, drawY, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 248, 231, ${s.alpha})`;
      ctx.fill();
    });

    for (let i = touchSparks.length - 1; i >= 0; i--) {
      const sp = touchSparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= sp.decay;
      if (sp.life <= 0) {
        touchSparks.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(253, 224, 71, ${sp.life})`;
      ctx.fill();
    }

    if (Math.random() < 0.34) spawnEmber(false);
    for (let i = embers.length - 1; i >= 0; i--) {
      const p = embers[i];
      p.x += p.vx + Math.sin(p.y * 0.03) * 0.3;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        embers.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251, 146, 60, ${p.life})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#f59e0b";
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const st = shootingStars[i];
      st.x += st.vx;
      st.y += st.vy;
      st.life -= 0.025;
      if (st.life <= 0) {
        shootingStars.splice(i, 1);
        continue;
      }
      const grad = ctx.createLinearGradient(st.x, st.y, st.x - 65, st.y - 40);
      grad.addColorStop(0, `rgba(254, 243, 199, ${st.life})`);
      grad.addColorStop(1, "rgba(254, 243, 199, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(st.x - 65, st.y - 40);
      ctx.stroke();
    }

    requestAnimationFrame(animateBackground);
  }
  animateBackground();

  // --- 4B. Overlay Canvas: Piñata Kiri-Kanan & Kembang Api 3 Detik ---
  const fxCanvas = document.createElement("canvas");
  fxCanvas.id = "celebrationCanvas";
  Object.assign(fxCanvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "100",
    pointerEvents: "none"
  });
  document.body.appendChild(fxCanvas);

  const fxCtx = fxCanvas.getContext("2d");
  fxCanvas.width = width;
  fxCanvas.height = height;

  window.addEventListener("resize", () => {
    width = bgCanvas.width = fxCanvas.width = window.innerWidth;
    height = bgCanvas.height = fxCanvas.height = window.innerHeight;
  });

  const pinataConfetti = [];
  const fireworkRockets = [];
  const fireworkSparks = [];
  let fxAnimating = false;
  let fireworkShowTimer = null;

  const CELEBRATION_COLORS = [
    "#ffffff",
    "#f5e6cc",
    "#fbbf24",
    "#f472b6",
    "#38bdf8",
    "#34d399",
    "#fb7185",
    "#c084fc"
  ];

  // Tembakan Piñata dari Sisi Kiri & Kanan Layar
  function firePinataCannons() {
    const origins = [
      { x: -6, y: height * 0.72, dir: 1 },
      { x: width + 6, y: height * 0.72, dir: -1 }
    ];

    origins.forEach((origin) => {
      for (let i = 0; i < 48; i++) {
        const spreadAngle = (Math.random() * 0.95 + 0.35); // Sudut ke atas & ke tengah layar
        const speed = Math.random() * 11 + 6.5;
        pinataConfetti.push({
          x: origin.x,
          y: origin.y + (Math.random() - 0.5) * 60,
          vx: Math.cos(spreadAngle) * speed * origin.dir,
          vy: -Math.sin(spreadAngle) * speed - (Math.random() * 4 + 2),
          w: Math.random() * 9 + 5,
          h: Math.random() * 5 + 3,
          color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.24,
          wobble: Math.random() * 10,
          wobbleSpeed: Math.random() * 0.12 + 0.04,
          shape: Math.random() > 0.3 ? "rect" : "circle",
          life: 1,
          decay: Math.random() * 0.007 + 0.005
        });
      }
    });

    startFxLoop();
  }

  // Ledakan Kembang Api di Langit
  function explodeFirework(x, y, baseColor) {
    playFireworkPopSound();
    haptic(18);
    const secondColor =
      CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];
    const sparkCount = 54;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.14;
      const speed = Math.random() * 4.8 + 1.4;
      fireworkSparks.push({
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 3 === 0 ? secondColor : baseColor,
        size: Math.random() * 2.4 + 1.2,
        life: 1,
        decay: Math.random() * 0.018 + 0.014
      });
    }
  }

  // Luncurkan Roket Kembang Api
  function launchFireworkRocket() {
    const startX = width * (0.2 + Math.random() * 0.6);
    const targetY = height * (0.14 + Math.random() * 0.26);
    const color =
      CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];

    fireworkRockets.push({
      x: startX,
      y: height * 0.88,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -(Math.random() * 4 + 9.5),
      targetY,
      color
    });

    startFxLoop();
  }

  // Jalankan Piñata + Kembang Api Terus-Menerus Selama 3 Detik
  function triggerFullCelebration() {
    haptic([45, 45, 70, 40, 100]);

    // 1. Tembakan Piñata Gelombang 1 & 2 dari Kiri-Kanan
    firePinataCannons();
    setTimeout(() => firePinataCannons(), 380);

    // 2. Ledakan Kembang Api Instan di Awal + Luncuran Beruntun Selama 3 Detik
    explodeFirework(width * 0.3, height * 0.24, "#fbbf24");
    setTimeout(() => explodeFirework(width * 0.72, height * 0.22, "#f472b6"), 180);

    clearInterval(fireworkShowTimer);
    const showEndTime = Date.now() + 3000;

    fireworkShowTimer = setInterval(() => {
      if (Date.now() >= showEndTime) {
        clearInterval(fireworkShowTimer);
        return;
      }
      launchFireworkRocket();
      if (Math.random() > 0.45) {
        setTimeout(() => launchFireworkRocket(), 160);
      }
    }, 380);
  }

  function startFxLoop() {
    if (fxAnimating) return;
    fxAnimating = true;
    requestAnimationFrame(animateCelebrationFx);
  }

  function animateCelebrationFx() {
    fxCtx.clearRect(0, 0, width, height);

    // Update & Gambar Piñata Confetti
    for (let i = pinataConfetti.length - 1; i >= 0; i--) {
      const c = pinataConfetti[i];
      c.wobble += c.wobbleSpeed;
      c.x += c.vx + Math.sin(c.wobble) * 1.1;
      c.y += c.vy;
      c.vy += 0.28; // Gravitasi
      c.vx *= 0.985; // Hambatan udara
      c.rot += c.rotSpeed;
      c.life -= c.decay;

      if (c.life <= 0 || c.y > height + 30) {
        pinataConfetti.splice(i, 1);
        continue;
      }

      fxCtx.save();
      fxCtx.globalAlpha = Math.min(1, c.life * 1.4);
      fxCtx.translate(c.x, c.y);
      fxCtx.rotate(c.rot);
      fxCtx.fillStyle = c.color;

      if (c.shape === "rect") {
        const scaleY = Math.cos(c.wobble);
        fxCtx.fillRect(-c.w / 2, (-c.h * scaleY) / 2, c.w, c.h * scaleY);
      } else {
        fxCtx.beginPath();
        fxCtx.arc(0, 0, c.w * 0.42, 0, Math.PI * 2);
        fxCtx.fill();
      }
      fxCtx.restore();
    }

    // Update & Gambar Roket Kembang Api
    for (let i = fireworkRockets.length - 1; i >= 0; i--) {
      const r = fireworkRockets[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.14;

      fxCtx.beginPath();
      fxCtx.arc(r.x, r.y, 2.6, 0, Math.PI * 2);
      fxCtx.fillStyle = r.color;
      fxCtx.shadowBlur = 10;
      fxCtx.shadowColor = r.color;
      fxCtx.fill();
      fxCtx.shadowBlur = 0;

      if (r.y <= r.targetY || r.vy >= -1) {
        explodeFirework(r.x, r.y, r.color);
        fireworkRockets.splice(i, 1);
      }
    }

    // Update & Gambar Percikan Kembang Api
    for (let i = fireworkSparks.length - 1; i >= 0; i--) {
      const s = fireworkSparks[i];
      s.prevX = s.x;
      s.prevY = s.y;
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy = s.vy * 0.96 + 0.065;
      s.life -= s.decay;

      if (s.life <= 0) {
        fireworkSparks.splice(i, 1);
        continue;
      }

      fxCtx.save();
      fxCtx.globalAlpha = s.life;
      fxCtx.strokeStyle = s.color;
      fxCtx.lineWidth = s.size;
      fxCtx.shadowBlur = 8;
      fxCtx.shadowColor = s.color;
      fxCtx.beginPath();
      fxCtx.moveTo(s.prevX, s.prevY);
      fxCtx.lineTo(s.x, s.y);
      fxCtx.stroke();
      fxCtx.restore();
    }

    if (
      pinataConfetti.length > 0 ||
      fireworkRockets.length > 0 ||
      fireworkSparks.length > 0
    ) {
      requestAnimationFrame(animateCelebrationFx);
    } else {
      fxAnimating = false;
      fxCtx.clearRect(0, 0, width, height);
    }
  }

  // --- 5. Api Unggun Interaktif ---
  const campfire = document.getElementById("campfire");
  const fireWhisper = document.getElementById("fireWhisper");
  let whisperIdx = 0;
  let holdInterval = null;

  function stokeFireOnce() {
    haptic(25);
    campfire.classList.add("stoked");
    for (let i = 0; i < 18; i++) spawnEmber(true);

    fireWhisper.style.opacity = 0;
    setTimeout(() => {
      fireWhisper.textContent = BIRTHDAY_DATA.fireWhispers[whisperIdx];
      whisperIdx = (whisperIdx + 1) % BIRTHDAY_DATA.fireWhispers.length;
      fireWhisper.style.opacity = 1;
