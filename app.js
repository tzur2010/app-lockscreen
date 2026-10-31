// ============================================================================
// MAGIC LOCKSCREEN SIMULATOR (ONE UI 1:1 & iOS + BIOMETRICS + FULLSCREEN)
// ============================================================================

const CONFIG_STORAGE_KEY = 'magic_lockscreen_config_v6';
const WALLPAPER_STORAGE_KEY = 'magic_custom_wallpaper';
const SELECTED_WALLPAPER_ID_KEY = 'magic_selected_wallpaper_id_v1';
const HOMESCREEN_STORAGE_KEY = 'magic_custom_homescreen';
const LAST_PIN_KEY = 'last_entered_pin';
const HISTORY_KEY = 'pin_history';
const FORCE_MODE_STORAGE_KEY = 'magic_lockscreen_force_mode';

// מצב כפיית פתיחה למנטליזם (Any PIN Unlocks / Magician Force Mode)
let isForceMode = (() => {
  const saved = localStorage.getItem(FORCE_MODE_STORAGE_KEY);
  if (saved === null) {
    localStorage.setItem(FORCE_MODE_STORAGE_KEY, 'true');
    return true;
  }
  return saved === 'true';
})();

function setForceModeState(nextState) {
  isForceMode = Boolean(nextState);
  try {
    localStorage.setItem(FORCE_MODE_STORAGE_KEY, String(isForceMode));
  } catch (e) {}
}

function triggerHaptic(msOrPattern) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(msOrPattern);
    } catch (e) {}
  }
  if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
    try {
      const arr = Array.isArray(msOrPattern) ? msOrPattern : [msOrPattern];
      window.AndroidBridge.vibrate(JSON.stringify(arr));
    } catch (e) {}
  }
}

let pinAudioCtx = null;
function playKeyClickSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!pinAudioCtx) pinAudioCtx = new AudioCtx();
    if (pinAudioCtx.state === 'suspended') {
      pinAudioCtx.resume().catch(() => {});
    }
    const osc = pinAudioCtx.createOscillator();
    const gain = pinAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, pinAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, pinAudioCtx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.04, pinAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, pinAudioCtx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(pinAudioCtx.destination);
    osc.start();
    osc.stop(pinAudioCtx.currentTime + 0.028);
  } catch (e) {}
}

function toggleForceModeSecretly() {
  setForceModeState(!isForceMode);
  // חיווי רטט קצרצר ועדין בלבד (50ms) כאשר המצב משתנה
  triggerHaptic(50);
}

