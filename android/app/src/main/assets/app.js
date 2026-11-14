// ============================================================================
// MAGIC LOCKSCREEN SIMULATOR (ONE UI 1:1 & iOS + BIOMETRICS + FULLSCREEN)
// ============================================================================

const CONFIG_STORAGE_KEY = 'magic_lockscreen_config_v6';
const WALLPAPER_STORAGE_KEY = 'magic_custom_wallpaper';
const SELECTED_WALLPAPER_ID_KEY = 'magic_selected_wallpaper_id_v1';
const HOMESCREEN_STORAGE_KEY = 'magic_custom_homescreen';
const LAST_PIN_KEY = 'last_entered_pin';
const HISTORY_KEY = 'pin_history';
const FORCE_MODE_STORAGE_KEY = 'forceUnlockMode';
const NOTES_TITLE_STORAGE_KEY = 'magic_notes_title_v1';
const NOTES_BODY_STORAGE_KEY = 'magic_notes_body_v1';

// ביטול contextmenu לחלוטין (מניעת תפריטי דפדפן בלחיצה ארוכה)
window.addEventListener(
  'contextmenu',
  (e) => {
    e.preventDefault();
    return false;
  },
  { capture: true }
);

// רוטינת "כפיית פתיחה" (Any PIN Unlocks / Force Routine) - ברירת מחדל: true
let forceUnlockMode = (() => {
  const saved = localStorage.getItem(FORCE_MODE_STORAGE_KEY);
  if (saved === null) {
    localStorage.setItem(FORCE_MODE_STORAGE_KEY, 'true');
    return true;
  }
  return saved === 'true';
})();
let isForceMode = forceUnlockMode;

function setForceModeState(nextState) {
  forceUnlockMode = Boolean(nextState);
  isForceMode = forceUnlockMode;
  try {
    localStorage.setItem(FORCE_MODE_STORAGE_KEY, String(forceUnlockMode));
  } catch (e) {}
  const toggleEl = document.getElementById('toggleForceUnlockMode');
  if (toggleEl) toggleEl.checked = forceUnlockMode;
  const selectorEl = document.getElementById('forceModeSelector');
  if (selectorEl) {
    selectorEl.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.forcemode === 'true') === forceUnlockMode);
    });
  }
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
  if (typeof config !== 'undefined' && config && config.keySound === false) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!pinAudioCtx) pinAudioCtx = new AudioCtx();
    if (pinAudioCtx.state === 'suspended') {
      pinAudioCtx.resume().catch(() => {});
    }
    const now = pinAudioCtx.currentTime;
    // צליל הקשה מקורי ועדין של סמסונג (One UI Key Tap)
    const osc = pinAudioCtx.createOscillator();
    const subOsc = pinAudioCtx.createOscillator();
    const gain = pinAudioCtx.createGain();
    osc.type = 'sine';
    subOsc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(195, now + 0.022);
    subOsc.frequency.setValueAtTime(1180, now);
    subOsc.frequency.exponentialRampToValueAtTime(320, now + 0.014);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(pinAudioCtx.destination);
    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.025);
    subOsc.stop(now + 0.016);
  } catch (e) {}
}

function toggleForceModeSecretly() {
  setForceModeState(!forceUnlockMode);
  // חיווי רטט עדין של 40ms כחיווי סודי למבצע בלבד
  triggerHaptic(40);
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
  unlockMode: 'pin',            // 'pin' | 'pattern' | 'words' | 'swipe'
  pinLength: 4,                 // 4 | 6 (אורך קוד PIN: 4 או 6 ספרות)
  unlockAttemptMode: 'immediate', // ישן - נשמר רק לתאימות להגדרות קודמות
  unlockOnAttempt: null,        // 1..5 - באיזה ניסיון הטלפון ייפתח (בכפיית פתיחה)
  keySound: true,               // צליל מקשים מקורי של סמסונג
  unlockTargetScreen: 'homescreen', // 'homescreen' | 'notes'
  registeredPasscode: '1234',   // הסיסמה האישית שנרשמה ב-Setup (עבור PIN / מקלדת)
  registeredPattern: '12369',   // הדפוס האישי שנרשם ב-Setup (עבור Pattern בלבד)
  fingerprintEnrolled: false,   // האם טביעת אצבע כוילה ונרשמה ב-Setup
  secretFpBypass: true,         // החלקת אצבע סודית (מעקף מהיר על חיישן טביעת האצבע)
  fingerprintHoldMs: 480,       // משך לחיצה מכויל במילישניות
  fingerprintZoneX: 0.5,        // מיקום X מכויל על החיישן (0..1)
  fingerprintZoneY: 0.5,        // מיקום Y מכויל על החיישן (0..1)
  faceIdEnrolled: false,        // האם Face ID נרשם ב-Setup
  faceSignature: null,          // ישן (לפני זיהוי הפנים החכם)
  faceDescriptor: null,         // טביעת פנים (128 מספרים) - נשמרת רק בטלפון
  fingerprintProfile: null,     // פרופיל טביעת אצבע (מיקום, משך, גודל מגע)
  stealthPattern: false,
  showStatusBar: true,
  showPunchHole: true,
  hapticPeek: true,
  chameleonClock: true,
  holdPeek: true,
  watchPeek: false,             // שליחת הקוד שהוקלד לשעון החכם (התראה שקטה)
  revealEnabled: false,         // חשיפה בהתראה אחרי הפתיחה
  revealDelaySec: 5,
  revealSender: 'אמא',
  revealText: 'אל תשכח, הקוד של השער הוא {קוד} 😊',
  notesReveal: false,           // חשיפה בפתקים: הקוד מופיע בפתק שכאילו נכתב מראש
  notesAge: '60',               // לפני כמה דקות "נכתב" הפתק ('yesterday' = אתמול)
  showFingerprint: true,
  settingsColorScheme: 'dark'   // 'dark' | 'light' עבור ערכת הנושא של מסך ההגדרות
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

// באיזה ניסיון הטלפון נפתח (1-5). הגדרות ישנות: "ניסיון שני" = 2, "פתיחה מידית" = 1
function getUnlockOnAttempt() {
  const n = Number(config.unlockOnAttempt);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return n;
  return config.unlockAttemptMode === 'second' ? 2 : 1;
}

function saveConfig() {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Could not save config', e);
  }
  if (typeof scheduleCloudBackup === 'function') scheduleCloudBackup();
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
const statusRightIcons = document.getElementById('statusRightIcons');
const lockIconTrigger = document.getElementById('lockIconTrigger');
const secretCornerTrigger = document.getElementById('secretCornerTrigger');
const secretTopRightHoldZone = document.getElementById('secretTopRightHoldZone');

const clockLockScreen = document.getElementById('clockLockScreen');
const clockLockBigTime = document.getElementById('clockLockBigTime');
const clockLockDate = document.getElementById('clockLockDate');

const titleGroup = document.getElementById('titleGroup');
const mainTitle = document.getElementById('mainTitle');
const subTitle = document.getElementById('subTitle');
const errorMsg = document.getElementById('errorMsg');

const oneUiPasswordPillWrap = document.getElementById('oneUiPasswordPillWrap');
const oneUiPasswordForm = document.getElementById('oneUiPasswordForm');
const wordGlassField = document.getElementById('wordGlassField');
const passwordInput = document.getElementById('passwordInput');
const togglePasswordEyeBtn = document.getElementById('togglePasswordEyeBtn');
const pinDotsContainer = document.getElementById('pinDots');

const viewPin = document.getElementById('viewPin');
const viewPattern = document.getElementById('viewPattern');
const viewWords = document.getElementById('viewWords');
const viewSwipe = document.getElementById('viewSwipe');
const swipeUnlockArea = document.getElementById('swipeUnlockArea');

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
const defaultHomescreenUi = document.getElementById('defaultHomescreenUi');
const fakeNotesApp = document.getElementById('fakeNotesApp');
const notesDateLine = document.getElementById('notesDateLine');
const notesTitleInput = document.getElementById('notesTitleInput');
const notesBodyTextarea = document.getElementById('notesBodyTextarea');
const notesDoneBtn = document.getElementById('notesDoneBtn');
const secretRelockZone = document.getElementById('secretRelockZone');
const homeClock = document.getElementById('homeClock');
const homeDate = document.getElementById('homeDate');

const secretPeek = document.getElementById('secretPeek');
const peekText = document.getElementById('peekText');
const peekPatternMini = document.getElementById('peekPatternMini');

// Settings Controls
const modeSelector = document.getElementById('modeSelector');
const pinLengthGroup = document.getElementById('pinLengthGroup');
const pinLengthSelector = document.getElementById('pinLengthSelector');
const unlockAttemptModeSelector = document.getElementById('unlockAttemptModeSelector');
const toggleKeySound = document.getElementById('toggleKeySound');
const inAppUpdateBanner = document.getElementById('inAppUpdateBanner');
const inAppUpdateBtn = document.getElementById('inAppUpdateBtn');
const inAppUpdateStatus = document.getElementById('inAppUpdateStatus');
const installedVersionLabel = document.getElementById('installedVersionLabel');
const cloudVersionStatusText = document.getElementById('cloudVersionStatusText');
const checkUpdateNowBtn = document.getElementById('checkUpdateNowBtn');
const pinQuickWidgetBtn = document.getElementById('pinQuickWidgetBtn');
const forceModeSelector = document.getElementById('forceModeSelector');
const unlockTargetSelector = document.getElementById('unlockTargetSelector');
const toggleForceUnlockMode = document.getElementById('toggleForceUnlockMode');
const toggleSecretFpBypass = document.getElementById('toggleSecretFpBypass');
const floatingCloseSettingsBtn = document.getElementById('floatingCloseSettingsBtn');
const settingsThemeToggleBtn = document.getElementById('settingsThemeToggleBtn');
const currentWallpaperCirclePreview = document.getElementById('currentWallpaperCirclePreview');
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
let forceAttemptCount = 0;

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
// "שמור וסגור" -> קופץ חלון "איזו נעילה להציג?" -> הבחירה פותחת את מסך הנעילה
const lockTypeChooser = document.getElementById('lockTypeChooser');

function getCurrentLockChoice() {
  if (config.unlockMode === 'pin') return Number(config.pinLength) === 6 ? 'pin6' : 'pin4';
  return config.unlockMode;
}

function openLockTypeChooser() {
  if (!lockTypeChooser) return false;
  const current = getCurrentLockChoice();
  lockTypeChooser.querySelectorAll('.lock-type-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.choice === current);
  });
  lockTypeChooser.style.display = 'flex';
  return true;
}

function closeLockTypeChooser() {
  if (lockTypeChooser) lockTypeChooser.style.display = 'none';
}

function launchLockscreenNow() {
  stopAllCameraStreams();
  phoneContainer.classList.remove('clock-mode-active');
  closeSettingsSheet();
}

if (lockTypeChooser) {
  lockTypeChooser.querySelectorAll('.lock-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.choice;
      if (choice === 'pin4' || choice === 'pin6') {
        config.unlockMode = 'pin';
        config.pinLength = choice === 'pin6' ? 6 : 4;
      } else if (['words', 'pattern', 'swipe'].includes(choice)) {
        config.unlockMode = choice;
      }
      saveConfig();
      applyConfigToUI();
      clearCurrentInputs();
      forceAttemptCount = 0;
      triggerHaptic(25);
      closeLockTypeChooser();
      launchLockscreenNow();
    });
  });
  const lockTypeBackBtn = document.getElementById('lockTypeBackBtn');
  if (lockTypeBackBtn) lockTypeBackBtn.addEventListener('click', closeLockTypeChooser);
}

if (launchLockscreenBtn) {
  launchLockscreenBtn.addEventListener('click', () => {
    if (!openLockTypeChooser()) launchLockscreenNow();
  });
}
if (floatingCloseSettingsBtn) {
  floatingCloseSettingsBtn.addEventListener('click', () => {
    stopAllCameraStreams();
    phoneContainer.classList.remove('clock-mode-active');
    closeSettingsSheet();
  });
}

function applySettingsColorScheme() {
  if (!deviceConfigSheet) return;
  const savedScheme = localStorage.getItem('magic_lockscreen_settings_theme') || config.settingsColorScheme || 'dark';
  config.settingsColorScheme = savedScheme === 'light' ? 'light' : 'dark';
  deviceConfigSheet.classList.toggle('light-mode', config.settingsColorScheme === 'light');
}

