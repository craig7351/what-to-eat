/* ============================================================
   今天要吃什麼？ — 純前端餐點轉盤
   ============================================================ */

const meals = {
  breakfast: [
    { name: "三明治",   icon: "assets/早餐/三明治.png" },
    { name: "土司夾蛋", icon: "assets/早餐/土司夾蛋.png" },
    { name: "水煎包",   icon: "assets/早餐/水煎包.png" },
    { name: "御飯糰",   icon: "assets/早餐/御飯糰.png" },
    { name: "蛋餅",     icon: "assets/早餐/蛋餅.png" },
    { name: "漢堡",     icon: "assets/早餐/漢堡.png" },
    { name: "瘦肉粥",   icon: "assets/早餐/瘦肉粥.png" },
    { name: "蔥抓餅",   icon: "assets/早餐/蔥抓餅.png" },
    { name: "燒餅油條", icon: "assets/早餐/燒餅油條.png" },
    { name: "蘿蔔糕",   icon: "assets/早餐/蘿蔔糕.png" }
  ],
  lunchDinner: [
    { name: "水餃",     icon: "assets/午晚餐/水餃.png" },
    { name: "牛肉麵",   icon: "assets/午晚餐/牛肉麵.png" },
    { name: "石鍋拌飯", icon: "assets/午晚餐/石鍋拌飯.png" },
    { name: "咖哩飯",   icon: "assets/午晚餐/咖哩飯.png" },
    { name: "拉麵",     icon: "assets/午晚餐/拉麵.png" },
    { name: "炒飯",     icon: "assets/午晚餐/炒飯.png" },
    { name: "焗烤",     icon: "assets/午晚餐/焗烤.png" },
    { name: "義大利麵", icon: "assets/午晚餐/義大利麵.png" },
    { name: "壽司",     icon: "assets/午晚餐/壽司.png" },
    { name: "滷肉飯",   icon: "assets/午晚餐/滷肉飯.png" },
    { name: "豬排飯",   icon: "assets/午晚餐/豬排飯.png" },
    { name: "燒臘飯",   icon: "assets/午晚餐/燒臘飯.png" },
    { name: "親子丼",   icon: "assets/午晚餐/親子丼.png" },
    { name: "雞腿飯",   icon: "assets/午晚餐/雞腿飯.png" }
  ]
};

const LABELS = {
  breakfast:   "今天早餐吃",
  lunchDinner: "今天午晚餐吃"
};

// 柔和粉彩色循環（奶油黃、米白、淺橘、柔粉、薄荷綠、淡藍）
const SLICE_COLORS = [
  "#ffe9a8", "#fff2d6", "#ffcf9e", "#ffd3dd", "#c7f0d8", "#cfe6ff"
];

const SVG_NS = "http://www.w3.org/2000/svg";
const CENTER = 250;   // viewBox 500x500
const RADIUS = 244;

// ===== 狀態 =====
let currentCategory = "breakfast";
let currentRotation = 0;   // 累積旋轉角度（度）
let isSpinning = false;
let labelParts = [];       // 每個 icon/文字外層 g 與其錨點，用來反向旋轉維持正立

// ===== DOM =====
const wheelEl      = document.getElementById("wheel");
const spinBtn      = document.getElementById("spinBtn");
const tabs         = Array.from(document.querySelectorAll(".tab"));
const resultCard   = document.getElementById("resultCard");
const resultBanner = document.getElementById("resultBanner");
const resultTitle  = document.getElementById("resultTitle");
const resultNote   = document.getElementById("resultNote");
const resultIcon   = document.getElementById("resultIcon");
const resultIconWrap = document.getElementById("resultIconWrap");
const resultDivider = document.getElementById("resultDivider");
const hub          = document.getElementById("hub");
const hubFx        = document.getElementById("hubFx");
const confettiLayer = document.getElementById("confettiLayer");
const soundToggle  = document.getElementById("soundToggle");