// ----------------------------------------------------------------------------
// 1. מחולל טפטים רשמיים מובנים (SVG Data-URI מהירים, חדים וללא תלות ברשת)
// ----------------------------------------------------------------------------
function createSvgWallpaper(stops, shapesSvg = '', angle = 145) {
  const rad = (angle * Math.PI) / 180;
  const x2 = Math.round(50 + Math.sin(rad) * 50);
  const y2 = Math.round(50 + Math.cos(rad) * 50);
  const stopsXml = stops
    .map(([offset, color]) => `<stop offset="${offset}%" stop-color="${color}"/>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 2400" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="${x2}%" y2="${y2}%">${stopsXml}</linearGradient>
      <radialGradient id="glow1" cx="30%" cy="25%" r="55%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
      <radialGradient id="glow2" cx="75%" cy="72%" r="50%">
        <stop offset="0%" stop-color="rgba(56,189,248,0.22)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <rect width="1080" height="2400" fill="url(#bg)"/>
    <rect width="1080" height="2400" fill="url(#glow1)"/>
    <rect width="1080" height="2400" fill="url(#glow2)"/>
    ${shapesSvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ----------------------------------------------------------------------------
// 2. מאגר דגמים מלא (Presets: Samsung S20-S26 & Apple iPhone 12-18)
// ----------------------------------------------------------------------------
const MODEL_PRESETS = {
  samsung: [
    {
      id: 's20',
      name: 'Galaxy S20',
      year: '2020',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0f172a'], [38, '#1e3a8a'], [74, '#ec4899'], [100, '#fbcfe8']],
        `<path d="M-100 1700 C320 1350, 760 1980, 1200 1550 L1200 2400 L-100 2400 Z" fill="rgba(255,255,255,0.14)"/>
         <circle cx="540" cy="880" r="420" fill="rgba(244,114,182,0.18)"/>`
      )
    },
    {
      id: 's21',
      name: 'Galaxy S21',
      year: '2021',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#1e1b4b'], [42, '#5b21b6'], [78, '#c084fc'], [100, '#f5d0fe']],
        `<path d="M0 400 Q540 950 1080 350 L1080 1450 Q540 1000 0 1550 Z" fill="rgba(255,255,255,0.12)"/>`
      )
    },
    {
      id: 's22',
      name: 'Galaxy S22',
      year: '2022',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#042f2e'], [40, '#0f766e'], [78, '#fb7185'], [100, '#fde68a']],
        `<circle cx="380" cy="980" r="460" fill="rgba(45,212,191,0.2)"/>
         <circle cx="720" cy="1360" r="390" fill="rgba(251,113,133,0.22)"/>`
      )
    },
    {
      id: 's23',
      name: 'Galaxy S23',
      year: '2023',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#052e16'], [45, '#14532d'], [80, '#3f6212'], [100, '#bef264']],
        `<circle cx="540" cy="1120" r="480" fill="rgba(163,230,53,0.16)"/>
         <circle cx="540" cy="1120" r="290" fill="rgba(255,255,255,0.1)"/>`
      )
    },
    {
      id: 's24',
      name: 'Galaxy S24',
      year: '2024',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#1c1917'], [38, '#57534e'], [74, '#d97706'], [100, '#fef08a']],
        `<polygon points="540,360 960,1150 540,1920 120,1150" fill="rgba(251,191,36,0.16)"/>
         <polygon points="540,560 820,1150 540,1720 260,1150" fill="rgba(255,255,255,0.12)"/>`
      )
    },
    {
      id: 's25',
      name: 'Galaxy S25',
      year: '2025',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#090d1e'], [38, '#1e1b4b'], [72, '#3b0764'], [100, '#581c87']],
        `<circle cx="540" cy="960" r="500" fill="rgba(56,189,248,0.15)"/>
         <path d="M-80 1650 Q540 1220 1160 1650 L1160 2400 L-80 2400 Z" fill="rgba(192,38,211,0.16)"/>`
      )
    },
    {
      id: 's26',
      name: 'Galaxy S26',
      year: '2026',
      cutout: 'punch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0c0a24'], [35, '#1e1b4b'], [72, '#4c1d95'], [100, '#701a75']],
        `<ellipse cx="540" cy="1080" rx="460" ry="620" fill="rgba(56,189,248,0.14)"/>
         <ellipse cx="540" cy="1080" rx="280" ry="420" fill="rgba(244,114,182,0.15)"/>`
      )
    }
  ],
  ios: [
    {
      id: 'iphone12',
      name: 'iPhone 12',
      year: 'Notch',
      cutout: 'notch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0f172a'], [36, '#1d4ed8'], [72, '#ec4899'], [100, '#fda4af']],
        `<circle cx="540" cy="1200" r="560" fill="rgba(59,130,246,0.22)"/>
         <circle cx="540" cy="1200" r="360" fill="rgba(244,114,182,0.25)"/>`
      )
    },
    {
      id: 'iphone13',
      name: 'iPhone 13',
      year: 'Notch',
      cutout: 'notch',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#0c4a6e'], [42, '#0284c7'], [76, '#7dd3fc'], [100, '#f0f9ff']],
        `<path d="M0 700 C400 1050, 680 450, 1080 850 L1080 1850 C680 1450, 400 2050, 0 1700 Z" fill="rgba(255,255,255,0.22)"/>`
      )
    },
    {
      id: 'iphone14',
      name: 'iPhone 14',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#2e1065'], [44, '#6d28d9'], [80, '#c084fc'], [100, '#f3e8ff']],
        `<ellipse cx="540" cy="1160" rx="480" ry="680" fill="rgba(255,255,255,0.15)"/>`
      )
    },
    {
      id: 'iphone15',
      name: 'iPhone 15',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#18181b'], [40, '#3f3f46'], [76, '#60a5fa'], [100, '#dbeafe']],
        `<path d="M-60 1100 Q540 650 1140 1100 L1140 1700 Q540 1250 -60 1700 Z" fill="rgba(147,197,253,0.2)"/>`
      )
    },
    {
      id: 'iphone16',
      name: 'iPhone 16',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#1e1b4b'], [38, '#4338ca'], [74, '#818cf8'], [100, '#fde68a']],
        `<circle cx="340" cy="950" r="420" fill="rgba(129,140,248,0.25)"/>
         <circle cx="740" cy="1380" r="420" fill="rgba(251,191,36,0.22)"/>`
      )
    },
    {
      id: 'iphone17',
      name: 'iPhone 17',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#042f2e'], [38, '#0f766e'], [76, '#38bdf8'], [100, '#f0fdfa']],
        `<ellipse cx="540" cy="1050" rx="520" ry="440" fill="rgba(255,255,255,0.16)"/>`
      )
    },
    {
      id: 'iphone18',
      name: 'iPhone 18',
      year: 'Dynamic Island',
      cutout: 'island',
      defaultWallpaper: createSvgWallpaper(
        [[0, '#090d16'], [32, '#311042'], [68, '#0284c7'], [100, '#a5f3fc']],
        `<circle cx="540" cy="1040" r="480" fill="rgba(56,189,248,0.2)"/>
         <circle cx="540" cy="1380" r="350" fill="rgba(244,114,182,0.2)"/>`
      )
    }
  ]
};

// גלריית טפטים נוספים לכל מערכת הפעלה
const BUILTIN_GALLERY_WALLPAPERS = {
  samsung: [
    {
      id: 'sam_aurora',
      label: 'One UI Violet',
      dataUrl: createSvgWallpaper(
        [[0, '#0c0d24'], [45, '#1e1b4b'], [82, '#581c87'], [100, '#831843']],
        `<circle cx="540" cy="920" r="450" fill="rgba(56,189,248,0.16)"/>`
      )
    },
    {
      id: 'sam_titanium',
      label: 'Titanium Gold',
      dataUrl: createSvgWallpaper(
        [[0, '#1c1917'], [48, '#78350f'], [82, '#f59e0b'], [100, '#fef3c7']],
        `<polygon points="540,340 940,1200 540,2040 140,1200" fill="rgba(255,255,255,0.14)"/>`
      )
    },
    {
      id: 'sam_crystal',
      label: 'Emerald Wave',
      dataUrl: createSvgWallpaper(
        [[0, '#064e3b'], [46, '#059669'], [82, '#34d399'], [100, '#d1fae5']],
        `<path d="M-80 1550 Q540 1100 1160 1550 L1160 2400 L-80 2400 Z" fill="rgba(255,255,255,0.16)"/>`
      )
    }
  ],
  ios: [
    {
      id: 'ios_bloom',
      label: 'iOS Glow',
      dataUrl: createSvgWallpaper(
        [[0, '#1e1b4b'], [40, '#6d28d9'], [76, '#ec4899'], [100, '#fbcfe8']],
        `<circle cx="540" cy="1100" r="460" fill="rgba(255,255,255,0.18)"/>`
      )
    },
    {
      id: 'ios_ocean',
      label: 'Pacific Blue',
      dataUrl: createSvgWallpaper(
        [[0, '#082f49'], [44, '#0284c7'], [80, '#38bdf8'], [100, '#e0f2fe']],
        `<ellipse cx="540" cy="1240" rx="520" ry="380" fill="rgba(255,255,255,0.18)"/>`
      )
    },
    {
      id: 'ios_sunset',
      label: 'Desert Gold',
      dataUrl: createSvgWallpaper(
        [[0, '#3b0764'], [42, '#be185d'], [78, '#fb923c'], [100, '#fef08a']],
        `<circle cx="540" cy="960" r="440" fill="rgba(254,240,138,0.2)"/>`
      )
    }
  ]
};

// ----------------------------------------------------------------------------
// 3. קונפיגורציה ושמירה ב-localStorage
// ----------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  osTheme: 'samsung',           // 'samsung' | 'ios'
  deviceModel: 's26',           // 's20'..'s26' | 'iphone12'..'iphone18'
  unlockMode: 'pin',            // 'pin' | 'pattern' | 'words'
  registeredPasscode: '1234',   // הסיסמה האישית שנרשמה ב-Setup (עבור PIN / מקלדת)
  registeredPattern: '12369',   // הדפוס האישי שנרשם ב-Setup (עבור Pattern בלבד)
  fingerprintEnrolled: false,   // האם טביעת אצבע כוילה ונרשמה ב-Setup
  fingerprintHoldMs: 480,       // משך לחיצה מכויל במילישניות
  fingerprintZoneX: 0.5,        // מיקום X מכויל על החיישן (0..1)
  fingerprintZoneY: 0.5,        // מיקום Y מכויל על החיישן (0..1)
  faceIdEnrolled: false,        // האם Face ID נרשם ב-Setup
  faceSignature: null,          // חתימת תווי פנים ממצלמת הסלפי
  stealthPattern: false,
  showStatusBar: true,
  showPunchHole: true,
  hapticPeek: true,
  chameleonClock: true,
  holdPeek: true,
  showFingerprint: true
};

let config = loadConfig();

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Could not save config', e);
  }
}

// ----------------------------------------------------------------------------
// 4. הפניית אלמנטים ב-DOM
// ----------------------------------------------------------------------------
const splashScreen = document.getElementById('splashScreen');
const setupOverlay = document.getElementById('setupOverlay');
const splitChoiceScreen = document.getElementById('splitChoiceScreen');
const chooseSamsungBtn = document.getElementById('chooseSamsungBtn');
const chooseIosBtn = document.getElementById('chooseIosBtn');
const deviceConfigSheet = document.getElementById('deviceConfigSheet');
const backToSplitBtn = document.getElementById('backToSplitBtn');
const selectedDevicePill = document.getElementById('selectedDevicePill');
const modelPresetsGrid = document.getElementById('modelPresetsGrid');
const launchLockscreenBtn = document.getElementById('launchLockscreenBtn');

// Setup Biometrics, Passcode & Pattern DOM
const setupPasscodeBox = document.getElementById('setupPasscodeBox');
const setupPasscodeInput = document.getElementById('setupPasscodeInput');
const setupPasscodeSavedBadge = document.getElementById('setupPasscodeSavedBadge');

const setupPatternBox = document.getElementById('setupPatternBox');
const setupPatternStatusText = document.getElementById('setupPatternStatusText');
const setupPatternSavedBadge = document.getElementById('setupPatternSavedBadge');
const setupPatternWrapper = document.getElementById('setupPatternWrapper');
const setupPatternSvg = document.getElementById('setupPatternSvg');
const setupPatternLine = document.getElementById('setupPatternLine');
const setupPatternNodes = Array.from(document.querySelectorAll('.setup-pattern-node'));

const fpEnrollSection = document.getElementById('fpEnrollSection');
const fpEnrollStatusText = document.getElementById('fpEnrollStatusText');
const openFpEnrollBtn = document.getElementById('openFpEnrollBtn');
const fpEnrollPadWrap = document.getElementById('fpEnrollPadWrap');
const fpEnrollSteps = document.getElementById('fpEnrollSteps');
const fpEnrollSensor = document.getElementById('fpEnrollSensor');
const fpEnrollHint = document.getElementById('fpEnrollHint');

const faceIdEnrollSection = document.getElementById('faceIdEnrollSection');
const faceIdEnrollStatusText = document.getElementById('faceIdEnrollStatusText');
const startFaceIdEnrollBtn = document.getElementById('startFaceIdEnrollBtn');
const faceIdCameraBox = document.getElementById('faceIdCameraBox');
const faceIdVideoCircle = document.getElementById('faceIdVideoCircle');
const setupFaceVideo = document.getElementById('setupFaceVideo');
const faceIdRingOverlay = document.getElementById('faceIdRingOverlay');
const faceIdScanCaption = document.getElementById('faceIdScanCaption');

// Lockscreen DOM
const phoneContainer = document.getElementById('phoneContainer');
const statusBar = document.getElementById('statusBar');
const cameraPunchHole = document.getElementById('cameraPunchHole');
const islandLiveCam = document.getElementById('islandLiveCam');
const statusTime = document.getElementById('statusTime');
const lockIconTrigger = document.getElementById('lockIconTrigger');
const secretCornerTrigger = document.getElementById('secretCornerTrigger');

const clockLockScreen = document.getElementById('clockLockScreen');
const clockLockBigTime = document.getElementById('clockLockBigTime');
const clockLockDate = document.getElementById('clockLockDate');

const titleGroup = document.getElementById('titleGroup');
const mainTitle = document.getElementById('mainTitle');
const subTitle = document.getElementById('subTitle');
const errorMsg = document.getElementById('errorMsg');

const oneUiPasswordPillWrap = document.getElementById('oneUiPasswordPillWrap');
const wordGlassField = document.getElementById('wordGlassField');
const passwordInput = document.getElementById('passwordInput');
const togglePasswordEyeBtn = document.getElementById('togglePasswordEyeBtn');
const pinDotsContainer = document.getElementById('pinDots');

const viewPin = document.getElementById('viewPin');
const viewPattern = document.getElementById('viewPattern');
const viewWords = document.getElementById('viewWords');

const numericKeypad = document.getElementById('numericKeypad');
const keypadBackspaceBtn = document.getElementById('keypadBackspaceBtn');
const keypadOkBtn = document.getElementById('keypadOkBtn');
const wordSubmitInlineBtn = document.getElementById('wordSubmitInlineBtn');

const patternWrapper = document.getElementById('patternWrapper');
const patternSvg = document.getElementById('patternSvg');
const patternLine = document.getElementById('patternLine');
const patternNodes = Array.from(document.querySelectorAll('.pattern-node'));

const fingerprintContainer = document.getElementById('fingerprintContainer');
const samsungBackBtn = document.getElementById('samsungBackBtn');
const iosFooter = document.getElementById('iosFooter');
const iosSwipeHint = document.getElementById('iosSwipeHint');
const iosRightActionBtn = document.getElementById('iosRightActionBtn');

const fakeHomescreen = document.getElementById('fakeHomescreen');
const secretRelockZone = document.getElementById('secretRelockZone');
const homeClock = document.getElementById('homeClock');
const homeDate = document.getElementById('homeDate');

const secretPeek = document.getElementById('secretPeek');
const peekText = document.getElementById('peekText');
const peekPatternMini = document.getElementById('peekPatternMini');

// Settings Controls
const modeSelector = document.getElementById('modeSelector');
const statusBarSelector = document.getElementById('statusBarSelector');
const stealthPatternGroup = document.getElementById('stealthPatternGroup');
const toggleStealthPattern = document.getElementById('toggleStealthPattern');
const toggleStatusBar = document.getElementById('toggleStatusBar');
const togglePunchHole = document.getElementById('togglePunchHole');
const toggleHapticPeek = document.getElementById('toggleHapticPeek');
const toggleChameleonClock = document.getElementById('toggleChameleonClock');
const toggleHoldPeek = document.getElementById('toggleHoldPeek');
const toggleFingerprint = document.getElementById('toggleFingerprint');
const fingerprintSettingRow = document.getElementById('fingerprintSettingRow');

const wallpaperGalleryRow = document.getElementById('wallpaperGalleryRow');
const cycleWallpaperBtn = document.getElementById('cycleWallpaperBtn');
const wallpaperFileInput = document.getElementById('wallpaperFileInput');
const clearWallpaperBtn = document.getElementById('clearWallpaperBtn');
const homescreenFileInput = document.getElementById('homescreenFileInput');
const clearHomescreenBtn = document.getElementById('clearHomescreenBtn');
const settingsLastInput = document.getElementById('settingsLastInput');

// State Variables
let isLockedOut = false;
let isPasswordVisible = false;
let activePatternNodes = [];
let isDrawingPattern = false;
let isClockPeekActive = false;
let clockPeekTimeout = null;
let holdPeekTimer = null;
let faceIdUnlocked = false;
let faceIdTimer = null;
let activeCameraStream = null;

// ----------------------------------------------------------------------------
// 5. פתיח (Splash Screen) - 1.1 שניות
// ----------------------------------------------------------------------------
function initSplashScreen() {
  if (!splashScreen) return;
  setTimeout(() => {
    splashScreen.classList.add('fade-out');
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 450);
  }, 1050);
}

// ----------------------------------------------------------------------------
// 6. מסך הגדרות מקדים (Setup / Onboarding) עם מעבר חלק וללא קפיצת מסך
// ----------------------------------------------------------------------------
function getModelsForCurrentOs() {
  return MODEL_PRESETS[config.osTheme] || MODEL_PRESETS.samsung;
}

function getCurrentModelObject() {
  const list = getModelsForCurrentOs();
  return list.find((m) => m.id === config.deviceModel) || list[list.length - 1];
}

function openDeviceConfigFor(osTheme) {
  config.osTheme = osTheme;
  const models = MODEL_PRESETS[osTheme] || MODEL_PRESETS.samsung;
  if (!models.some((m) => m.id === config.deviceModel)) {
    config.deviceModel = models[models.length - 1].id;
  }
  saveConfig();
  applyConfigToUI();

  // מעבר אנימטיבי חלק ונקי ממסך הבחירה 50/50 למסך ההגדרות (ללא הגדלת מסך פתאומית)
  if (splitChoiceScreen) {
    splitChoiceScreen.classList.add('hidden');
  }
  if (deviceConfigSheet) {
    deviceConfigSheet.classList.add('active', 'open');
  }
}

if (chooseSamsungBtn) {
  chooseSamsungBtn.addEventListener('click', () => openDeviceConfigFor('samsung'));
}
if (chooseIosBtn) {
  chooseIosBtn.addEventListener('click', () => openDeviceConfigFor('ios'));
}
if (backToSplitBtn) {
  backToSplitBtn.addEventListener('click', () => {
    stopAllCameraStreams();
    if (deviceConfigSheet) {
      deviceConfigSheet.classList.remove('active', 'open');
    }
    if (splitChoiceScreen) {
      splitChoiceScreen.classList.remove('hidden');
    }
  });
}
if (launchLockscreenBtn) {
  launchLockscreenBtn.addEventListener('click', () => {
    stopAllCameraStreams();
    phoneContainer.classList.remove('clock-mode-active');
    closeSettingsSheet();
  });
}

function renderModelPresetsGrid() {
  if (!modelPresetsGrid) return;
  const models = getModelsForCurrentOs();
  modelPresetsGrid.innerHTML = '';

  models.forEach((model) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'model-preset-chip model-preset-btn' + (model.id === config.deviceModel ? ' active' : '');
    btn.innerHTML = `
      <span class="model-preset-name">${model.name}</span>
      <span class="model-preset-sub">${model.year}</span>
    `;
    btn.addEventListener('click', () => {
      config.deviceModel = model.id;
      const savedWallpaperId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';
      if (savedWallpaperId !== 'custom') {
        localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, 'model_default');
      }
      saveConfig();
      applyConfigToUI();
    });
    modelPresetsGrid.appendChild(btn);
  });
}

function getWallpaperCatalogForCurrentModel() {
  const model = getCurrentModelObject();
  const osGallery = BUILTIN_GALLERY_WALLPAPERS[config.osTheme] || BUILTIN_GALLERY_WALLPAPERS.samsung;
  return [
    {
      id: 'model_default',
      label: `רשמי (${model.name})`,
      dataUrl: model.defaultWallpaper
    },
    ...osGallery
  ];
}

function renderWallpaperGallery() {
  if (!wallpaperGalleryRow) return;
  const catalog = getWallpaperCatalogForCurrentModel();
  const customDataUrl = localStorage.getItem(WALLPAPER_STORAGE_KEY);
  const selectedId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';

  wallpaperGalleryRow.innerHTML = '';

  catalog.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'wp-thumb-card' + (selectedId === item.id ? ' active' : '');
    card.style.backgroundImage = `url("${item.dataUrl}")`;
    card.innerHTML = `<span class="wp-thumb-label">${item.label}</span>`;
    card.addEventListener('click', () => {
      localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, item.id);
      applyWallpaperToContainer();
      renderWallpaperGallery();
    });
    wallpaperGalleryRow.appendChild(card);
  });

  if (customDataUrl) {
    const customCard = document.createElement('button');
    customCard.type = 'button';
    customCard.className = 'wp-thumb-card' + (selectedId === 'custom' ? ' active' : '');
    customCard.style.backgroundImage = `url("${customDataUrl}")`;
    customCard.innerHTML = `<span class="wp-thumb-label">טפט אישי</span>`;
    customCard.addEventListener('click', () => {
      localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, 'custom');
      applyWallpaperToContainer();
      renderWallpaperGallery();
    });
    wallpaperGalleryRow.appendChild(customCard);
  }
}

function applyWallpaperToContainer() {
  const catalog = getWallpaperCatalogForCurrentModel();
  const customDataUrl = localStorage.getItem(WALLPAPER_STORAGE_KEY);
  const selectedId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';

  let chosenUrl = catalog[0].dataUrl;
  if (selectedId === 'custom' && customDataUrl) {
    chosenUrl = customDataUrl;
    if (clearWallpaperBtn) clearWallpaperBtn.style.display = 'inline-flex';
  } else {
    const found = catalog.find((item) => item.id === selectedId);
    if (found) chosenUrl = found.dataUrl;
    if (clearWallpaperBtn) {
      clearWallpaperBtn.style.display = customDataUrl ? 'inline-flex' : 'none';
    }
  }

  phoneContainer.style.backgroundImage = `url("${chosenUrl}")`;
  phoneContainer.style.backgroundSize = 'cover';
  phoneContainer.style.backgroundPosition = 'center';
}

if (cycleWallpaperBtn) {
  cycleWallpaperBtn.addEventListener('click', () => {
    const catalog = getWallpaperCatalogForCurrentModel();
    const customDataUrl = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    const ids = catalog.map((c) => c.id);
    if (customDataUrl) ids.push('custom');

    const currentId = localStorage.getItem(SELECTED_WALLPAPER_ID_KEY) || 'model_default';
    const nextIndex = (ids.indexOf(currentId) + 1) % ids.length;
    localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, ids[nextIndex]);
    applyWallpaperToContainer();
    renderWallpaperGallery();
  });
}

// ----------------------------------------------------------------------------
// 8. רישום קוד אישי, דפוס אישי, טביעת אצבע מכוילת ו-Face ID מותאם
// ----------------------------------------------------------------------------
const SETUP_PATTERN_COORDS = {
  1: [35, 35],   2: [105, 35],  3: [175, 35],
  4: [35, 105],  5: [105, 105], 6: [175, 105],
  7: [35, 175],  8: [105, 175], 9: [175, 175]
};

// הפקת חתימה ויזואלית (8x8 Normalized Color & Luminance Grid) ממצלמת הסלפי
function captureVideoSignature(videoEl) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth || !videoEl.videoHeight) {
    return null;
  }
  const canvas = document.createElement('canvas');
  const grid = 8;
  canvas.width = grid;
  canvas.height = grid;
  const ctx = canvas.getContext('2d');

  // דגימת מרכז הפריים (אזור הפנים)
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const size = Math.min(vw, vh) * 0.72;
  const sx = (vw - size) / 2;
  const sy = (vh - size) / 2;

  ctx.drawImage(videoEl, sx, sy, size, size, 0, 0, grid, grid);
  const data = ctx.getImageData(0, 0, grid, grid).data;

  const vec = [];
  let sumLum = 0;
  let sumSqLum = 0;
  const count = grid * grid;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumLum += lum;
    sumSqLum += lum * lum;
    vec.push(Number(r.toFixed(3)), Number(g.toFixed(3)), Number(b.toFixed(3)));
  }

  const meanLum = sumLum / count;
  const varianceLum = sumSqLum / count - meanLum * meanLum;

  // בדיקה שהמצלמה לא מכוסה / חשוכה לגמרי או שרופה לגמרי
  if (meanLum < 0.05 || varianceLum < 0.0015) {
    return null;
  }

  return vec;
}

// השוואת חתימת הפנים השמורה מול הפריים החי במצלמה (Cosine + L1 Similarity)
function computeFaceSimilarity(sigA, sigB) {
  if (!Array.isArray(sigA) || !Array.isArray(sigB) || sigA.length !== sigB.length || sigA.length === 0) {
    return 0;
  }
  let diffSum = 0;
  for (let i = 0; i < sigA.length; i++) {
    diffSum += Math.abs(sigA[i] - sigB[i]);
  }
  const meanAbsDiff = diffSum / sigA.length; // 0..1
  return Math.max(0, 1 - meanAbsDiff * 2.2);
}

function renderSavedSetupPattern() {
  if (!setupPatternLine || !setupPatternNodes.length) return;
  const saved = String(config.registeredPattern || '12369')
    .split('')
    .map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 9);

  setupPatternNodes.forEach((nodeEl) => {
    const id = Number(nodeEl.dataset.node);
    nodeEl.classList.toggle('active', saved.includes(id));
  });

  const pts = saved.map((n) => SETUP_PATTERN_COORDS[n].join(',')).join(' ');
  setupPatternLine.setAttribute('points', pts);

  if (setupPatternStatusText) {
    setupPatternStatusText.textContent = `דפוס אישי מוגדר (${saved.join(' → ')}) - צייר דפוס חדש לשינוי`;
  }
}

function initBiometricsEnrollment() {
  // א. רישום סיסמה אישית (מוצג רק במצב PIN או מקלדת מלאה)
  if (setupPasscodeInput) {
    setupPasscodeInput.value = config.registeredPasscode || '1234';
    setupPasscodeInput.addEventListener('input', () => {
      const val = setupPasscodeInput.value.trim();
      config.registeredPasscode = val.length > 0 ? val : '1234';
      saveConfig();
      if (setupPasscodeSavedBadge) {
        setupPasscodeSavedBadge.textContent = 'נשמר ✓';
        setupPasscodeSavedBadge.style.opacity = '1';
      }
    });
  }

  // ב. רישום דפוס אישי ב-Setup (מוצג אך ורק כשנבחרת האופציה של דפוס - Pattern)
  if (setupPatternWrapper && setupPatternSvg && setupPatternLine) {
    let setupNodesActive = [];
    let isDrawingSetupPattern = false;

    const getSetupMidNode = (a, b) => {
      const pairs = {
        '1-3': 2, '3-1': 2, '4-6': 5, '6-4': 5, '7-9': 8, '9-7': 8,
        '1-7': 4, '7-1': 4, '2-8': 5, '8-2': 5, '3-9': 6, '9-3': 6,
        '1-9': 5, '9-1': 5, '3-7': 5, '7-3': 5
      };
      return pairs[`${a}-${b}`] || null;
    };

    const addSetupNode = (nodeId) => {
      const num = Number(nodeId);
      if (setupNodesActive.includes(num)) return;
      if (setupNodesActive.length > 0) {
        const last = setupNodesActive[setupNodesActive.length - 1];
        const mid = getSetupMidNode(last, num);
        if (mid && !setupNodesActive.includes(mid)) {
          setupNodesActive.push(mid);
        }
      }
      setupNodesActive.push(num);
      setupPatternNodes.forEach((el) => {
        el.classList.toggle('active', setupNodesActive.includes(Number(el.dataset.node)));
      });
      if (navigator.vibrate) navigator.vibrate(15);
    };

    const hitSetupNode = (clientX, clientY) => {
      for (const el of setupPatternNodes) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (Math.hypot(clientX - cx, clientY - cy) <= rect.width * 0.48) {
          return Number(el.dataset.node);
        }
      }
      return null;
    };

    const renderSetupLine = (clientX = null, clientY = null) => {
      const pts = setupNodesActive.map((n) => SETUP_PATTERN_COORDS[n].join(','));
      if (clientX !== null && clientY !== null && setupNodesActive.length > 0) {
        const rect = setupPatternSvg.getBoundingClientRect();
        const x = Math.round(((clientX - rect.left) * 210) / rect.width);
        const y = Math.round(((clientY - rect.top) * 210) / rect.height);
        pts.push(`${x},${y}`);
      }
      setupPatternLine.setAttribute('points', pts.join(' '));
    };

    setupPatternWrapper.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setupPatternWrapper.setPointerCapture(e.pointerId);
      setupNodesActive = [];
      isDrawingSetupPattern = true;
      const hit = hitSetupNode(e.clientX, e.clientY);
      if (hit) addSetupNode(hit);
      renderSetupLine(e.clientX, e.clientY);
    });

    setupPatternWrapper.addEventListener('pointermove', (e) => {
      if (!isDrawingSetupPattern) return;
      e.preventDefault();
      const hit = hitSetupNode(e.clientX, e.clientY);
      if (hit) addSetupNode(hit);
      renderSetupLine(e.clientX, e.clientY);
    });

    const finishSetupPattern = () => {
      if (!isDrawingSetupPattern) return;
      isDrawingSetupPattern = false;

      if (setupNodesActive.length < 4) {
        if (setupPatternStatusText) {
          setupPatternStatusText.textContent = 'חבר לפחות 4 נקודות כדי לשמור דפוס אישי!';
        }
        if (navigator.vibrate) navigator.vibrate([50, 60, 50]);
        renderSavedSetupPattern();
        return;
      }

      config.registeredPattern = setupNodesActive.join('');
      saveConfig();
      renderSavedSetupPattern();
      if (setupPatternSavedBadge) {
        setupPatternSavedBadge.textContent = 'נשמר ✓';
      }
      if (navigator.vibrate) navigator.vibrate(45);
    };

    setupPatternWrapper.addEventListener('pointerup', finishSetupPattern);
    setupPatternWrapper.addEventListener('pointercancel', finishSetupPattern);

    renderSavedSetupPattern();
  }

  // ג. רישום טביעת אצבע מכוילת (3 לחיצות לכיול מיקום מדויק על החיישן + משך לחיצה)
  let fpEnrollStep = 0;
  let fpSamples = [];
  let fpHoldStart = 0;
  let fpTouchNormX = 0.5;
  let fpTouchNormY = 0.5;

  function updateFpEnrollUI() {
    if (!fpEnrollStatusText) return;
    if (config.fingerprintEnrolled) {
      fpEnrollStatusText.textContent = `טביעת אצבע מותאמת אישית שמורה (זמן לחיצה: ~${config.fingerprintHoldMs}ms) ✓`;
      fpEnrollStatusText.classList.add('enrolled');
    } else {
      fpEnrollStatusText.textContent = `טרם נרשמה טביעת אצבע — כייל 3 לחיצות (${fpEnrollStep}/3)`;
      fpEnrollStatusText.classList.remove('enrolled');
    }
  }
  updateFpEnrollUI();

  if (openFpEnrollBtn && fpEnrollPadWrap) {
    openFpEnrollBtn.addEventListener('click', () => {
      const isHidden = fpEnrollPadWrap.style.display === 'none';
      fpEnrollPadWrap.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) {
        fpEnrollStep = 0;
        fpSamples = [];
        const dots = fpEnrollSteps ? fpEnrollSteps.querySelectorAll('.fp-step-dot') : [];
        dots.forEach((d) => d.classList.remove('done'));
        if (fpEnrollHint) {
          fpEnrollHint.textContent = 'לחיצה 1 מתוך 3: הנח את האצבע על החיישן, החזק ושחרר';
        }
      }
    });
  }

  if (fpEnrollSensor) {
    const startEnrollHold = (e) => {
      if (e.cancelable) e.preventDefault();
      const rect = fpEnrollSensor.getBoundingClientRect();
      fpTouchNormX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      fpTouchNormY = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
      fpHoldStart = performance.now();
      fpEnrollSensor.classList.add('holding');
      if (navigator.vibrate) navigator.vibrate(25);
    };

    const endEnrollHold = () => {
      if (!fpHoldStart) return;
      const duration = Math.round(performance.now() - fpHoldStart);
      fpHoldStart = 0;
      fpEnrollSensor.classList.remove('holding');

      if (duration < 250 || duration > 1600) {
        if (fpEnrollHint) {
          fpEnrollHint.textContent =
            duration < 250
              ? 'לחיצה קצרה מדי! החזק את האצבע כחצי שנייה ושחרר'
              : 'לחיצה ארוכה מדי! החזק כחצי שנייה ושחרר';
        }
        if (navigator.vibrate) navigator.vibrate([50, 60, 50]);
        return;
      }

      // בדיקת עקביות בין הלחיצות של אותו משתמש
      if (fpSamples.length > 0) {
        const prev = fpSamples[fpSamples.length - 1];
        const dist = Math.hypot(fpTouchNormX - prev.x, fpTouchNormY - prev.y);
        const timeDiff = Math.abs(duration - prev.ms);
        if (dist > 0.36 || timeDiff > 320) {
          if (fpEnrollHint) {
            fpEnrollHint.textContent = 'הנח את אותה אצבע באותו אזור ובאותו משך לחיצה כפי שעשית בלחיצה הקודמת';
          }
          if (navigator.vibrate) navigator.vibrate([50, 60, 50]);
          return;
        }
      }

      fpSamples.push({ ms: duration, x: fpTouchNormX, y: fpTouchNormY });
      fpEnrollStep += 1;

      const dots = fpEnrollSteps ? fpEnrollSteps.querySelectorAll('.fp-step-dot') : [];
      dots.forEach((dot, idx) => {
        dot.classList.toggle('done', idx < fpEnrollStep);
      });

      if (navigator.vibrate) navigator.vibrate(45);

      if (fpEnrollStep < 3) {
        if (fpEnrollHint) {
          fpEnrollHint.textContent = `מעולה (${fpEnrollStep}/3)! חזור על אותה לחיצה בדיוק ללחיצה ${fpEnrollStep + 1} מתוך 3`;
        }
      } else {
        const avgMs = Math.round(fpSamples.reduce((a, b) => a + b.ms, 0) / fpSamples.length);
        const avgX = Number((fpSamples.reduce((a, b) => a + b.x, 0) / fpSamples.length).toFixed(3));
        const avgY = Number((fpSamples.reduce((a, b) => a + b.y, 0) / fpSamples.length).toFixed(3));

        config.fingerprintHoldMs = avgMs;
        config.fingerprintZoneX = avgX;
        config.fingerprintZoneY = avgY;
        config.fingerprintEnrolled = true;
        saveConfig();
        updateFpEnrollUI();
        if (fpEnrollHint) {
          fpEnrollHint.textContent = `טביעת האצבע האישית נשמרה! (תפתח רק בלחיצה של ~${avgMs}ms באותו אזור) ✓`;
        }
        setTimeout(() => {
          if (fpEnrollPadWrap) fpEnrollPadWrap.style.display = 'none';
        }, 1200);
      }
    };

    fpEnrollSensor.addEventListener('pointerdown', startEnrollHold);
    fpEnrollSensor.addEventListener('pointerup', endEnrollHold);
    fpEnrollSensor.addEventListener('pointercancel', endEnrollHold);
    fpEnrollSensor.addEventListener('pointerleave', endEnrollHold);
  }

  // ד. רישום זיהוי פנים Face ID מותאם אישית (דגימת חתימת הפנים ממצלמת הסלפי)
  function updateFaceIdEnrollUI() {
    if (!faceIdEnrollStatusText) return;
    if (config.faceIdEnrolled && Array.isArray(config.faceSignature) && config.faceSignature.length > 0) {
      faceIdEnrollStatusText.textContent = 'תווי הפנים שלך שמורים ומורשים ל-Face ID ✓';
      faceIdEnrollStatusText.classList.add('enrolled');
    } else {
      faceIdEnrollStatusText.textContent = 'טרם נרשמו פנים — לחץ "סרוק פנים כעת" לרישום הפנים שלך';
      faceIdEnrollStatusText.classList.remove('enrolled');
    }
  }
  updateFaceIdEnrollUI();

  if (startFaceIdEnrollBtn && faceIdCameraBox) {
    startFaceIdEnrollBtn.addEventListener('click', async () => {
      faceIdCameraBox.style.display = 'flex';
      if (faceIdVideoCircle) faceIdVideoCircle.classList.remove('scan-complete');
      if (faceIdScanCaption) faceIdScanCaption.textContent = 'מפעיל מצלמת סלפי... הבט ישירות למצלמה';

      stopAllCameraStreams();
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('No camera API');
        }
        activeCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 320 } },
          audio: false
        });
        if (setupFaceVideo) {
          setupFaceVideo.srcObject = activeCameraStream;
          await setupFaceVideo.play().catch(() => {});
        }
      } catch (err) {
        if (faceIdScanCaption) {
          faceIdScanCaption.textContent = 'לא ניתן לגשת למצלמה — אשר הרשאת מצלמה בדפדפן לסריקת פנים';
        }
        return;
      }

      setTimeout(() => {
        const sig = captureVideoSignature(setupFaceVideo);
        if (!sig) {
          if (faceIdScanCaption) {
            faceIdScanCaption.textContent = 'המצלמה חשוכה או שלא זוהו פנים ברורות. נסה שוב באור תקין.';
          }
          if (navigator.vibrate) navigator.vibrate([60, 70, 60]);
          stopAllCameraStreams();
          return;
        }

        config.faceSignature = sig;
        config.faceIdEnrolled = true;
        saveConfig();
        updateFaceIdEnrollUI();

        if (faceIdVideoCircle) faceIdVideoCircle.classList.add('scan-complete');
        if (faceIdScanCaption) faceIdScanCaption.textContent = 'תווי הפנים שלך נשמרו בהצלחה! רק הפנים שלך יפתחו את ה-Face ID ✓';
        if (navigator.vibrate) navigator.vibrate([40, 60, 80]);

        setTimeout(() => {
          stopAllCameraStreams();
          faceIdCameraBox.style.display = 'none';
        }, 1300);
      }, 1700);
    });
  }
}

function stopAllCameraStreams() {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach((track) => track.stop());
    activeCameraStream = null;
  }
  if (setupFaceVideo) setupFaceVideo.srcObject = null;
  if (islandLiveCam) islandLiveCam.srcObject = null;
}

// ----------------------------------------------------------------------------
// 9. החלת הקונפיגורציה על הממשק (One UI 1:1 מול iOS)
// ----------------------------------------------------------------------------
function applyConfigToUI() {
  const currentModel = getCurrentModelObject();

  // ערכת נושא Samsung One UI מול Apple iOS
  phoneContainer.classList.toggle('theme-samsung', config.osTheme === 'samsung');
  phoneContainer.classList.toggle('theme-ios', config.osTheme === 'ios');

  // דגמי Notch (iPhone 12 / 13) מול Dynamic Island (iPhone 14 - 18)
  const isNotch = config.osTheme === 'ios' && currentModel.cutout === 'notch';
  phoneContainer.classList.toggle('ios-notch-model', isNotch);

  if (selectedDevicePill) {
    selectedDevicePill.textContent =
      config.osTheme === 'ios' ? `Apple ${currentModel.name}` : `Samsung ${currentModel.name}`;
  }

  renderModelPresetsGrid();
  renderWallpaperGallery();
  applyWallpaperToContainer();

  // הצגת הגדרת דפוס אך ורק במצב דפוס (Pattern), והגדרת סיסמה רק במצב סיסמה/מקלדת
  if (setupPasscodeBox) {
    setupPasscodeBox.style.display = config.unlockMode === 'pattern' ? 'none' : 'flex';
  }
  if (setupPatternBox) {
    setupPatternBox.style.display = config.unlockMode === 'pattern' ? 'flex' : 'none';
    if (config.unlockMode === 'pattern') {
      renderSavedSetupPattern();
    }
  }

  // הצגת רישום טביעת אצבע ו-Face ID בהגדרות
  if (fpEnrollSection) {
    fpEnrollSection.style.display = config.osTheme === 'samsung' ? 'flex' : 'none';
  }
  if (faceIdEnrollSection) {
    faceIdEnrollSection.style.display = 'flex';
  }

  // הצגת/הסתרת שורת סטטוס עליונה
  phoneContainer.classList.toggle('hide-status-bar', !config.showStatusBar);
  if (statusBar) {
    statusBar.style.display = config.showStatusBar ? 'flex' : 'none';
  }
  if (statusBarSelector) {
    statusBarSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      const shouldShow = btn.dataset.statusbar === 'show';
      btn.classList.toggle('active', shouldShow === config.showStatusBar);
    });
  }

  // חור מצלמה / Dynamic Island
  if (cameraPunchHole) {
    cameraPunchHole.style.display = config.showPunchHole ? 'flex' : 'none';
  }

  // טביעת אצבע בתחתית (עבור סמסונג)
  if (fingerprintSettingRow) {
    fingerprintSettingRow.style.display = config.osTheme === 'samsung' ? 'flex' : 'none';
  }
  if (fingerprintContainer) {
    const showFp = config.osTheme === 'samsung' && config.showFingerprint;
    fingerprintContainer.style.display = showFp ? 'flex' : 'none';
  }

  // כפתורי מצב נעילה
  if (modeSelector) {
    modeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === config.unlockMode);
    });
  }

  if (stealthPatternGroup) {
    stealthPatternGroup.style.display = config.unlockMode === 'pattern' ? 'block' : 'none';
  }
  if (patternWrapper) {
    patternWrapper.classList.toggle('stealth-mode', config.stealthPattern);
  }

  // החלפת תצוגות נעילה (PIN / Pattern / Words) והפרדה מוחלטת בין PIN לסיסמת מילים
  phoneContainer.classList.toggle('mode-words-active', config.unlockMode === 'words');
  viewPin.classList.toggle('active', config.unlockMode === 'pin');
  viewPattern.classList.toggle('active', config.unlockMode === 'pattern');
  viewWords.classList.toggle('active', config.unlockMode === 'words');

  // הפרדה מוחלטת:
  // - במצב קוד PIN ('pin'): מוצגות נקודות ה-PIN ולוח המקשים הנומרי כרגיל (ללא שדה הקפסולה)
  // - במצב סיסמת מילים ('words'): מוצג אך ורק שדה הקפסולה המעוגל בגוון סגלגל-בורדו כהה עם העין והמקלדת האמיתית
  // - במצב דפוס ('pattern'): מוצג אך ורק לוח הדפוס 3x3
  if (oneUiPasswordPillWrap) {
    oneUiPasswordPillWrap.style.display = config.unlockMode === 'words' ? 'flex' : 'none';
  }
  if (pinDotsContainer) {
    pinDotsContainer.style.display = config.unlockMode === 'pin' ? 'flex' : 'none';
  }

  updateHeaderTitles();

  // סנכרון מתגים בהגדרות
  if (toggleStealthPattern) toggleStealthPattern.checked = config.stealthPattern;
  if (toggleStatusBar) toggleStatusBar.checked = config.showStatusBar;
  if (togglePunchHole) togglePunchHole.checked = config.showPunchHole;
  if (toggleHapticPeek) toggleHapticPeek.checked = config.hapticPeek;
  if (toggleChameleonClock) toggleChameleonClock.checked = config.chameleonClock;
  if (toggleHoldPeek) toggleHoldPeek.checked = config.holdPeek;
  if (toggleFingerprint) toggleFingerprint.checked = config.showFingerprint;

  clearCurrentInputs();
  refreshSettingsLastCaptured();

  // הפעלת סריקת פנים כשמסך ההגדרות סגור (אם נרשמו פנים)
  if (!setupOverlay.classList.contains('open')) {
    triggerIosFaceIdSequence();
  }
}

function updateHeaderTitles() {
  if (config.unlockMode === 'words') {
    // עיצוב צילום המסך מיועד אך ורק לאפשרות של "סיסמת מילים"
    mainTitle.textContent = 'הזן סיסמה';
    subTitle.textContent = 'סיסמה חייבת להכיל לפחות 4 תווים, ביניהם אות אחת לפחות.';
  } else if (config.unlockMode === 'pattern') {
    mainTitle.textContent = config.osTheme === 'ios' ? 'צייר דפוס לשחרור' : 'צייר דפוס';
    subTitle.textContent = '';
  } else {
    // מסך קוד ה-PIN המקורי ללא שינוי
    mainTitle.textContent = config.osTheme === 'ios' ? 'הזן קוד גישה' : 'הזן קוד PIN';
    subTitle.textContent = '';
  }
}

// ----------------------------------------------------------------------------
// 10. שעון חי + Chameleon Clock Peek
// ----------------------------------------------------------------------------
function updateLiveClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (!isClockPeekActive && statusTime) {
    statusTime.textContent = timeStr;
  }
  if (homeClock) homeClock.textContent = timeStr;
  if (clockLockBigTime) clockLockBigTime.textContent = timeStr;

  const dateFormatter = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  const formattedDate = dateFormatter.format(now);
  if (homeDate) homeDate.textContent = formattedDate;
  if (clockLockDate) clockLockDate.textContent = formattedDate;
}

updateLiveClock();
setInterval(updateLiveClock, 10000);

function triggerChameleonClockPeek() {
  if (!config.chameleonClock || !statusTime) return;

  const lastCode = localStorage.getItem(LAST_PIN_KEY) || '';
  if (!lastCode) return;

  const digitsOnly = lastCode.replace(/\D/g, '');
  let fakeTime = '';
  if (digitsOnly.length >= 4) {
    fakeTime = `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2, 4)}`;
  } else if (digitsOnly.length > 0) {
    const padded = digitsOnly.padStart(4, '0');
    fakeTime = `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
  } else {
    fakeTime = lastCode.slice(0, 5);
  }

  isClockPeekActive = true;
  statusTime.textContent = fakeTime;
  statusTime.classList.add('peek-active');

  clearTimeout(clockPeekTimeout);
  clockPeekTimeout = setTimeout(() => {
    isClockPeekActive = false;
    statusTime.classList.remove('peek-active');
    updateLiveClock();
  }, 3000);
}

