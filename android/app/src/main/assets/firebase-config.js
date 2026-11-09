// ============================================================================
// Firebase Firestore Configuration & Real-Time Users Sync (google-services.json + Native Bridge)
// ============================================================================

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: localStorage.getItem('fb_apiKey') || "AIzaSyDemoMagicLockscreenKey2026",
  authDomain: localStorage.getItem('fb_authDomain') || "magic-lockscreen-pro.firebaseapp.com",
  projectId: localStorage.getItem('fb_projectId') || "magic-lockscreen-pro",
  storageBucket: localStorage.getItem('fb_storageBucket') || "magic-lockscreen-pro.appspot.com",
  messagingSenderId: localStorage.getItem('fb_messagingSenderId') || "1029384756",
  appId: localStorage.getItem('fb_appId') || "1:1029384756:android:abcdef1234567890"
};

window.MAGIC_FIREBASE_CONFIG = { ...DEFAULT_FIREBASE_CONFIG };

// פענוח אוטומטי של קובץ google-services.json וחילוץ project_id, api_key ו-app_id
window.parseAndApplyGoogleServicesJson = function (rawJsonOrObj, persistToLocal = false) {
  try {
    const data = typeof rawJsonOrObj === 'string' ? JSON.parse(rawJsonOrObj) : rawJsonOrObj;
    if (!data || typeof data !== 'object') return null;

    const projectInfo = data.project_info || {};
    const firstClient = Array.isArray(data.client) && data.client.length > 0 ? data.client[0] : {};
    const clientInfo = firstClient.client_info || {};
    const apiKeyArr = Array.isArray(firstClient.api_key) ? firstClient.api_key : [];
    const currentKey = (apiKeyArr[0] && apiKeyArr[0].current_key) || data.apiKey || '';

    const extracted = {
      projectId: projectInfo.project_id || data.projectId || '',
      apiKey: currentKey,
      storageBucket: projectInfo.storage_bucket || data.storageBucket || '',
      messagingSenderId: projectInfo.project_number || data.messagingSenderId || '',
      appId: clientInfo.mobilesdk_app_id || data.appId || ''
    };

    if (extracted.projectId) {
      extracted.authDomain = `${extracted.projectId}.firebaseapp.com`;
      // אם המשתמש לא הגדיר ידנית ב-localStorage, או אם ביקש לשמור מפורשות:
      if (persistToLocal || !localStorage.getItem('fb_projectId') || localStorage.getItem('fb_projectId') === 'magic-lockscreen-pro') {
        window.MAGIC_FIREBASE_CONFIG = {
          ...window.MAGIC_FIREBASE_CONFIG,
          ...extracted
        };
      }
      if (persistToLocal) {
        localStorage.setItem('fb_projectId', extracted.projectId);
        if (extracted.apiKey) localStorage.setItem('fb_apiKey', extracted.apiKey);
        if (extracted.storageBucket) localStorage.setItem('fb_storageBucket', extracted.storageBucket);
        if (extracted.messagingSenderId) localStorage.setItem('fb_messagingSenderId', extracted.messagingSenderId);
        if (extracted.appId) localStorage.setItem('fb_appId', extracted.appId);
        localStorage.setItem('fb_google_services_json', JSON.stringify(data));
      }
      return extracted;
    }
  } catch (e) {}
  return null;
};

// טעינה אוטומטית של google-services.json מתוך LocalStorage, מתוך ה-APK הנייטיבי או מתיקיית הפרויקט
(function autoLoadGoogleServices() {
  try {
    const savedRaw = localStorage.getItem('fb_google_services_json');
    if (savedRaw) {
      window.parseAndApplyGoogleServicesJson(savedRaw, false);
    }
  } catch (e) {}

  try {
    if (window.AndroidNative && typeof window.AndroidNative.getGoogleServicesJson === 'function') {
      const nativeJson = window.AndroidNative.getGoogleServicesJson();
      if (nativeJson && nativeJson.trim().startsWith('{')) {
        window.parseAndApplyGoogleServicesJson(nativeJson, false);
      }
    }
  } catch (e) {}

  try {
    if (window.location.protocol !== 'file:') {
      fetch('./google-services.json?t=' + Date.now(), { cache: 'no-store' })
        .then((r) => (r.ok ? r.text() : ''))
        .then((txt) => {
          if (txt && txt.trim().startsWith('{')) {
            window.parseAndApplyGoogleServicesJson(txt, false);
          }
        })
        .catch(() => {});
    }
  } catch (e) {}
})();

