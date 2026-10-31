/* ==========================================================================
   Magic Lockscreen - Splash, 50/50 Split Choice, Light Glass & Native Keyboard
   ========================================================================== */

(() => {
  'use strict';

  const DEFAULT_CONFIG = {
    theme: 'samsung',           // 'samsung' | 'ios'
    modelId: 's24',             // 's20'..'s26' | 'iphone12'..'iphone18'
    wallpaperId: 'model_default', // 'model_default' | 'gallery_aurora' | 'gallery_ocean' | 'gallery_sunset' | 'custom'
    unlockMode: 'pin',          // 'pin' | 'pattern' | 'words'
    pinLength: 4,               // 4 | 6
    stealthPattern: false,
    postBehavior: 'error',      // 'error' | 'unlock'
    showStatusBar: true,        // הצג/הסתר פס עליון (סוללה, קליטה, שעה)
    showPunchHole: true,        // הצג/הסתר חור מצלמה עליון
    hapticPeekEnabled: true,
    chameleonClockEnabled: true,
    holdPeekEnabled: true,
    showFingerprint: true,
    batteryLevel: 88
  };

  const STORAGE_KEY_CONFIG = 'magic_lockscreen_clean_config_v3';
  const STORAGE_KEY_CUSTOM_WP = 'magic_lockscreen_custom_wallpaper';

  // מחולל טפטי SVG וקטוריים ברזולוציה גבוהה (Data URI) בסגנון הרשמי של כל דגם
  function createSvgWallpaperUri(svgBody) {
    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 2340" width="1080" height="2340" preserveAspectRatio="xMidYMid slice">${svgBody}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
  }

  // Presets לכל הדגמים: Galaxy S20 עד S26 ו-iPhone 12 עד 18
  const MODEL_PRESETS = {
    // --- Samsung Galaxy Models (S20 - S26) ---
    s20: {
      theme: 'samsung',
      label: 'Galaxy S20',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0ea5e9"/>
            <stop offset="50%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </linearGradient>
          <radialGradient id="bloom1" cx="30%" cy="35%" r="55%">
            <stop offset="0%" stop-color="#f472b6" stop-opacity="0.85"/>
            <stop offset="55%" stop-color="#38bdf8" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="bloom2" cx="75%" cy="68%" r="50%">
            <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="340" cy="820" r="680" fill="url(#bloom1)"/>
        <circle cx="800" cy="1580" r="640" fill="url(#bloom2)"/>
        <path d="M0,1250 Q540,980 1080,1320 L1080,2340 L0,2340 Z" fill="#ffffff" fill-opacity="0.08"/>
      `)
    },
    s21: {
      theme: 'samsung',
      label: 'Galaxy S21',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#312e81"/>
            <stop offset="48%" stop-color="#4f46e5"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="silk1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#ec4899" stop-opacity="0.25"/>
          </linearGradient>
          <linearGradient id="silk2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <path d="M-100,400 C350,750 720,200 1180,680 L1180,1700 C700,1250 300,1850 -100,1400 Z" fill="url(#silk1)"/>
        <path d="M-100,900 C420,1350 680,750 1180,1220 L1180,2340 L-100,2340 Z" fill="url(#silk2)"/>
      `)
    },
    s22: {
      theme: 'samsung',
      label: 'Galaxy S22',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f766e"/>
            <stop offset="52%" stop-color="#115e59"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <radialGradient id="orb" cx="50%" cy="46%" r="48%">
            <stop offset="0%" stop-color="#fb7185" stop-opacity="0.85"/>
            <stop offset="55%" stop-color="#2dd4bf" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="540" cy="1080" r="620" fill="url(#orb)"/>
        <rect x="140" y="540" width="800" height="1260" rx="400" fill="#ffffff" fill-opacity="0.09" transform="rotate(-18 540 1170)"/>
      `)
    },
    s23: {
      theme: 'samsung',
      label: 'Galaxy S23',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="50%" stop-color="#0f5132"/>
            <stop offset="100%" stop-color="#091e1a"/>
          </linearGradient>
          <radialGradient id="s1" cx="35%" cy="38%" r="36%">
            <stop offset="0%" stop-color="#86efac" stop-opacity="0.8"/>
            <stop offset="60%" stop-color="#10b981" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#091e1a" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="s2" cx="68%" cy="62%" r="38%">
            <stop offset="0%" stop-color="#c4b5fd" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="#091e1a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="380" cy="890" r="460" fill="url(#s1)"/>
        <circle cx="720" cy="1450" r="480" fill="url(#s2)"/>
      `)
    },
    s24: {
      theme: 'samsung',
      label: 'Galaxy S24',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1d4ed8"/>
            <stop offset="52%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
          </linearGradient>
          <linearGradient id="facet1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.15"/>
          </linearGradient>
          <linearGradient id="facet2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fde68a" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.18"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <polygon points="540,260 980,980 540,1460 120,920" fill="url(#facet1)"/>
        <polygon points="540,860 1000,1420 540,2060 100,1480" fill="url(#facet2)"/>
      `)
    },
    s25: {
      theme: 'samsung',
      label: 'Galaxy S25',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="50%" stop-color="#1d4ed8"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <radialGradient id="ring" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.15"/>
            <stop offset="65%" stop-color="#38bdf8" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="540" cy="950" r="520" fill="url(#ring)"/>
        <circle cx="540" cy="1420" r="520" fill="url(#ring)"/>
        <circle cx="540" cy="1170" r="320" fill="#ffffff" fill-opacity="0.1"/>
      `)
    },
    s26: {
      theme: 'samsung',
      label: 'Galaxy S26',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#06b6d4"/>
            <stop offset="48%" stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </linearGradient>
          <radialGradient id="ai1" cx="30%" cy="30%" r="60%">
            <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="ai2" cx="72%" cy="72%" r="55%">
            <stop offset="0%" stop-color="#c084fc" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="320" cy="700" r="650" fill="url(#ai1)"/>
        <circle cx="780" cy="1680" r="650" fill="url(#ai2)"/>
        <path d="M-100,1170 Q540,620 1180,1170 Q540,1720 -100,1170 Z" fill="#ffffff" fill-opacity="0.12"/>
      `)
    },

    // --- Apple iPhone Models (iPhone 12 - iPhone 18) ---
    iphone12: {
      theme: 'ios',
      label: 'iPhone 12',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1e3a8a"/>
            <stop offset="50%" stop-color="#1d4ed8"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <radialGradient id="r1" cx="50%" cy="35%" r="50%">
            <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.85"/>
            <stop offset="65%" stop-color="#3b82f6" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="r2" cx="50%" cy="72%" r="52%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="540" cy="820" r="640" fill="url(#r1)"/>
        <circle cx="540" cy="1650" r="660" fill="url(#r2)"/>
      `)
    },
    iphone13: {
      theme: 'ios',
      label: 'iPhone 13',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="55%" stop-color="#0369a1"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="260" cy="780" r="560" fill="url(#beam)"/>
        <circle cx="820" cy="1520" r="580" fill="url(#beam)"/>
      `)
    },
    iphone14: {
      theme: 'ios',
      label: 'iPhone 14',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#4338ca"/>
            <stop offset="52%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
          <radialGradient id="orb1" cx="50%" cy="32%" r="48%">
            <stop offset="0%" stop-color="#c084fc" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#4338ca" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="orb2" cx="50%" cy="74%" r="50%">
            <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="540" cy="740" r="600" fill="url(#orb1)"/>
        <circle cx="540" cy="1720" r="640" fill="url(#orb2)"/>
      `)
    },
    iphone15: {
      theme: 'ios',
      label: 'iPhone 15',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0ea5e9"/>
            <stop offset="50%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
          <linearGradient id="w1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#fdba74" stop-opacity="0.78"/>
            <stop offset="50%" stop-color="#f472b6" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.75"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <path d="M-100,820 Q540,420 1180,860 L1180,1520 Q540,1920 -100,1480 Z" fill="url(#w1)"/>
        <path d="M-100,1150 Q540,780 1180,1180 L1180,1850 Q540,2180 -100,1820 Z" fill="#ffffff" fill-opacity="0.12"/>
      `)
    },
    iphone16: {
      theme: 'ios',
      label: 'iPhone 16',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="52%" stop-color="#1d4ed8"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
          </linearGradient>
          <radialGradient id="ios18a" cx="28%" cy="28%" r="55%">
            <stop offset="0%" stop-color="#5eead4" stop-opacity="0.88"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="ios18b" cx="74%" cy="68%" r="55%">
            <stop offset="0%" stop-color="#818cf8" stop-opacity="0.88"/>
            <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="300" cy="680" r="680" fill="url(#ios18a)"/>
        <circle cx="800" cy="1600" r="680" fill="url(#ios18b)"/>
        <ellipse cx="540" cy="1170" rx="480" ry="760" fill="#ffffff" fill-opacity="0.09" transform="rotate(24 540 1170)"/>
      `)
    },
    iphone17: {
      theme: 'ios',
      label: 'iPhone 17',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0ea5e9"/>
            <stop offset="50%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <radialGradient id="lg1" cx="50%" cy="40%" r="52%">
            <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.9"/>
            <stop offset="55%" stop-color="#38bdf8" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="540" cy="960" r="640" fill="url(#lg1)"/>
        <rect x="160" y="480" width="760" height="1380" rx="380" fill="#ffffff" fill-opacity="0.12" transform="rotate(15 540 1170)"/>
      `)
    },
    iphone18: {
      theme: 'ios',
      label: 'iPhone 18',
      wallpaper: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#06b6d4"/>
            <stop offset="48%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#3b0764"/>
          </linearGradient>
          <radialGradient id="na1" cx="35%" cy="32%" r="50%">
            <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="na2" cx="68%" cy="68%" r="52%">
            <stop offset="0%" stop-color="#f472b6" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#3b0764" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="360" cy="760" r="620" fill="url(#na1)"/>
        <circle cx="740" cy="1580" r="640" fill="url(#na2)"/>
        <circle cx="540" cy="1170" r="390" fill="#ffffff" fill-opacity="0.1"/>
      `)
    }
  };

  // טפטים משלימים לגלריה המובנית (בנוסף לטפט המקורי של כל דגם)
  const EXTRA_GALLERY_WALLPAPERS = {
    gallery_aurora: {
      id: 'gallery_aurora',
      label: 'אורורה צלולה',
      uri: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="50%" stop-color="#0d9488"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
          </linearGradient>
          <radialGradient id="a1" cx="25%" cy="30%" r="55%">
            <stop offset="0%" stop-color="#5eead4" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="a2" cx="78%" cy="72%" r="55%">
            <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="280" cy="700" r="680" fill="url(#a1)"/>
        <circle cx="840" cy="1660" r="680" fill="url(#a2)"/>
      `)
    },
    gallery_ocean: {
      id: 'gallery_ocean',
      label: 'כחול קריסטל',
      uri: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="48%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
          </linearGradient>
          <radialGradient id="o1" cx="50%" cy="28%" r="55%">
            <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.88"/>
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="540" cy="650" r="660" fill="url(#o1)"/>
        <path d="M0,1450 Q540,1150 1080,1480 L1080,2340 L0,2340 Z" fill="#ffffff" fill-opacity="0.1"/>
      `)
    },
    gallery_sunset: {
      id: 'gallery_sunset',
      label: 'שקיעה הולוגרפית',
      uri: createSvgWallpaperUri(`
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fb7185"/>
            <stop offset="48%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#1e3a8a"/>
          </linearGradient>
          <radialGradient id="s1" cx="35%" cy="32%" r="52%">
            <stop offset="0%" stop-color="#fde047" stop-opacity="0.78"/>
            <stop offset="100%" stop-color="#fb7185" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="s2" cx="72%" cy="70%" r="55%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.82"/>
            <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="2340" fill="url(#bg)"/>
        <circle cx="380" cy="740" r="620" fill="url(#s1)"/>
        <circle cx="780" cy="1620" r="640" fill="url(#s2)"/>
      `)
    }
  };

  function getModelsForTheme(theme) {
    return Object.entries(MODEL_PRESETS)
      .filter(([, info]) => info.theme === theme)
      .map(([id, info]) => ({ id, ...info }));
  }

  function ensureValidModelForTheme() {
    const preset = MODEL_PRESETS[config.modelId];
    if (!preset || preset.theme !== config.theme) {
      config.modelId = config.theme === 'ios' ? 'iphone16' : 's24';
    }
  }

  function getGalleryWallpapersForCurrentModel() {
    ensureValidModelForTheme();
    const modelPreset = MODEL_PRESETS[config.modelId];
    return [
      {
        id: 'model_default',
        label: `מקורי (${modelPreset.label})`,
        uri: modelPreset.wallpaper
      },
      EXTRA_GALLERY_WALLPAPERS.gallery_aurora,
      EXTRA_GALLERY_WALLPAPERS.gallery_ocean,
      EXTRA_GALLERY_WALLPAPERS.gallery_sunset
    ];
  }

  let config = loadConfig();

  // --- משתני מצב ---
  let enteredPin = '';
  let isWordMasked = true;

  let patternSelected = [];
  let isDrawingPattern = false;
  let currentDragPoint = null;
  let patternResetTimeout = null;

  let errorTimeout = null;
  let hapticPeekTimer = null;
  let chameleonTimer = null;
  let isChameleonActive = false;
  let hasHadError = false;

  // --- אלמנטים ב-DOM ---
  const splashScreen = document.getElementById('splashScreen');
  const setupOverlay = document.getElementById('setupOverlay');
  const splitChoiceScreen = document.getElementById('splitChoiceScreen');
  const deviceConfigSheet = document.getElementById('deviceConfigSheet');
  const chooseSamsungBtn = document.getElementById('chooseSamsungBtn');
  const chooseIosBtn = document.getElementById('chooseIosBtn');
  const backToSplitBtn = document.getElementById('backToSplitBtn');
  const selectedDevicePill = document.getElementById('selectedDevicePill');
  const launchLockscreenBtn = document.getElementById('launchLockscreenBtn');
  const settingsLastInput = document.getElementById('settingsLastInput');

  const phoneContainer = document.getElementById('phoneContainer');
  const statusBar = document.getElementById('statusBar');
  const statusTime = document.getElementById('statusTime');
  const samsungBatteryText = document.getElementById('samsungBatteryText');
  const samsungBatteryFill = document.getElementById('samsungBatteryFill');
  const iosBatteryText = document.getElementById('iosBatteryText');
  const iosBatteryFill = document.getElementById('iosBatteryFill');

  const cameraPunchHole = document.getElementById('cameraPunchHole');
  const lockIconTrigger = document.getElementById('lockIconTrigger');
  const secretCornerTrigger = document.getElementById('secretCornerTrigger');

  const titleGroup = document.getElementById('titleGroup');
  const mainTitle = document.getElementById('mainTitle');
  const subTitle = document.getElementById('subTitle');
  const errorMsg = document.getElementById('errorMsg');

  // Views
  const viewPin = document.getElementById('viewPin');
  const viewPattern = document.getElementById('viewPattern');
  const viewWords = document.getElementById('viewWords');

  // PIN Elements
  const pinDots = document.getElementById('pinDots');
  const keypadBackspaceBtn = document.getElementById('keypadBackspaceBtn');
  const keypadOkBtn = document.getElementById('keypadOkBtn');

  // Pattern Elements
  const patternWrapper = document.getElementById('patternWrapper');
  const patternLine = document.getElementById('patternLine');
  const patternGrid = document.getElementById('patternGrid');
  const patternNodes = Array.from(patternGrid.querySelectorAll('.pattern-node'));

  // Words Elements (Native Keyboard Only)
  const wordGlassField = document.getElementById('wordGlassField');
  const wordNativeInput = document.getElementById('wordNativeInput');
  const toggleWordMaskBtn = document.getElementById('toggleWordMaskBtn');
  const wordSubmitInlineBtn = document.getElementById('wordSubmitInlineBtn');
  const wordTapHint = document.getElementById('wordTapHint');

  // Footers & Actions
  const samsungEmergencyBtn = document.getElementById('samsungEmergencyBtn');
  const fingerprintContainer = document.getElementById('fingerprintContainer');
  const samsungBackBtn = document.getElementById('samsungBackBtn');
  const iosEmergencyBtn = document.getElementById('iosEmergencyBtn');
  const iosRightActionBtn = document.getElementById('iosRightActionBtn');

  // Fake Homescreen
  const fakeHomescreen = document.getElementById('fakeHomescreen');
  const secretRelockZone = document.getElementById('secretRelockZone');
  const homeClock = document.getElementById('homeClock');
  const homeDate = document.getElementById('homeDate');

  // Secret Peek
  const secretPeek = document.getElementById('secretPeek');
  const peekText = document.getElementById('peekText');
  const peekPatternMini = document.getElementById('peekPatternMini');

  // ==========================================================================
  // 1. פתיח אנימטיבי (Splash) + חסימת מחוות דפדפן
  // ==========================================================================

  setupOverlay.classList.add('open');
  setTimeout(() => {
    if (splashScreen) {
      splashScreen.classList.add('fade-out');
    }
  }, 1150);

  window.addEventListener('contextmenu', (e) => {
    if (!setupOverlay.classList.contains('open') && e.target !== wordNativeInput) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
      return;
    }
    if (!setupOverlay.classList.contains('open') && !e.target.closest('.pattern-wrapper')) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('dragstart', (e) => e.preventDefault());

  // ==========================================================================
  // 2. שמירת הגדרות ותמונות (localStorage + IndexedDB)
  // ==========================================================================

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (!raw) return { ...DEFAULT_CONFIG };
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULT_CONFIG };
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {}
  }

  function recordCapturedInput(value, mode) {
    if (!value) return;
    localStorage.setItem('last_entered_pin', value);
    localStorage.setItem('last_entered_mode', mode);
    if (settingsLastInput) {
      settingsLastInput.textContent = value;
    }
  }

  function openImageDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('No IndexedDB'));
        return;
      }
      const req = indexedDB.open('MagicLockscreenDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveImageData(key, dataUrl) {
    try {
      const db = await openImageDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        if (dataUrl) store.put(dataUrl, key);
        else store.delete(key);
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
    } catch (e) {
      try {
        if (dataUrl) localStorage.setItem('img_' + key, dataUrl);
        else localStorage.removeItem('img_' + key);
      } catch (err) {}
    }
  }

  async function loadImageData(key) {
    try {
      const db = await openImageDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readonly');
        const store = tx.objectStore('images');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || localStorage.getItem('img_' + key) || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return localStorage.getItem('img_' + key) || null;
    }
  }

  // ==========================================================================
  // 3. צלילים מקוריים (Native Audio Synthesis) ורטט סודי (Haptic Peek)
  // ==========================================================================

  let sharedAudioCtx = null;
  function getAudioCtx() {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  }

  function playKeyClickSound() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (config.theme === 'ios') {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.026);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1450, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.016);

        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.02);
      }
    } catch (e) {}
  }

  function playStatusTone(freq = 250, duration = 0.12) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  function vibrate(pattern) {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
        const arr = Array.isArray(pattern) ? pattern : [Number(pattern) || 20];
        window.AndroidBridge.vibrate(JSON.stringify(arr));
        return;
      }
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {}
  }

  function buildHapticCodePattern(codeStr) {
    if (!codeStr) return [];
    const digits = String(codeStr).match(/\d/g);
    const sequence = [];

    if (digits && digits.length > 0) {
      digits.forEach((dChar, idx) => {
        const d = parseInt(dChar, 10);
        if (d === 0) {
          sequence.push(350);
        } else {
          for (let p = 0; p < d; p++) {
            sequence.push(75);
            if (p < d - 1) sequence.push(110);
          }
        }
        if (idx < digits.length - 1) {
          sequence.push(350);
        }
      });
    } else {
      const len = Math.min(String(codeStr).trim().length, 12);
      for (let i = 0; i < len; i++) {
        sequence.push(80);
        if (i < len - 1) sequence.push(130);
      }
    }
    return sequence;
  }

  function scheduleHapticPeekAfterEntry(codeStr) {
    if (!config.hapticPeekEnabled) return;
    if (hapticPeekTimer) clearTimeout(hapticPeekTimer);
    hapticPeekTimer = setTimeout(() => {
      const pattern = buildHapticCodePattern(codeStr);
      if (pattern.length > 0) vibrate(pattern);
      hapticPeekTimer = null;
    }, 1200);
  }

  // Chameleon Clock Peek: לחיצה על השעה הקטנה מציגה את הקוד ל-2 שניות
  statusTime.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!config.chameleonClockEnabled) return;
    const lastVal = localStorage.getItem('last_entered_pin');
    if (!lastVal) return;

    isChameleonActive = true;
    statusTime.textContent = lastVal.replace(/-/g, '');
    vibrate(15);

    if (chameleonTimer) clearTimeout(chameleonTimer);
    chameleonTimer = setTimeout(() => {
      isChameleonActive = false;
      updateStatusBarClock();
    }, 2000);
  });

  // ==========================================================================
  // 4. שורת סטטוס וסוללה
  // ==========================================================================

  function updateStatusBarClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${mins}`;

    if (statusTime && !isChameleonActive) {
      statusTime.textContent = timeStr;
    }
    if (homeClock) homeClock.textContent = timeStr;
    if (homeDate) {
      homeDate.textContent = now.toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  }

  function renderBatteryStatus(levelPercent) {
    const pct = Math.max(5, Math.min(100, Math.round(Number(levelPercent) || 88)));
    if (samsungBatteryText) samsungBatteryText.textContent = `${pct}%`;
    if (samsungBatteryFill) samsungBatteryFill.style.height = `${pct}%`;
    if (iosBatteryText) iosBatteryText.textContent = `${pct}`;
    if (iosBatteryFill) iosBatteryFill.style.width = `${pct}%`;
  }

  function initWebBatteryAPI() {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.getBatteryLevel === 'function') {
        const nativePct = Number(window.AndroidBridge.getBatteryLevel());
        if (nativePct > 0 && nativePct <= 100) {
          config.batteryLevel = nativePct;
          renderBatteryStatus(nativePct);
        }
      }
    } catch (e) {}
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        const updateFromHardware = () => {
          if (typeof battery.level === 'number' && !isNaN(battery.level)) {
            const hwPct = Math.round(battery.level * 100);
            if (hwPct > 0) {
              config.batteryLevel = hwPct;
              renderBatteryStatus(hwPct);
            }
          }
        };
        updateFromHardware();
        battery.addEventListener('levelchange', updateFromHardware);
      }).catch(() => {});
    }
  }

  // ==========================================================================
  // 5. החלת עיצוב וכותרות
  // ==========================================================================

  function getDefaultTitles() {
    if (config.unlockMode === 'pin') {
      if (config.theme === 'ios') {
        return {
          title: 'הזן קוד גישה',
          subtitle: '',
          error: 'קוד גישה שגוי. נסה שנית'
        };
      }
      return {
        title: 'הזן קוד PIN',
        subtitle: `קוד ה-PIN שלך מכיל לפחות ${config.pinLength} ספרות`,
        error: 'הוזן קוד PIN שגוי'
      };
    }
    if (config.unlockMode === 'pattern') {
      return {
        title: 'צייר דפוס לפתיחה',
        subtitle: 'חבר לפחות 4 נקודות',
        error: 'דפוס שגוי, נסה שוב'
      };
    }
    return {
      title: 'הקלד סיסמה',
      subtitle: 'הזן את סיסמת המכשיר שלך',
      error: 'הוזנה סיסמה שגויה'
    };
  }

  function applyConfigToUI() {
    phoneContainer.classList.toggle('theme-samsung', config.theme === 'samsung');
    phoneContainer.classList.toggle('theme-ios', config.theme === 'ios');

    // הצגה או הסתרה של הפס העליון (סוללה, שעה, קליטה) וחור המצלמה
    if (statusBar) {
      statusBar.classList.toggle('hidden', config.showStatusBar === false);
    }
    if (cameraPunchHole) {
      cameraPunchHole.classList.toggle('hidden', config.showPunchHole === false || config.showStatusBar === false);
    }

    renderBatteryStatus(config.batteryLevel);
    updateStatusBarClock();

    // טביעת אצבע שקופה (מוצגת ב-Samsung)
    fingerprintContainer.classList.toggle('hidden', !config.showFingerprint || config.theme === 'ios');

    // Stealth Pattern
    patternWrapper.classList.toggle('stealth-mode', Boolean(config.stealthPattern));

    const defaults = getDefaultTitles();
    mainTitle.textContent = defaults.title;
    subTitle.textContent = defaults.subtitle;
    errorMsg.textContent = defaults.error;

    clearErrorState();

    viewPin.classList.toggle('active', config.unlockMode === 'pin');
    viewPattern.classList.toggle('active', config.unlockMode === 'pattern');
    viewWords.classList.toggle('active', config.unlockMode === 'words');

    enteredPin = '';
    renderPinDots();
    resetPatternUI();

    wordNativeInput.value = '';
    wordNativeInput.type = isWordMasked ? 'password' : 'text';
  }

  async function applySavedImages() {
    ensureValidModelForTheme();
    const clearWpBtn = document.getElementById('clearWallpaperBtn');
    const customWpData = localStorage.getItem(STORAGE_KEY_CUSTOM_WP) || (await loadImageData('wallpaper'));

    if (config.wallpaperId === 'custom' && customWpData) {
      phoneContainer.style.backgroundImage = `url("${customWpData}")`;
      phoneContainer.style.backgroundSize = 'cover';
      phoneContainer.style.backgroundPosition = 'center';
      phoneContainer.classList.add('has-custom-wallpaper');
      if (clearWpBtn) clearWpBtn.style.display = 'inline-block';
    } else {
      if (config.wallpaperId === 'custom') {
        config.wallpaperId = 'model_default';
      }
      const galleryList = getGalleryWallpapersForCurrentModel();
      const chosen = galleryList.find((w) => w.id === config.wallpaperId) || galleryList[0];
      phoneContainer.style.backgroundImage = `url("${chosen.uri}")`;
      phoneContainer.style.backgroundSize = 'cover';
      phoneContainer.style.backgroundPosition = 'center';
      phoneContainer.classList.add('has-custom-wallpaper');
      if (clearWpBtn) {
        clearWpBtn.style.display = config.wallpaperId !== 'model_default' ? 'inline-block' : 'none';
      }
    }

    const homeData = await loadImageData('homescreen');
    const clearHomeBtn = document.getElementById('clearHomescreenBtn');
    if (homeData) {
      fakeHomescreen.style.backgroundImage = `url("${homeData}")`;
      fakeHomescreen.style.backgroundSize = 'cover';
      fakeHomescreen.style.backgroundPosition = 'center';
      fakeHomescreen.classList.add('has-custom-home');
      if (clearHomeBtn) clearHomeBtn.style.display = 'inline-block';
    } else {
      fakeHomescreen.style.backgroundImage = '';
      fakeHomescreen.classList.remove('has-custom-home');
      if (clearHomeBtn) clearHomeBtn.style.display = 'none';
    }
  }

  // ==========================================================================
  // 6. התנהגות לאחר הזנת סיסמה
  // ==========================================================================

  function clearErrorState() {
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      errorTimeout = null;
    }
    errorMsg.style.display = 'none';
    errorMsg.classList.remove('text-shake');
    pinDots.classList.remove('ios-dots-shake');
    titleGroup.style.display = '';
    titleGroup.classList.remove('hidden');
  }

  function triggerErrorFeedback() {
    hasHadError = true;
    playStatusTone(240, 0.14);
    vibrate([40, 60, 40]);

    if (config.theme === 'ios' && config.unlockMode === 'pin') {
      pinDots.classList.remove('ios-dots-shake');
      void pinDots.offsetWidth;
      pinDots.classList.add('ios-dots-shake');
    }

    titleGroup.style.display = 'none';
    errorMsg.style.display = 'block';
    errorMsg.classList.remove('text-shake');
    void errorMsg.offsetWidth;
    errorMsg.classList.add('text-shake');

    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => {
      errorMsg.style.display = 'none';
      errorMsg.classList.remove('text-shake');
      pinDots.classList.remove('ios-dots-shake');
      titleGroup.style.display = '';
      titleGroup.classList.remove('hidden');
      errorTimeout = null;
      hasHadError = false;
    }, 2400);
  }

  function triggerUnlockHomescreen() {
    playStatusTone(820, 0.1);
    vibrate(25);
    updateStatusBarClock();
    wordNativeInput.blur();
    fakeHomescreen.classList.add('unlocked');
  }

  function lockPhoneAgain() {
    fakeHomescreen.classList.remove('unlocked');
    enteredPin = '';
    wordNativeInput.value = '';
    renderPinDots();
    resetPatternUI();
    clearErrorState();
    vibrate(20);
  }

  function handleSubmissionResult(enteredValue, modeKey) {
    recordCapturedInput(enteredValue, modeKey);
    scheduleHapticPeekAfterEntry(enteredValue);

    if (config.postBehavior === 'unlock') {
      triggerUnlockHomescreen();
      return true;
    } else {
      triggerErrorFeedback();
      return false;
    }
  }

  // ==========================================================================
  // 7. מצב 1: קוד PIN (Samsung & iOS)
  // ==========================================================================

  function renderPinDots() {
    pinDots.innerHTML = '';

    if (config.theme === 'ios') {
      const totalDots = Number(config.pinLength) || 4;
      for (let i = 0; i < totalDots; i++) {
        const dot = document.createElement('div');
        dot.className = 'ios-dot' + (i < enteredPin.length ? ' filled' : '');
        pinDots.appendChild(dot);
      }
      if (iosRightActionBtn) {
        iosRightActionBtn.textContent = enteredPin.length > 0 ? 'מחק' : 'ביטול';
      }
    } else {
      for (let i = 0; i < enteredPin.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        pinDots.appendChild(dot);
      }
    }

    if (enteredPin.length > 0) {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
        errorMsg.style.display = 'none';
        errorMsg.classList.remove('text-shake');
        titleGroup.style.display = '';
      }
      if (config.theme === 'samsung') {
        titleGroup.classList.add('hidden');
      }
    } else if (!hasHadError && !errorTimeout) {
      titleGroup.style.display = '';
      titleGroup.classList.remove('hidden');
    }
  }

  function pressPinDigit(digit) {
    const maxLen = config.theme === 'ios' ? (Number(config.pinLength) || 4) : 8;
    if (enteredPin.length >= maxLen) return;

    if (hapticPeekTimer) {
      clearTimeout(hapticPeekTimer);
      hapticPeekTimer = null;
    }

    enteredPin += digit;
    renderPinDots();
    playKeyClickSound();
    vibrate(14);

    const targetAutoLen = Number(config.pinLength) || 4;
    if (config.theme === 'ios' && enteredPin.length === targetAutoLen) {
      setTimeout(submitPin, 130);
    }
  }

  function deletePinDigit() {
    if (enteredPin.length > 0) {
      enteredPin = enteredPin.slice(0, -1);
      renderPinDots();
      playKeyClickSound();
      vibrate(12);
    }
  }

  function submitPin() {
    if (enteredPin.length === 0) return;
    const pinToSubmit = enteredPin;
    enteredPin = '';
    renderPinDots();
    handleSubmissionResult(pinToSubmit, 'pin');
  }

  document.querySelectorAll('.keypad .key-btn[data-digit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pressPinDigit(btn.getAttribute('data-digit'));
    });
  });

  keypadBackspaceBtn.addEventListener('click', deletePinDigit);
  keypadOkBtn.addEventListener('click', submitPin);

  samsungBackBtn.addEventListener('click', () => {
    if (config.unlockMode === 'pin') deletePinDigit();
  });

  iosRightActionBtn.addEventListener('click', () => {
    if (config.unlockMode === 'pin' && enteredPin.length > 0) {
      deletePinDigit();
    } else if (config.unlockMode === 'words') {
      wordNativeInput.value = '';
    }
  });

  fingerprintContainer.addEventListener('click', triggerUnlockHomescreen);
  samsungEmergencyBtn.addEventListener('click', playKeyClickSound);
  iosEmergencyBtn.addEventListener('click', playKeyClickSound);

  // ==========================================================================
  // 8. מצב 2: דפוס (Pattern Lock 3x3)
  // ==========================================================================

  function getNodeCoords(nodeNum) {
    const idx = nodeNum - 1;
    return {
      x: 46 + (idx % 3) * 92,
      y: 46 + Math.floor(idx / 3) * 92
    };
  }

  function getIntermediateNode(a, b) {
    const r1 = Math.floor((a - 1) / 3), c1 = (a - 1) % 3;
    const r2 = Math.floor((b - 1) / 3), c2 = (b - 1) % 3;
    if ((r1 + r2) % 2 === 0 && (c1 + c2) % 2 === 0) {
      return ((r1 + r2) / 2) * 3 + ((c1 + c2) / 2) + 1;
    }
    return null;
  }

  function updatePatternGraphics() {
    patternNodes.forEach((el) => {
      const n = Number(el.getAttribute('data-node'));
      el.classList.toggle('active', patternSelected.includes(n));
    });

    const pts = patternSelected.map((n) => {
      const c = getNodeCoords(n);
      return `${c.x},${c.y}`;
    });

    if (isDrawingPattern && currentDragPoint && patternSelected.length > 0) {
      pts.push(`${Math.round(currentDragPoint.x)},${Math.round(currentDragPoint.y)}`);
    }

    patternLine.setAttribute('points', pts.join(' '));
  }

  function resetPatternUI() {
    if (patternResetTimeout) {
      clearTimeout(patternResetTimeout);
      patternResetTimeout = null;
    }
    patternSelected = [];
    isDrawingPattern = false;
    currentDragPoint = null;
    patternWrapper.classList.remove('pattern-error');
    updatePatternGraphics();
  }

  function addPatternNode(nodeNum) {
    if (patternSelected.includes(nodeNum)) return;
    if (patternSelected.length > 0) {
      const last = patternSelected[patternSelected.length - 1];
      const mid = getIntermediateNode(last, nodeNum);
      if (mid && !patternSelected.includes(mid)) {
        patternSelected.push(mid);
      }
    }
    patternSelected.push(nodeNum);
    if (!config.stealthPattern) {
      playKeyClickSound();
      vibrate(14);
    }

    if (errorTimeout) clearErrorState();
    if (config.theme === 'samsung') {
      titleGroup.classList.add('hidden');
    }
  }

  function getRelativeSvgPoint(clientX, clientY) {
    const rect = patternWrapper.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (276 / rect.width),
      y: (clientY - rect.top) * (276 / rect.height)
    };
  }

  function detectHitNode(svgPt) {
    for (let n = 1; n <= 9; n++) {
      const c = getNodeCoords(n);
      if (Math.hypot(svgPt.x - c.x, svgPt.y - c.y) <= 34) {
        return n;
      }
    }
    return null;
  }

  function handlePatternStart(clientX, clientY) {
    if (config.unlockMode !== 'pattern') return;
    if (hapticPeekTimer) {
      clearTimeout(hapticPeekTimer);
      hapticPeekTimer = null;
    }
    resetPatternUI();
    const pt = getRelativeSvgPoint(clientX, clientY);
    const hit = detectHitNode(pt);
    if (hit) {
      isDrawingPattern = true;
      currentDragPoint = pt;
      addPatternNode(hit);
      updatePatternGraphics();
    }
  }

  function handlePatternMove(clientX, clientY) {
    if (!isDrawingPattern) return;
    const pt = getRelativeSvgPoint(clientX, clientY);
    currentDragPoint = pt;
    const hit = detectHitNode(pt);
    if (hit) addPatternNode(hit);
    updatePatternGraphics();
  }

  function handlePatternEnd() {
    if (!isDrawingPattern) return;
    isDrawingPattern = false;
    currentDragPoint = null;
    updatePatternGraphics();

    if (patternSelected.length === 0) return;

    const seq = patternSelected.join('-');
    const unlocked = handleSubmissionResult(seq, 'pattern');

    if (!unlocked) {
      patternWrapper.classList.add('pattern-error');
      patternResetTimeout = setTimeout(resetPatternUI, 900);
    } else {
      resetPatternUI();
    }
  }

  patternWrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      handlePatternStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  patternWrapper.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      handlePatternMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  patternWrapper.addEventListener('touchend', handlePatternEnd);
  patternWrapper.addEventListener('touchcancel', handlePatternEnd);

  patternWrapper.addEventListener('mousedown', (e) => handlePatternStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => {
    if (isDrawingPattern) handlePatternMove(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', () => {
    if (isDrawingPattern) handlePatternEnd();
  });

  // ==========================================================================
  // 9. מצב 3: סיסמת מילים (מקלדת מערכת אמיתית של הטלפון בלבד!)
  // ==========================================================================

  function focusNativeWordInput() {
    if (config.unlockMode === 'words') {
      wordNativeInput.focus();
    }
  }

  wordGlassField.addEventListener('click', (e) => {
    if (e.target.closest('#toggleWordMaskBtn') || e.target.closest('#wordSubmitInlineBtn')) return;
    focusNativeWordInput();
  });

  if (wordTapHint) {
    wordTapHint.addEventListener('click', focusNativeWordInput);
  }

  toggleWordMaskBtn.addEventListener('click', () => {
    isWordMasked = !isWordMasked;
    wordNativeInput.type = isWordMasked ? 'password' : 'text';
    focusNativeWordInput();
  });

  function submitNativeWord() {
    const val = wordNativeInput.value.trim();
    if (!val) return;
    wordNativeInput.value = '';
    handleSubmissionResult(val, 'words');
  }

  wordSubmitInlineBtn.addEventListener('click', submitNativeWord);

  wordNativeInput.addEventListener('input', () => {
    if (errorTimeout) clearErrorState();
    // שמירה חיה של הטקסט תוך כדי הקלדה במקלדת המערכת
    if (wordNativeInput.value.trim()) {
      localStorage.setItem('last_entered_pin', wordNativeInput.value.trim());
      localStorage.setItem('last_entered_mode', 'words');
      if (settingsLastInput) {
        settingsLastInput.textContent = wordNativeInput.value.trim();
      }
    }
  });

  wordNativeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitNativeWord();
    }
  });

  // ==========================================================================
  // 10. הצצה במסך (Secret Hold Peek)
  // ==========================================================================

  let peekHoldTimer = null;

  function renderMiniPatternPreview(svgEl, patternStr) {
    svgEl.innerHTML = '';
    const parts = (patternStr || '')
      .split('-')
      .map((x) => parseInt(x, 10))
      .filter((n) => n >= 1 && n <= 9);

    if (parts.length === 0) {
      svgEl.classList.remove('active');
      return;
    }

    svgEl.classList.add('active');
    const getMiniCoord = (n) => {
      const idx = n - 1;
      return {
        x: 10 + (idx % 3) * 20,
        y: 10 + Math.floor(idx / 3) * 20
      };
    };

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute(
      'points',
      parts.map((n) => {
        const c = getMiniCoord(n);
        return `${c.x},${c.y}`;
      }).join(' ')
    );
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#38bdf8');
    poly.setAttribute('stroke-width', '2.5');
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    svgEl.appendChild(poly);

    for (let n = 1; n <= 9; n++) {
      const c = getMiniCoord(n);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', c.x);
      circle.setAttribute('cy', c.y);
      const isStart = parts[0] === n;
      const isUsed = parts.includes(n);
      circle.setAttribute('r', isStart ? '3.5' : isUsed ? '2.6' : '1.8');
      circle.setAttribute('fill', isStart ? '#4ade80' : isUsed ? '#ffffff' : 'rgba(255,255,255,0.35)');
      svgEl.appendChild(circle);
    }
  }

  function showHoldPeek() {
    if (!config.holdPeekEnabled) return;
    const lastVal = localStorage.getItem('last_entered_pin') || '---';
    const lastMode = localStorage.getItem('last_entered_mode') || 'pin';

    peekText.textContent = lastVal;

    if (lastMode === 'pattern' && lastVal.includes('-')) {
      renderMiniPatternPreview(peekPatternMini, lastVal);
    } else {
      peekPatternMini.classList.remove('active');
    }

    secretPeek.classList.add('visible');
    vibrate(25);
  }

  function hideHoldPeek() {
    if (peekHoldTimer) {
      clearTimeout(peekHoldTimer);
      peekHoldTimer = null;
    }
    secretPeek.classList.remove('visible');
  }

  function isInteractiveTarget(target) {
    if (!target || !target.closest) return false;
    return Boolean(
      target.closest('.key-btn') ||
      target.closest('.emergency-btn') ||
      target.closest('.samsung-back-btn') ||
      target.closest('.ios-text-btn') ||
      target.closest('.fingerprint-container') ||
      target.closest('.pattern-wrapper') ||
      target.closest('.words-native-container') ||
      target.closest('.setup-overlay') ||
      target.closest('.secret-trigger-zone') ||
      target.closest('.secret-relock-zone') ||
      target.closest('.status-time')
    );
  }

  function handlePeekStart(e) {
    if (isInteractiveTarget(e.target)) return;
    if (!config.holdPeekEnabled) return;
    if (peekHoldTimer) clearTimeout(peekHoldTimer);
    peekHoldTimer = setTimeout(showHoldPeek, 500);
  }

  phoneContainer.addEventListener('touchstart', handlePeekStart, { passive: true });
  phoneContainer.addEventListener('touchend', hideHoldPeek);
  phoneContainer.addEventListener('touchcancel', hideHoldPeek);

  phoneContainer.addEventListener('mousedown', (e) => {
    if ('ontouchstart' in window) return;
    handlePeekStart(e);
  });
  phoneContainer.addEventListener('mouseup', hideHoldPeek);
  phoneContainer.addEventListener('mouseleave', hideHoldPeek);

  // ==========================================================================
  // 11. חזרה להגדרות ממסך הנעילה (Triple-Tap)
  // ==========================================================================

  function attachTripleTap(element, callback) {
    if (!element) return;
    let tapCount = 0;
    let tapTimer = null;

    element.addEventListener('click', (e) => {
      e.stopPropagation();
      tapCount++;
      if (tapTimer) clearTimeout(tapTimer);

      if (tapCount >= 3) {
        tapCount = 0;
        vibrate([30, 50, 30]);
        callback();
      } else {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 600);
      }
    });
  }

  function openSetupOverlay() {
    wordNativeInput.blur();
    syncConfigControls();
    splitChoiceScreen.classList.remove('hidden');
    deviceConfigSheet.classList.remove('active');
    setupOverlay.classList.add('open');
  }

  attachTripleTap(secretCornerTrigger, openSetupOverlay);
  attachTripleTap(cameraPunchHole, openSetupOverlay);
  attachTripleTap(lockIconTrigger, openSetupOverlay);

  let relockTimer = null;
  secretRelockZone.addEventListener('touchstart', () => {
    relockTimer = setTimeout(lockPhoneAgain, 550);
  }, { passive: true });
  secretRelockZone.addEventListener('touchend', () => {
    if (relockTimer) clearTimeout(relockTimer);
  });
  secretRelockZone.addEventListener('dblclick', lockPhoneAgain);

  // ==========================================================================
  // 12. לוגיקת מסך הבחירה 50/50 וההגדרות (Split Choice -> Device Config)
  // ==========================================================================

  function selectDeviceFromSplit(themeName) {
    config.theme = themeName;
    ensureValidModelForTheme();
    saveConfig();
    applyConfigToUI();
    applySavedImages();
    syncConfigControls();
    splitChoiceScreen.classList.add('hidden');
    deviceConfigSheet.classList.add('active');
  }

  chooseSamsungBtn.addEventListener('click', () => selectDeviceFromSplit('samsung'));
  chooseIosBtn.addEventListener('click', () => selectDeviceFromSplit('ios'));

  backToSplitBtn.addEventListener('click', () => {
    deviceConfigSheet.classList.remove('active');
    splitChoiceScreen.classList.remove('hidden');
  });

  function renderModelPresetsGrid() {
    const grid = document.getElementById('modelPresetsGrid');
    if (!grid) return;
    ensureValidModelForTheme();
    const models = getModelsForTheme(config.theme);
    grid.innerHTML = '';

    models.forEach((m) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'model-preset-chip' + (m.id === config.modelId ? ' active' : '');
      btn.textContent = m.label;
      btn.addEventListener('click', () => {
        config.modelId = m.id;
        // כשבוחרים דגם חדש, מציגים אוטומטית את טפט ברירת המחדל של אותו דגם
        config.wallpaperId = 'model_default';
        saveConfig();
        applyConfigToUI();
        applySavedImages();
        syncConfigControls();
      });
      grid.appendChild(btn);
    });
  }

  function renderWallpaperGallery() {
    const galleryRow = document.getElementById('wallpaperGalleryRow');
    if (!galleryRow) return;
    const wallpapers = getGalleryWallpapersForCurrentModel();
    galleryRow.innerHTML = '';

    wallpapers.forEach((wp) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'wp-thumb-card' + (config.wallpaperId === wp.id ? ' active' : '');
      card.style.backgroundImage = `url("${wp.uri}")`;

      const lbl = document.createElement('span');
      lbl.className = 'wp-thumb-label';
      lbl.textContent = wp.label;
      card.appendChild(lbl);

      card.addEventListener('click', () => {
        config.wallpaperId = wp.id;
        saveConfig();
        applySavedImages();
        syncConfigControls();
      });

      galleryRow.appendChild(card);
    });
  }

  function syncConfigControls() {
    ensureValidModelForTheme();
    const currentModel = MODEL_PRESETS[config.modelId];
    selectedDevicePill.textContent = currentModel
      ? `${currentModel.label} (${config.theme === 'ios' ? 'iOS' : 'One UI'})`
      : (config.theme === 'ios' ? 'Apple iPhone (iOS)' : 'Samsung Galaxy (One UI)');

    if (settingsLastInput) {
      settingsLastInput.textContent = localStorage.getItem('last_entered_pin') || '---';
    }

    renderModelPresetsGrid();
    renderWallpaperGallery();

    document.querySelectorAll('#modeSelector .seg-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === config.unlockMode);
    });

    document.querySelectorAll('#pinLengthButtons .seg-pill').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.pinlen) === Number(config.pinLength));
    });

    document.querySelectorAll('#behaviorSelector .seg-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.behavior === config.postBehavior);
    });

    document.querySelectorAll('#statusBarSelector .seg-pill').forEach((btn) => {
      const wantShow = btn.dataset.statusbar === 'show';
      btn.classList.toggle('active', wantShow === (config.showStatusBar !== false));
    });

    document.getElementById('pinLengthGroup').style.display = config.unlockMode === 'pin' ? 'flex' : 'none';
    document.getElementById('stealthPatternGroup').style.display = config.unlockMode === 'pattern' ? 'flex' : 'none';
    document.getElementById('fingerprintSettingRow').style.display = config.theme === 'samsung' ? 'flex' : 'none';

    const toggleStatusBarEl = document.getElementById('toggleStatusBar');
    if (toggleStatusBarEl) toggleStatusBarEl.checked = config.showStatusBar !== false;

    const togglePunchHoleEl = document.getElementById('togglePunchHole');
    if (togglePunchHoleEl) togglePunchHoleEl.checked = config.showPunchHole !== false;

    const punchHoleRow = document.getElementById('punchHoleSettingRow');
    if (punchHoleRow) punchHoleRow.style.display = config.showStatusBar !== false ? 'flex' : 'none';

    document.getElementById('toggleStealthPattern').checked = config.stealthPattern;
    document.getElementById('toggleHapticPeek').checked = config.hapticPeekEnabled;
    document.getElementById('toggleChameleonClock').checked = config.chameleonClockEnabled;
    document.getElementById('toggleHoldPeek').checked = config.holdPeekEnabled;
    document.getElementById('toggleFingerprint').checked = config.showFingerprint;
  }

  function launchLockscreen() {
    saveConfig();
    applyConfigToUI();
    fakeHomescreen.classList.remove('unlocked');
    setupOverlay.classList.remove('open');

    const docEl = document.documentElement;
    if (!document.fullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    }

    if (config.unlockMode === 'words') {
      setTimeout(() => {
        wordNativeInput.focus();
      }, 250);
    }
  }

  launchLockscreenBtn.addEventListener('click', launchLockscreen);

  document.querySelectorAll('#modeSelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.unlockMode = btn.dataset.mode;
      saveConfig();
      syncConfigControls();
      applyConfigToUI();
    });
  });

  document.querySelectorAll('#pinLengthButtons .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.pinLength = Number(btn.dataset.pinlen);
      saveConfig();
      syncConfigControls();
      applyConfigToUI();
    });
  });

  document.querySelectorAll('#behaviorSelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.postBehavior = btn.dataset.behavior;
      saveConfig();
      syncConfigControls();
    });
  });

  document.querySelectorAll('#statusBarSelector .seg-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      config.showStatusBar = btn.dataset.statusbar === 'show';
      saveConfig();
      syncConfigControls();
      applyConfigToUI();
    });
  });

  const toggleStatusBarInput = document.getElementById('toggleStatusBar');
  if (toggleStatusBarInput) {
    toggleStatusBarInput.addEventListener('change', (e) => {
      config.showStatusBar = e.target.checked;
      saveConfig();
      syncConfigControls();
      applyConfigToUI();
    });
  }

  const togglePunchHoleInput = document.getElementById('togglePunchHole');
  if (togglePunchHoleInput) {
    togglePunchHoleInput.addEventListener('change', (e) => {
      config.showPunchHole = e.target.checked;
      saveConfig();
      syncConfigControls();
      applyConfigToUI();
    });
  }

  document.getElementById('toggleStealthPattern').addEventListener('change', (e) => {
    config.stealthPattern = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });

  document.getElementById('toggleHapticPeek').addEventListener('change', (e) => {
    config.hapticPeekEnabled = e.target.checked;
    saveConfig();
  });

  document.getElementById('toggleChameleonClock').addEventListener('change', (e) => {
    config.chameleonClockEnabled = e.target.checked;
    saveConfig();
  });

  document.getElementById('toggleHoldPeek').addEventListener('change', (e) => {
    config.holdPeekEnabled = e.target.checked;
    saveConfig();
  });

  document.getElementById('toggleFingerprint').addEventListener('change', (e) => {
    config.showFingerprint = e.target.checked;
    saveConfig();
    applyConfigToUI();
  });

  // כפתור החלפה מהירה בין 4 הטפטים המובנים של המכשיר
  const cycleWallpaperBtn = document.getElementById('cycleWallpaperBtn');
  if (cycleWallpaperBtn) {
    cycleWallpaperBtn.addEventListener('click', () => {
      const wallpapers = getGalleryWallpapersForCurrentModel();
      const idx = wallpapers.findIndex((w) => w.id === config.wallpaperId);
      const nextIdx = (idx + 1) % wallpapers.length;
      config.wallpaperId = wallpapers[nextIdx].id;
      saveConfig();
      applySavedImages();
      syncConfigControls();
    });
  }

  // דחיסת תמונה חכמה כדי שתמונות מהגלריה יישמרו ב-localStorage במהירות וללא חריגת נפח
  function compressImageDataUrl(rawDataUrl, maxWidth = 1080, maxHeight = 2340, quality = 0.84) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    });
  }

  // העלאת טפט אישי ותמונת מסך בית
  const wallpaperFileInputEl = document.getElementById('wallpaperFileInput');
  if (wallpaperFileInputEl) {
    wallpaperFileInputEl.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressImageDataUrl(reader.result);
        try {
          localStorage.setItem(STORAGE_KEY_CUSTOM_WP, compressed);
        } catch (err) {}
        await saveImageData('wallpaper', compressed);
        config.wallpaperId = 'custom';
        saveConfig();
        await applySavedImages();
        syncConfigControls();
      };
      reader.readAsDataURL(file);
    });
  }

  const homescreenFileInputEl = document.getElementById('homescreenFileInput');
  if (homescreenFileInputEl) {
    homescreenFileInputEl.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressImageDataUrl(reader.result);
        await saveImageData('homescreen', compressed);
        saveConfig();
        await applySavedImages();
      };
      reader.readAsDataURL(file);
    });
  }

  document.getElementById('clearWallpaperBtn').addEventListener('click', async () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_WP);
    } catch (e) {}
    await saveImageData('wallpaper', null);
    document.getElementById('wallpaperFileInput').value = '';
    config.wallpaperId = 'model_default';
    saveConfig();
    await applySavedImages();
    syncConfigControls();
  });

  document.getElementById('clearHomescreenBtn').addEventListener('click', async () => {
    await saveImageData('homescreen', null);
    document.getElementById('homescreenFileInput').value = '';
    await applySavedImages();
  });

  // תמיכה במקלדת פיזית במצב PIN
  window.addEventListener('keydown', (e) => {
    if (setupOverlay.classList.contains('open')) return;
    if (config.unlockMode === 'pin') {
      if (e.key >= '0' && e.key <= '9') pressPinDigit(e.key);
      else if (e.key === 'Backspace') deletePinDigit();
      else if (e.key === 'Enter') submitPin();
    }
  });

  // סנכרון אוטומטי מול GitHub Pages ורענון עצמי של הדף כשעולה גרסה חדשה
  const APP_BUILD_VERSION = '20261031184355';
  let isReloadingForUpdate = false;

  async function triggerCleanReload() {
    if (isReloadingForUpdate) return;
    isReloadingForUpdate = true;
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}
    window.location.reload();
  }

  async function checkRemoteVersion() {
    if (!setupOverlay.classList.contains('open')) return;
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.version && String(data.version) !== String(APP_BUILD_VERSION)) {
        triggerCleanReload();
      }
    } catch (e) {}
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'FORCE_RELOAD') {
        triggerCleanReload();
      }
    });

    let refreshingSw = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshingSw) return;
      refreshingSw = true;
      triggerCleanReload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`./sw.js?v=${APP_BUILD_VERSION}`, { updateViaCache: 'none' })
        .then((reg) => {
          reg.update().catch(() => {});
          setInterval(() => {
            if (setupOverlay.classList.contains('open')) {
              reg.update().catch(() => {});
            }
          }, 8000);
        })
        .catch(() => {});
    });
  }

  // בדיקה מחזורית של גרסה חדשה ב-GitHub Pages (מתבצעת ברקע כשנמצאים במסך הבחירה/הגדרות)
  setTimeout(checkRemoteVersion, 1500);
  setInterval(checkRemoteVersion, 7000);

  // אתחול
  applyConfigToUI();
  applySavedImages();
  syncConfigControls();
  initWebBatteryAPI();
  setInterval(updateStatusBarClock, 10000);
})();