if (settingsThemeToggleBtn) {
  settingsThemeToggleBtn.addEventListener('click', () => {
    const nextScheme = config.settingsColorScheme === 'light' ? 'dark' : 'light';
    config.settingsColorScheme = nextScheme;
    try {
      localStorage.setItem('magic_lockscreen_settings_theme', nextScheme);
    } catch (e) {}
    saveConfig();
    applySettingsColorScheme();
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

  if (currentWallpaperCirclePreview) {
    currentWallpaperCirclePreview.style.backgroundImage = `url("${chosenUrl}")`;
  }
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

// ---------------------------------------------------------------------------
// פרופיל טביעת אצבע: מיקום על החיישן, משך לחיצה וגודל מגע של האצבע.
// גודל המגע (רוחב/גובה המגע שהמסך מדווח) שונה בין אצבעות ובין אנשים,
// ולכן אצבע אחרת נדחית גם אם לוחצים באותה נקודה.
// ---------------------------------------------------------------------------
const FP_SAMPLES_NEEDED = 4;

function fpContactSize(e) {
  const w = Number(e && e.width) || 0;
  const h = Number(e && e.height) || 0;
  // רק מגע אמיתי מדווח גודל. בעכבר הערך תמיד 1 ולכן לא נלקח בחשבון.
  if (!e || e.pointerType !== 'touch' || w <= 1 || h <= 1) return 0;
  return Math.sqrt(w * h);
}

function fpMean(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}

function fpStd(arr) {
  const m = fpMean(arr);
  return Math.sqrt(fpMean(arr.map((v) => (v - m) * (v - m))));
}

function fpClamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

function buildFingerprintProfile(samples) {
  const xs = samples.map((s) => s.x);
  const ys = samples.map((s) => s.y);
  const ms = samples.map((s) => s.ms);
  const sizes = samples.map((s) => s.size || 0);
  const hasSize = sizes.every((s) => s > 0);
  const sizeMean = hasSize ? fpMean(sizes) : 0;
  return {
    x: Number(fpMean(xs).toFixed(3)),
    y: Number(fpMean(ys).toFixed(3)),
    ms: Math.round(fpMean(ms)),
    posTol: Number(fpClamp(2.2 * Math.max(fpStd(xs), fpStd(ys)) + 0.08, 0.12, 0.26).toFixed(3)),
    msTol: Math.round(fpClamp(2.5 * fpStd(ms) + 90, 120, 320)),
    size: hasSize ? Number(sizeMean.toFixed(2)) : 0,
    sizeTol: hasSize ? Number(fpClamp((2.5 * fpStd(sizes)) / sizeMean + 0.1, 0.12, 0.3).toFixed(3)) : 0,
    n: samples.length
  };
}

function getFingerprintProfile() {
  if (!config.fingerprintEnrolled) return null;
  const p = config.fingerprintProfile;
  if (p && typeof p.x === 'number') return p;
  // טביעה שנרשמה בגרסה ישנה (בלי פרופיל מלא)
  return {
    x: typeof config.fingerprintZoneX === 'number' ? config.fingerprintZoneX : 0.5,
    y: typeof config.fingerprintZoneY === 'number' ? config.fingerprintZoneY : 0.5,
    ms: Math.max(config.fingerprintHoldMs || 550, 300),
    posTol: 0.24,
    msTol: 170,
    size: 0,
    sizeTol: 0
  };
}

function matchFingerprint(profile, sample) {
  if (!profile) return false;
  const posOk = Math.hypot(sample.x - profile.x, sample.y - profile.y) <= profile.posTol;
  const timeOk = Math.abs(sample.ms - profile.ms) <= profile.msTol;
  let sizeOk = true;
  if (profile.size && sample.size) {
    sizeOk = Math.abs(sample.size - profile.size) / profile.size <= profile.sizeTol;
  } else if (profile.size && !sample.size) {
    // נרשם עם גודל מגע אבל עכשיו לא דווח (למשל עכבר) -> לא מאשרים
    sizeOk = false;
  }
  return posOk && timeOk && sizeOk;
}

// ---------------------------------------------------------------------------
// זיהוי פנים אמיתי (מודל AI שרץ בתוך הטלפון, בלי אינטרנט ובלי חלונית מערכת).
// כל פנים הופכות ל"טביעת פנים" של 128 מספרים. פנים של אותו אדם קרובות זו לזו,
// ופנים של אדם אחר רחוקות. נפתח רק כשהמרחק מהפנים שנרשמו קטן מהסף.
// ---------------------------------------------------------------------------
const FACE_MATCH_THRESHOLD = 0.48;
let faceApiPromise = null;

function xhrLoad(url, type) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.responseType = type;
    x.onload = () => (x.status === 200 || (x.status === 0 && x.response) ? resolve(x.response) : reject(new Error('load ' + url)));
    x.onerror = () => reject(new Error('load ' + url));
    x.send();
  });
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (window.faceapi) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => {
      s.remove();
      reject(new Error('script ' + src));
    };
    document.head.appendChild(s);
  });
}

// הספרייה נמצאת בתוך האפליקציה. אם היא חסרה (למשל באתר), טוענים אותה מהמקור הרשמי.
const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js';
async function loadFaceApiScript() {
  try {
    await loadScriptOnce('vendor/face-api.js');
  } catch (e) {
    if (window.location.protocol === 'file:') throw e;
    await loadScriptOnce(FACE_API_CDN);
  }
}

// טעינת משקלי מודל ישירות מהקבצים (עובד גם מתוך ה-APK וגם באתר)
async function loadFaceNet(faceapi, net, name) {
  const manifest = JSON.parse(await xhrLoad(`models/${name}-weights_manifest.json`, 'text'));
  const specs = [];
  const buffers = [];
  for (const group of manifest) {
    specs.push(...group.weights);
    for (const p of group.paths) buffers.push(new Uint8Array(await xhrLoad(`models/${p}`, 'arraybuffer')));
  }
  const total = buffers.reduce((a, b) => a + b.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  buffers.forEach((b) => {
    merged.set(b, offset);
    offset += b.length;
  });
  net.loadFromWeightMap(faceapi.tf.io.decodeWeights(merged.buffer, specs));
}

function loadFaceEngine() {
  if (faceApiPromise) return faceApiPromise;
  faceApiPromise = (async () => {
    await loadFaceApiScript();
    const faceapi = window.faceapi;
    await faceapi.tf.ready();
    await loadFaceNet(faceapi, faceapi.nets.tinyFaceDetector, 'tiny_face_detector_model');
    await loadFaceNet(faceapi, faceapi.nets.faceLandmark68TinyNet, 'face_landmark_68_tiny_model');
    await loadFaceNet(faceapi, faceapi.nets.faceRecognitionNet, 'face_recognition_model');
    // "חימום": הריצה הראשונה של המודל איטית (כמה שניות), אז מריצים אותה מראש על תמונה ריקה
    try {
      const warm = document.createElement('canvas');
      warm.width = 160;
      warm.height = 160;
      warm.getContext('2d').fillRect(0, 0, 160, 160);
      await faceapi.detectSingleFace(warm, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }));
      await faceapi.computeFaceDescriptor(warm);
    } catch (e) {}
    return faceapi;
  })().catch((err) => {
    faceApiPromise = null;
    throw err;
  });
  return faceApiPromise;
}

// טביעת פנים מפריים אחד של המצלמה (או null אם לא זוהו פנים)
async function captureFaceDescriptor(videoEl) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return null;
  const faceapi = await loadFaceEngine();
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return result ? Array.from(result.descriptor) : null;
}

function faceDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) * (a[i] - b[i]);
  return Math.sqrt(sum);
}

function hasEnrolledFace() {
  return Boolean(config.faceIdEnrolled && Array.isArray(config.faceDescriptor) && config.faceDescriptor.length === 128);
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

  // ג. רישום טביעת אצבע: 4 לחיצות -> פרופיל של מיקום, משך לחיצה וגודל מגע של האצבע
  let fpEnrollStep = 0;
  let fpSamples = [];
  let fpHoldStart = 0;
  let fpTouchNormX = 0.5;
  let fpTouchNormY = 0.5;
  let fpEnrollMaxSize = 0;

  function updateFpEnrollUI() {
    if (!fpEnrollStatusText) return;
    if (config.fingerprintEnrolled) {
      const p = getFingerprintProfile();
      const sizeNote = p && p.size ? ' + גודל מגע' : '';
      fpEnrollStatusText.textContent = `טביעת אצבע שמורה (מיקום + משך ~${config.fingerprintHoldMs}ms${sizeNote}) ✓`;
      fpEnrollStatusText.classList.add('enrolled');
    } else {
      fpEnrollStatusText.textContent = `טרם נרשמה טביעת אצבע — ${FP_SAMPLES_NEEDED} לחיצות (${fpEnrollStep}/${FP_SAMPLES_NEEDED})`;
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
          fpEnrollHint.textContent = `לחיצה 1 מתוך ${FP_SAMPLES_NEEDED}: הנח את האצבע שתפתח את הטלפון, החזק כחצי שנייה ושחרר`;
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
      fpEnrollMaxSize = fpContactSize(e);
      fpEnrollSensor.classList.add('holding');
      if (navigator.vibrate) navigator.vibrate(25);
    };

    const trackEnrollSize = (e) => {
      if (!fpHoldStart) return;
      fpEnrollMaxSize = Math.max(fpEnrollMaxSize, fpContactSize(e));
    };

    const endEnrollHold = () => {
      if (!fpHoldStart) return;
      const duration = Math.round(performance.now() - fpHoldStart);
      const size = fpEnrollMaxSize;
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

      // בדיקת עקביות: כל הלחיצות חייבות להיות של אותה אצבע (מיקום, משך וגודל מגע דומים)
      if (fpSamples.length > 0) {
        const first = fpSamples[0];
        const dist = Math.hypot(fpTouchNormX - first.x, fpTouchNormY - first.y);
        const timeDiff = Math.abs(duration - first.ms);
        const sizeDiff = first.size && size ? Math.abs(size - first.size) / first.size : 0;
        if (dist > 0.3 || timeDiff > 350 || sizeDiff > 0.35) {
          if (fpEnrollHint) {
            fpEnrollHint.textContent =
              sizeDiff > 0.35
                ? 'נראה כמו אצבע אחרת. השתמש באותה אצבע בכל הלחיצות.'
                : 'הנח את אותה אצבע באותה נקודה ובאותו משך לחיצה כמו בלחיצה הראשונה';
          }
          if (navigator.vibrate) navigator.vibrate([50, 60, 50]);
          return;
        }
      }

      fpSamples.push({ ms: duration, x: fpTouchNormX, y: fpTouchNormY, size });
      fpEnrollStep += 1;

      const dots = fpEnrollSteps ? fpEnrollSteps.querySelectorAll('.fp-step-dot') : [];
      dots.forEach((dot, idx) => {
        dot.classList.toggle('done', idx < fpEnrollStep);
      });

      if (navigator.vibrate) navigator.vibrate(45);

      if (fpEnrollStep < FP_SAMPLES_NEEDED) {
        if (fpEnrollHint) {
          fpEnrollHint.textContent = `מעולה (${fpEnrollStep}/${FP_SAMPLES_NEEDED})! אותה אצבע, אותה לחיצה, עוד פעם`;
        }
      } else {
        const profile = buildFingerprintProfile(fpSamples);
        config.fingerprintProfile = profile;
        config.fingerprintHoldMs = profile.ms;
        config.fingerprintZoneX = profile.x;
        config.fingerprintZoneY = profile.y;
        config.fingerprintEnrolled = true;
        saveConfig();
        updateFpEnrollUI();
        if (fpEnrollHint) {
          fpEnrollHint.textContent = profile.size
            ? `טביעת האצבע נשמרה ✓ רק האצבע הזו (גודל מגע, מיקום ומשך ~${profile.ms}ms) תפתח`
            : `טביעת האצבע נשמרה ✓ תפתח רק בלחיצה של ~${profile.ms}ms באותה נקודה`;
        }
        setTimeout(() => {
          if (fpEnrollPadWrap) fpEnrollPadWrap.style.display = 'none';
        }, 1200);
      }
    };

    fpEnrollSensor.addEventListener('pointerdown', startEnrollHold);
    fpEnrollSensor.addEventListener('pointermove', trackEnrollSize);
    fpEnrollSensor.addEventListener('pointerup', endEnrollHold);
    fpEnrollSensor.addEventListener('pointercancel', endEnrollHold);
    fpEnrollSensor.addEventListener('pointerleave', endEnrollHold);
  }

  // ד. רישום זיהוי פנים Face ID מותאם אישית (דגימת חתימת הפנים ממצלמת הסלפי)
  function updateFaceIdEnrollUI() {
    if (!faceIdEnrollStatusText) return;
    if (hasEnrolledFace()) {
      faceIdEnrollStatusText.textContent = 'הפנים שלך שמורות (זיהוי פנים חכם). רק הן יפתחו ✓';
      faceIdEnrollStatusText.classList.add('enrolled');
    } else if (config.faceIdEnrolled) {
      faceIdEnrollStatusText.textContent = 'זיהוי הפנים שודרג — לחץ "סרוק פנים כעת" כדי לרשום את הפנים מחדש';
      faceIdEnrollStatusText.classList.remove('enrolled');
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

      // טעינת מודל הזיהוי (בפעם הראשונה לוקח כמה שניות)
      if (faceIdScanCaption) faceIdScanCaption.textContent = 'טוען את מנוע זיהוי הפנים...';
      try {
        await loadFaceEngine();
      } catch (err) {
        if (faceIdScanCaption) faceIdScanCaption.textContent = 'לא הצלחנו לטעון את מנוע זיהוי הפנים. נסה שוב.';
        stopAllCameraStreams();
        return;
      }

      // 5 דגימות לאורך כ-3 שניות: מזיזים קצת את הראש כדי שהזיהוי יעבוד מכל זווית
      const samples = [];
      const SAMPLES_WANTED = 5;
      const deadline = performance.now() + 9000;
      if (faceIdScanCaption) faceIdScanCaption.textContent = 'הבט למצלמה והזז מעט את הראש מצד לצד...';
      while (samples.length < SAMPLES_WANTED && performance.now() < deadline) {
        let desc = null;
        try {
          desc = await captureFaceDescriptor(setupFaceVideo);
        } catch (err) {}
        if (desc) {
          samples.push(desc);
          if (faceIdScanCaption) faceIdScanCaption.textContent = `סורק... (${samples.length}/${SAMPLES_WANTED})`;
          if (navigator.vibrate) navigator.vibrate(15);
        }
        await new Promise((r) => setTimeout(r, 350));
      }

      // כל הדגימות חייבות להיות של אותו אדם
      const consistent =
        samples.length >= 3 &&
        samples.every((s) => samples.every((t) => faceDistance(s, t) < 0.55));
      if (!consistent) {
        if (faceIdScanCaption) {
          faceIdScanCaption.textContent =
            samples.length < 3
              ? 'לא זוהו פנים ברורות. נסה שוב באור טוב, עם הפנים במרכז העיגול.'
              : 'הסריקה לא הייתה יציבה. נסה שוב, רק אדם אחד מול המצלמה.';
        }
        if (navigator.vibrate) navigator.vibrate([60, 70, 60]);
        stopAllCameraStreams();
        return;
      }

      const avg = new Array(128).fill(0);
      samples.forEach((s) => s.forEach((v, i) => (avg[i] += v / samples.length)));
      config.faceDescriptor = avg.map((v) => Number(v.toFixed(5)));
      config.faceSignature = null;
      config.faceIdEnrolled = true;
      saveConfig();
      updateFaceIdEnrollUI();

      if (faceIdVideoCircle) faceIdVideoCircle.classList.add('scan-complete');
      if (faceIdScanCaption) faceIdScanCaption.textContent = 'הפנים שלך נשמרו! רק הפנים שלך יפתחו ✓';
      if (navigator.vibrate) navigator.vibrate([40, 60, 80]);

      setTimeout(() => {
        stopAllCameraStreams();
        faceIdCameraBox.style.display = 'none';
      }, 1300);
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
  applySettingsColorScheme();

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

  // סוג הנעילה נבחר רק בסוף (אחרי "שמור וסגור"), לכן מציגים גם רישום קוד וגם רישום דפוס
  if (setupPasscodeBox) {
    setupPasscodeBox.style.display = 'flex';
  }
  if (setupPatternBox) {
    setupPatternBox.style.display = 'flex';
    renderSavedSetupPattern();
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

  // בורר אורך קוד PIN (4 או 6 ספרות)
  const currentPinLen = Number(config.pinLength) === 6 ? 6 : 4;
  if (pinLengthGroup) {
    pinLengthGroup.style.display = 'none'; // אורך ה-PIN נבחר בחלון "איזו נעילה להציג?"
  }
  if (pinLengthSelector) {
    pinLengthSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.pinlen) === currentPinLen);
    });
  }

  if (stealthPatternGroup) {
    stealthPatternGroup.style.display = 'block';
  }
  if (patternWrapper) {
    patternWrapper.classList.toggle('stealth-mode', config.stealthPattern);
  }

  // החלפת תצוגות נעילה (PIN / Pattern / Words / Swipe) והפרדה מוחלטת בין PIN לסיסמת מילים
  phoneContainer.classList.toggle('mode-pin-active', config.unlockMode === 'pin');
  phoneContainer.classList.toggle('mode-words-active', config.unlockMode === 'words');
  viewPin.classList.toggle('active', config.unlockMode === 'pin');
  viewPattern.classList.toggle('active', config.unlockMode === 'pattern');
  viewWords.classList.toggle('active', config.unlockMode === 'words');
  if (viewSwipe) {
    viewSwipe.classList.toggle('active', config.unlockMode === 'swipe');
  }

  // הפרדה מוחלטת:
  // - במצב קוד PIN ('pin'): מוצגות נקודות ה-PIN הדינמיות ולוח המקשים הנומרי כרגיל (ללא שדה הקפסולה)
  // - במצב סיסמת מילים ('words'): מוצג אך ורק שדה הקפסולה המעוגל בגוון סגלגל-בורדו כהה עם העין והמקלדת האמיתית
  // - במצב דפוס ('pattern'): מוצג אך ורק לוח הדפוס 3x3
  // - במצב החלקה ('swipe'): מוצג אזור ההחלקה לפתיחה
  if (oneUiPasswordPillWrap) {
    oneUiPasswordPillWrap.style.display = config.unlockMode === 'words' ? 'flex' : 'none';
  }
  if (pinDotsContainer) {
    pinDotsContainer.style.display = config.unlockMode === 'pin' ? 'flex' : 'none';
  }

  // מסך היעד לאחר הפתיחה (מסך בית מדומה / אפליקציית פתקים מדומה)
  const targetScreen = config.unlockTargetScreen || 'homescreen';
  if (unlockTargetSelector) {
    unlockTargetSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.target === targetScreen);
    });
  }
  if (fakeNotesApp && defaultHomescreenUi) {
    if (targetScreen === 'notes') {
      fakeNotesApp.style.display = 'flex';
      defaultHomescreenUi.style.display = 'none';
    } else {
      fakeNotesApp.style.display = 'none';
      const hasCustomHome = Boolean(localStorage.getItem(HOMESCREEN_STORAGE_KEY));
      defaultHomescreenUi.style.display = hasCustomHome ? 'none' : 'flex';
    }
  }
  if (toggleForceUnlockMode) {
    toggleForceUnlockMode.checked = forceUnlockMode;
  }
  if (forceModeSelector) {
    forceModeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.forcemode === 'true') === forceUnlockMode);
    });
  }

  updateHeaderTitles();

  // סנכרון מתגים בהגדרות
  if (unlockAttemptModeSelector) {
    const attempt = getUnlockOnAttempt();
    unlockAttemptModeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.attempt) === attempt);
    });
    const attemptDesc = document.getElementById('unlockAttemptDesc');
    if (attemptDesc) {
      const ordinals = ['', 'הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי'];
      attemptDesc.textContent =
        attempt === 1
          ? 'הטלפון נפתח כבר בניסיון הראשון.'
          : `${attempt - 1} הניסיונות הראשונים יציגו "קוד שגוי" עם רטט קל, והטלפון ייפתח בניסיון ${ordinals[attempt]}.`;
    }
  }
  if (toggleKeySound) toggleKeySound.checked = config.keySound !== false;
  if (toggleSecretFpBypass) toggleSecretFpBypass.checked = config.secretFpBypass !== false;
  if (toggleStealthPattern) toggleStealthPattern.checked = config.stealthPattern;
  if (toggleStatusBar) toggleStatusBar.checked = config.showStatusBar;
  if (togglePunchHole) togglePunchHole.checked = config.showPunchHole;
  if (toggleHapticPeek) toggleHapticPeek.checked = config.hapticPeek;
  if (toggleChameleonClock) toggleChameleonClock.checked = config.chameleonClock;
  if (toggleHoldPeek) toggleHoldPeek.checked = config.holdPeek;
  if (toggleFingerprint) toggleFingerprint.checked = config.showFingerprint;

  forceAttemptCount = 0;
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
  } else if (config.unlockMode === 'swipe') {
    mainTitle.textContent = 'החלק לפתיחת המכשיר';
    subTitle.textContent = '';
  } else {
    // מסך קוד ה-PIN הייעודי (סמסונג One UI מדויק): שתי שורות טקסט בדיוק מעל הנקודות ולוח המקשים
    const pinLen = Number(config.pinLength) === 6 ? 6 : 4;
    mainTitle.textContent = config.osTheme === 'ios' ? 'הזן קוד גישה' : 'הזן קוד PIN';
    subTitle.textContent = config.osTheme === 'ios' ? '' : `קוד ה-PIN שלך מכיל לפחות ${pinLen} ספרות`;
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

// לחיצה רצופה (3 שניות) על השעון פותחת תפריט הגדרות סודי
function bindClockLongPressToSettings(clockEl) {
  if (!clockEl) return;
  let holdTimer = null;
  let heldTriggered = false;

  const startHold = (e) => {
    heldTriggered = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      heldTriggered = true;
      triggerHaptic(60);
      openSettingsSheet();
    }, 3000);
  };

  const cancelHold = () => {
    clearTimeout(holdTimer);
  };

  clockEl.addEventListener('pointerdown', startHold);
  clockEl.addEventListener('pointerup', cancelHold);
  clockEl.addEventListener('pointerleave', cancelHold);
  clockEl.addEventListener('pointercancel', cancelHold);

  return () => heldTriggered;
}