if (statusTime) {
  let statusClockTaps = 0;
  let statusClockTapTimer = null;
  statusTime.addEventListener('click', (e) => {
    e.stopPropagation();
    statusClockTaps++;
    clearTimeout(statusClockTapTimer);
    if (statusClockTaps >= 2) {
      statusClockTaps = 0;
      // לחיצה כפולה על השעון: החלפה חשאית בין מצב רגיל למצב קסם (Force Mode) עם רטט 50ms
      toggleForceModeSecretly();
      return;
    }
    statusClockTapTimer = setTimeout(() => {
      statusClockTaps = 0;
      triggerChameleonClockPeek();
    }, 280);
  });
}

if (clockLockBigTime) {
  let bigClockTaps = 0;
  let bigClockTapTimer = null;
  clockLockBigTime.addEventListener('click', (e) => {
    e.stopPropagation();
    bigClockTaps++;
    clearTimeout(bigClockTapTimer);
    if (bigClockTaps >= 2) {
      bigClockTaps = 0;
      // לחיצה כפולה על השעון הגדול: החלפה חשאית בין מצב רגיל למצב קסם (Force Mode) עם רטט 50ms
      toggleForceModeSecretly();
      return;
    }
    bigClockTapTimer = setTimeout(() => {
      bigClockTaps = 0;
      phoneContainer.classList.remove('clock-mode-active');
    }, 280);
  });
}