// ===== 幾何工具 =====
// 角度以「12 點鐘方向為 0、順時針增加」計算
function polar(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + r * Math.sin(rad),
    y: CENTER - r * Math.cos(rad)
  };
}

function slicePath(startDeg, endDeg) {
  const p1 = polar(startDeg, RADIUS);
  const p2 = polar(endDeg, RADIUS);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
         `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
}

// 建立 SVG 元素小工具
function svgEl(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// ===== 建立轉盤 =====
function buildWheel(category) {
  const list = meals[category];
  const n = list.length;
  const sliceAngle = 360 / n;

  // 格數越少，icon 與字級越大
  const iconSize = n <= 10 ? 100 : 80;
  const baseFont = n <= 10 ? 20 : 17;

  // 清空
  while (wheelEl.firstChild) wheelEl.removeChild(wheelEl.firstChild);
  labelParts = [];

  // 漸層定義（笑臉、金框）
  const defs = svgEl("defs", {});
  const faceGrad = svgEl("radialGradient", { id: "faceGrad", cx: "50%", cy: "36%", r: "68%" });
  faceGrad.appendChild(svgEl("stop", { offset: "0%",  "stop-color": "#fff2bd" }));
  faceGrad.appendChild(svgEl("stop", { offset: "55%", "stop-color": "#ffd35c" }));
  faceGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#f4b12c" }));
  const ringGrad = svgEl("linearGradient", { id: "ringGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
  ringGrad.appendChild(svgEl("stop", { offset: "0%",   "stop-color": "#ffdd82" }));
  ringGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#e29a1f" }));
  defs.appendChild(faceGrad);
  defs.appendChild(ringGrad);
  wheelEl.appendChild(defs);

  list.forEach((meal, i) => {
    const start = i * sliceAngle;
    const end = (i + 1) * sliceAngle;
    const mid = start + sliceAngle / 2;

    // 扇形
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", slicePath(start, end));
    path.setAttribute("fill", SLICE_COLORS[i % SLICE_COLORS.length]);
    path.setAttribute("stroke", "#ffffff");
    path.setAttribute("stroke-width", "2");
    wheelEl.appendChild(path);

    // icon 與名稱依扇形中心以極座標定位；各自包一層 g，之後反向旋轉維持「永遠正立」
    const iconR = RADIUS - 66;   // icon 靠外圈
    const textR = RADIUS - 132;  // 名稱靠內圈
    const ip = polar(mid, iconR);
    const tp = polar(mid, textR);

    // icon
    const iconG = svgEl("g", {});
    const img = svgEl("image", {
      href: meal.icon,
      width: iconSize, height: iconSize,
      x: ip.x - iconSize / 2, y: ip.y - iconSize / 2
    });
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", meal.icon); // 舊瀏覽器相容
    iconG.appendChild(img);
    wheelEl.appendChild(iconG);
    labelParts.push({ el: iconG, x: ip.x, y: ip.y });

    // 名稱
    const textG = svgEl("g", {});
    const text = svgEl("text", {
      class: "wheel-slice-text",
      x: tp.x, y: tp.y,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": meal.name.length >= 4 ? baseFont - 3 : baseFont
    });
    text.textContent = meal.name;
    textG.appendChild(text);
    wheelEl.appendChild(textG);
    labelParts.push({ el: textG, x: tp.x, y: tp.y });
  });

  // ===== 金黃外框（漸層粗環 + 內緣高光）=====
  wheelEl.appendChild(svgEl("circle", {
    cx: CENTER, cy: CENTER, r: RADIUS - 6,
    fill: "none", stroke: "url(#ringGrad)", "stroke-width": "16"
  }));
  wheelEl.appendChild(svgEl("circle", {
    cx: CENTER, cy: CENTER, r: RADIUS - 13,
    fill: "none", stroke: "#fff3cf", "stroke-width": "3", opacity: "0.9"
  }));

  // 鉚釘點
  const rivetCount = 24;
  const rivetR = RADIUS - 6;
  for (let k = 0; k < rivetCount; k++) {
    const a = (360 / rivetCount) * k;
    const rp = polar(a, rivetR);
    wheelEl.appendChild(svgEl("circle", {
      cx: rp.x.toFixed(2), cy: rp.y.toFixed(2), r: "3.4",
      fill: "#fffdf3", stroke: "#e8b24a", "stroke-width": "1"
    }));
  }

  // 中央笑臉改由固定的 .hub 覆蓋層繪製（見 index.html / style.css），不隨轉盤旋轉

  applyUpright(currentRotation);
}

// 反向旋轉每個 icon/文字，抵銷轉盤旋轉，使其永遠正立（且仍落在各自扇形內）
function applyUpright(rot) {
  labelParts.forEach((p) => {
    p.el.setAttribute("transform", `rotate(${-rot} ${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
  });
}

