// ============================================================================
// Cloud Real-Time Licensing & Users Sync Engine (Zero-Config + Firestore Ready)
// ============================================================================

const DEFAULT_FIREBASE_CONFIG = {
  projectId: localStorage.getItem('fb_projectId') || "magic-lockscreen-cloud"
};

window.MAGIC_FIREBASE_CONFIG = { ...DEFAULT_FIREBASE_CONFIG };

// חישוב קוד הפעלה מתוך מזהה מכשיר (4 ספרות + 5555)
window.computeActivationCodeForDevice = function (deviceId) {
  const clean = String(deviceId || '').trim();
  const num = parseInt(clean.replace(/\D/g, '').slice(-4) || '1234', 10);
  if (isNaN(num)) return '6789';
  return String(num + 5555);
};

// מנוע סנכרון ענן בזמן אמת (עובד מקצה לקצה ללא צורך בהגדרת שרתים ידנית)
window.MagicFirestoreUsers = (function () {
  const COLLECTION_NAME = 'users';
  const APP_CONFIG_COLLECTION = 'app_config';
  const LOCAL_USERS_CACHE_KEY = 'magic_cloud_users_v2';
  const LOCAL_APP_CONFIG_CACHE_KEY = 'magic_cloud_app_config_v1';
  const DEFAULT_APK_DOWNLOAD_URL = 'https://github.com/tzur2010/app-lockscreen/raw/main/Lockscreen.apk';
  const REMOTE_VERSION_JSON_URL = 'https://tzur2010.github.io/app-lockscreen/version.json';
  // ערוץ סנכרון זמן-אמת ייעודי + מאגר ענן קבוע
  const REALTIME_STREAM_URL = 'https://ntfy.sh/magic_lockscreen_tzur2010_users_v2';
  const PERMANENT_CLOUD_OBJECT_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1c04e71f67047';

  let lastConnectionState = { ok: true, status: 200, error: '' };
  const connectionListeners = [];

  function notifyConnectionState(state) {
    lastConnectionState = state;
    connectionListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {}
    });
  }

  function getLocalUsersMap() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_USERS_CACHE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveLocalUsersMap(map) {
    try {
      localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  // ביצוע קריאת HTTP (דרך fetch אסינכרוני מהיר עם גיבוי אוטומטי לגשר Java נייטיבי ב-APK)
  async function executeHttp(url, method = 'GET', bodyStr = '', contentType = 'application/json') {
    try {
      const headers = {};
      if (bodyStr && method !== 'GET' && method !== 'DELETE') {
        headers['Content-Type'] = contentType;
      }
      const res = await fetch(url, {
        method,
        headers,
        body: bodyStr && method !== 'GET' && method !== 'DELETE' ? bodyStr : undefined,
        cache: 'no-store'
      });
      const text = await res.text();
      if (res.ok) {
        notifyConnectionState({ ok: true, status: res.status, error: '' });
        return { ok: true, status: res.status, text };
      }
    } catch (err) {}

    if (window.AndroidNative && typeof window.AndroidNative.httpRequest === 'function') {
      try {
        const raw = window.AndroidNative.httpRequest(url, method, bodyStr || '');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.ok) {
            notifyConnectionState({ ok: true, status: parsed.status || 200, error: '' });
            return { ok: true, status: parsed.status || 200, text: parsed.body || '' };
          }
        }
      } catch (e) {}
    }

    return { ok: false, status: 0, text: '', error: 'Network error' };
  }

  // שליפת כל האירועים מערוץ הזמן-אמת ועדכון מפת המשתמשים
  async function syncFromRealtimeStream(existingMap) {
    const map = { ...(existingMap || getLocalUsersMap()) };
    const url = `${REALTIME_STREAM_URL}/json?poll=1&since=all&_t=${Date.now()}`;
    const resp = await executeHttp(url, 'GET');
    if (resp.ok && resp.text) {
      const lines = resp.text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const envelope = JSON.parse(trimmed);
          if (envelope && envelope.event === 'message' && envelope.message) {
            const payload = JSON.parse(envelope.message);
            applyStreamPayloadToMap(map, payload);
          }
        } catch (e) {}
      }
      saveLocalUsersMap(map);
    }
    return map;
  }

  function applyStreamPayloadToMap(map, payload) {
    if (!payload || !payload.action) return false;
    const devId = String(payload.deviceId || (payload.user && payload.user.deviceId) || '').trim();
    if (!devId) return false;

    if (payload.action === 'upsert' && payload.user) {
      const prev = map[devId] || {};
      map[devId] = {
        name: payload.user.name || prev.name || '',
        phone: payload.user.phone || prev.phone || '',
        deviceId: devId,
        // אם המשתמש כבר אושר בעבר והלקוח שלח שוב בקשה מאותו מכשיר, נשמור על סטטוס עדכני לפי האירוע האחרון
        status: payload.user.status || prev.status || 'pending',
        createdAt: payload.user.createdAt || prev.createdAt || new Date().toISOString()
      };
      return true;
    }

    if (payload.action === 'status') {
      if (!map[devId]) {
        map[devId] = {
          name: (payload.user && payload.user.name) || 'לקוח',
          phone: (payload.user && payload.user.phone) || '',
          deviceId: devId,
          status: payload.status || 'approved',
          createdAt: new Date().toISOString()
        };
      } else {
        map[devId].status = payload.status || 'approved';
      }
      return true;
    }

    if (payload.action === 'delete') {
      delete map[devId];
      return true;
    }

    if (payload.action === 'app_config' && payload.app_config) {
      saveLocalAppConfig(payload.app_config);
      return false;
    }

    return false;
  }

  function getLocalAppConfig() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_APP_CONFIG_CACHE_KEY) || '{}');
      return {
        latest_version: parsed.latest_version || '4.1',
        apk_url: parsed.apk_url || DEFAULT_APK_DOWNLOAD_URL
      };
    } catch (e) {
      return {
        latest_version: '4.1',
        apk_url: DEFAULT_APK_DOWNLOAD_URL
      };
    }
  }

  function saveLocalAppConfig(cfg) {
    if (!cfg) return;
    try {
      const merged = {
        latest_version: String(cfg.latest_version || '4.1').trim(),
        apk_url: String(cfg.apk_url || DEFAULT_APK_DOWNLOAD_URL).trim(),
        updatedAt: cfg.updatedAt || new Date().toISOString()
      };
      localStorage.setItem(LOCAL_APP_CONFIG_CACHE_KEY, JSON.stringify(merged));
    } catch (e) {}
  }

  // סנכרון מול מאגר הענן הקבוע (גיבוי קבוע מעבר להיסטוריית ה-Stream)
  async function syncFromPermanentCloud() {
    const map = getLocalUsersMap();
    try {
      const resp = await executeHttp(PERMANENT_CLOUD_OBJECT_URL, 'GET');
      if (resp.ok && resp.text) {
        const parsed = JSON.parse(resp.text);
        const cloudUsers = (parsed && parsed.data && parsed.data.users) || {};
        Object.keys(cloudUsers).forEach((devId) => {
          if (cloudUsers[devId] && !map[devId]) {
            map[devId] = cloudUsers[devId];
          } else if (cloudUsers[devId] && map[devId]) {
            // אם בענן הקבוע הסטטוס מאושר, נעדכן
            if (cloudUsers[devId].status === 'approved') {
              map[devId].status = 'approved';
            }
          }
        });
        saveLocalUsersMap(map);
        if (parsed && parsed.data && parsed.data.app_config) {
          saveLocalAppConfig(parsed.data.app_config);
        }
      }
    } catch (e) {}
    return map;
  }

  async function persistMapToPermanentCloud(map, customAppConfig) {
    try {
      const appCfg = customAppConfig || getLocalAppConfig();
      await executeHttp(
        PERMANENT_CLOUD_OBJECT_URL,
        'PUT',
        JSON.stringify({
          name: 'magic-lockscreen-users',
          data: {
            users: map || getLocalUsersMap(),
            app_config: appCfg,
            updatedAt: Date.now()
          }
        })
      );
    } catch (e) {}
  }

  // פרסום אירוע לערוץ הזמן-אמת
  async function publishStreamEvent(payloadObj) {
    const body = JSON.stringify(payloadObj);
    const resp = await executeHttp(REALTIME_STREAM_URL, 'POST', body, 'text/plain; charset=utf-8');
    return resp.ok;
  }

  // 1. רישום או עדכון בקשת לקוח חדשה ('pending')
  async function registerOrUpdateUser(userData) {
    const deviceId = String(userData.deviceId || '').trim();
    if (!deviceId) throw new Error('Missing deviceId');

    const record = {
      name: String(userData.name || '').trim(),
      phone: String(userData.phone || '').trim(),
      deviceId: deviceId,
      status: userData.status || 'pending',
      createdAt: userData.createdAt || new Date().toISOString()
    };

    const localMap = getLocalUsersMap();
    localMap[deviceId] = record;
    saveLocalUsersMap(localMap);

    // שידור מיידי לערוץ הזמן-אמת (מופיע ב-Admin Dashboard תוך חצי שנייה)
    const streamOk = await publishStreamEvent({
      action: 'upsert',
      deviceId: deviceId,
      user: record,
      ts: Date.now()
    });

    // גיבוי למאגר הענן הקבוע ברקע
    persistMapToPermanentCloud(localMap);

    if (!streamOk) {
      // ניסיון נוסף מול המאגר הקבוע
      await persistMapToPermanentCloud(localMap);
    }

    return record;
  }

  // 2. עדכון סטטוס משתמש ('approved' / 'blocked' / 'pending')
  async function updateUserStatus(deviceId, newStatus) {
    const cleanId = String(deviceId || '').trim();
    if (!cleanId) return false;

    const localMap = getLocalUsersMap();
    if (localMap[cleanId]) {
      localMap[cleanId].status = newStatus;
    } else {
      localMap[cleanId] = {
        name: 'לקוח',
        phone: '',
        deviceId: cleanId,
        status: newStatus,
        createdAt: new Date().toISOString()
      };
    }
    saveLocalUsersMap(localMap);

    await publishStreamEvent({
      action: 'status',
      deviceId: cleanId,
      status: newStatus,
      user: localMap[cleanId],
      ts: Date.now()
    });

    persistMapToPermanentCloud(localMap);
    return true;
  }

  // 3. מחיקת משתמש
  async function deleteUser(deviceId) {
    const cleanId = String(deviceId || '').trim();
    if (!cleanId) return false;

    const localMap = getLocalUsersMap();
    delete localMap[cleanId];
    saveLocalUsersMap(localMap);

    await publishStreamEvent({
      action: 'delete',
      deviceId: cleanId,
      ts: Date.now()
    });

    persistMapToPermanentCloud(localMap);
    return true;
  }

  // 4. האזנה בזמן אמת לסטטוס המכשיר באפליקציית הלקוח (נפתח אוטומטית ברגע שהמנהל לוחץ "אשר")
  function listenToUserStatus(deviceId, onStatusChange) {
    const cleanId = String(deviceId || '').trim();
    let stopped = false;
    let sse = null;

    const checkNow = async () => {
      if (stopped) return;
      const map = await syncFromRealtimeStream(getLocalUsersMap());
      if (map[cleanId] && map[cleanId].status) {
        onStatusChange(map[cleanId].status, map[cleanId]);
        if (map[cleanId].status === 'approved') return;
      }
      const permMap = await syncFromPermanentCloud();
      if (permMap[cleanId] && permMap[cleanId].status) {
        onStatusChange(permMap[cleanId].status, permMap[cleanId]);
      }
    };

    // פתיחת חיבור EventSource חי (SSE) לעדכון מיידי תוך שבריר שנייה
    try {
      if (typeof EventSource !== 'undefined') {
        sse = new EventSource(`${REALTIME_STREAM_URL}/sse?since=all`);
        sse.onmessage = (ev) => {
          if (stopped || !ev || !ev.data) return;
          try {
            const payload = JSON.parse(ev.data);
            const map = getLocalUsersMap();
            if (applyStreamPayloadToMap(map, payload)) {
              saveLocalUsersMap(map);
              if (map[cleanId] && map[cleanId].status) {
                onStatusChange(map[cleanId].status, map[cleanId]);
              }
            }
          } catch (e) {}
        };
      }
    } catch (e) {}

    checkNow();
    const timer = setInterval(checkNow, 2500);

    return function unsubscribe() {
      stopped = true;
      clearInterval(timer);
      if (sse) {
        try {
          sse.close();
        } catch (e) {}
      }
    };
  }

  // 5. האזנה בזמן אמת לכל המשתמשים עבור אתר הניהול (Admin Dashboard)
  function listenToAllUsers(onUsersList) {
    let stopped = false;
    let sse = null;

    const emitSorted = (map) => {
      if (stopped) return;
      const list = Object.values(map || {}).sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );
      onUsersList(list);
    };

    const syncAll = async () => {
      if (stopped) return;
      const map = await syncFromRealtimeStream(getLocalUsersMap());
      emitSorted(map);
    };

    // טעינה ראשונית גם מהמאגר הקבוע וגם מערוץ הזמן-אמת
    syncFromPermanentCloud().then((permMap) => {
      syncFromRealtimeStream(permMap).then((merged) => {
        emitSorted(merged);
      });
    });

    // האזנה חיה (SSE) לכל בקשה חדשה שנשלחת מטלפון של לקוח
    try {
      if (typeof EventSource !== 'undefined') {
        sse = new EventSource(`${REALTIME_STREAM_URL}/sse?since=all`);
        sse.onmessage = (ev) => {
          if (stopped || !ev || !ev.data) return;
          try {
            const payload = JSON.parse(ev.data);
            const map = getLocalUsersMap();
            if (applyStreamPayloadToMap(map, payload)) {
              saveLocalUsersMap(map);
              emitSorted(map);
            }
          } catch (e) {}
        };
      }
    } catch (e) {}

    const timer = setInterval(syncAll, 3000);

    return function unsubscribe() {
      stopped = true;
      clearInterval(timer);
      if (sse) {
        try {
          sse.close();
        } catch (e) {}
      }
    };
  }

  // 6. שליפה ועדכון של מסמך הגדרות האפליקציה בענן (app_config: latest_version, apk_url)
  async function getAppConfig() {
    let cfg = getLocalAppConfig();
    try {
      // בדיקה מול version.json בענן (GitHub Pages) ומול מאגר הענן הקבוע
      const verResp = await executeHttp(`${REMOTE_VERSION_JSON_URL}?t=${Date.now()}`, 'GET');
      if (verResp.ok && verResp.text) {
        const verData = JSON.parse(verResp.text);
        if (verData) {
          if (verData.latest_version) cfg.latest_version = String(verData.latest_version);
          if (verData.apk_url) cfg.apk_url = String(verData.apk_url);
          saveLocalAppConfig(cfg);
        }
      }
    } catch (e) {}

    try {
      await syncFromPermanentCloud();
      await syncFromRealtimeStream(getLocalUsersMap());
      const cloudCfg = getLocalAppConfig();
      if (cloudCfg && cloudCfg.latest_version) {
        cfg = cloudCfg;
      }
    } catch (e) {}

    return cfg;
  }

  async function updateAppConfig(newConfig) {
    const cfg = {
      latest_version: String((newConfig && newConfig.latest_version) || '4.1').trim(),
      apk_url: String((newConfig && newConfig.apk_url) || DEFAULT_APK_DOWNLOAD_URL).trim(),
      updatedAt: new Date().toISOString()
    };
    saveLocalAppConfig(cfg);
    await publishStreamEvent({
      action: 'app_config',
      deviceId: 'app_config',
      app_config: cfg,
      ts: Date.now()
    });
    await persistMapToPermanentCloud(getLocalUsersMap(), cfg);
    return cfg;
  }

  function onConnectionStatusChange(cb) {
    if (typeof cb === 'function') {
      connectionListeners.push(cb);
      cb(lastConnectionState);
    }
  }

  return {
    COLLECTION_NAME,
    APP_CONFIG_COLLECTION,
    registerOrUpdateUser,
    updateUserStatus,
    deleteUser,
    listenToUserStatus,
    listenToAllUsers,
    getAppConfig,
    updateAppConfig,
    onConnectionStatusChange
  };
})();