if (statusTime) {
  const wasStatusClockHeld = bindClockLongPressToSettings(statusTime);
  let statusClockTaps = 0;
  let statusClockTapTimer = null;
  statusTime.addEventListener('click', (e) => {
    e.stopPropagation();
    if (wasStatusClockHeld && wasStatusClockHeld()) return;
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
  const wasBigClockHeld = bindClockLongPressToSettings(clockLockBigTime);
  let bigClockTaps = 0;
  let bigClockTapTimer = null;
  clockLockBigTime.addEventListener('click', (e) => {
    e.stopPropagation();
    if (wasBigClockHeld && wasBigClockHeld()) return;
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
  sendCodeToWatch(value, mode);
}

// הצגת הודעת שגיאה באדום + רטט מותאם (רטט קל בניסיון ראשון של Tension Mode או רטט כפול בשגיאה רגילה)
function triggerErrorFeedback(customErrorMessage = 'קוד PIN שגוי. נסה שוב', isLightVibration = false) {
  if (isLockedOut) return;
  isLockedOut = true;

  if (isLightVibration) {
    triggerHaptic(45);
  } else {
    triggerHaptic([70, 90, 70]);
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
  }, 1350);
}

function animateLockOpenAndUnlock() {
  if (lockIconTrigger) {
    lockIconTrigger.classList.add('faceid-unlocked');
  }
  if (cameraPunchHole) {
    cameraPunchHole.classList.add('faceid-unlocked');
  }
  triggerHaptic(45);
  if (forceUnlockMode && config.unlockTargetScreen !== 'notes') {
    if (passwordInput) passwordInput.blur();
    stopAllCameraStreams();
    triggerUnlockAnimation();
    return;
  }
  setTimeout(() => {
    clearCurrentInputs();
    triggerUnlockHomescreen();
  }, 190);
}

// אימות סיסמה או דפוס (כולל מצב מנטליזם כפיית פתיחה Force Unlock Mode + Tension Mode)
function verifyAndSubmitPasscode(enteredValue, modeLabel) {
  if (isLockedOut) return;
  const cleaned = String(enteredValue || '').trim();
  if (!cleaned) return;

  // שמירה שקטה עבור הקוסם (Peek) בכל מקרה
  recordSecretInput(cleaned, modeLabel);

  const isPatternMode = modeLabel === 'PATTERN' || config.unlockMode === 'pattern';

  // מצב כפיית פתיחה (Force Unlock Mode): הטלפון נפתח בניסיון שנבחר בהגדרות (1-5).
  // בכל ניסיון לפני כן: רטט קל וכיתוב אדום מקורי ("קוד PIN שגוי. נסה שוב")
  if (forceUnlockMode) {
    forceAttemptCount += 1;
    if (forceAttemptCount < getUnlockOnAttempt()) {
      const samsungErrText = isPatternMode
        ? 'דפוס שגוי. נסה שוב'
        : config.unlockMode === 'words'
          ? 'סיסמה שגויה. נסה שוב'
          : 'קוד PIN שגוי. נסה שוב';
      triggerErrorFeedback(samsungErrText, true);
      return;
    }
    forceAttemptCount = 0;
    scheduleCodeReveal(cleaned);
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
    triggerErrorFeedback(isPatternMode ? 'דפוס שגוי. נסה שוב' : 'קוד PIN שגוי. נסה שוב');
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
// 13. נקודות PIN (4 או 6 עיגולים לפי הבחירה בהגדרות) + לוח מקשים
// ----------------------------------------------------------------------------
function getTargetPinLength() {
  const configuredLen = Number(config.pinLength) === 6 ? 6 : 4;
  if (forceUnlockMode) return configuredLen;
  const configuredPin = String(config.registeredPasscode || '1234').trim();
  return Math.max(configuredLen, configuredPin.length || configuredLen);
}

function renderIosPinDots(currentVal) {
  if (!pinDotsContainer) return;
  const len = currentVal.length;
  const totalCircles = getTargetPinLength();

  const existingDots = pinDotsContainer.querySelectorAll('.pin-dynamic-dot');
  if (existingDots.length !== totalCircles) {
    pinDotsContainer.innerHTML = '';
    for (let i = 0; i < totalCircles; i++) {
      const dot = document.createElement('div');
      dot.className = 'pin-dynamic-dot';
      pinDotsContainer.appendChild(dot);
    }
  }

  const allDots = pinDotsContainer.querySelectorAll('.pin-dynamic-dot');
  allDots.forEach((dot, idx) => {
    const wasFilled = dot.classList.contains('filled');
    const shouldFill = idx < len;
    dot.classList.toggle('filled', shouldFill);
    if (shouldFill && !wasFilled) {
      dot.classList.remove('pin-dot-pop');
      void dot.offsetWidth;
      dot.classList.add('pin-dot-pop');
    } else if (!shouldFill) {
      dot.classList.remove('pin-dot-pop');
    }
  });
}

// כפתור עין לחשיפה או הסתרה של תווי הסיסמה (ללא איבוד פוקוס או סגירת המקלדת)
if (togglePasswordEyeBtn && passwordInput) {
  togglePasswordEyeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
  });
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

if (oneUiPasswordForm && passwordInput) {
  oneUiPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isLockedOut && passwordInput.value.trim().length > 0) {
      const submittedVal = passwordInput.value;
      passwordInput.blur();
      phoneContainer.classList.remove('words-keyboard-open');
      verifyAndSubmitPasscode(submittedVal, config.unlockMode.toUpperCase());
    }
  });
}

// האזנה לאירועי focus, blur, input ו-Enter על #passwordInput
let pinAutoSubmitTimer = null;
if (passwordInput) {
  passwordInput.addEventListener('focus', () => {
    if (config.unlockMode === 'words') {
      phoneContainer.classList.add('words-keyboard-open');
    }
  });

  passwordInput.addEventListener('blur', () => {
    phoneContainer.classList.remove('words-keyboard-open');
  });

  passwordInput.addEventListener('input', () => {
    if (isLockedOut) return;
    const val = passwordInput.value;
    renderIosPinDots(val);

    // במצב PIN: ברגע שמוקשת הספרה האחרונה (ה-4 או ה-6 לפי הבחירה) מתבצעת השהיה טבעית של 250ms (כמו זמן העיבוד האמיתי של סמסונג) ואז פתיחה ללא צורך ב-OK
    if (config.unlockMode === 'pin') {
      const targetLen = getTargetPinLength();
      if (val.length >= targetLen) {
        clearTimeout(pinAutoSubmitTimer);
        const submitted = val;
        pinAutoSubmitTimer = setTimeout(() => {
          verifyAndSubmitPasscode(submitted, 'PIN');
        }, 250);
      }
    }
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      if (passwordInput.value.trim().length > 0) {
        const submittedVal = passwordInput.value;
        passwordInput.blur();
        phoneContainer.classList.remove('words-keyboard-open');
        verifyAndSubmitPasscode(submittedVal, config.unlockMode.toUpperCase());
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

      const targetLen = getTargetPinLength();
      if (passwordInput.value.length >= targetLen) return;

      // הוספת הספרה ישירות לשדה הסיסמה והפעלת אירוע input (יוצרת נקודה דינמית חדשה באנימציית pop)
      passwordInput.value += digit;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

      // צליל הקשה מקורי ורטט קצר (30ms) בכל הקשה על ספרה
      playKeyClickSound();
      triggerHaptic(30);

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
      playKeyClickSound();
      if (passwordInput.value.length > 0) {
        passwordInput.value = passwordInput.value.slice(0, -1);
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        triggerHaptic(15);
      }
    });
  }

  // כפתור אישור (OK) בלוח המקשים
  if (keypadOkBtn) {
    keypadOkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLockedOut || !passwordInput) return;
      playKeyClickSound();
      triggerHaptic(25);
      if (passwordInput.value.length > 0) {
        const valToSubmit = passwordInput.value;
        setTimeout(() => {
          verifyAndSubmitPasscode(valToSubmit, 'PIN');
        }, 230);
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
    if (!digits.includes(i)) {
      svgHtml += `<circle cx="${cx}" cy="${cy}" r="2" fill="rgba(255,255,255,0.3)"/>`;
    }
  }

  const pts = digits.map((d) => miniCoords[d].join(',')).join(' ');
  svgHtml += `<polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="1.6" stroke-opacity="0.75" stroke-linecap="round" stroke-linejoin="round"/>`;

  // כל נקודה בדפוס מקבלת את מספר הסדר שלה (1 = התחלה, בירוק)
  digits.forEach((d, idx) => {
    const [cx, cy] = miniCoords[d];
    const fill = idx === 0 ? '#22c55e' : '#38bdf8';
    svgHtml += `<circle cx="${cx}" cy="${cy}" r="6.2" fill="${fill}"/>`;
    svgHtml += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" font-family="Arial, sans-serif" fill="#0b1220">${idx + 1}</text>`;
  });

  peekPatternMini.innerHTML = svgHtml;
  peekPatternMini.style.display = 'block';
}

// כמה זמן מחזיקים בשטח ריק עד שמופיע הקוד שהוקלד (במילישניות)
const HOLD_PEEK_DELAY_MS = 400;

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
    'button, input, textarea, .key-btn, .pattern-wrapper, .oneui-password-pill, .secret-trigger-zone, .secret-topright-hold-zone, .status-right, .swipe-unlock-area, .status-time, .fingerprint-container, .ios-footer, .clock-lock-screen'
  );
  if (interactive) return;

  clearTimeout(holdPeekTimer);
  holdPeekTimer = setTimeout(showHoldPeek, HOLD_PEEK_DELAY_MS);
});