// ===== 重置結果卡 =====
function resetResult() {
  resultBanner.hidden = true;
  resultTitle.textContent = "按一下，讓轉盤幫你決定！";
  resultDivider.hidden = true;
  resultNote.hidden = true;
  resultIconWrap.hidden = true;
  resultCard.classList.remove("pop");
}

// ===== 顯示結果 =====
function showResult(meal) {
  resultBanner.textContent = LABELS[currentCategory];
  resultBanner.hidden = false;
  resultTitle.innerHTML = `<span class="meal-name">${meal.name}</span>`;
  resultIcon.src = meal.icon;
  resultIcon.alt = meal.name;
  resultIconWrap.hidden = false;
  resultDivider.hidden = false;
  resultNote.hidden = false;

  // 重播彈出動畫
  resultCard.classList.remove("pop");
  void resultCard.offsetWidth; // reflow
  resultCard.classList.add("pop");
}

// ===== 全螢幕彩帶灑落 =====
const CONFETTI_COLORS = [
  "#ff9db1", "#ffd35c", "#8fd3ff", "#b6e88a",
  "#c9a8ff", "#ffb066", "#ff7f9c", "#7fe0c3"
];

function launchConfetti(count = 70) {
  confettiLayer.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";

    const w = 7 + Math.random() * 8;                 // 寬 7~15px
    const h = w * (0.5 + Math.random() * 1.1);        // 長方形紙屑
    const round = Math.random() < 0.25;               // 部分做成圓點
    const sway = (Math.random() * 24 - 12).toFixed(1);// 左右飄散 -12~12vw
    const spin = (Math.random() * 720 + 360).toFixed(0) * (Math.random() < 0.5 ? -1 : 1);
    const dur = (2.4 + Math.random() * 1.4).toFixed(2); // 2.4~3.8s
    const delay = (Math.random() * 0.7).toFixed(2);

    piece.style.left = (Math.random() * 100).toFixed(2) + "vw";
    piece.style.width = w.toFixed(1) + "px";
    piece.style.height = h.toFixed(1) + "px";
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.borderRadius = round ? "50%" : "2px";
    piece.style.opacity = "0";
    piece.style.setProperty("--sway", sway + "vw");
    piece.style.setProperty("--spin", spin + "deg");
    piece.style.animationDuration = dur + "s";
    piece.style.animationDelay = delay + "s";

    piece.addEventListener("animationend", () => piece.remove());
    frag.appendChild(piece);
  }
  confettiLayer.appendChild(frag);
}