// ----------------------------------------------------------------------------
// 11. רטט מורס סודי בכיס (Haptic Peek)
// ----------------------------------------------------------------------------
function vibrateDigitCode(codeString) {
  if (!config.hapticPeek || !navigator.vibrate) return;
  const digits = String(codeString).replace(/\D/g, '');
  if (!digits) return;

  const pattern = [100, 250];
  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[i], 10);
    if (d === 0) {
      pattern.push(320);
    } else {
      for (let p = 0; p < d; p++) {
        pattern.push(65);
        if (p < d - 1) pattern.push(85);
      }
    }
    if (i < digits.length - 1) {
      pattern.push(420);
    }
  }
  try {
    navigator.vibrate(pattern);
  } catch (e) {}
}

// ----------------------------------------------------------------------------
// 12. שמירת הקלט להיסטוריית הקוסם ואימות הסיסמה האישית
// ----------------------------------------------------------------------------
function recordSecretInput(value, mode) {
  if (!value) return;
  localStorage.setItem(LAST_PIN_KEY, value);

  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.push({
      code: value,
      mode: mode,
      os: config.osTheme,
      model: config.deviceModel,
      timestamp: new Date().toLocaleTimeString('he-IL')
    });
    if (history.length > 30) history.shift();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}

  refreshSettingsLastCaptured();
  vibrateDigitCode(value);
}