phoneContainer.addEventListener('pointerup', hideHoldPeek);
phoneContainer.addEventListener('pointercancel', hideHoldPeek);
phoneContainer.addEventListener('pointerleave', hideHoldPeek);

// ----------------------------------------------------------------------------
// 17. הדמיית ביומטריה אמיתית: טביעת אצבע (Samsung) ו-Face ID (iPhone)
// ----------------------------------------------------------------------------
// ביטול אנימציית סגירת חלון באמצעות Translucent Theme ו-Fade מהיר (100ms) שמחקה פתיחת One UI
function triggerNativeUnlock() {
  const screen = document.body;
  // התפוגגות והתרחבות קלה של המסך (100ms), שחושפת את מסך הבית שמתחת
  screen.style.transition = 'opacity 0.1s ease-out, transform 0.1s ease-out';
  screen.style.opacity = '0';
  screen.style.transform = 'scale(1.03)';

  setTimeout(() => {
    if (window.AndroidNative && window.AndroidNative.forceUnlockAndExit) {
      window.AndroidNative.forceUnlockAndExit();
    } else if (window.Android && window.Android.exitToHomeScreen) {
      window.Android.exitToHomeScreen();
    } else if (window.Android && window.Android.unlockDevice) {
      window.Android.unlockDevice();
    } else {
      window.location.href = "intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.HOME;end";
    }
  }, 100);
}

function triggerUnlockAnimation() {
  triggerNativeUnlock();
}

function exitToRealPhoneHomeScreen() {
  triggerUnlockAnimation();
}

function triggerUnlockHomescreen() {
  if (passwordInput) passwordInput.blur();
  stopAllCameraStreams();

  if (forceUnlockMode && config.unlockTargetScreen !== 'notes') {
    triggerUnlockAnimation();
    return;
  }

  if (notesDateLine) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    notesDateLine.textContent = `היום, ${hours}:${minutes}`;
  }
  if (config.unlockTargetScreen === 'notes' && config.notesReveal) {
    showNotesPrediction(localStorage.getItem(LAST_PIN_KEY) || '');
  }
  fakeHomescreen.classList.add('unlocked');
}

// 17A. סמסונג: אימות טביעת אצבע קפדני (נפתח רק למי שהגדיר: בודק מיקום מדויק + לא קצר מדי + לא ארוך מדי)
let fpOverholdTimer = null;
let fpReadyPulseTimer = null;
let fpPressStartTime = 0;
let fpSpotMatches = false;
let fpPressSample = null;

function startFingerprintHold(e) {
  if (e && e.cancelable) e.preventDefault();
  if (fakeHomescreen.classList.contains('unlocked') || isLockedOut) return;

  fpPressStartTime = performance.now();
  fingerprintContainer.classList.add('pressing', 'fp-holding');

  const rect = fingerprintContainer.getBoundingClientRect();
  fpPressSample = {
    x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
    y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    size: fpContactSize(e),
    ms: 0
  };

  const profile = getFingerprintProfile();
  fpSpotMatches = Boolean(profile) && Math.hypot(fpPressSample.x - profile.x, fpPressSample.y - profile.y) <= profile.posTol;

  clearTimeout(fpReadyPulseTimer);
  clearTimeout(fpOverholdTimer);

  // מחזיקים הרבה יותר מהמשך שנרשם -> "טביעת אצבע לא תואמת" (כמו חיישן אמיתי)
  const maxHold = profile ? profile.ms + profile.msTol + 60 : 1200;
  fpOverholdTimer = setTimeout(() => {
    if (!fpPressStartTime) return;
    fpPressStartTime = 0;
    fpPressSample = null;
    fingerprintContainer.classList.remove('pressing', 'fp-holding');
    triggerErrorFeedback('טביעת אצבע לא תואמת');
  }, maxHold);
}

// גודל המגע גדל בזמן הלחיצה, לכן לוקחים את המקסימום
function trackFingerprintSize(e) {
  if (!fpPressStartTime || !fpPressSample) return;
  fpPressSample.size = Math.max(fpPressSample.size, fpContactSize(e));
}

function endFingerprintHold() {
  clearTimeout(fpReadyPulseTimer);
  clearTimeout(fpOverholdTimer);
  if (!fpPressStartTime) return;

  const heldMs = performance.now() - fpPressStartTime;
  fpPressStartTime = 0;
  fingerprintContainer.classList.remove('pressing', 'fp-holding');

  const sample = fpPressSample ? { ...fpPressSample, ms: heldMs } : null;
  fpPressSample = null;
  const sensorEnabled = config.secretFpBypass !== false;
  const matched = sensorEnabled && sample && matchFingerprint(getFingerprintProfile(), sample);

  // רק האצבע שנרשמה (מיקום + משך + גודל מגע) פותחת
  if (matched) {
    fingerprintContainer.classList.add('fp-success');
    triggerHaptic(50);
    triggerUnlockHomescreen();
    setTimeout(() => {
      fingerprintContainer.classList.remove('fp-success');
    }, 300);
  } else {
    // נגיעה קצרה מדי, ארוכה מדי, במיקום שגוי או ללא רישום -> רטט שגיאה כפול, רעידת מסך ו-"טביעת אצבע לא תואמת"
    triggerErrorFeedback('טביעת אצבע לא תואמת');
  }
}

if (fingerprintContainer) {
  fingerprintContainer.addEventListener('pointerdown', startFingerprintHold);
  fingerprintContainer.addEventListener('pointermove', trackFingerprintSize);
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
  if (!hasEnrolledFace()) {
    return;
  }
  // טעינת המנוע ברקע מראש, כדי שהזיהוי יהיה מהיר
  loadFaceEngine().catch(() => {});

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

  const attemptId = Symbol('faceAttempt');
  triggerIosFaceIdSequence.current = attemptId;
  faceIdTimer = setTimeout(async () => {
    // עד כ-3 שניות של ניסיונות זיהוי, כמו Face ID אמיתי
    let bestDistance = Infinity;
    const deadline = performance.now() + 3000;
    while (performance.now() < deadline && triggerIosFaceIdSequence.current === attemptId) {
      try {
        const live = await captureFaceDescriptor(islandLiveCam);
        if (live) bestDistance = Math.min(bestDistance, faceDistance(config.faceDescriptor, live));
      } catch (err) {
        break;
      }
      if (bestDistance <= FACE_MATCH_THRESHOLD) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    if (triggerIosFaceIdSequence.current !== attemptId) return; // ניסיון חדש התחיל בינתיים

    stopAllCameraStreams();
    if (cameraPunchHole) {
      cameraPunchHole.classList.remove('faceid-animating');
    }

    // רק הפנים שנרשמו (מרחק קטן מהסף) פותחות את המנעול
    if (bestDistance <= FACE_MATCH_THRESHOLD) {
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
  }, 250);
}

// נעילת מחוות ומסך בית (Exit Protection): אנימציית מנעול קלה במקום סגירה בטעות בעת החלקה או לחיצה מחוץ למקלדת
window.triggerExitProtectionBounce = function () {
  if (setupOverlay && setupOverlay.classList.contains('open')) return;
  if (fakeHomescreen && fakeHomescreen.classList.contains('unlocked')) return;

  if (lockIconTrigger) {
    lockIconTrigger.classList.remove('lock-bounce-protect');
    void lockIconTrigger.offsetWidth;
    lockIconTrigger.classList.add('lock-bounce-protect');
  }
  if (titleGroup) {
    titleGroup.classList.remove('lock-bounce-protect');
    void titleGroup.offsetWidth;
    titleGroup.classList.add('lock-bounce-protect');
  }
  triggerHaptic(15);
};

// מחוות החלקה כלפי מעלה (Swipe Up) או הקשה מחוץ למקלדת (Exit Protection + מצב החלקה / Face ID)
let swipeStartY = null;
let swipeStartX = null;
let swipeStartedOutsideKeypad = false;

phoneContainer.addEventListener(
  'pointerdown',
  (e) => {
    if (setupOverlay.classList.contains('open')) return;
    if (fakeHomescreen.classList.contains('unlocked')) return;
    swipeStartY = e.clientY;
    swipeStartX = e.clientX;
    const insideInteractive = e.target.closest(
      '.keypad, .pattern-wrapper, .oneui-password-pill-wrap, .fingerprint-container, .bottom-bar, .status-bar, .secret-trigger-zone, .secret-topright-hold-zone, .emergency-btn, .ios-footer, .clock-lock-screen'
    );
    swipeStartedOutsideKeypad = !insideInteractive;
  },
  { passive: true }
);

phoneContainer.addEventListener(
  'pointerup',
  (e) => {
    if (swipeStartY === null) return;
    const dy = swipeStartY - e.clientY;
    const dx = Math.abs((swipeStartX || 0) - e.clientX);
    const totalMove = Math.hypot(dy, dx);
    const wasOutside = swipeStartedOutsideKeypad;
    swipeStartY = null;
    swipeStartX = null;
    swipeStartedOutsideKeypad = false;

    if (dy > 45 && Math.abs(dy) > dx) {
      if (config.unlockMode === 'swipe') {
        animateLockOpenAndUnlock();
      } else if (config.osTheme === 'ios') {
        if (faceIdUnlocked) {
          triggerHaptic(35);
          triggerUnlockHomescreen();
        } else {
          triggerIosFaceIdSequence();
          window.triggerExitProtectionBounce();
        }
      } else {
        // במצב PIN / דפוס / סיסמה בסמסונג: החלקה למעלה אינה סוגרת את האפליקציה אלא מפעילה אנימציית מנעול קלה
        window.triggerExitProtectionBounce();
      }
      return;
    }

    // לחיצה קצרה מחוץ למקלדת: מגיבה כמו מסך נעילה אמיתי (אנימציית מנעול קלה)
    if (wasOutside && totalMove < 12 && config.unlockMode !== 'swipe') {
      window.triggerExitProtectionBounce();
    }
  },
  { passive: true }
);

if (swipeUnlockArea) {
  swipeUnlockArea.addEventListener('click', () => {
    if (config.unlockMode === 'swipe') {
      animateLockOpenAndUnlock();
    }
  });
}

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
      relockFakePhone();
      if (config.osTheme === 'ios') {
        triggerIosFaceIdSequence();
      }
    }
  });
}

// ----------------------------------------------------------------------------
// 18. תפריט הגדרות סודי (לחיצה ממושכת 2.5 שניות בפינה הימנית העליונה) + עקיפת חירום (3 לחיצות על סוללה/Wi-Fi)
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
  forceAttemptCount = 0;
  refreshSettingsLastCaptured();
  if (typeof checkCloudAppUpdate === 'function') {
    checkCloudAppUpdate(false);
  }
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

// כניסה לתפריט ההגדרות הסודי: לחיצה ממושכת של 2.5 שניות בפינה הימנית העליונה של המסך
let topRightHoldTimer = null;
if (secretTopRightHoldZone) {
  const startTopRightHold = (e) => {
    if (e && e.cancelable) e.preventDefault();
    clearTimeout(topRightHoldTimer);
    topRightHoldTimer = setTimeout(() => {
      triggerHaptic(50);
      openSettingsSheet();
    }, 2500);
  };
  const cancelTopRightHold = () => {
    clearTimeout(topRightHoldTimer);
  };
  secretTopRightHoldZone.addEventListener('pointerdown', startTopRightHold);
  secretTopRightHoldZone.addEventListener('pointerup', cancelTopRightHold);
  secretTopRightHoldZone.addEventListener('pointerleave', cancelTopRightHold);
  secretTopRightHoldZone.addEventListener('pointercancel', cancelTopRightHold);
}