// ===== 旋轉 =====
function spin() {
  if (isSpinning) return;

  const list = meals[currentCategory];
  const n = list.length;
  const sliceAngle = 360 / n;
  const index = Math.floor(Math.random() * n);

  // 該格中心目前所在角度（順時針、由頂端起算）
  const centerAngle = index * sliceAngle + sliceAngle / 2;

  // 要讓該格中心停在頂端（0 度）：最終旋轉量 mod 360 = (360 - centerAngle)
  const want = (360 - centerAngle) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const diff = (want - currentMod + 360) % 360;
  const turns = 5 + Math.floor(Math.random() * 2); // 至少 5 圈
  const finalRotation = currentRotation + turns * 360 + diff;

  isSpinning = true;
  setControlsDisabled(true);
  hub.classList.remove("win");
  hub.classList.add("spinning");   // 轉動中眨眼
  hubFx.classList.remove("burst");

  // 先把文字/圖案反轉到「最終角度」的正立狀態：
  // 螢幕上的傾角 = 轉盤角度 − finalRotation，隨轉盤轉到 finalRotation 時歸零 → 正立
  applyUpright(finalRotation);

  // 轉動音效：用實際旋轉量與格數推算 tick，與轉盤減速完全同步
  Sound.spinTicks(4200, finalRotation - currentRotation, n);

  const anim = wheelEl.animate(
    [
      { transform: `rotate(${currentRotation}deg)` },
      { transform: `rotate(${finalRotation}deg)` }
    ],
    {
      duration: 4200,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)", // ease-out
      fill: "forwards"
    }
  );

  anim.onfinish = () => {
    currentRotation = finalRotation;
    // 鎖定最終狀態
    wheelEl.style.transform = `rotate(${finalRotation}deg)`;
    isSpinning = false;
    setControlsDisabled(false);
    hub.classList.remove("spinning");
    hub.classList.add("win");        // 轉完咧嘴大笑
    // 噴發愛心／閃光（先移除再 reflow 以重播動畫）
    hubFx.classList.remove("burst");
    void hubFx.offsetWidth;
    hubFx.classList.add("burst");
    launchConfetti();                // 全螢幕彩帶灑落
    Sound.win();                     // 中獎音效
    showResult(list[index]);
  };
}

// ===== 控制項啟用/停用 =====
function setControlsDisabled(disabled) {
  spinBtn.disabled = disabled;
  tabs.forEach((t) => (t.disabled = disabled));
}