// הצגת הודעת שגיאה באדום + רטט כפול
function triggerErrorFeedback(customErrorMessage = 'סיסמה שגויה') {
  if (isLockedOut) return;
  isLockedOut = true;

  // רטט כפול לשגיאה
  if (navigator.vibrate) {
    try {
      navigator.vibrate([70, 90, 70]);
    } catch (e) {}
  }

  if (errorMsg) {
    errorMsg.textContent = customErrorMessage;
  }

  titleGroup.classList.add('fade-out');
  setTimeout(() => {
    titleGroup.style.display = 'none';
    errorMsg.style.display = 'block';
    void errorMsg.offsetWidth;
    errorMsg.classList.add('show');
  }, 150);

  if (wordGlassField && oneUiPasswordPillWrap.style.display !== 'none') {
    wordGlassField.classList.add('text-shake');
    setTimeout(() => wordGlassField.classList.remove('text-shake'), 420);
  }

  if (config.unlockMode === 'pin' && pinDotsContainer) {
    pinDotsContainer.classList.add('ios-dots-shake');
    setTimeout(() => pinDotsContainer.classList.remove('ios-dots-shake'), 420);
  }

  if (customErrorMessage === 'טביעת אצבע לא תואמת') {
    phoneContainer.classList.add('text-shake');
    setTimeout(() => phoneContainer.classList.remove('text-shake'), 420);
  }

  if (config.unlockMode === 'pattern') {
    patternWrapper.classList.add('pattern-error');
  }

  setTimeout(() => {
    clearCurrentInputs();

    errorMsg.classList.remove('show');
    setTimeout(() => {
      errorMsg.style.display = 'none';
      titleGroup.style.display = 'flex';
      void titleGroup.offsetWidth;
      titleGroup.classList.remove('fade-out');
      isLockedOut = false;
    }, 180);
  }, 1450);
}