// עקיפת חירום: 3 לחיצות מהירות על סמל הסוללה / Wi-Fi פותחות מיד את המכשיר
bindTripleTap(statusRightIcons, () => {
  animateLockOpenAndUnlock();
});

bindTripleTap(lockIconTrigger, openSettingsSheet);
bindCornerSecretZone(secretCornerTrigger, toggleForceModeSecretly, openSettingsSheet);

function refreshSettingsLastCaptured() {
  const last = localStorage.getItem(LAST_PIN_KEY) || '---';
  if (settingsLastInput) settingsLastInput.textContent = last;
  if (typeof renderCodeHistory === 'function') renderCodeHistory();
}

// היסטוריית קודים בלשונית "הצצה" (מהחדש לישן)
function renderCodeHistory() {
  const listEl = document.getElementById('codeHistoryList');
  if (!listEl) return;
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (e) {}
  listEl.innerHTML = '';
  if (!Array.isArray(history) || !history.length) {
    listEl.innerHTML = '<div class="code-history-empty">עוד לא הוקלדו קודים</div>';
    return;
  }
  const labels = { PIN: 'קוד', WORDS: 'סיסמה', PATTERN: 'דפוס', SWIPE: 'החלקה' };
  history
    .slice()
    .reverse()
    .forEach((h) => {
      const item = document.createElement('div');
      item.className = 'code-history-item';
      const code = document.createElement('span');
      code.className = 'code-history-code';
      const mode = String(h.mode || '').toUpperCase();
      code.textContent = mode === 'PATTERN' ? String(h.code).split('').join('›') : String(h.code);
      const meta = document.createElement('span');
      meta.className = 'code-history-meta';
      meta.textContent = `${labels[mode] || 'קוד'} · ${h.timestamp || ''}`;
      item.append(meta, code);
      listEl.appendChild(item);
    });
}

(function initCodeHistoryClear() {
  const btn = document.getElementById('historyClearBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (btn.dataset.confirm !== '1') {
      btn.dataset.confirm = '1';
      btn.textContent = 'בטוח?';
      setTimeout(() => {
        btn.dataset.confirm = '';
        btn.textContent = 'נקה';
      }, 2500);
      return;
    }
    btn.dataset.confirm = '';
    btn.textContent = 'נקה';
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {}
    renderCodeHistory();
  });
})();

// שמירת תוכן אפליקציית הפתקים המדומה ב-localStorage
function initFakeNotesApp() {
  const savedTitle = localStorage.getItem(NOTES_TITLE_STORAGE_KEY);
  const savedBody = localStorage.getItem(NOTES_BODY_STORAGE_KEY);
  if (notesTitleInput && savedTitle !== null) {
    notesTitleInput.value = savedTitle;
  }
  if (notesBodyTextarea && savedBody !== null) {
    notesBodyTextarea.value = savedBody;
  }
  if (notesTitleInput) {
    notesTitleInput.addEventListener('input', () => {
      try {
        localStorage.setItem(NOTES_TITLE_STORAGE_KEY, notesTitleInput.value);
      } catch (e) {}
    });
  }
  if (notesBodyTextarea) {
    notesBodyTextarea.addEventListener('input', () => {
      try {
        localStorage.setItem(NOTES_BODY_STORAGE_KEY, notesBodyTextarea.value);
      } catch (e) {}
    });
  }
  if (notesDoneBtn) {
    notesDoneBtn.addEventListener('click', () => {
      if (notesTitleInput) notesTitleInput.blur();
      if (notesBodyTextarea) notesBodyTextarea.blur();
    });
  }
}
initFakeNotesApp();

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

if (pinLengthSelector) {
  pinLengthSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.pinLength = Number(btn.dataset.pinlen) === 6 ? 6 : 4;
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (unlockAttemptModeSelector) {
  unlockAttemptModeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.attempt);
      config.unlockOnAttempt = n >= 1 && n <= 5 ? n : 1;
      config.unlockAttemptMode = config.unlockOnAttempt >= 2 ? 'second' : 'immediate';
      forceAttemptCount = 0;
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (toggleKeySound) {
  toggleKeySound.addEventListener('change', (e) => {
    config.keySound = e.target.checked;
    saveConfig();
    if (config.keySound) {
      playKeyClickSound();
    }
  });
}

if (pinQuickWidgetBtn) {
  pinQuickWidgetBtn.addEventListener('click', () => {
    let requested = false;
    try {
      if (window.AndroidNative && typeof window.AndroidNative.requestPinQuickWidget === 'function') {
        requested = Boolean(window.AndroidNative.requestPinQuickWidget());
      }
    } catch (e) {}
    if (requested) {
      pinQuickWidgetBtn.textContent = '✓ אשר את הוספת הווידג׳ט בחלונית שנפתחה';
    } else {
      alert('להוספת ווידג׳ט שקוף: לחץ לחיצה ארוכה על מסך הבית בטלפון -> ווידג׳טים -> בחר Lockscreen.\n\nלהפעלה מכפתור הצד של סמסונג: הגדרות המכשיר -> תכונות מתקדמות -> מקש צד -> לחיצה כפולה -> פתיחת אפליקציה -> Lockscreen.');
    }
  });
}

if (forceModeSelector) {
  forceModeSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      setForceModeState(btn.dataset.forcemode === 'true');
    });
  });
}

if (unlockTargetSelector) {
  unlockTargetSelector.querySelectorAll('.seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.unlockTargetScreen = btn.dataset.target;
      saveConfig();
      applyConfigToUI();
    });
  });
}

if (toggleForceUnlockMode) {
  toggleForceUnlockMode.addEventListener('change', (e) => {
    setForceModeState(e.target.checked);
  });
}