// חישוב קוד הפעלה מתוך מזהה מכשיר (4 ספרות + 5555)
window.computeActivationCodeForDevice = function (deviceId) {
  const clean = String(deviceId || '').trim();
  const num = parseInt(clean.replace(/\D/g, '').slice(-4) || '1234', 10);
  if (isNaN(num)) return '6789';
  return String(num + 5555);
};

// מעטפת אחידה ל-Firestore עבור קולקציית 'users' (תומכת ב-Native Android Bridge, Firebase SDK ו-REST API)
window.MagicFirestoreUsers = (function () {
  const COLLECTION_NAME = 'users';
  const LOCAL_USERS_CACHE_KEY = 'magic_firestore_users_cache_v1';
  let firestoreDb = null;
  let sdkLoadedProjectId = null;
  let lastConnectionState = { ok: null, status: 0, error: '' };
  const connectionListeners = [];

  function notifyConnectionState(state) {
    lastConnectionState = state;
    connectionListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {}
    });
  }

  function getProjectId() {
    return (
      localStorage.getItem('fb_projectId') ||
      window.MAGIC_FIREBASE_CONFIG.projectId ||
      'magic-lockscreen-pro'
    ).trim();
  }

  function getApiKey() {
    const key = (
      localStorage.getItem('fb_apiKey') ||
      window.MAGIC_FIREBASE_CONFIG.apiKey ||
      ''
    ).trim();
    // אם זה מפתח הדמה, לא נשלח אותו כפרמטר כדי ש-Firestore REST יעבוד מול כללים פתוחים (allow read, write: if true) רק עם projectId!
    if (key === 'AIzaSyDemoMagicLockscreenKey2026') return '';
    return key;
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

  // ביצוע בקשת HTTP דרך הגשר הנייטיבי של אנדרואיד (עוקף CORS ב-file://) או דרך fetch רגיל
  async function executeFirestoreHttp(url, method, bodyObj) {
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : '';

    // 1. בתוך אפליקציית ה-APK: שימוש ב-HttpURLConnection נייטיבי ב-MainActivity
    if (window.AndroidNative && typeof window.AndroidNative.httpRequest === 'function') {
      try {
        const rawResp = window.AndroidNative.httpRequest(url, method, bodyStr);
        if (rawResp) {
          const parsedResp = JSON.parse(rawResp);
          let jsonBody = null;
          try {
            jsonBody = parsedResp.body ? JSON.parse(parsedResp.body) : null;
          } catch (e) {}
          const ok = Boolean(parsedResp.ok);
          const status = Number(parsedResp.status || 0);
          const errMsg =
            (jsonBody && jsonBody.error && jsonBody.error.message) ||
            parsedResp.error ||
            (ok ? '' : `HTTP ${status}`);
          notifyConnectionState({ ok, status, error: errMsg, projectId: getProjectId() });
          return { ok, status, data: jsonBody, error: errMsg };
        }
      } catch (e) {}
    }

    // 2. בדפדפן או כגיבוי: שימוש ב-fetch עם תמיכה ב-X-HTTP-Method-Override עבור PATCH
    const fetchMethod = method === 'PATCH' ? 'POST' : method;
    const headers = { Accept: 'application/json' };
    if (method === 'PATCH') {
      headers['X-HTTP-Method-Override'] = 'PATCH';
    }
    if (bodyStr && fetchMethod !== 'GET' && fetchMethod !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(url, {
        method: fetchMethod,
        headers,
        body: bodyStr && fetchMethod !== 'GET' && fetchMethod !== 'DELETE' ? bodyStr : undefined,
        cache: 'no-store'
      });
      let jsonBody = null;
      try {
        jsonBody = await res.json();
      } catch (e) {}
      const ok = res.ok;
      const status = res.status;
      const errMsg =
        (jsonBody && jsonBody.error && jsonBody.error.message) ||
        (ok ? '' : `HTTP ${status}`);
      notifyConnectionState({ ok, status, error: errMsg, projectId: getProjectId() });
      return { ok, status, data: jsonBody, error: errMsg };
    } catch (err) {
      const errMsg = (err && err.message) || 'שגיאת רשת בחיבור ל-Firestore';
      notifyConnectionState({ ok: false, status: 0, error: errMsg, projectId: getProjectId() });
      return { ok: false, status: 0, data: null, error: errMsg };
    }
  }

  // אתחול אופציונלי של Firebase JS SDK אם נטען בדף
  function initSdkIfAvailable() {
    const currentPid = getProjectId();
    const currentKey = getApiKey();
    if (!currentPid || currentPid === 'magic-lockscreen-pro' || !currentKey) return null;
    if (sdkLoadedProjectId === currentPid && firestoreDb) return firestoreDb;
    try {
      if (window.firebase && typeof window.firebase.initializeApp === 'function') {
        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          window.firebase.initializeApp({
            apiKey: currentKey,
            authDomain: `${currentPid}.firebaseapp.com`,
            projectId: currentPid
          });
        }
        if (typeof window.firebase.firestore === 'function') {
          firestoreDb = window.firebase.firestore();
          sdkLoadedProjectId = currentPid;
          return firestoreDb;
        }
      }
    } catch (e) {}
    return null;
  }

  // המרת מסמך Firestore REST לאובייקט רגיל
  function parseRestDoc(doc) {
    if (!doc || !doc.fields) return null;
    const f = doc.fields;
    const parts = (doc.name || '').split('/');
    const docId = parts[parts.length - 1] || '';
    return {
      deviceId: (f.deviceId && f.deviceId.stringValue) || docId,
      name: (f.name && f.name.stringValue) || '',
      phone: (f.phone && f.phone.stringValue) || '',
      status: (f.status && f.status.stringValue) || 'pending',
      createdAt:
        (f.createdAt && (f.createdAt.timestampValue || f.createdAt.stringValue || f.createdAt.integerValue)) ||
        new Date().toISOString()
    };
  }

  function buildDocUrl(deviceId, queryParams = '') {
    const projectId = getProjectId();
    const apiKey = getApiKey();
    const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${COLLECTION_NAME}/${encodeURIComponent(deviceId)}`;
    const params = [];
    if (queryParams) params.push(queryParams);
    if (apiKey) params.push(`key=${encodeURIComponent(apiKey)}`);
    return params.length > 0 ? `${base}?${params.join('&')}` : base;
  }

  function buildCollectionUrl() {
    const projectId = getProjectId();
    const apiKey = getApiKey();
    const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${COLLECTION_NAME}`;
    return apiKey ? `${base}?key=${encodeURIComponent(apiKey)}&pageSize=200` : `${base}?pageSize=200`;
  }

  // רישום או עדכון משתמש בקולקציית 'users'
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

    // שמירה במטמון מקומי
    const localMap = getLocalUsersMap();
    localMap[deviceId] = record;
    saveLocalUsersMap(localMap);

    // 1. כתיבה ישירה דרך Firestore REST API / Native Android Bridge
    const url = buildDocUrl(deviceId);
    const resp = await executeFirestoreHttp(url, 'PATCH', {
      fields: {
        name: { stringValue: record.name },
        phone: { stringValue: record.phone },
        deviceId: { stringValue: record.deviceId },
        status: { stringValue: record.status },
        createdAt: { stringValue: String(record.createdAt) }
      }
    });

    if (resp.ok) {
      return { ...record, synced: true };
    }

    // 2. גיבוי דרך Firebase JS SDK אם זמין
    const db = initSdkIfAvailable();
    if (db) {
      try {
        await db.collection(COLLECTION_NAME).doc(deviceId).set(record, { merge: true });
        notifyConnectionState({ ok: true, status: 200, error: '', projectId: getProjectId() });
        return { ...record, synced: true };
      } catch (sdkErr) {
        throw new Error(sdkErr.message || resp.error || 'Firestore write failed');
      }
    }

    throw new Error(resp.error || `Firestore Error (HTTP ${resp.status})`);
  }

  // עדכון סטטוס משתמש ('approved' / 'blocked' / 'pending')
  async function updateUserStatus(deviceId, newStatus) {
    const localMap = getLocalUsersMap();
    if (localMap[deviceId]) {
      localMap[deviceId].status = newStatus;
      saveLocalUsersMap(localMap);
    }

    const url = buildDocUrl(deviceId, 'updateMask.fieldPaths=status');
    const resp = await executeFirestoreHttp(url, 'PATCH', {
      fields: {
        status: { stringValue: newStatus }
      }
    });

    if (!resp.ok) {
      const db = initSdkIfAvailable();
      if (db) {
        try {
          await db.collection(COLLECTION_NAME).doc(deviceId).update({ status: newStatus });
          return true;
        } catch (e) {}
      }
    }
    return resp.ok;
  }

  // מחיקת משתמש מ-Firestore
  async function deleteUser(deviceId) {
    const localMap = getLocalUsersMap();
    delete localMap[deviceId];
    saveLocalUsersMap(localMap);

    const url = buildDocUrl(deviceId);
    const resp = await executeFirestoreHttp(url, 'DELETE');
    if (!resp.ok) {
      const db = initSdkIfAvailable();
      if (db) {
        try {
          await db.collection(COLLECTION_NAME).doc(deviceId).delete();
          return true;
        } catch (e) {}
      }
    }
    return resp.ok;
  }

  // האזנה בזמן אמת (SnapshotListener) למסמך של מכשיר ספציפי בקולקציית 'users'
  function listenToUserStatus(deviceId, onStatusChange) {
    let stopped = false;
    let sdkUnsubscribe = null;

    const db = initSdkIfAvailable();
    if (db) {
      try {
        sdkUnsubscribe = db
          .collection(COLLECTION_NAME)
          .doc(deviceId)
          .onSnapshot(
            (docSnap) => {
              if (stopped || !docSnap || !docSnap.exists) return;
              const data = docSnap.data();
              if (data && data.status) {
                onStatusChange(data.status, data);
              }
            },
            () => {}
          );
      } catch (e) {}
    }

    const poll = async () => {
      if (stopped) return;

      const localMap = getLocalUsersMap();
      if (localMap[deviceId] && localMap[deviceId].status) {
        onStatusChange(localMap[deviceId].status, localMap[deviceId]);
      }

      const url = buildDocUrl(deviceId);
      const resp = await executeFirestoreHttp(url, 'GET');
      if (resp.ok && resp.data) {
        const parsed = parseRestDoc(resp.data);
        if (parsed && parsed.status) {
          localMap[deviceId] = parsed;
          saveLocalUsersMap(localMap);
          onStatusChange(parsed.status, parsed);
        }
      }
    };

    poll();
    const timer = setInterval(poll, 2800);

    return function unsubscribe() {
      stopped = true;
      clearInterval(timer);
      if (typeof sdkUnsubscribe === 'function') sdkUnsubscribe();
    };
  }

  // האזנה בזמן אמת לכל המשתמשים בקולקציית 'users' (עבור admin.html)
  function listenToAllUsers(onUsersList) {
    let stopped = false;
    let sdkUnsubscribe = null;

    const db = initSdkIfAvailable();
    if (db) {
      try {
        sdkUnsubscribe = db.collection(COLLECTION_NAME).onSnapshot(
          (querySnap) => {
            if (stopped || !querySnap) return;
            const list = [];
            const localMap = getLocalUsersMap();
            querySnap.forEach((doc) => {
              const d = doc.data();
              const item = {
                deviceId: d.deviceId || doc.id,
                name: d.name || '',
                phone: d.phone || '',
                status: d.status || 'pending',
                createdAt: d.createdAt || new Date().toISOString()
              };
              list.push(item);
              localMap[item.deviceId] = item;
            });
            saveLocalUsersMap(localMap);
            onUsersList(list);
          },
          () => {}
        );
      } catch (e) {}
    }

    const pollAll = async () => {
      if (stopped) return;
      const localMap = getLocalUsersMap();

      const url = buildCollectionUrl();
      const resp = await executeFirestoreHttp(url, 'GET');
      if (resp.ok && resp.data) {
        const remoteMap = {};
        if (Array.isArray(resp.data.documents)) {
          resp.data.documents.forEach((doc) => {
            const parsed = parseRestDoc(doc);
            if (parsed && parsed.deviceId) {
              remoteMap[parsed.deviceId] = parsed;
            }
          });
        }
        saveLocalUsersMap(remoteMap);
        const list = Object.values(remoteMap).sort((a, b) =>
          String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        );
        onUsersList(list);
        return;
      }

      const combined = Object.values(localMap).sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );
      onUsersList(combined);
    };

    pollAll();
    const timer = setInterval(pollAll, 3000);

    return function unsubscribe() {
      stopped = true;
      clearInterval(timer);
      if (typeof sdkUnsubscribe === 'function') sdkUnsubscribe();
    };
  }

  function onConnectionStatusChange(cb) {
    if (typeof cb === 'function') {
      connectionListeners.push(cb);
      if (lastConnectionState.ok !== null) {
        cb(lastConnectionState);
      }
    }
  }

  return {
    COLLECTION_NAME,
    getProjectId,
    getApiKey,
    registerOrUpdateUser,
    updateUserStatus,
    deleteUser,
    listenToUserStatus,
    listenToAllUsers,
    onConnectionStatusChange
  };
})();