function animateLockOpenAndUnlock() {
  if (lockIconTrigger) {
    lockIconTrigger.classList.add('faceid-unlocked');
  }
  if (cameraPunchHole) {
    cameraPunchHole.classList.add('faceid-unlocked');
  }
  triggerHaptic(45);
  setTimeout(() => {
    clearCurrentInputs();
    triggerUnlockHomescreen();
  }, 190);
}

// אימות סיסמה או דפוס (כולל מצב מנטליזם Any-PIN Force Mode)
function verifyAndSubmitPasscode(enteredValue, modeLabel) {
  if (isLockedOut) return;
  const cleaned = String(enteredValue || '').trim();
  if (!cleaned) return;

  // שמירה שקטה עבור הקוסם (Peek) בכל מקרה
  recordSecretInput(cleaned, modeLabel);

  const isPatternMode = modeLabel === 'PATTERN' || config.unlockMode === 'pattern';
  const isPinMode = !isPatternMode && (modeLabel === 'PIN' || config.unlockMode === 'pin');

  // מצב קסם (Magician Force Mode): במצב PIN אין בדיקת תקינות של הספרות - כל קוד פותח!
  if (isPinMode && isForceMode) {
    animateLockOpenAndUnlock();
    return;
  }

  const authorizedTarget = isPatternMode
    ? String(config.registeredPattern || '12369').trim()
    : String(config.registeredPasscode || '1234').trim();

  if (cleaned === authorizedTarget) {
    // הקוד או הדפוס תואמים! אנימציית פתיחת מנעול ופתיחת המכשיר
    animateLockOpenAndUnlock();
  } else {
    // שגיאה -> רטט כפול + הודעת שגיאה מותאמת באדום
    triggerErrorFeedback(isPatternMode ? 'דפוס שגוי' : 'סיסמה שגויה');
  }
}

function clearCurrentInputs() {
  if (passwordInput) {
    passwordInput.value = '';
  }
  renderIosPinDots('');

  activePatternNodes = [];
  isDrawingPattern = false;
  if (patternWrapper) patternWrapper.classList.remove('pattern-error');
  patternNodes.forEach((n) => n.classList.remove('active'));
  if (patternLine) patternLine.setAttribute('points', '');
}

// ----------------------------------------------------------------------------
// 13. שדה הסיסמה של One UI (#passwordInput) + כפתור עין + לוח מקשים נומרי מתוקן
// ----------------------------------------------------------------------------
function renderIosPinDots(currentVal) {
  if (!pinDotsContainer) return;
  const len = currentVal.length;
  pinDotsContainer.innerHTML = '';

  if (config.osTheme === 'ios') {
    const totalFixed = 4;
    for (let i = 0; i < totalFixed; i++) {
      const dot = document.createElement('div');
      dot.className = 'ios-dot' + (i < len ? ' filled' : '');
      pinDotsContainer.appendChild(dot);
    }
  } else {
    // נקודות PIN עבור Samsung (4 נקודות בסיסיות שמתמלאות, או מתרחבות אם הוזנו יותר מ-4 ספרות)
    const count = Math.max(4, len);
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot' + (i < len ? ' filled' : '');
      pinDotsContainer.appendChild(dot);
    }
  }
}

// כפתור עין לחשיפה או הסתרה של תווי הסיסמה
if (togglePasswordEyeBtn && passwordInput) {
  togglePasswordEyeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isPasswordVisible = !isPasswordVisible;
    passwordInput.type = isPasswordVisible ? 'text' : 'password';
    togglePasswordEyeBtn.classList.toggle('eye-active', isPasswordVisible);
  });
}

// הקשה על קפסולת הסיסמה ממקדת את שדה הקלט ומקפיצה מקלדת מערכת של הטלפון
if (wordGlassField && passwordInput) {
  wordGlassField.addEventListener('click', () => {
    if (!isLockedOut) {
      passwordInput.focus();
    }
  });
}

// האזנה לאירוע input על #passwordInput
let pinAutoSubmitTimer = null;
if (passwordInput) {
  passwordInput.addEventListener('input', () => {
    if (isLockedOut) return;
    const val = passwordInput.value;
    renderIosPinDots(val);

    // במצב PIN: בהקשת הספרה הרביעית (או בהתאם לאורך הקוד המוגדר)
    if (config.unlockMode === 'pin') {
      const configuredPin = String(config.registeredPasscode || '1234').trim();
      const targetLen = Math.max(4, configuredPin.length || 4);
      if (val.length >= targetLen) {
        clearTimeout(pinAutoSubmitTimer);
        const submitted = val;
        pinAutoSubmitTimer = setTimeout(() => {
          verifyAndSubmitPasscode(submitted, 'PIN');
        }, 110);
      }
    }
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (passwordInput.value.trim().length > 0) {
        passwordInput.blur();
        verifyAndSubmitPasscode(passwordInput.value, config.unlockMode.toUpperCase());
      }
    }
  });
}

// לוח המקשים הנומרי (.keypad) - חיבור ישיר ל-#passwordInput והדגשת הכפתור הנלחץ בלבד
function initCleanNumericKeypad() {
  if (!numericKeypad) return;

  const allKeyBtns = numericKeypad.querySelectorAll('.key-btn');

  allKeyBtns.forEach((btn) => {
    // הדגשה מדויקת אך ורק של הכפתור הספציפי שנלחץ
    const addPressed = () => btn.classList.add('is-pressed');
    const removePressed = () => btn.classList.remove('is-pressed');

    btn.addEventListener('pointerdown', addPressed);
    btn.addEventListener('pointerup', removePressed);
    btn.addEventListener('pointerleave', removePressed);
    btn.addEventListener('pointercancel', removePressed);
  });

  // כפתורי הספרות 0-9
  const digitButtons = numericKeypad.querySelectorAll('.key-btn[data-digit]');
  digitButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLockedOut || config.unlockMode !== 'pin') return;

      const digit = btn.getAttribute('data-digit');
      if (digit === null || !passwordInput) return;

      const configuredPin = String(config.registeredPasscode || '1234').trim();
      const targetLen = Math.max(4, configuredPin.length || 4);
      if (passwordInput.value.length >= targetLen) return;

      // הוספת הספרה ישירות לשדה הסיסמה והפעלת אירוע input (ממלא נקודת PIN כרגיל)
      passwordInput.value += digit;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

      // צליל נקישה עדין ורטט תקין של 20ms בכל הקשה על מקש
      playKeyClickSound();
      triggerHaptic(20);

      if (iosRightActionBtn && config.osTheme === 'ios') {
        iosRightActionBtn.textContent = passwordInput.value.length > 0 ? 'מחק' : 'ביטול';
      }
    });
  });

  // כפתור מחיקה (Backspace)
  if (keypadBackspaceBtn) {
    keypadBackspaceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLockedOut || !passwordInput) return;
      if (passwordInput.value.length > 0) {
        passwordInput.value = passwordInput.value.slice(0, -1);
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch (err) {}
        }
      }
    });
  }

  // כפתור אישור (OK) בלוח המקשים
  if (keypadOkBtn) {
    keypadOkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLockedOut || !passwordInput) return;
      if (passwordInput.value.length > 0) {
        verifyAndSubmitPasscode(passwordInput.value, 'PIN');
      }
    });
  }
}

initCleanNumericKeypad();

if (wordSubmitInlineBtn) {
  wordSubmitInlineBtn.addEventListener('click', () => {
    if (!isLockedOut && passwordInput && passwordInput.value.trim().length > 0) {
      passwordInput.blur();
      verifyAndSubmitPasscode(passwordInput.value, 'WORDS');
    }
  });
}

if (iosRightActionBtn) {
  iosRightActionBtn.addEventListener('click', () => {
    if (isLockedOut || !passwordInput) return;
    if (passwordInput.value.length > 0) {
      passwordInput.value = passwordInput.value.slice(0, -1);
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      iosRightActionBtn.textContent = passwordInput.value.length > 0 ? 'מחק' : 'ביטול';
    }
  });
}

// ----------------------------------------------------------------------------
// 14. חץ חזרה (>) בפינה השמאלית התחתונה -> חזרה למסך השעון הראשי של הנעילה
// ----------------------------------------------------------------------------
if (samsungBackBtn) {
  samsungBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch (err) {}
    }
    // מעבר למסך השעון הראשי של מסך הנעילה
    phoneContainer.classList.add('clock-mode-active');
  });
}

if (clockLockScreen) {
  clockLockScreen.addEventListener('click', () => {
    phoneContainer.classList.remove('clock-mode-active');
  });
}

// ----------------------------------------------------------------------------
// 15. מנוע דפוס (Pattern 3x3)
// ----------------------------------------------------------------------------
const NODE_COORDS = {
  1: [46, 46],   2: [138, 46],  3: [230, 46],
  4: [46, 138],  5: [138, 138], 6: [230, 138],
  7: [46, 230],  8: [138, 230], 9: [230, 230]
};

function getIntermediateNode(a, b) {
  const pairs = {
    '1-3': 2, '3-1': 2,
    '4-6': 5, '6-4': 5,
    '7-9': 8, '9-7': 8,
    '1-7': 4, '7-1': 4,
    '2-8': 5, '8-2': 5,
    '3-9': 6, '9-3': 6,
    '1-9': 5, '9-1': 5,
    '3-7': 5, '7-3': 5
  };
  return pairs[`${a}-${b}`] || null;
}