// ===== 切換分類 =====
function switchCategory(category) {
  if (isSpinning || category === currentCategory) return;
  currentCategory = category;

  tabs.forEach((t) => {
    const active = t.dataset.category === category;
    t.classList.toggle("is-active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });

  // 重置轉盤角度與內容
  currentRotation = 0;
  wheelEl.getAnimations().forEach((a) => a.cancel());
  wheelEl.style.transform = "rotate(0deg)";
  hub.classList.remove("spinning", "win");   // 表情歸位
  hubFx.classList.remove("burst");
  confettiLayer.innerHTML = "";              // 清掉彩帶
  buildWheel(category);
  resetResult();
}

// ============================================================
//  音樂 & 音效（Web Audio API 即時合成，無需音檔）
// ============================================================
const Sound = (() => {
  let ctx, master, bgmGain, sfxGain;
  let muted = false;
  let bgmTimer = null;
  let bgmStarted = false;

  // 可愛循環旋律（C 大調），[頻率, 拍數]，beat = 0.26s
  const BEAT = 0.26;
  const MELODY = [
    [659, 1], [784, 1], [880, 1], [784, 1],
    [659, 1], [587, 1], [523, 2],
    [587, 1], [659, 1], [784, 1], [659, 1],
    [587, 1], [523, 2]
  ];
  const BASS = [131, 0, 165, 0, 196, 0, 175, 0]; // 每兩拍一個低音

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      bgmGain = ctx.createGain(); bgmGain.gain.value = 0.10; bgmGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5;  sfxGain.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  function tone(freq, start, dur, { type = "triangle", gain = 0.5, dest = null } = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g); g.connect(dest || sfxGain);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  // 排一輪旋律，回傳總長度（秒）
  function scheduleBar(t0) {
    let t = t0;
    for (const [f, beats] of MELODY) {
      tone(f, t, beats * BEAT * 0.9, { type: "triangle", gain: 0.5, dest: bgmGain });
      t += beats * BEAT;
    }
    const barLen = t - t0;
    // 低音鋪底
    let bt = t0;
    for (const bf of BASS) {
      if (bf) tone(bf, bt, BEAT * 1.6, { type: "sine", gain: 0.6, dest: bgmGain });
      bt += BEAT * 2;
    }
    return barLen;
  }

  function startBGM() {
    ensure();
    if (bgmStarted) return;
    bgmStarted = true;
    const loop = () => {
      if (!bgmStarted) return;
      const len = scheduleBar(ctx.currentTime + 0.05);
      bgmTimer = setTimeout(loop, len * 1000);
    };
    loop();
  }

  function stopBGM() {
    bgmStarted = false;
    if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
  }

  // 貝茲曲線單軸取值（P0=0, P3=1，兩個控制點 a1、a2）
  function bez(a1, a2, u) {
    const v = 1 - u;
    return 3 * v * v * u * a1 + 3 * v * u * u * a2 + u * u * u;
  }
  // 已知進度 y，反解出對應的參數 u（Y 單調遞增，用二分法）
  function solveU(yTarget, y1, y2) {
    let lo = 0, hi = 1;
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (bez(y1, y2, mid) < yTarget) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // 轉動音效：每轉過「一格」響一聲，時間點直接由轉盤的 ease 曲線推算 → 完全對齊
  // easing = cubic-bezier(0.16, 1, 0.3, 1)：X 控制點 (0.16, 0.3)，Y 控制點 (1, 1)
  function spinTicks(durationMs, deltaAngle, sliceCount) {
    ensure();
    const dur = durationMs / 1000;
    const sliceAngle = 360 / sliceCount;
    const total = Math.min(Math.round(deltaAngle / sliceAngle), 140); // 經過的格數
    const t0 = ctx.currentTime;
    for (let m = 1; m <= total; m++) {
      const yTarget = m / total;              // 角度進度（0~1）
      const u = solveU(yTarget, 1, 1);        // 反解貝茲參數
      const x = bez(0.16, 0.3, u);            // 對應的時間進度（0~1）
      const t = t0 + x * dur;
      tone(1150 - yTarget * 480, t, 0.045, { type: "square", gain: 0.08 });
    }
  }

  // 中獎：上行琶音 + 亮片
  function win() {
    ensure();
    const t0 = ctx.currentTime + 0.02;
    [523, 659, 784, 1046].forEach((f, i) => {
      tone(f, t0 + i * 0.11, 0.5, { type: "triangle", gain: 0.55 });
    });
    tone(1568, t0 + 0.44, 0.6, { type: "sine", gain: 0.35 });
    tone(2093, t0 + 0.5, 0.5, { type: "sine", gain: 0.25 });
  }

  // 按鈕／點擊
  function click() {
    ensure();
    tone(880, ctx.currentTime, 0.08, { type: "square", gain: 0.25 });
  }

  function toggleMute() {
    muted = !muted;
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    return muted;
  }

  return { startBGM, stopBGM, spinTicks, win, click, toggleMute };
})();

// ===== 事件 =====
spinBtn.addEventListener("click", () => {
  if (isSpinning) return;
  Sound.startBGM();      // 首次點擊啟動背景音樂（符合瀏覽器自動播放規範）
  Sound.click();
  spin();                // 轉動音效在 spin() 內依實際旋轉量觸發
});

tabs.forEach((t) => {
  t.addEventListener("click", () => {
    if (isSpinning) return;
    Sound.click();
    switchCategory(t.dataset.category);
  });
});

soundToggle.addEventListener("click", () => {
  const muted = Sound.toggleMute();
  soundToggle.classList.toggle("is-muted", muted);
  soundToggle.querySelector(".sound-ico").textContent = muted ? "🔇" : "🔊";
  if (!muted) Sound.startBGM();
});

// ===== 初始化 =====
buildWheel(currentCategory);
resetResult();