if (toggleSecretFpBypass) {
  toggleSecretFpBypass.addEventListener('change', (e) => {
    config.secretFpBypass = e.target.checked;
    saveConfig();
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

// ============================================================================
// 20ב. שער גישה: בקשה -> אישור מנהל -> בדיקה חוזרת קבועה
// ----------------------------------------------------------------------------
// • אין קודי הפעלה ואין קוד מאסטר. הגישה נקבעת רק לפי הסטטוס בענן.
// • מכשיר מאושר עובד גם בלי אינטרנט עד LICENSE_OFFLINE_GRACE_MS מהבדיקה האחרונה.
// • ביטול גישה במנהל -> האפליקציה ננעלת בבדיקה הבאה (כל דקה / בחזרה לאפליקציה).
// • תקלת רשת אף פעם לא נועלת מכשיר מאושר (רק תשובה ברורה מהשרת).
// ============================================================================
const LICENSE_CACHE_KEY = 'magic_license_state_v3';
const LICENSE_OFFLINE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;
const LICENSE_RECHECK_MS = 60 * 1000;
const LICENSE_PENDING_POLL_MS = 5000;
const LICENSE_ERROR_RETRY_MS = 15000;

function readLicenseCache() {
  try {
    return JSON.parse(localStorage.getItem(LICENSE_CACHE_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function writeLicenseCache(status) {
  try {
    localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify({ status, checkedAt: Date.now() }));
  } catch (e) {}
}

function isCachedApprovalValid() {
  const cache = readLicenseCache();
  return Boolean(cache && cache.status === 'approved' && Date.now() - Number(cache.checkedAt || 0) < LICENSE_OFFLINE_GRACE_MS);
}

// רישום שימוש לאתר הניהול (מתי נפתח לאחרונה, כמה פעמים, איזו גרסה).
// לכל היותר פעם ב-20 דקות, ברקע, בלי להשפיע על האפליקציה אם אין רשת.
const USAGE_PING_KEY = 'magic_last_usage_ping';
const USAGE_PING_MIN_GAP_MS = 20 * 60 * 1000;
let usagePingInFlight = false;

function maybeReportUsage() {
  if (usagePingInFlight || !window.MagicCloud || !window.MagicCloud.device.reportUsage) return;
  const last = Number(localStorage.getItem(USAGE_PING_KEY) || 0);
  if (Date.now() - last < USAGE_PING_MIN_GAP_MS) return;
  usagePingInFlight = true;
  window.MagicCloud.device
    .reportUsage(getInstalledAppVersion())
    .then(() => {
      try {
        localStorage.setItem(USAGE_PING_KEY, String(Date.now()));
      } catch (e) {}
    })
    .catch(() => {})
    .finally(() => {
      usagePingInFlight = false;
    });
}

function isLicenseOverlayVisible() {
  const overlay = document.getElementById('licenseLockOverlay');
  return Boolean(overlay && overlay.style.display !== 'none');
}

function initDeviceLicenseGate() {
  const overlay = document.getElementById('licenseLockOverlay');
  const card = document.getElementById('licenseLockCard');
  const promptText = document.getElementById('licensePromptText');
  const regFormSection = document.getElementById('regFormSection');
  const regNameInput = document.getElementById('regNameInput');
  const regPhoneInput = document.getElementById('regPhoneInput');
  const submitRegBtn = document.getElementById('submitRegBtn');
  const regWaitingBox = document.getElementById('regWaitingBox');
  const regWaitingTitle = document.getElementById('regWaitingTitle');
  const regWaitingSub = document.getElementById('regWaitingSub');
  const regBlockedBox = document.getElementById('regBlockedBox');
  const errorEl = document.getElementById('licenseErrorMsg');

  if (!overlay) return;

  // ניקוי דגלי הרישיון של הגרסה הישנה (שאפשרו עקיפה)
  try {
    localStorage.removeItem('is_licensed');
  } catch (e) {}

  let devId = '';
  try {
    if (window.AndroidNative && typeof window.AndroidNative.getSimpleDeviceId === 'function') {
      devId = String(window.AndroidNative.getSimpleDeviceId() || '');
    } else {
      devId = localStorage.getItem('magic_fallback_device_id') || String(Math.floor(1000 + Math.random() * 9000));
      localStorage.setItem('magic_fallback_device_id', devId);
    }
  } catch (e) {}

  let timer = null;
  let checking = false;

  const setError = (msg) => {
    if (errorEl) errorEl.textContent = msg || '';
  };

  // מצבים: approved | form | pending | blocked | checking | config
  function applyState(state) {
    if (state === 'approved') {
      overlay.style.display = 'none';
      setError('');
      if (typeof maybeShowUpdatePopup === 'function') maybeShowUpdatePopup();
      if (typeof maybeShowGuideFirstTime === 'function') maybeShowGuideFirstTime();
      return;
    }
    overlay.style.display = 'flex';
    if (regFormSection) regFormSection.style.display = state === 'form' ? '' : 'none';
    if (regBlockedBox) regBlockedBox.style.display = state === 'blocked' ? 'flex' : 'none';
    if (regWaitingBox) regWaitingBox.style.display = state === 'pending' || state === 'checking' ? 'flex' : 'none';
    if (promptText) promptText.style.display = state === 'form' ? '' : 'none';

    if (state === 'pending') {
      if (regWaitingTitle) regWaitingTitle.textContent = 'הבקשה נשלחה וממתינה לאישור';
      if (regWaitingSub) regWaitingSub.textContent = 'האפליקציה תיפתח אוטומטית מיד עם אישור הבקשה';
    } else if (state === 'checking') {
      if (regWaitingTitle) regWaitingTitle.textContent = 'בודק הרשאת גישה...';
      if (regWaitingSub) regWaitingSub.textContent = 'נדרש חיבור לאינטרנט';
    } else if (state === 'config') {
      setError('המערכת עדיין לא הוגדרה. פנה למנהל.');
    }
  }

  function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(checkStatus, ms);
  }

  async function checkStatus() {
    clearTimeout(timer);
    if (!window.MagicCloud || !window.MagicCloud.isConfigured()) {
      applyState('config');
      return;
    }
    if (checking) return;
    checking = true;
    try {
      const status = await window.MagicCloud.device.getMyStatus();
      setError('');
      if (status === 'approved') {
        writeLicenseCache('approved');
        applyState('approved');
        maybeReportUsage();
        schedule(LICENSE_RECHECK_MS);
      } else if (status === 'none') {
        // אין בקשה (או שהמנהל מחק אותה) -> טופס הרשמה
        try {
          localStorage.removeItem(LICENSE_CACHE_KEY);
        } catch (e) {}
        applyState('form');
      } else {
        writeLicenseCache(status);
        applyState(status);
        schedule(status === 'pending' ? LICENSE_PENDING_POLL_MS : LICENSE_RECHECK_MS);
      }
    } catch (err) {
      // תקלת רשת/שרת: מכשיר מאושר ממשיך לעבוד בתוך תקופת החסד
      if (isCachedApprovalValid()) {
        applyState('approved');
      } else if (!isLicenseOverlayVisible() || (readLicenseCache() || {}).status === 'approved') {
        applyState('checking');
        setError('אין חיבור לאינטרנט. יש להתחבר כדי לאמת את הגישה.');
      } else {
        setError('אין חיבור לאינטרנט, מנסה שוב...');
      }
      schedule(LICENSE_ERROR_RETRY_MS);
    } finally {
      checking = false;
    }
  }

  if (submitRegBtn) {
    submitRegBtn.onclick = async () => {
      const name = regNameInput ? regNameInput.value.trim() : '';
      const phone = regPhoneInput ? regPhoneInput.value.trim() : '';
      if (name.length < 2) {
        setError('אנא הזן שם מלא');
        return;
      }
      if (phone.replace(/\D/g, '').length < 9 || phone.length > 20) {
        setError('אנא הזן מספר טלפון תקין');
        return;
      }
      if (!window.MagicCloud || !window.MagicCloud.isConfigured()) {
        applyState('config');
        return;
      }
      setError('');
      submitRegBtn.disabled = true;
      submitRegBtn.textContent = 'שולח בקשה...';
      try {
        const status = await window.MagicCloud.device.submitRequest({ name, phone, deviceId: devId });
        triggerHaptic(40);
        if (status === 'approved') {
          writeLicenseCache('approved');
          applyState('approved');
          schedule(LICENSE_RECHECK_MS);
        } else {
          applyState(status === 'blocked' ? 'blocked' : 'pending');
          schedule(LICENSE_PENDING_POLL_MS);
        }
      } catch (err) {
        setError(err && err.network ? 'אין חיבור לאינטרנט, נסה שוב' : 'שליחת הבקשה נכשלה, נסה שוב');
        triggerHaptic([60, 80, 60]);
        if (card) {
          card.classList.add('text-shake');
          setTimeout(() => card.classList.remove('text-shake'), 420);
        }
      } finally {
        submitRegBtn.disabled = false;
        submitRegBtn.textContent = 'שלח בקשה';
      }
    };
  }

  // פתיחה מהירה: מכשיר שאושר לאחרונה נפתח מיד, והבדיקה מול הענן רצה ברקע
  if (isCachedApprovalValid()) {
    applyState('approved');
  } else {
    applyState('checking');
  }
  checkStatus();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkStatus();
  });
  window.addEventListener('online', checkStatus);
}

// ============================================================================
// 21. עדכונים: המנהל מפרסם גרסה -> אצל כולם קופץ חלון "יש עדכון חדש"
// ----------------------------------------------------------------------------
// APP_VERSION חייב להיות זהה ל-versionName ב-android/app/build.gradle.
// החלון מוצג רק כשמסך ההגדרות פתוח (בפתיחת האפליקציה / בתפריט הסודי),
// ולעולם לא מעל מסך הנעילה הפעיל מול קהל.
// ============================================================================
const APP_VERSION = '5.0';
const DEFAULT_APK_URL = 'https://github.com/tzur2010/app-lockscreen/raw/main/Lockscreen.apk';
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_DISMISS_KEY = 'magic_update_dismissed_version';

function isNativeApk() {
  return Boolean(window.AndroidNative && typeof window.AndroidNative.getAppVersionName === 'function');
}

function getInstalledAppVersion() {
  try {
    if (isNativeApk()) {
      const v = String(window.AndroidNative.getAppVersionName() || '').trim();
      if (v) return v;
    }
  } catch (e) {}
  return APP_VERSION;
}

function compareSemver(verA, verB) {
  const partsA = String(verA || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = String(verB || '0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const a = partsA[i] || 0;
    const b = partsB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

let latestCloudAppConfig = null;

function hasPendingUpdate() {
  return Boolean(
    latestCloudAppConfig &&
      latestCloudAppConfig.latest_version &&
      compareSemver(latestCloudAppConfig.latest_version, getInstalledAppVersion()) > 0
  );
}

window.onApkDownloadFinished = function () {
  const ver = latestCloudAppConfig ? latestCloudAppConfig.latest_version : '';
  if (inAppUpdateBtn) {
    inAppUpdateBtn.disabled = false;
    inAppUpdateBtn.textContent = `ההורדה הושלמה (v${ver}) - פותח מתקין...`;
  }
  if (inAppUpdateStatus) {
    inAppUpdateStatus.textContent = 'קובץ העדכון ירד בהצלחה! אשר "עדכן" בחלונית ההתקנה של אנדרואיד (כל ההגדרות שלך נשמרות).';
  }
};

async function reloadWebAppToLatest(ver) {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
  } catch (e) {}
  window.location.replace(`${window.location.pathname}?v=${encodeURIComponent(ver || Date.now())}`);
}

function performAppUpdate() {
  if (!latestCloudAppConfig) return;
  const ver = String(latestCloudAppConfig.latest_version || '').replace(/^v/i, '');
  const url = String(latestCloudAppConfig.apk_url || DEFAULT_APK_URL).trim();

  if (!isNativeApk()) {
    // גרסת אתר (PWA): העדכון = טעינה מחדש של הקבצים העדכניים
    reloadWebAppToLatest(ver);
    return;
  }

  if (inAppUpdateBtn) {
    inAppUpdateBtn.disabled = true;
    inAppUpdateBtn.textContent = `מוריד עדכון (v${ver})...`;
  }
  if (inAppUpdateStatus) {
    inAppUpdateStatus.textContent = 'ההורדה נפתחת בדפדפן. בסיום יש לפתוח את הקובץ ולאשר "עדכן" (ההגדרות שלך נשמרות).';
  }
  let started = false;
  try {
    started = Boolean(window.AndroidNative.downloadAndInstallApk(url, ver));
  } catch (e) {}
  if (!started && inAppUpdateStatus) {
    inAppUpdateStatus.textContent = 'לא ניתן לפתוח את ההורדה. נסה שוב.';
  }
  setTimeout(() => {
    if (inAppUpdateBtn) {
      inAppUpdateBtn.disabled = false;
      inAppUpdateBtn.textContent = `יש עדכון זמין (v${ver}) - לחץ לעדכון`;
    }
  }, 4000);
}

function hideUpdatePopup() {
  const popup = document.getElementById('updatePopupOverlay');
  if (popup) popup.style.display = 'none';
}

function maybeShowUpdatePopup() {
  const popup = document.getElementById('updatePopupOverlay');
  if (!popup || !hasPendingUpdate()) return;
  // רק כשמסך ההגדרות פתוח והמשתמש מאושר - לא מעל מסך הנעילה ולא מעל מסך ההרשמה
  if (!setupOverlay || !setupOverlay.classList.contains('open')) return;
  if (isLicenseOverlayVisible()) return;

  const ver = String(latestCloudAppConfig.latest_version).replace(/^v/i, '');
  try {
    if (sessionStorage.getItem(UPDATE_DISMISS_KEY) === ver) return;
  } catch (e) {}

  const titleEl = document.getElementById('updatePopupTitle');
  const textEl = document.getElementById('updatePopupText');
  if (titleEl) titleEl.textContent = `יש עדכון חדש (v${ver})`;
  if (textEl) {
    const note = String(latestCloudAppConfig.message || '').trim();
    textEl.textContent = (note ? note + '\n\n' : '') + `הגרסה שלך: v${getInstalledAppVersion()}. כל ההגדרות נשמרות בעדכון.`;
  }
  popup.style.display = 'flex';
}

async function checkCloudAppUpdate(isManualClick = false) {
  const installedVer = getInstalledAppVersion();
  if (installedVersionLabel) {
    installedVersionLabel.textContent = `גרסה מותקנת: v${installedVer}`;
  }
  if (isManualClick && checkUpdateNowBtn) {
    checkUpdateNowBtn.disabled = true;
    checkUpdateNowBtn.textContent = 'בודק...';
  }

  let fetchFailed = false;
  try {
    if (window.MagicCloud && window.MagicCloud.isConfigured()) {
      const cfg = await window.MagicCloud.getAppConfig();
      if (cfg && cfg.latest_version) latestCloudAppConfig = cfg;
    }
  } catch (e) {
    fetchFailed = true;
  }

  const hasNewer = hasPendingUpdate();
  if (hasNewer) {
    const remoteVer = String(latestCloudAppConfig.latest_version).replace(/^v/i, '');
    if (inAppUpdateBanner) inAppUpdateBanner.style.display = 'flex';
    if (inAppUpdateBtn) {
      inAppUpdateBtn.disabled = false;
      inAppUpdateBtn.textContent = `יש עדכון זמין (v${remoteVer}) - לחץ לעדכון`;
    }
    if (cloudVersionStatusText) {
      cloudVersionStatusText.textContent = `זמינה גרסה חדשה (v${remoteVer}) — לחץ על הכפתור הירוק למעלה`;
    }
    if (isManualClick) {
      try {
        sessionStorage.removeItem(UPDATE_DISMISS_KEY);
      } catch (e) {}
    }
    maybeShowUpdatePopup();
  } else {
    if (inAppUpdateBanner) inAppUpdateBanner.style.display = 'none';
    if (cloudVersionStatusText) {
      cloudVersionStatusText.textContent = !isManualClick
        ? 'הגדרות המשתמש נשמרות במלואן בעת עדכון'
        : fetchFailed
        ? 'אין חיבור לאינטרנט, נסה שוב'
        : `האפליקציה מעודכנת לגרסה האחרונה (v${installedVer}) ✓`;
    }
  }

  if (isManualClick && checkUpdateNowBtn) {
    checkUpdateNowBtn.disabled = false;
    checkUpdateNowBtn.textContent = 'בדוק עדכון';
  }
}

function initInAppSelfUpdater() {
  if (inAppUpdateBtn) inAppUpdateBtn.addEventListener('click', performAppUpdate);
  if (checkUpdateNowBtn) checkUpdateNowBtn.addEventListener('click', () => checkCloudAppUpdate(true));

  const popupBtn = document.getElementById('updatePopupBtn');
  const popupLater = document.getElementById('updatePopupLater');
  if (popupBtn) {
    popupBtn.addEventListener('click', () => {
      hideUpdatePopup();
      performAppUpdate();
    });
  }
  if (popupLater) {
    popupLater.addEventListener('click', () => {
      try {
        if (latestCloudAppConfig) {
          sessionStorage.setItem(UPDATE_DISMISS_KEY, String(latestCloudAppConfig.latest_version).replace(/^v/i, ''));
        }
      } catch (e) {}
      hideUpdatePopup();
    });
  }

  checkCloudAppUpdate(false);
  setInterval(() => {
    if (document.visibilityState === 'visible') checkCloudAppUpdate(false);
  }, UPDATE_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkCloudAppUpdate(false);
  });
}

// ============================================================================
// 23. הצצה לשעון החכם + חשיפה בהתראה
// ----------------------------------------------------------------------------
// השעון מחובר כבר לטלפון של הקוסם, ולכן אין צורך בחיבור נוסף: האפליקציה שולחת
// התראה שקטה (בלי צליל ובלי קפיצה על הטלפון) והשעון מציג אותה. הקוד לא נשלח לשרת.
// ============================================================================
function hasNativeNotifications() {
  return Boolean(window.AndroidNative && typeof window.AndroidNative.sendWatchPeek === 'function');
}

function formatCodeForDisplay(code, mode) {
  const clean = String(code || '');
  if (String(mode).toUpperCase() === 'PATTERN') return clean.split('').join('-');
  return clean;
}

function sendCodeToWatch(code, mode) {
  if (!config.watchPeek || !hasNativeNotifications() || !code) return;
  const m = String(mode || '').toUpperCase();
  const label = m === 'PATTERN' ? 'דפוס' : m === 'WORDS' ? 'סיסמה' : 'קוד';
  try {
    window.AndroidNative.sendWatchPeek(formatCodeForDisplay(code, m), label);
  } catch (e) {}
}

function buildRevealMessage(code) {
  const template = String(config.revealText || '{קוד}');
  return template.split('{קוד}').join(String(code || ''));
}

// תמונת השולח: נשמרת בנפרד מההגדרות (תמונה קטנה, 192 פיקסלים)
const REVEAL_AVATAR_KEY = 'magic_reveal_avatar_v1';
const AVATAR_COLORS = ['#0EA5E9', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6'];

function getRevealAvatar() {
  try {
    return localStorage.getItem(REVEAL_AVATAR_KEY) || '';
  } catch (e) {
    return '';
  }
}

// אותו חישוב צבע כמו באנדרואיד (String.hashCode של ג'אווה), כדי שהעיגול ייראה זהה בשני המקומות
function avatarColorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function paintAvatar(el, name, dataUrl) {
  if (!el) return;
  const clean = String(name || '').trim();
  if (dataUrl) {
    el.style.backgroundImage = `url("${dataUrl}")`;
    el.style.backgroundColor = 'transparent';
    el.textContent = '';
  } else {
    el.style.backgroundImage = 'none';
    el.style.backgroundColor = avatarColorFor(clean);
    el.textContent = clean ? Array.from(clean)[0] : '?';
  }
}

function resizeImageToAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 192;
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

let fakeBannerTimer = null;
function showFakeMessageBanner(sender, text) {
  const banner = document.getElementById('fakeMsgBanner');
  if (!banner) return;
  paintAvatar(document.getElementById('fakeMsgAvatar'), sender, getRevealAvatar());
  document.getElementById('fakeMsgSender').textContent = sender;
  document.getElementById('fakeMsgText').textContent = text;
  banner.classList.toggle('light', config.osTheme === 'ios');
  banner.style.display = 'flex';
  void banner.offsetWidth;
  banner.classList.add('show');
  triggerHaptic([40, 60, 40]);
  clearTimeout(fakeBannerTimer);
  fakeBannerTimer = setTimeout(hideFakeMessageBanner, 12000);
}

function hideFakeMessageBanner() {
  const banner = document.getElementById('fakeMsgBanner');
  if (!banner) return;
  banner.classList.remove('show');
  setTimeout(() => {
    if (!banner.classList.contains('show')) banner.style.display = 'none';
  }, 400);
}

// נקרא ברגע שהטלפון "נפתח" בכפיית פתיחה
function scheduleCodeReveal(code, force = false) {
  if (!force && !config.revealEnabled) return false;
  const delayMs = Math.max(1, Number(config.revealDelaySec) || 5) * 1000;
  const sender = String(config.revealSender || 'אמא');
  const text = buildRevealMessage(code);
  // באנדרואיד: הודעה אמיתית של המערכת (מגיעה גם אחרי שהאפליקציה נסגרה למסך הבית)
  if (hasNativeNotifications()) {
    try {
      if (typeof window.AndroidNative.scheduleRevealNotificationV2 === 'function') {
        if (window.AndroidNative.scheduleRevealNotificationV2(sender, text, delayMs, getRevealAvatar())) return true;
      } else if (typeof window.AndroidNative.scheduleRevealNotification === 'function') {
        if (window.AndroidNative.scheduleRevealNotification(sender, text, delayMs)) return true;
      }
    } catch (e) {}
  }
  // בגרסת האתר: הודעה מדומה שקופצת בראש המסך
  setTimeout(() => showFakeMessageBanner(sender, text), delayMs);
  return true;
}

function syncMagicFeaturesUI() {
  const watchToggle = document.getElementById('toggleWatchPeek');
  const watchExtra = document.getElementById('watchPeekExtra');
  const watchDesc = document.getElementById('watchPeekDesc');
  const revealToggle = document.getElementById('toggleReveal');
  const revealExtra = document.getElementById('revealExtra');
  const native = hasNativeNotifications();

  if (watchToggle) {
    watchToggle.checked = Boolean(config.watchPeek) && native;
    watchToggle.disabled = !native;
  }
  if (watchExtra) watchExtra.style.display = config.watchPeek && native ? 'block' : 'none';
  if (watchDesc && !native) watchDesc.textContent = 'זמין רק באפליקציית האנדרואיד (עם שעון חכם שמחובר לטלפון).';

  if (revealToggle) revealToggle.checked = Boolean(config.revealEnabled);
  if (revealExtra) revealExtra.style.display = config.revealEnabled ? 'block' : 'none';

  const senderInput = document.getElementById('revealSenderInput');
  const textInput = document.getElementById('revealTextInput');
  if (senderInput && document.activeElement !== senderInput) senderInput.value = config.revealSender || '';
  if (textInput && document.activeElement !== textInput) textInput.value = config.revealText || '';
  document.querySelectorAll('#revealDelaySelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.delay) === Number(config.revealDelaySec || 5));
  });

  const avatar = getRevealAvatar();
  paintAvatar(document.getElementById('revealAvatarPreview'), config.revealSender, avatar);
  const clearBtn = document.getElementById('revealAvatarClear');
  if (clearBtn) clearBtn.style.display = avatar ? '' : 'none';
}

function initMagicFeatures() {
  const watchToggle = document.getElementById('toggleWatchPeek');
  const revealToggle = document.getElementById('toggleReveal');
  const askPermission = () => {
    try {
      if (window.AndroidNative && typeof window.AndroidNative.requestNotificationPermission === 'function') {
        window.AndroidNative.requestNotificationPermission();
      }
    } catch (e) {}
  };

  if (watchToggle) {
    watchToggle.addEventListener('change', (e) => {
      config.watchPeek = e.target.checked;
      saveConfig();
      if (config.watchPeek) askPermission();
      syncMagicFeaturesUI();
    });
  }
  if (revealToggle) {
    revealToggle.addEventListener('change', (e) => {
      config.revealEnabled = e.target.checked;
      saveConfig();
      if (config.revealEnabled) askPermission();
      syncMagicFeaturesUI();
    });
  }

  const senderInput = document.getElementById('revealSenderInput');
  const textInput = document.getElementById('revealTextInput');
  if (senderInput) {
    senderInput.addEventListener('input', () => {
      config.revealSender = senderInput.value.slice(0, 40);
      saveConfig();
      paintAvatar(document.getElementById('revealAvatarPreview'), config.revealSender, getRevealAvatar());
    });
  }

  const avatarInput = document.getElementById('revealAvatarInput');
  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files && avatarInput.files[0];
      avatarInput.value = '';
      if (!file) return;
      try {
        const dataUrl = await resizeImageToAvatar(file);
        localStorage.setItem(REVEAL_AVATAR_KEY, dataUrl);
      } catch (e) {}
      syncMagicFeaturesUI();
      scheduleCloudBackup();
    });
  }
  const avatarClear = document.getElementById('revealAvatarClear');
  if (avatarClear) {
    avatarClear.addEventListener('click', () => {
      try {
        localStorage.removeItem(REVEAL_AVATAR_KEY);
      } catch (e) {}
      syncMagicFeaturesUI();
    });
  }
  if (textInput) {
    textInput.addEventListener('input', () => {
      config.revealText = textInput.value.slice(0, 300);
      saveConfig();
    });
  }
  document.querySelectorAll('#revealDelaySelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.revealDelaySec = Number(btn.dataset.delay) || 5;
      saveConfig();
      syncMagicFeaturesUI();
    });
  });

  const watchTestBtn = document.getElementById('watchPeekTestBtn');
  const watchStatus = document.getElementById('watchPeekStatus');
  if (watchTestBtn) {
    watchTestBtn.addEventListener('click', () => {
      let ok = false;
      try {
        ok = hasNativeNotifications() && window.AndroidNative.sendWatchPeek('1234', 'בדיקה - אם זה מופיע בשעון, הכל עובד');
      } catch (e) {}
      if (!ok) askPermission();
      if (watchStatus) {
        watchStatus.textContent = ok
          ? 'נשלח ✓ בדוק את השעון. אם לא הופיע: באפליקציית Galaxy Wearable ← התראות ← הדלק "הצג התראות בשעון גם כשהטלפון בשימוש".'
          : 'ההתראות חסומות. אשר את הרשאת ההתראות שקפצה ונסה שוב.';
      }
    });
  }

  const revealTestBtn = document.getElementById('revealTestBtn');
  const revealStatus = document.getElementById('revealStatus');
  if (revealTestBtn) {
    revealTestBtn.addEventListener('click', () => {
      scheduleCodeReveal('1234', true);
      if (revealStatus) revealStatus.textContent = `ההודעה תגיע בעוד ${Number(config.revealDelaySec) || 5} שניות...`;
      setTimeout(() => {
        if (revealStatus) revealStatus.textContent = '';
      }, (Number(config.revealDelaySec) || 5) * 1000 + 3000);
    });
  }

  const banner = document.getElementById('fakeMsgBanner');
  if (banner) banner.addEventListener('click', hideFakeMessageBanner);

  syncMagicFeaturesUI();
}