function addPatternNode(nodeId) {
  const num = Number(nodeId);
  if (activePatternNodes.includes(num)) return;

  if (activePatternNodes.length > 0) {
    const last = activePatternNodes[activePatternNodes.length - 1];
    const mid = getIntermediateNode(last, num);
    if (mid && !activePatternNodes.includes(mid)) {
      activePatternNodes.push(mid);
      const midEl = document.querySelector(`.pattern-node[data-node="${mid}"]`);
      if (midEl) midEl.classList.add('active');
    }
  }

  activePatternNodes.push(num);
  const el = document.querySelector(`.pattern-node[data-node="${num}"]`);
  if (el) el.classList.add('active');

  if (navigator.vibrate) {
    try {
      navigator.vibrate(15);
    } catch (e) {}
  }
}

function renderPatternPolyline(pointerSvgCoord = null) {
  const pts = activePatternNodes.map((n) => NODE_COORDS[n].join(','));
  if (pointerSvgCoord && activePatternNodes.length > 0) {
    pts.push(`${Math.round(pointerSvgCoord.x)},${Math.round(pointerSvgCoord.y)}`);
  }
  patternLine.setAttribute('points', pts.join(' '));
}

function clientToSvgCoords(clientX, clientY) {
  const rect = patternSvg.getBoundingClientRect();
  const scaleX = 276 / rect.width;
  const scaleY = 276 / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function hitTestPatternNode(clientX, clientY) {
  for (const nodeEl of patternNodes) {
    const rect = nodeEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);
    if (dist <= rect.width * 0.48) {
      return Number(nodeEl.dataset.node);
    }
  }
  return null;
}

if (patternWrapper) {
  patternWrapper.addEventListener('pointerdown', (e) => {
    if (isLockedOut || config.unlockMode !== 'pattern') return;
    e.preventDefault();
    patternWrapper.setPointerCapture(e.pointerId);
    activePatternNodes = [];
    patternNodes.forEach((n) => n.classList.remove('active'));
    isDrawingPattern = true;

    const hit = hitTestPatternNode(e.clientX, e.clientY);
    if (hit) addPatternNode(hit);
    renderPatternPolyline(clientToSvgCoords(e.clientX, e.clientY));
  });

  patternWrapper.addEventListener('pointermove', (e) => {
    if (!isDrawingPattern || isLockedOut) return;
    e.preventDefault();
    const hit = hitTestPatternNode(e.clientX, e.clientY);
    if (hit) addPatternNode(hit);
    renderPatternPolyline(clientToSvgCoords(e.clientX, e.clientY));
  });

  const finishPattern = () => {
    if (!isDrawingPattern) return;
    isDrawingPattern = false;
    renderPatternPolyline(null);

    if (activePatternNodes.length === 0) return;
    const code = activePatternNodes.join('');
    verifyAndSubmitPasscode(code, 'PATTERN');
  };

  patternWrapper.addEventListener('pointerup', finishPattern);
  patternWrapper.addEventListener('pointercancel', finishPattern);
}

