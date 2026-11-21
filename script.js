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

  // --- 2. Web Audio API: Suara Gemeretak Api Unggun ---
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

  // --- 4. Canvas Langit Malam, Jejak Cahaya Jari, Bintang & Percikan Cat ---
  const bgCanvas = document.getElementById("bgCanvas");
  const ctx = bgCanvas.getContext("2d");
  let width = (bgCanvas.width = window.innerWidth);
  let height = (bgCanvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = bgCanvas.width = window.innerWidth;
    height = bgCanvas.height = window.innerHeight;
  });

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
  const paintSplashes = [];

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

  function spawnPaintCelebration() {
    const palette = ["#ffffff", "#e6d3b3", "#fbbf24", "#f472b6", "#38bdf8", "#a78bfa"];
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      paintSplashes.push({
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: Math.random() * 4.5 + 2,
        color: palette[Math.floor(Math.random() * palette.length)],
        life: 1,
        decay: Math.random() * 0.014 + 0.008
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

    for (let i = paintSplashes.length - 1; i >= 0; i--) {
      const ps = paintSplashes[i];
      ps.x += ps.vx;
      ps.y += ps.vy;
      ps.vy += 0.08;
      ps.life -= ps.decay;
      if (ps.life <= 0) {
        paintSplashes.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = ps.life;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, ps.size, 0, Math.PI * 2);
      ctx.fillStyle = ps.color;
      ctx.fill();
      ctx.restore();
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
    }, 160);

    setTimeout(() => campfire.classList.remove("stoked"), 650);
  }

  function startHoldingFire(e) {
    if (e.cancelable) e.preventDefault();
    initCampfireSound();
    campfire.classList.add("holding");
    document.body.classList.add("fire-holding");
    stokeFireOnce();

    clearInterval(holdInterval);
    holdInterval = setInterval(() => {
      haptic(12);
      for (let i = 0; i < 6; i++) spawnEmber(true);
    }, 140);
  }

  function stopHoldingFire() {
    if (!campfire.classList.contains("holding")) return;
    campfire.classList.remove("holding");
    document.body.classList.remove("fire-holding");
    clearInterval(holdInterval);
  }

  campfire.addEventListener("touchstart", startHoldingFire, { passive: false });
  campfire.addEventListener("touchend", stopHoldingFire);
  campfire.addEventListener("touchcancel", stopHoldingFire);
  campfire.addEventListener("mousedown", startHoldingFire);
  window.addEventListener("mouseup", stopHoldingFire);

  // --- 6. Fitur Scratch Balon (Cepat Terbuka & Scrollable di HP) ---
  const scratchModal = document.getElementById("scratchModal");
  const scratchWrapper = document.getElementById("scratchWrapper");
  const scratchCanvas = document.getElementById("scratchCanvas");
  const sCtx = scratchCanvas.getContext("2d");
  const polaroidPhoto = document.getElementById("polaroidPhoto");
  const polaroidFallback = document.getElementById("polaroidFallback");
  let isDrawing = false;
  let isRevealed = false;
  let lastScratchVibe = 0;

  polaroidPhoto.onerror = () => {
    polaroidPhoto.style.display = "none";
    polaroidFallback.classList.remove("hidden");
  };

  function setupScratchCover(label) {
    isRevealed = false;
    scratchWrapper.classList.remove("is-open");
    scratchCanvas.classList.remove("cleared");
    sCtx.globalCompositeOperation = "source-over";

    const grad = sCtx.createLinearGradient(0, 0, scratchCanvas.width, scratchCanvas.height);
    grad.addColorStop(0, "#d97706");
    grad.addColorStop(0.5, "#f59e0b");
    grad.addColorStop(1, "#b45309");
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);

    sCtx.fillStyle = "rgba(255, 255, 255, 0.14)";
    for (let i = 0; i < 100; i++) {
      sCtx.beginPath();
      sCtx.arc(
        Math.random() * scratchCanvas.width,
        Math.random() * scratchCanvas.height,
        Math.random() * 2 + 0.5,
        0,
        Math.PI * 2
      );
      sCtx.fill();
    }

    sCtx.fillStyle = "#fffbeb";
    sCtx.font = "italic 600 22px 'Cormorant Garamond', serif";
    sCtx.textAlign = "center";
    sCtx.fillText(`Gosok Balon ${label}`, scratchCanvas.width / 2, scratchCanvas.height / 2 - 6);

    sCtx.font = "400 13px 'Plus Jakarta Sans', sans-serif";
    sCtx.fillStyle = "rgba(255, 251, 235, 0.9)";
    sCtx.fillText("Usap 2-3 kali di sini", scratchCanvas.width / 2, scratchCanvas.height / 2 + 18);
  }

  function openScratchModal(index) {
    activeBalloonIndex = index;
    const item = BIRTHDAY_DATA.balloons[index];

    document.getElementById("scratchTitle").textContent = `Balon Cahaya ${item.label}`;
    document.getElementById("scratchHint").textContent = openedSet.has(index)
      ? "Kenangan ini sudah terbuka"
      : "Usap perlahan lapisan emas di bawah ini";

    polaroidPhoto.style.display = "block";
    polaroidFallback.classList.add("hidden");
    polaroidPhoto.src = item.photo;
    document.getElementById("polaroidCaption").textContent = item.caption;
    document.getElementById("balloonMessage").textContent = item.message;

    scratchModal.classList.remove("hidden");
    scratchModal.querySelector(".modal-card").scrollTop = 0;

    if (openedSet.has(index)) {
      scratchCanvas.classList.add("cleared");
      scratchWrapper.classList.add("is-open");
      isRevealed = true;
    } else {
      setupScratchCover(item.label);
    }
  }

  function getPointerPos(e) {
    const rect = scratchCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (scratchCanvas.width / rect.width),
      y: (clientY - rect.top) * (scratchCanvas.height / rect.height)
    };
  }

  function scratchAt(x, y) {
    if (isRevealed) return;
    sCtx.globalCompositeOperation = "destination-out";
    sCtx.beginPath();
    // Radius lebar supaya cukup 2-3 usapan langsung terbuka
    sCtx.arc(x, y, 48, 0, Math.PI * 2);
    sCtx.fill();

    const now = Date.now();
    if (now - lastScratchVibe > 90) {
      haptic(8);
      lastScratchVibe = now;
    }

    checkScratchPercentage();
  }

  function checkScratchPercentage() {
    const pixels = sCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
    let transparent = 0;
    const step = 16;
    for (let i = 3; i < pixels.length; i += 4 * step) {
      if (pixels[i] === 0) transparent++;
    }
    const totalSampled = pixels.length / (4 * step);
    // Ambang 22% langsung terbuka penuh & membuka scroll HP
    if (transparent / totalSampled > 0.22) {
      isRevealed = true;
      haptic([35, 50, 70]);
      scratchCanvas.classList.add("cleared");
      scratchWrapper.classList.add("is-open");
      document.getElementById("scratchHint").textContent = "Geser ke bawah untuk baca selengkapnya ✨";
      markBalloonOpened(activeBalloonIndex);
    }
  }

  function markBalloonOpened(index) {
    if (index === null || openedSet.has(index)) return;
    openedSet.add(index);

    const balloonEl = balloonsContainer.children[index];
    if (balloonEl) balloonEl.classList.add("opened");

    const count = openedSet.size;
    document.getElementById("progressText").textContent =
      count === totalBalloons
        ? "Kelima balon terbuka! Segel surat utama sudah terbuka ✨"
        : `${count} dari ${totalBalloons} balon kenangan terbuka`;

    if (count === totalBalloons) {
      const letterCard = document.getElementById("letterCard");
      letterCard.classList.remove("locked");
      letterCard.classList.add("unlocked");
      document.getElementById("letterHint").textContent =
        "Segel lilin terbuka — ketuk huruf F untuk membaca suratmu";
    }
  }

  scratchCanvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    const pos = getPointerPos(e);
    scratchAt(pos.x, pos.y);
  });
  window.addEventListener("mouseup", () => (isDrawing = false));
  scratchCanvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    scratchAt(pos.x, pos.y);
  });

  scratchCanvas.addEventListener(
    "touchstart",
    (e) => {
      if (e.cancelable) e.preventDefault();
      isDrawing = true;
      const pos = getPointerPos(e);
      scratchAt(pos.x, pos.y);
    },
    { passive: false }
  );
  scratchCanvas.addEventListener("touchend", () => (isDrawing = false));
  scratchCanvas.addEventListener(
    "touchmove",
    (e) => {
      if (e.cancelable) e.preventDefault();
      if (!isDrawing) return;
      const pos = getPointerPos(e);
      scratchAt(pos.x, pos.y);
    },
    { passive: false }
  );

  document.getElementById("closeScratchModal").addEventListener("click", () => {
    scratchModal.classList.add("hidden");
  });
  document.getElementById("closeScratchBackdrop").addEventListener("click", () => {
    scratchModal.classList.add("hidden");
  });

  // --- 7. Fitur Bakar Rasa Lelah ---
  const worryModal = document.getElementById("worryModal");
  const worryFormArea = document.getElementById("worryFormArea");
  const worryComfortArea = document.getElementById("worryComfortArea");
  const worryInput = document.getElementById("worryInput");
  const burningPaper = document.getElementById("burningPaper");

  document.getElementById("worryBtn").addEventListener("click", () => {
    haptic(20);
    worryInput.value = "";
    worryFormArea.classList.remove("hidden");
    worryComfortArea.classList.add("hidden");
    burningPaper.classList.remove("burn-away");
    worryModal.classList.remove("hidden");
  });

  document.getElementById("burnWorryBtn").addEventListener("click", () => {
    const text = worryInput.value.trim();
    if (!text) return;

    haptic([40, 30, 80]);
    worryFormArea.classList.add("hidden");
    worryComfortArea.classList.remove("hidden");
    burningPaper.textContent = `"${text}"`;

    const reply =
      BIRTHDAY_DATA.worryComfortReplies[
        Math.floor(Math.random() * BIRTHDAY_DATA.worryComfortReplies.length)
      ];
    document.getElementById("comfortText").textContent = "";

    setTimeout(() => {
      burningPaper.classList.add("burn-away");
      for (let i = 0; i < 24; i++) spawnEmber(true);
    }, 300);

    setTimeout(() => {
      document.getElementById("comfortText").textContent = reply;
    }, 1300);
  });

  document.getElementById("closeWorryModal").addEventListener("click", () => {
    worryModal.classList.add("hidden");
  });
  document.getElementById("closeWorryBackdrop").addEventListener("click", () => {
    worryModal.classList.add("hidden");
  });

  // --- 8. Surat Utama & Tiket Undangan Studio Melukis ---
  const letterModal = document.getElementById("letterModal");
  const letterGreeting = document.getElementById("letterGreeting");
  const letterBody = document.getElementById("letterBody");
  const letterSignature = document.getElementById("letterSignature");

  letterGreeting.textContent = BIRTHDAY_DATA.finalLetter.greeting;
  letterSignature.textContent = BIRTHDAY_DATA.finalLetter.signature;
  BIRTHDAY_DATA.finalLetter.paragraphs.forEach((pText) => {
    const p = document.createElement("p");
    p.textContent = pText;
    letterBody.appendChild(p);
  });

  document.getElementById("sealBtn").addEventListener("click", () => {
    if (openedSet.size < totalBalloons) {
      haptic([25, 40, 25]);
      showWishToast(`Gosok dan buka kelima balon cahaya di atas dulu ya ✨`);
      return;
    }
    haptic([35, 50, 65]);
    letterModal.classList.remove("hidden");
    letterModal.querySelector(".modal-card").scrollTop = 0;
  });

  document.getElementById("closeLetterModal").addEventListener("click", () => {
    letterModal.classList.add("hidden");
  });
  document.getElementById("closeLetterBackdrop").addEventListener("click", () => {
    letterModal.classList.add("hidden");
  });

  // Populate & Buka Tiket Studio Melukis
  const ticketModal = document.getElementById("ticketModal");
  const tData = BIRTHDAY_DATA.artDateTicket;
  document.getElementById("ticketTag").textContent = tData.tag;
  document.getElementById("ticketTitle").textContent = tData.title;
  document.getElementById("ticketIntro").textContent = tData.intro;
  document.getElementById("ticketVenue").textContent = tData.venue;
  document.getElementById("ticketTime").textContent = tData.time;
  document.getElementById("ticketDateNote").textContent = tData.dateNote;
  document.getElementById("dresscodeText").textContent = tData.dresscode;

  document.getElementById("openGiftBtn").addEventListener("click", () => {
    haptic([35, 45, 75]);
    letterModal.classList.add("hidden");
    ticketModal.classList.remove("hidden");
    ticketModal.querySelector(".modal-card").scrollTop = 0;
    spawnPaintCelebration();
  });

  const confirmDateBtn = document.getElementById("confirmDateBtn");
  const ticketConfirmedMsg = document.getElementById("ticketConfirmedMsg");

  confirmDateBtn.addEventListener("click", () => {
    haptic([40, 50, 90]);
    confirmDateBtn.textContent = "Sudah Dikonfirmasi! 🎨✨";
    confirmDateBtn.classList.add("confirmed");
    ticketConfirmedMsg.classList.remove("hidden");
    spawnPaintCelebration();
  });

  document.getElementById("closeTicketModal").addEventListener("click", () => {
    ticketModal.classList.add("hidden");
  });
  document.getElementById("closeTicketBackdrop").addEventListener("click", () => {
    ticketModal.classList.add("hidden");
  });
});
