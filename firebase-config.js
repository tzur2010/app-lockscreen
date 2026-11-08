// ============================================================================
// Firebase Firestore Configuration & Real-Time Users Sync (Offline-Resilient)
// ============================================================================

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: localStorage.getItem('fb_apiKey') || "AIzaSyDemoMagicLockscreenKey2026",
  authDomain: localStorage.getItem('fb_authDomain') || "magic-lockscreen-pro.firebaseapp.com",
  projectId: localStorage.getItem('fb_projectId') || "magic-lockscreen-pro",
  storageBucket: localStorage.getItem('fb_storageBucket') || "magic-lockscreen-pro.appspot.com",
  messagingSenderId: localStorage.getItem('fb_messagingSenderId') || "1029384756",
  appId: localStorage.getItem('fb_appId') || "1:1029384756:web:abcdef123456"
};

window.MAGIC_FIREBASE_CONFIG = DEFAULT_FIREBASE_CONFIG;

// חישוב קוד הפעלה מתוך מזהה מכשיר (4 ספרות + 5555)
window.computeActivationCodeForDevice = function (deviceId) {
  const clean = String(deviceId || '').trim();
  const num = parseInt(clean.replace(/\D/g, '').slice(-4) || '1234', 10);
  if (isNaN(num)) return '6789';
  return String(num + 5555);
};

// מעטפת אחידה ל-Firestore (תומכת גם ב-Firebase SDK עם onSnapshot וגם ב-Firestore REST API + Local Sync)
window.MagicFirestoreUsers = (function () {
  const LOCAL_USERS_CACHE_KEY = 'magic_firestore_users_cache_v1';
  let firestoreDb = null;
  let sdkLoaded = false;

  function getProjectId() {
    return localStorage.getItem('fb_projectId') || window.MAGIC_FIREBASE_CONFIG.projectId || 'magic-lockscreen-pro';
  }

  function getApiKey() {
    return localStorage.getItem('fb_apiKey') || window.MAGIC_FIREBASE_CONFIG.apiKey || '';
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

  // אתחול אופציונלי של Firebase JS SDK אם נטען בדף
  function initSdkIfAvailable() {
    if (sdkLoaded && firestoreDb) return firestoreDb;
    try {
      if (window.firebase && typeof window.firebase.initializeApp === 'function') {
        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          window.firebase.initializeApp({
            apiKey: getApiKey(),
            authDomain: `${getProjectId()}.firebaseapp.com`,
            projectId: getProjectId()
          });
        }
        if (typeof window.firebase.firestore === 'function') {
          firestoreDb = window.firebase.firestore();
          sdkLoaded = true;
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

    // 1. ניסיון כתיבה דרך Firebase Firestore SDK
    const db = initSdkIfAvailable();
    if (db) {
      try {
        await db.collection('users').doc(deviceId).set(record, { merge: true });
        return record;
      } catch (e) {}
    }

    // 2. כתיבה ישירה דרך Firestore REST API (ללא תלות בספריות חיצוניות)
    const projectId = getProjectId();
    const apiKeyParam = getApiKey() ? `?key=${encodeURIComponent(getApiKey())}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(deviceId)}${apiKeyParam}`;

    try {
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            name: { stringValue: record.name },
            phone: { stringValue: record.phone },
            deviceId: { stringValue: record.deviceId },
            status: { stringValue: record.status },
            createdAt: { stringValue: String(record.createdAt) }
          }
        })
      });
    } catch (e) {}

    return record;
  }

  // עדכון סטטוס משתמש ('approved' / 'blocked' / 'pending')
  async function updateUserStatus(deviceId, newStatus) {
    const localMap = getLocalUsersMap();
    if (localMap[deviceId]) {
      localMap[deviceId].status = newStatus;
      saveLocalUsersMap(localMap);
    }

    const db = initSdkIfAvailable();
    if (db) {
      try {
        await db.collection('users').doc(deviceId).update({ status: newStatus });
        return true;
      } catch (e) {}
    }

    const projectId = getProjectId();
    const apiKeyParam = getApiKey() ? `&key=${encodeURIComponent(getApiKey())}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(deviceId)}?updateMask.fieldPaths=status${apiKeyParam}`;

    try {
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            status: { stringValue: newStatus }
          }
        })
      });
    } catch (e) {}
    return true;
  }

  // מחיקת משתמש מ-Firestore
  async function deleteUser(deviceId) {
    const localMap = getLocalUsersMap();
    delete localMap[deviceId];
    saveLocalUsersMap(localMap);

    const db = initSdkIfAvailable();
    if (db) {
      try {
        await db.collection('users').doc(deviceId).delete();
        return true;
      } catch (e) {}
    }

    const projectId = getProjectId();
    const apiKeyParam = getApiKey() ? `?key=${encodeURIComponent(getApiKey())}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(deviceId)}${apiKeyParam}`;
    try {
      await fetch(url, { method: 'DELETE' });
    } catch (e) {}
    return true;
  }

  // האזנה בזמן אמת (SnapshotListener) למסמך של מכשיר ספציפי
  function listenToUserStatus(deviceId, onStatusChange) {
    let stopped = false;
    let sdkUnsubscribe = null;

    const db = initSdkIfAvailable();
    if (db) {
      try {
        sdkUnsubscribe = db
          .collection('users')
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

    // בדיקה מחזורית מול Firestore REST API + LocalStorage
    const poll = async () => {
      if (stopped) return;

      const localMap = getLocalUsersMap();
      if (localMap[deviceId] && localMap[deviceId].status) {
        onStatusChange(localMap[deviceId].status, localMap[deviceId]);
      }

      if (!navigator.onLine) return;
      const projectId = getProjectId();
      const apiKeyParam = getApiKey() ? `?key=${encodeURIComponent(getApiKey())}` : '';
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(deviceId)}${apiKeyParam}`;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const parsed = parseRestDoc(json);
          if (parsed && parsed.status) {
            localMap[deviceId] = parsed;
            saveLocalUsersMap(localMap);
            onStatusChange(parsed.status, parsed);
          }
        }
      } catch (e) {}
    };

    poll();
    const timer = setInterval(poll, 3000);

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
        sdkUnsubscribe = db.collection('users').onSnapshot(
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

      if (navigator.onLine) {
        const projectId = getProjectId();
        const apiKeyParam = getApiKey() ? `?key=${encodeURIComponent(getApiKey())}` : '';
        const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users${apiKeyParam}`;
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.documents)) {
              json.documents.forEach((doc) => {
                const parsed = parseRestDoc(doc);
                if (parsed && parsed.deviceId) {
                  localMap[parsed.deviceId] = parsed;
                }
              });
              saveLocalUsersMap(localMap);
            }
          }
        } catch (e) {}
      }

      const combined = Object.values(localMap).sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );
      onUsersList(combined);
    };

    pollAll();
    const timer = setInterval(pollAll, 3500);

    return function unsubscribe() {
      stopped = true;
      clearInterval(timer);
      if (typeof sdkUnsubscribe === 'function') sdkUnsubscribe();
    };
  }

  return {
    registerOrUpdateUser,
    updateUserStatus,
    deleteUser,
    listenToUserStatus,
    listenToAllUsers
  };
})();