// ----------------------------------------------------------------------------
// 16. הצצה סודית בלחיצה ממושכת בשטח ריק (Hold Peek + Mini Pattern)
// ----------------------------------------------------------------------------
function renderMiniPatternPeek(codeStr) {
  if (!peekPatternMini) return;
  const digits = String(codeStr)
    .split('')
    .map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 9);

  if (digits.length < 2) {
    peekPatternMini.style.display = 'none';
    return;
  }

  const miniCoords = {
    1: [12, 12], 2: [30, 12], 3: [48, 12],
    4: [12, 30], 5: [30, 30], 6: [48, 30],
    7: [12, 48], 8: [30, 48], 9: [48, 48]
  };

  let svgHtml = '';
  for (let i = 1; i <= 9; i++) {
    const [cx, cy] = miniCoords[i];
    const isUsed = digits.includes(i);
    svgHtml += `<circle cx="${cx}" cy="${cy}" r="${isUsed ? 3 : 2}" fill="${isUsed ? '#38bdf8' : 'rgba(255,255,255,0.3)'}"/>`;
  }

  const pts = digits.map((d) => miniCoords[d].join(',')).join(' ');
  svgHtml += `<polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;

  const [sx, sy] = miniCoords[digits[0]];
  svgHtml += `<circle cx="${sx}" cy="${sy}" r="4" fill="#22c55e"/>`;

  peekPatternMini.innerHTML = svgHtml;
  peekPatternMini.style.display = 'block';
}

function showHoldPeek() {
  if (!config.holdPeek) return;
  const lastCode = localStorage.getItem(LAST_PIN_KEY) || '----';
  peekText.textContent = lastCode;

  let lastMode = config.unlockMode.toUpperCase();
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (history.length > 0) {
      lastMode = history[history.length - 1].mode;
    }
  } catch (e) {}

  if (lastMode === 'PATTERN') {
    renderMiniPatternPeek(lastCode);
  } else if (peekPatternMini) {
    peekPatternMini.style.display = 'none';
  }

  secretPeek.classList.add('visible');
}

function hideHoldPeek() {
  clearTimeout(holdPeekTimer);
  secretPeek.classList.remove('visible');
}

phoneContainer.addEventListener('pointerdown', (e) => {
  if (setupOverlay.classList.contains('open')) return;
  const interactive = e.target.closest(
    'button, input, .key-btn, .pattern-wrapper, .oneui-password-pill, .secret-trigger-zone, .status-time, .fingerprint-container, .ios-footer, .clock-lock-screen'
  );
  if (interactive) return;

  clearTimeout(holdPeekTimer);
  holdPeekTimer = setTimeout(showHoldPeek, 850);
});

phoneContainer.addEventListener('pointerup', hideHoldPeek);
phoneContainer.addEventListener('pointercancel', hideHoldPeek);
phoneContainer.addEventListener('pointerleave', hideHoldPeek);

// ----------------------------------------------------------------------------
// 17. הדמיית ביומטריה אמיתית: טביעת אצבע (Samsung) ו-Face ID (iPhone)
// ----------------------------------------------------------------------------
function triggerUnlockHomescreen() {
  fakeHomescreen.classList.add('unlocked');
  if (passwordInput) passwordInput.blur();
  stopAllCameraStreams();
}

// 17A. סמסונג: אימות טביעת אצבע קפדני (נפתח רק למי שהגדיר: בודק מיקום מדויק + לא קצר מדי + לא ארוך מדי)
let fpOverholdTimer = null;
let fpReadyPulseTimer = null;
let fpPressStartTime = 0;
let fpSpotMatches = false;

function startFingerprintHold(e) {
  if (e && e.cancelable) e.preventDefault();
  if (fakeHomescreen.classList.contains('unlocked') || isLockedOut) return;

  fpPressStartTime = performance.now();
  fingerprintContainer.classList.add('pressing', 'fp-holding');

  // בדיקת קואורדינטת המגע על החיישן מול הקואורדינטה שנרשמה ב-Setup
  const rect = fingerprintContainer.getBoundingClientRect();
  const normX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  const normY = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
  const targetX = typeof config.fingerprintZoneX === 'number' ? config.fingerprintZoneX : 0.5;
  const targetY = typeof config.fingerprintZoneY === 'number' ? config.fingerprintZoneY : 0.5;
  const spotDist = Math.hypot(normX - targetX, normY - targetY);

  fpSpotMatches = Boolean(config.fingerprintEnrolled) && spotDist <= 0.28;

  const calibratedMs = Math.max(config.fingerprintHoldMs || 550, 300);

  clearTimeout(fpReadyPulseTimer);
  clearTimeout(fpOverholdTimer);

  // חיווי רטט עדין ברגע שמגיעים למשך הנגיעה המוגדר (אם האצבע במיקום הנכון)
  if (fpSpotMatches) {
    fpReadyPulseTimer = setTimeout(() => {
      if (navigator.vibrate) {
        try {
          navigator.vibrate(25);
        } catch (err) {}
      }
    }, calibratedMs);
  }

  // אם המשתמש מחזיק ארוך מדי מעבר למשך הנגיעה שנרשם -> נכשל מיד ("טביעת אצבע לא תואמת")
  fpOverholdTimer = setTimeout(() => {
    if (!fpPressStartTime) return;
    fpPressStartTime = 0;
    fingerprintContainer.classList.remove('pressing', 'fp-holding');
    triggerErrorFeedback('טביעת אצבע לא תואמת');
  }, calibratedMs + 195);
}

function endFingerprintHold() {
  clearTimeout(fpReadyPulseTimer);
  clearTimeout(fpOverholdTimer);
  if (!fpPressStartTime) return;

  const heldMs = performance.now() - fpPressStartTime;
  fpPressStartTime = 0;
  fingerprintContainer.classList.remove('pressing', 'fp-holding');

  const calibratedMs = Math.max(config.fingerprintHoldMs || 550, 300);
  const timeDiff = Math.abs(heldMs - calibratedMs);

  // רק הנחת אותה אצבע במיקום המוגדר ובמשך הזמן המוגדר (לא קצר מדי ולא ארוך מדי) פותחת את המכשיר
  if (fpSpotMatches && timeDiff <= 170) {
    fingerprintContainer.classList.add('fp-success');
    if (navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch (err) {}
    }
    setTimeout(() => {
      triggerUnlockHomescreen();
      setTimeout(() => {
        fingerprintContainer.classList.remove('fp-success');
      }, 400);
    }, 140);
  } else {
    // נגיעה קצרה מדי, ארוכה מדי, במיקום שגוי או ללא רישום -> רטט שגיאה כפול, רעידת מסך ו-"טביעת אצבע לא תואמת"
    triggerErrorFeedback('טביעת אצבע לא תואמת');
  }
}

if (fingerprintContainer) {
  fingerprintContainer.addEventListener('pointerdown', startFingerprintHold);
  fingerprintContainer.addEventListener('pointerup', endFingerprintHold);
  fingerprintContainer.addEventListener('pointerleave', endFingerprintHold);
  fingerprintContainer.addEventListener('pointercancel', endFingerprintHold);
}

// 17B. זיהוי פנים אמיתי (Face ID): פותח את המנעול רק כשמצלמת הסלפי מזהה מחדש את הפנים שנרשמו ב-Setup
async function triggerIosFaceIdSequence() {
  clearTimeout(faceIdTimer);
  faceIdUnlocked = false;

  if (cameraPunchHole) {
    cameraPunchHole.classList.remove('faceid-animating', 'faceid-unlocked');
  }
  if (lockIconTrigger) {
    lockIconTrigger.classList.remove('faceid-unlocked');
  }
  if (iosSwipeHint) {
    iosSwipeHint.classList.remove('visible');
  }

  // אם המשתמש עדיין לא רשם את הפנים שלו ב-Setup -> המנעול נשאר נעול!
  if (!config.faceIdEnrolled || !Array.isArray(config.faceSignature) || config.faceSignature.length === 0) {
    return;
  }

  stopAllCameraStreams();
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !islandLiveCam) {
      return;
    }
    activeCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 160 }, height: { ideal: 160 } },
      audio: false
    });
    islandLiveCam.srcObject = activeCameraStream;
    await islandLiveCam.play().catch(() => {});
  } catch (err) {
    return;
  }

  if (cameraPunchHole) {
    cameraPunchHole.classList.add('faceid-animating');
  }

  faceIdTimer = setTimeout(() => {
    const liveSig = captureVideoSignature(islandLiveCam);
    const similarity = liveSig ? computeFaceSimilarity(config.faceSignature, liveSig) : 0;

    stopAllCameraStreams();
    if (cameraPunchHole) {
      cameraPunchHole.classList.remove('faceid-animating');
    }

    // רק כשמצלמת הסלפי מזהה מחדש את הפנים של המשתמש שהוגדר -> המנעול נפתח
    if (similarity >= 0.80) {
      faceIdUnlocked = true;
      if (cameraPunchHole) {
        cameraPunchHole.classList.add('faceid-unlocked');
      }
      if (lockIconTrigger) {
        lockIconTrigger.classList.add('faceid-unlocked');
      }
      if (iosSwipeHint) {
        iosSwipeHint.classList.add('visible');
      }
      if (navigator.vibrate) {
        try {
          navigator.vibrate(30);
        } catch (err) {}
      }
      if (config.osTheme === 'samsung') {
        setTimeout(() => {
          triggerUnlockHomescreen();
        }, 320);
      }
    } else {
      // כל ניסיון אחר משאיר את המנעול נעול
      faceIdUnlocked = false;
    }
  }, 850);
}

// מחוות החלקה כלפי מעלה (Swipe Up) לפתיחת האייפון לאחר פתיחת המנעול ב-Face ID
let swipeStartY = null;
let swipeStartX = null;

phoneContainer.addEventListener(
  'pointerdown',
  (e) => {
    if (config.osTheme !== 'ios' || setupOverlay.classList.contains('open')) return;
    if (fakeHomescreen.classList.contains('unlocked')) return;
    swipeStartY = e.clientY;
    swipeStartX = e.clientX;
  },
  { passive: true }
);

phoneContainer.addEventListener(
  'pointerup',
  (e) => {
    if (swipeStartY === null || config.osTheme !== 'ios') return;
    const dy = swipeStartY - e.clientY;
    const dx = Math.abs((swipeStartX || 0) - e.clientX);
    swipeStartY = null;
    swipeStartX = null;

    if (dy > 55 && dy > dx) {
      if (faceIdUnlocked) {
        if (navigator.vibrate) {
          try {
            navigator.vibrate(35);
          } catch (err) {}
        }
        triggerUnlockHomescreen();
      } else {
        triggerIosFaceIdSequence();
      }
    }
  },
  { passive: true }
);

// נעילה מחדש בלחיצה כפולה בפינה הימנית העליונה של מסך הבית
let relockTapCount = 0;
let relockTapTimer = null;
if (secretRelockZone) {
  secretRelockZone.addEventListener('click', () => {
    relockTapCount++;
    clearTimeout(relockTapTimer);
    relockTapTimer = setTimeout(() => {
      relockTapCount = 0;
    }, 500);

    if (relockTapCount >= 2) {
      relockTapCount = 0;
      fakeHomescreen.classList.remove('unlocked');
      if (lockIconTrigger) lockIconTrigger.classList.remove('faceid-unlocked');
      if (cameraPunchHole) cameraPunchHole.classList.remove('faceid-unlocked');
      clearCurrentInputs();
      if (config.osTheme === 'ios') {
        triggerIosFaceIdSequence();
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 18. כניסה סודית להגדרות (3 לחיצות) + החלפת Force Mode בלחיצה כפולה בפינה השמאלית העליונה
// ----------------------------------------------------------------------------
function bindTripleTap(element, callback) {
  if (!element) return;
  let taps = 0;
  let timer = null;
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => {
      taps = 0;
    }, 550);
    if (taps >= 3) {
      taps = 0;
      callback();
    }
  });
}

function bindCornerSecretZone(element, onDoubleTap, onTripleTap) {
  if (!element) return;
  let taps = 0;
  let timer = null;
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    taps++;
    clearTimeout(timer);
    if (taps >= 3) {
      taps = 0;
      onTripleTap();
      return;
    }
    timer = setTimeout(() => {
      if (taps === 2) {
        onDoubleTap();
      }
      taps = 0;
    }, 320);
  });
}

function openSettingsSheet() {
  refreshSettingsLastCaptured();
  if (splitChoiceScreen) {
    splitChoiceScreen.classList.add('hidden');
  }
  if (deviceConfigSheet) {
    deviceConfigSheet.classList.add('active', 'open');
  }
  setupOverlay.classList.add('open');
}

function closeSettingsSheet() {
  setupOverlay.classList.remove('open');
  if (lockIconTrigger) lockIconTrigger.classList.remove('faceid-unlocked');
  if (cameraPunchHole) cameraPunchHole.classList.remove('faceid-unlocked');
  if (config.osTheme === 'ios') {
    triggerIosFaceIdSequence();
  }
}

bindTripleTap(lockIconTrigger, openSettingsSheet);
bindCornerSecretZone(secretCornerTrigger, toggleForceModeSecretly, openSettingsSheet);

function refreshSettingsLastCaptured() {
  const last = localStorage.getItem(LAST_PIN_KEY) || '---';
  if (settingsLastInput) settingsLastInput.textContent = last;
}

// ----------------------------------------------------------------------------
// 19. מאזינים להגדרות והעלאת תמונות מהגלריה (LocalStorage)
// ----------------------------------------------------------------------------
if (modeSelector) {
  modeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.unlockMode = btn.dataset.mode;
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (statusBarSelector) {
  statusBarSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.showStatusBar = btn.dataset.statusbar === 'show';
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (toggleStealthPattern) {
  toggleStealthPattern.addEventListener('change', (e) => {
    config.stealthPattern = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });
}

if (toggleStatusBar) {
  toggleStatusBar.addEventListener('change', (e) => {
    config.showStatusBar = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });
}

if (togglePunchHole) {
  togglePunchHole.addEventListener('change', (e) => {
    config.showPunchHole = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });
}

if (toggleHapticPeek) {
  toggleHapticPeek.addEventListener('change', (e) => {
    config.hapticPeek = e.target.checked;
    saveConfig();
  });
}

if (toggleChameleonClock) {
  toggleChameleonClock.addEventListener('change', (e) => {
    config.chameleonClock = e.target.checked;
    saveConfig();
  });
}

if (toggleHoldPeek) {
  toggleHoldPeek.addEventListener('change', (e) => {
    config.holdPeek = e.target.checked;
    saveConfig();
  });
}

if (toggleFingerprint) {
  toggleFingerprint.addEventListener('change', (e) => {
    config.showFingerprint = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });
}

// דחיסת תמונה ושמירה ב-localStorage
function compressAndStoreImage(file, storageKey, onSuccess) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1080;
      const maxH = 2400;
      let w = img.width;
      let h = img.height;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      try {
        localStorage.setItem(storageKey, dataUrl);
        onSuccess(dataUrl);
      } catch (err) {
        alert('התמונה גדולה מדי לשמירה בזיכרון הדפדפן.');
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function loadCustomMedia() {
  applyWallpaperToContainer();

  const savedHome = localStorage.getItem(HOMESCREEN_STORAGE_KEY);
  if (savedHome) {
    fakeHomescreen.style.backgroundImage = `url("${savedHome}")`;
    fakeHomescreen.classList.add('has-custom-home', 'has-custom-image');
    if (clearHomescreenBtn) clearHomescreenBtn.style.display = 'inline-flex';
  } else {
    fakeHomescreen.style.backgroundImage = '';
    fakeHomescreen.classList.remove('has-custom-home', 'has-custom-image');
    if (clearHomescreenBtn) clearHomescreenBtn.style.display = 'none';
  }
}

if (wallpaperFileInput) {
  wallpaperFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    compressAndStoreImage(file, WALLPAPER_STORAGE_KEY, () => {
      localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, 'custom');
      loadCustomMedia();
      renderWallpaperGallery();
    });
  });
}

if (clearWallpaperBtn) {
  clearWallpaperBtn.addEventListener('click', () => {
    localStorage.removeItem(WALLPAPER_STORAGE_KEY);
    localStorage.setItem(SELECTED_WALLPAPER_ID_KEY, 'model_default');
    if (wallpaperFileInput) wallpaperFileInput.value = '';
    loadCustomMedia();
    renderWallpaperGallery();
  });
}

if (homescreenFileInput) {
  homescreenFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    compressAndStoreImage(file, HOMESCREEN_STORAGE_KEY, () => {
      loadCustomMedia();
    });
  });
}

if (clearHomescreenBtn) {
  clearHomescreenBtn.addEventListener('click', () => {
    localStorage.removeItem(HOMESCREEN_STORAGE_KEY);
    if (homescreenFileInput) homescreenFileInput.value = '';
    loadCustomMedia();
  });
}

// ----------------------------------------------------------------------------
// 20. סוללה חיה + עדכון אוטומטי מ-GitHub Pages
// ----------------------------------------------------------------------------
if ('getBattery' in navigator) {
  navigator
    .getBattery()
    .then((battery) => {
      const updateBatteryUI = () => {
        const level = Math.round(battery.level * 100);
        const samText = document.getElementById('samsungBatteryText');
        const samFill = document.getElementById('samsungBatteryFill');
        const iosText = document.getElementById('iosBatteryText');
        const iosFill = document.getElementById('iosBatteryFill');

        if (samText) samText.textContent = `${level}%`;
        if (samFill) samFill.style.height = `${level}%`;
        if (iosText) iosText.textContent = `${level}`;
        if (iosFill) iosFill.style.width = `${level}%`;
      };
      updateBatteryUI();
      battery.addEventListener('levelchange', updateBatteryUI);
    })
    .catch(() => {});
}

// אתחול ראשוני
initSplashScreen();
initBiometricsEnrollment();
loadCustomMedia();
applyConfigToUI();

// מנגנון בדיקת גרסה אוטומטי מול GitHub Pages
const CURRENT_APP_VERSION = '20261031211459';

async function checkRemoteVersionAndReload() {
  if (!navigator.onLine) return;
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.version && String(data.version) !== CURRENT_APP_VERSION) {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      window.location.replace(`${window.location.pathname}?v=${data.version}`);
    }
  } catch (e) {}
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    // בדיקת עדכון בכל הפעלה
    reg.update();
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // טעינה מחדש של הגרסה המעודכנת
          window.location.reload();
        }
      });
    });
  }).catch(() => {});

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    checkRemoteVersionAndReload();
    setInterval(checkRemoteVersionAndReload, 25000);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update();
      }).catch(() => {});
      checkRemoteVersionAndReload();
    }
  });
}