// ============================================================================
// 24. רוטינות שמורות: שמירת כל ההגדרות בשם ומעבר ביניהן בלחיצה
// ============================================================================
const ROUTINES_KEY = 'magic_routines_v1';
const ACTIVE_ROUTINE_KEY = 'magic_active_routine_v1';
// הגדרות שלא שייכות לרוטינה (אישיות למכשיר / למראה תפריט ההגדרות)
const ROUTINE_EXCLUDED_KEYS = ['settingsColorScheme', 'faceSignature', 'faceDescriptor', 'faceIdEnrolled', 'fingerprintEnrolled', 'fingerprintHoldMs', 'fingerprintZoneX', 'fingerprintZoneY', 'fingerprintProfile'];

function getRoutines() {
  try {
    const list = JSON.parse(localStorage.getItem(ROUTINES_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveRoutines(list) {
  try {
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(list));
  } catch (e) {}
  if (typeof scheduleCloudBackup === 'function') scheduleCloudBackup();
}

function snapshotCurrentSettings() {
  const snap = {};
  Object.keys(config).forEach((k) => {
    if (!ROUTINE_EXCLUDED_KEYS.includes(k)) snap[k] = config[k];
  });
  return { config: snap, force: Boolean(forceUnlockMode) };
}

function applyRoutine(routine) {
  if (!routine || !routine.config) return;
  const keep = {};
  ROUTINE_EXCLUDED_KEYS.forEach((k) => {
    if (k in config) keep[k] = config[k];
  });
  config = { ...DEFAULT_CONFIG, ...routine.config, ...keep };
  saveConfig();
  setForceModeState(routine.force !== false);
  forceAttemptCount = 0;
  applyConfigToUI();
  syncMagicFeaturesUI();
  try {
    localStorage.setItem(ACTIVE_ROUTINE_KEY, routine.id);
  } catch (e) {}
  triggerHaptic(30);
  renderRoutines();
}

function renderRoutines() {
  const listEl = document.getElementById('routineList');
  if (!listEl) return;
  const routines = getRoutines();
  const activeId = localStorage.getItem(ACTIVE_ROUTINE_KEY) || '';
  listEl.innerHTML = '';
  if (!routines.length) {
    listEl.innerHTML = '<div class="routine-empty">עוד אין רוטינות שמורות</div>';
    return;
  }
  routines.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'routine-item' + (r.id === activeId ? ' active' : '');
    const name = document.createElement('span');
    name.className = 'routine-item-name';
    name.textContent = (r.id === activeId ? '✓ ' : '') + r.name;
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'routine-load-btn';
    load.textContent = 'טען';
    load.addEventListener('click', () => applyRoutine(r));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'routine-del-btn';
    del.textContent = 'מחק';
    del.addEventListener('click', () => {
      if (del.dataset.confirm !== '1') {
        // לחיצה ראשונה מבקשת אישור (בלי חלון קופץ של הדפדפן)
        del.dataset.confirm = '1';
        del.textContent = 'בטוח?';
        setTimeout(() => {
          del.dataset.confirm = '';
          del.textContent = 'מחק';
        }, 2500);
        return;
      }
      saveRoutines(getRoutines().filter((x) => x.id !== r.id));
      renderRoutines();
    });
    item.append(name, load, del);
    listEl.appendChild(item);
  });
}

function initRoutines() {
  const input = document.getElementById('routineNameInput');
  const btn = document.getElementById('routineSaveBtn');
  if (btn && input) {
    btn.addEventListener('click', () => {
      const name = input.value.trim() || `רוטינה ${getRoutines().length + 1}`;
      const routines = getRoutines();
      const existing = routines.find((r) => r.name === name);
      const snap = snapshotCurrentSettings();
      let id;
      if (existing) {
        Object.assign(existing, snap, { savedAt: Date.now() });
        id = existing.id;
      } else {
        id = 'r' + Date.now().toString(36);
        routines.push({ id, name: name.slice(0, 30), savedAt: Date.now(), ...snap });
      }
      saveRoutines(routines.slice(-20));
      try {
        localStorage.setItem(ACTIVE_ROUTINE_KEY, id);
      } catch (e) {}
      input.value = '';
      triggerHaptic(30);
      renderRoutines();
    });
  }
  renderRoutines();
}

// ============================================================================
// 25. גיבוי הגדרות בענן לפי קוד גיבוי אישי
// ----------------------------------------------------------------------------
// אחרי התקנה מחדש הטלפון מקבל זהות חדשה, לכן הגיבוי לא קשור לזהות אלא לקוד
// אישי בן 12 תווים שהקוסם שומר אצלו. גיבוי אוטומטי כ-20 שניות אחרי כל שינוי.
// ============================================================================
var BACKUP_CODE_KEY = 'magic_backup_code_v1';
var BACKUP_LAST_KEY = 'magic_backup_last_v1';
var BACKUP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
var backupTimer = null;
var backupInFlight = false;

function getBackupCode() {
  let code = '';
  try {
    code = localStorage.getItem(BACKUP_CODE_KEY) || '';
  } catch (e) {}
  if (!/^[A-Z0-9]{12}$/.test(code)) {
    const bytes = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    code = Array.from(bytes, (b) => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length]).join('');
    try {
      localStorage.setItem(BACKUP_CODE_KEY, code);
    } catch (e) {}
  }
  return code;
}

function formatBackupCode(code) {
  return String(code).match(/.{1,4}/g).join('-');
}

function normalizeBackupCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function buildBackupPayload() {
  const cfg = { ...config };
  // נתונים ביומטריים (פנים) נשארים רק בטלפון ולא עולים לענן
  delete cfg.faceSignature;
  delete cfg.faceDescriptor;
  delete cfg.faceIdEnrolled;
  let avatar = '';
  try {
    avatar = localStorage.getItem(REVEAL_AVATAR_KEY) || '';
  } catch (e) {}
  return JSON.stringify({
    v: 1,
    config: cfg,
    force: Boolean(forceUnlockMode),
    routines: getRoutines(),
    activeRoutine: localStorage.getItem(ACTIVE_ROUTINE_KEY) || '',
    avatar
  });
}

function canUseCloudBackup() {
  try {
    if (!window.MagicCloud || !window.MagicCloud.isConfigured() || !window.MagicCloud.device.saveBackup) return false;
    const cache = readLicenseCache();
    return Boolean(cache && cache.status === 'approved');
  } catch (e) {
    return false;
  }
}

function setBackupStatus(text, color) {
  const el = document.getElementById('backupStatus');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = color || '';
}

