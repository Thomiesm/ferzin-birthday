document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Populate Content dari data.js ---
  document.getElementById("headerSubtitle").textContent = BIRTHDAY_DATA.headerSubtitle;

  const bgMusic = document.getElementById("bgMusic");
  bgMusic.src = BIRTHDAY_DATA.musicPath;

  const balloonsContainer = document.getElementById("balloonsContainer");
  const openedSet = new Set();
  let activeBalloonIndex = null;

  BIRTHDAY_DATA.balloons.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = "balloon-item";
    el.dataset.index = index;
    el.innerHTML = `
      <div class="balloon-orb">${item.label}</div>
      <div class="balloon-string"></div>
    `;
    el.addEventListener("click", () => openScratchModal(index));
    balloonsContainer.appendChild(el);
  });

  // --- 2. Web Audio API: Suara Gemeretak Api Unggun (Tanpa File Eksternal) ---
  let audioCtx = null;
  let fireNode = null;
  let fireGain = null;
  let isFireAudioOn = true;
  let isMusicOn = false;

  function initCampfireSound() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    const bufferSize = audioCtx.sampleRate * 3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise hangat + percikan crackle halus
      lastOut = (lastOut + 0.02 * white) / 1.02;
      const crackle = Math.random() > 0.9965 ? (Math.random() * 0.55 - 0.27) : 0;
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
    initCampfireSound();
    isFireAudioOn = !isFireAudioOn;
    if (fireGain) {
      fireGain.gain.setTargetAtTime(isFireAudioOn ? 0.22 : 0, audioCtx.currentTime, 0.2);
    }
    fireAudioToggle.classList.toggle("active", isFireAudioOn);
  });

  musicToggle.addEventListener("click", () => {
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

  // --- 3. Layar Pembuka ---
  const introOverlay = document.getElementById("introOverlay");
  document.getElementById("startBtn").addEventListener("click", () => {
    introOverlay.classList.add("fade-out");
    initCampfireSound();
    bgMusic.volume = 0.55;
    bgMusic.play().then(() => {
      isMusicOn = true;
      musicToggle.classList.add("active");
    }).catch(() => {});
  });

  // --- 4. Canvas Langit Malam, Bintang, Bintang Jatuh & Bara Api ---
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
    alpha: Math.random(),
    speed: Math.random() * 0.015 + 0.005
  }));

  const embers = [];
  const shootingStars = [];

  function spawnEmber(burst = false) {
    const centerX = width / 2 + (Math.random() - 0.5) * (burst ? 90 : 45);
    const startY = height * 0.66;
    embers.push({
      x: centerX,
      y: startY,
      vx: (Math.random() - 0.5) * (burst ? 2.4 : 0.9),
      vy: -(Math.random() * (burst ? 3.2 : 1.5) + 0.7),
      size: Math.random() * 2.5 + 1,
      life: 1,
      decay: Math.random() * 0.012 + 0.006
    });
  }

  function triggerShootingStar(targetX, targetY) {
    shootingStars.push({
      x: targetX - 140,
      y: targetY - 90,
      vx: 9,
      vy: 5.5,
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

  // Sentuh area langit kosong untuk memicu bintang jatuh
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
    if (e.clientY < height * 0.45) {
      triggerShootingStar(e.clientX, e.clientY);
    }
  });

  function animateBackground() {
    ctx.clearRect(0, 0, width, height);

    // Bintang berkelip
    stars.forEach((s) => {
      s.alpha += s.speed;
      if (s.alpha > 1 || s.alpha < 0.2) s.speed *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 248, 231, ${s.alpha})`;
      ctx.fill();
    });

    // Bara api melayang naik
    if (Math.random() < 0.32) spawnEmber(false);
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

    // Bintang jatuh
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
      ctx.lineWidth = 2;
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

  campfire.addEventListener("click", () => {
    campfire.classList.add("stoked");
    for (let i = 0; i < 16; i++) spawnEmber(true);

    fireWhisper.style.opacity = 0;
    setTimeout(() => {
      fireWhisper.textContent = BIRTHDAY_DATA.fireWhispers[whisperIdx];
      whisperIdx = (whisperIdx + 1) % BIRTHDAY_DATA.fireWhispers.length;
      fireWhisper.style.opacity = 1;
    }, 180);

    setTimeout(() => campfire.classList.remove("stoked"), 650);
  });

  // --- 6. Fitur Scratch Balon & Foto Polaroid ---
  const scratchModal = document.getElementById("scratchModal");
  const scratchCanvas = document.getElementById("scratchCanvas");
  const sCtx = scratchCanvas.getContext("2d");
  const polaroidPhoto = document.getElementById("polaroidPhoto");
  const polaroidFallback = document.getElementById("polaroidFallback");
  let isDrawing = false;
  let isRevealed = false;

  polaroidPhoto.onerror = () => {
    polaroidPhoto.style.display = "none";
    polaroidFallback.classList.remove("hidden");
  };

  function setupScratchCover(label) {
    isRevealed = false;
    scratchCanvas.classList.remove("cleared");
    sCtx.globalCompositeOperation = "source-over";

    const grad = sCtx.createLinearGradient(0, 0, scratchCanvas.width, scratchCanvas.height);
    grad.addColorStop(0, "#d97706");
    grad.addColorStop(0.5, "#f59e0b");
    grad.addColorStop(1, "#b45309");
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);

    // Tekstur bintik halus pada lapisan gosok
    sCtx.fillStyle = "rgba(255, 255, 255, 0.14)";
    for (let i = 0; i < 120; i++) {
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
    sCtx.fillStyle = "rgba(255, 251, 235, 0.85)";
    sCtx.fillText("Usap dengan jari atau kursor", scratchCanvas.width / 2, scratchCanvas.height / 2 + 18);
  }

  function openScratchModal(index) {
    activeBalloonIndex = index;
    const item = BIRTHDAY_DATA.balloons[index];

    document.getElementById("scratchTitle").textContent = `Balon Cahaya ${item.label}`;
    document.getElementById("scratchHint").textContent = openedSet.has(index)
      ? "Kenangan ini sudah terbuka"
      : "Gosok perlahan lapisan emas di bawah ini";

    polaroidPhoto.style.display = "block";
    polaroidFallback.classList.add("hidden");
    polaroidPhoto.src = item.photo;
    document.getElementById("polaroidCaption").textContent = item.caption;
    document.getElementById("balloonMessage").textContent = item.message;

    scratchModal.classList.remove("hidden");

    if (openedSet.has(index)) {
      scratchCanvas.classList.add("cleared");
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
    sCtx.arc(x, y, 26, 0, Math.PI * 2);
    sCtx.fill();
    checkScratchPercentage();
  }

  function checkScratchPercentage() {
    const pixels = sCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
    let transparent = 0;
    const step = 16; // Sampling cepat
    for (let i = 3; i < pixels.length; i += 4 * step) {
      if (pixels[i] === 0) transparent++;
    }
    const totalSampled = pixels.length / (4 * step);
    if (transparent / totalSampled > 0.45) {
      isRevealed = true;
      scratchCanvas.classList.add("cleared");
      markBalloonOpened(activeBalloonIndex);
    }
  }

  function markBalloonOpened(index) {
    if (index === null || openedSet.has(index)) return;
    openedSet.add(index);

    const balloonEl = balloonsContainer.children[index];
    if (balloonEl) balloonEl.classList.add("opened");

    const count = openedSet.size;
    const total = BIRTHDAY_DATA.balloons.length;
    document.getElementById("progressText").textContent =
      count === total
        ? "Semua balon terbuka! Segel surat utama sudah terbuka ✨"
        : `${count} dari ${total} balon kenangan terbuka`;

    if (count === total) {
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

  scratchCanvas.addEventListener("touchstart", (e) => {
    isDrawing = true;
    const pos = getPointerPos(e);
    scratchAt(pos.x, pos.y);
  }, { passive: true });
  scratchCanvas.addEventListener("touchend", () => (isDrawing = false));
  scratchCanvas.addEventListener("touchmove", (e) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    scratchAt(pos.x, pos.y);
  }, { passive: true });

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
    worryInput.value = "";
    worryFormArea.classList.remove("hidden");
    worryComfortArea.classList.add("hidden");
    burningPaper.classList.remove("burn-away");
    worryModal.classList.remove("hidden");
  });

  document.getElementById("burnWorryBtn").addEventListener("click", () => {
    const text = worryInput.value.trim();
    if (!text) return;

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
      for (let i = 0; i < 22; i++) spawnEmber(true);
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

  // --- 8. Surat Utama Bersegel Lilin ---
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
    if (openedSet.size < BIRTHDAY_DATA.balloons.length) {
      showWishToast("Gosok dan buka keempat balon cahaya di atas dulu ya ✨");
      return;
    }
    letterModal.classList.remove("hidden");
  });

  document.getElementById("closeLetterModal").addEventListener("click", () => {
    letterModal.classList.add("hidden");
  });
  document.getElementById("closeLetterBackdrop").addEventListener("click", () => {
    letterModal.classList.add("hidden");
  });
});