function describeLastBackup() {
  const last = Number(localStorage.getItem(BACKUP_LAST_KEY) || 0);
  if (!last) return 'עוד לא בוצע גיבוי';
  const d = new Date(last);
  return `גובה לאחרונה: ${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
}

async function runCloudBackup(manual = false) {
  if (backupInFlight) return false;
  if (!canUseCloudBackup()) {
    if (manual) setBackupStatus('הגיבוי זמין רק כשהאפליקציה מאושרת ומחוברת', '#f87171');
    return false;
  }
  backupInFlight = true;
  if (manual) setBackupStatus('מגבה...');
  try {
    await window.MagicCloud.device.saveBackup(getBackupCode(), buildBackupPayload());
    localStorage.setItem(BACKUP_LAST_KEY, String(Date.now()));
    setBackupStatus((manual ? 'נשמר ✓ ' : '') + describeLastBackup(), manual ? '#22c55e' : '');
    return true;
  } catch (err) {
    if (manual) setBackupStatus(err && err.network ? 'אין חיבור לאינטרנט, נסה שוב' : 'הגיבוי נכשל, נסה שוב', '#f87171');
    return false;
  } finally {
    backupInFlight = false;
  }
}

function scheduleCloudBackup() {
  try {
    clearTimeout(backupTimer);
    backupTimer = setTimeout(() => runCloudBackup(false), 20000);
  } catch (e) {}
}

function applyBackupPayload(payload) {
  const data = JSON.parse(payload);
  if (!data || !data.config) throw new Error('bad backup');
  const keep = { faceSignature: config.faceSignature, faceDescriptor: config.faceDescriptor, faceIdEnrolled: config.faceIdEnrolled };
  config = { ...DEFAULT_CONFIG, ...data.config, ...keep };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  setForceModeState(data.force !== false);
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(Array.isArray(data.routines) ? data.routines : []));
  if (data.activeRoutine) localStorage.setItem(ACTIVE_ROUTINE_KEY, data.activeRoutine);
  if (data.avatar) localStorage.setItem(REVEAL_AVATAR_KEY, data.avatar);
  else localStorage.removeItem(REVEAL_AVATAR_KEY);
  forceAttemptCount = 0;
  applyConfigToUI();
  syncMagicFeaturesUI();
  renderRoutines();
}

function initCloudBackup() {
  const codeEl = document.getElementById('backupCodeText');
  if (codeEl) codeEl.textContent = formatBackupCode(getBackupCode());
  setBackupStatus(describeLastBackup());

  const copyBtn = document.getElementById('backupCopyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = formatBackupCode(getBackupCode());
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {}
      copyBtn.textContent = ok ? 'הועתק ✓' : 'סמן והעתק';
      setTimeout(() => (copyBtn.textContent = 'העתק'), 2000);
    });
  }

  const nowBtn = document.getElementById('backupNowBtn');
  if (nowBtn) nowBtn.addEventListener('click', () => runCloudBackup(true));

  const restoreInput = document.getElementById('restoreCodeInput');
  const restoreBtn = document.getElementById('restoreBtn');
  const restoreStatus = document.getElementById('restoreStatus');
  const setRestoreStatus = (text, color) => {
    if (!restoreStatus) return;
    restoreStatus.textContent = text || '';
    restoreStatus.style.color = color || '';
  };
  if (restoreBtn && restoreInput) {
    restoreBtn.addEventListener('click', async () => {
      const code = normalizeBackupCode(restoreInput.value);
      if (code.length !== 12) {
        setRestoreStatus('הקוד צריך להיות 12 תווים (למשל K7P2-9XQM-4RTA)', '#f87171');
        return;
      }
      if (restoreBtn.dataset.confirm !== '1') {
        restoreBtn.dataset.confirm = '1';
        restoreBtn.textContent = 'בטוח?';
        setRestoreStatus('השחזור יחליף את כל ההגדרות הנוכחיות. לחץ שוב לאישור.', '#f59e0b');
        setTimeout(() => {
          restoreBtn.dataset.confirm = '';
          restoreBtn.textContent = 'שחזר';
        }, 4000);
        return;
      }
      restoreBtn.dataset.confirm = '';
      restoreBtn.textContent = 'משחזר...';
      restoreBtn.disabled = true;
      try {
        if (!window.MagicCloud || !window.MagicCloud.device.loadBackup) throw new Error('offline');
        const doc = await window.MagicCloud.device.loadBackup(code);
        if (!doc || !doc.data) {
          setRestoreStatus('לא נמצא גיבוי עם הקוד הזה', '#f87171');
        } else {
          applyBackupPayload(doc.data);
          localStorage.setItem(BACKUP_CODE_KEY, code);
          if (codeEl) codeEl.textContent = formatBackupCode(code);
          restoreInput.value = '';
          triggerHaptic([40, 60, 40]);
          setRestoreStatus('ההגדרות שוחזרו ✓', '#22c55e');
        }
      } catch (err) {
        setRestoreStatus(err && err.network ? 'אין חיבור לאינטרנט, נסה שוב' : 'השחזור נכשל, נסה שוב', '#f87171');
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.textContent = 'שחזר';
      }
    });
  }
}

// ============================================================================
// 26. מדריך שימוש: נפתח לבד בפעם הראשונה, ובכל זמן מכפתור בראש ההגדרות
// ============================================================================
var GUIDE_SEEN_KEY = 'magic_guide_seen_v1';

function openGuide() {
  const el = document.getElementById('guideOverlay');
  if (el) el.style.display = 'flex';
}

function closeGuide() {
  const el = document.getElementById('guideOverlay');
  if (el) el.style.display = 'none';
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, '1');
  } catch (e) {}
}

function maybeShowGuideFirstTime() {
  try {
    if (localStorage.getItem(GUIDE_SEEN_KEY)) return;
  } catch (e) {
    return;
  }
  if (!setupOverlay || !setupOverlay.classList.contains('open')) return;
  if (isLicenseOverlayVisible()) return;
  const updatePopup = document.getElementById('updatePopupOverlay');
  if (updatePopup && updatePopup.style.display === 'flex') return;
  setTimeout(openGuide, 1300); // אחרי מסך הפתיחה
}

function initGuide() {
  const openBtn = document.getElementById('openGuideBtn');
  const headerBtn = document.getElementById('headerGuideBtn');
  const closeBtn = document.getElementById('guideCloseBtn');
  if (openBtn) openBtn.addEventListener('click', openGuide);
  if (headerBtn) headerBtn.addEventListener('click', openGuide);
  if (closeBtn) closeBtn.addEventListener('click', closeGuide);
}

// ============================================================================
// 27. לשוניות ההגדרות: טריק / הצצה / מראה / אבטחה / עוד
// ============================================================================
var SETTINGS_TAB_KEY = 'magic_settings_tab_v1';

function showSettingsTab(tab) {
  const tabs = document.querySelectorAll('#settingsTabs .settings-tab');
  const panels = document.querySelectorAll('.settings-panel');
  if (!tabs.length) return;
  const exists = Array.from(panels).some((p) => p.dataset.tab === tab);
  const target = exists ? tab : 'trick';
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === target));
  panels.forEach((p) => p.classList.toggle('active', p.dataset.tab === target));
  const body = document.querySelector('.config-body');
  if (body) body.scrollTop = 0;
  try {
    localStorage.setItem(SETTINGS_TAB_KEY, target);
  } catch (e) {}
}

function initSettingsTabs() {
  document.querySelectorAll('#settingsTabs .settings-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerHaptic(10);
      showSettingsTab(btn.dataset.tab);
    });
  });
  let saved = 'trick';
  try {
    saved = localStorage.getItem(SETTINGS_TAB_KEY) || 'trick';
  } catch (e) {}
  showSettingsTab(saved);
}

// ============================================================================
// 28. חשיפה בפתקים + "מוכן לצופה הבא"
// ============================================================================
var NOTES_PREDICTION_DEFAULT = 'דברים שצריך לזכור השבוע:\n• קניות לסוף שבוע\n• לאסוף חבילה מהדואר\n• המספר שתבחר: {קוד}';

function getNotesTemplate() {
  let t = null;
  try {
    t = localStorage.getItem(NOTES_BODY_STORAGE_KEY);
  } catch (e) {}
  return t !== null && t !== '' ? t : NOTES_PREDICTION_DEFAULT;
}

function formatNoteTime(date, isYesterday) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${isYesterday ? 'אתמול' : 'היום'}, ${hh}:${mm}`;
}

// מציג בפתק את הקוד שהצופה בחר, עם שעת כתיבה מוקדמת
function showNotesPrediction(code) {
  if (!notesBodyTextarea) return;
  let template = getNotesTemplate();
  if (!template.includes('{קוד}')) template += '\n• {קוד}';
  notesBodyTextarea.value = template.split('{קוד}').join(code || '----');
  notesBodyTextarea.readOnly = true;
  notesBodyTextarea.dataset.prediction = '1';

  if (notesDateLine) {
    const now = new Date();
    if (config.notesAge === 'yesterday') {
      const d = new Date(now.getTime() - 24 * 3600 * 1000 + 37 * 60 * 1000);
      notesDateLine.textContent = formatNoteTime(d, true);
    } else {
      const mins = Math.max(1, Number(config.notesAge) || 60);
      const d = new Date(now.getTime() - mins * 60 * 1000);
      notesDateLine.textContent = formatNoteTime(d, d.toDateString() !== now.toDateString());
    }
  }
}

function restoreNotesTemplate() {
  if (!notesBodyTextarea || notesBodyTextarea.dataset.prediction !== '1') return;
  notesBodyTextarea.value = getNotesTemplate();
  notesBodyTextarea.readOnly = false;
  notesBodyTextarea.dataset.prediction = '';
}

// נועל מחדש את הטלפון המזויף (חוזר ממסך הבית/הפתקים למסך הנעילה)
function relockFakePhone() {
  fakeHomescreen.classList.remove('unlocked');
  if (lockIconTrigger) lockIconTrigger.classList.remove('faceid-unlocked');
  if (cameraPunchHole) cameraPunchHole.classList.remove('faceid-unlocked');
  clearCurrentInputs();
  restoreNotesTemplate();
  if (typeof hideFakeMessageBanner === 'function') hideFakeMessageBanner();
}

// "מוכן לצופה הבא": מנקה את הקוד האחרון, מאפס ניסיונות וחוזר למסך הנעילה
function resetForNextShow() {
  try {
    localStorage.removeItem(LAST_PIN_KEY);
  } catch (e) {}
  forceAttemptCount = 0;
  relockFakePhone();
  if (typeof hideHoldPeek === 'function') hideHoldPeek();
  refreshSettingsLastCaptured();
  triggerHaptic([30, 40, 30]);
  launchLockscreenNow();
}

function syncNotesRevealUI() {
  const toggle = document.getElementById('toggleNotesReveal');
  const extra = document.getElementById('notesRevealExtra');
  const input = document.getElementById('notesTemplateInput');
  if (toggle) toggle.checked = Boolean(config.notesReveal);
  if (extra) extra.style.display = config.notesReveal ? 'block' : 'none';
  if (input && document.activeElement !== input) input.value = getNotesTemplate();
  document.querySelectorAll('#notesAgeSelector .seg-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.age === String(config.notesAge || '60'));
  });
}

function initNotesReveal() {
  const toggle = document.getElementById('toggleNotesReveal');
  if (toggle) {
    toggle.addEventListener('change', (e) => {
      config.notesReveal = e.target.checked;
      if (config.notesReveal) {
        // החשיפה מופיעה בדף הפתקים, אז עוברים אליו אוטומטית
        config.unlockTargetScreen = 'notes';
        let stored = null;
        try {
          stored = localStorage.getItem(NOTES_BODY_STORAGE_KEY);
        } catch (err) {}
        if (!stored || !stored.includes('{קוד}')) {
          try {
            localStorage.setItem(NOTES_BODY_STORAGE_KEY, NOTES_PREDICTION_DEFAULT);
          } catch (err) {}
          if (notesBodyTextarea) notesBodyTextarea.value = NOTES_PREDICTION_DEFAULT;
        }
      }
      saveConfig();
      applyConfigToUI();
      syncNotesRevealUI();
    });
  }
  const input = document.getElementById('notesTemplateInput');
  if (input) {
    input.addEventListener('input', () => {
      try {
        localStorage.setItem(NOTES_BODY_STORAGE_KEY, input.value);
      } catch (e) {}
      if (notesBodyTextarea && notesBodyTextarea.dataset.prediction !== '1') notesBodyTextarea.value = input.value;
      scheduleCloudBackup();
    });
  }
  document.querySelectorAll('#notesAgeSelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.notesAge = btn.dataset.age;
      saveConfig();
      syncNotesRevealUI();
    });
  });
  const resetBtn = document.getElementById('resetShowBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetForNextShow);
  syncNotesRevealUI();
}

// ============================================================================
// 22. משוב מהקוסם (תפריט ההגדרות) -> מגיע לאתר הניהול
// ============================================================================
const FEEDBACK_LAST_SENT_KEY = 'magic_feedback_last_sent';

function initFeedbackBox() {
  const input = document.getElementById('feedbackInput');
  const btn = document.getElementById('feedbackSendBtn');
  const statusEl = document.getElementById('feedbackStatus');
  if (!input || !btn) return;

  const setStatus = (msg, color) => {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.color = color || '';
  };

  btn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (text.length < 2) {
      setStatus('כתוב משהו לפני השליחה', '#f87171');
      return;
    }
    const last = Number(localStorage.getItem(FEEDBACK_LAST_SENT_KEY) || 0);
    if (Date.now() - last < 30 * 1000) {
      setStatus('המשוב הקודם נשלח הרגע, נסה שוב בעוד חצי דקה', '#f59e0b');
      return;
    }
    if (!window.MagicCloud || !window.MagicCloud.isConfigured()) {
      setStatus('המערכת לא מחוברת כרגע', '#f87171');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'שולח...';
    setStatus('');
    try {
      await window.MagicCloud.device.sendFeedback({
        text,
        appVersion: getInstalledAppVersion(),
        os: config.osTheme,
        model: config.deviceModel
      });
      try {
        localStorage.setItem(FEEDBACK_LAST_SENT_KEY, String(Date.now()));
      } catch (e) {}
      input.value = '';
      triggerHaptic(30);
      setStatus('תודה! המשוב נשלח ✓', '#22c55e');
    } catch (err) {
      setStatus(err && err.network ? 'אין חיבור לאינטרנט, נסה שוב' : 'השליחה נכשלה, נסה שוב', '#f87171');
    } finally {
      btn.disabled = false;
      btn.textContent = 'שלח משוב';
    }
  });
}

// אתחול ראשוני
initFeedbackBox();
initMagicFeatures();
initRoutines();
initCloudBackup();
initGuide();
initSettingsTabs();
initNotesReveal();
// אם נרשמו פנים: טוענים ומחממים את מנוע הזיהוי ברקע, כדי שהזיהוי מול הקהל יהיה מיידי
if (hasEnrolledFace()) setTimeout(() => loadFaceEngine().catch(() => {}), 2500);
initDeviceLicenseGate();
initSplashScreen();
initBiometricsEnrollment();
loadCustomMedia();
applyConfigToUI();
initInAppSelfUpdater();

// Service Worker: מאפשר עבודה אופליין בגרסת האתר. הקבצים מתעדכנים בפתיחה הבאה,
// בלי ריענון אוטומטי באמצע שימוש (כדי לא לשבור הופעה).
if (window.location.protocol !== 'file:' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then((reg) => reg.update())
    .catch(() => {});
}
