package com.magic.lockscreen;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.app.Person;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.Icon;
import android.util.Base64;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Random;

public class MainActivity extends Activity {

    public static final String LOCAL_ASSET_URL = "file:///android_asset/index.html";
    public static final String APP_VERSION_NAME = "4.8";
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window window = getWindow();
        if (window != null) {
            window.setBackgroundDrawableResource(android.R.color.transparent);
            window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = window.getAttributes();
                lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                window.setAttributes(lp);
            }
        }
        enableImmersiveFullscreen();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.TRANSPARENT);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        AndroidBridge bridge = new AndroidBridge(this);
        webView.addJavascriptInterface(bridge, "AndroidNative");
        webView.addJavascriptInterface(bridge, "Android");
        webView.addJavascriptInterface(bridge, "AndroidBridge");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new LockChromeClient(this));

        webView.loadUrl(LOCAL_ASSET_URL);
        QuickTriggerWidgetProvider.updateAllWidgets(this);
    }

    public void openFileChooserInternal(ValueCallback<Uri[]> callback) {
        if (this.filePathCallback != null) {
            this.filePathCallback.onReceiveValue(null);
        }
        this.filePathCallback = callback;

        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/*");
        try {
            startActivityForResult(Intent.createChooser(intent, "בחר תמונה"), FILE_CHOOSER_RESULT_CODE);
        } catch (Exception e) {
            this.filePathCallback = null;
        }
    }

    private void enableImmersiveFullscreen() {
        View decorView = getWindow().getDecorView();
        if (decorView != null) {
            decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        enableImmersiveFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveFullscreen();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript("if(typeof triggerExitProtectionBounce==='function'){triggerExitProtectionBounce();}", null);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_ESCAPE) {
            onBackPressed();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    public static class LockChromeClient extends WebChromeClient {
        private final MainActivity activity;

        public LockChromeClient(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            activity.openFileChooserInternal(filePathCallback);
            return true;
        }
    }

    // מזהה תצוגה קצר (4 ספרות) שעוזר למנהל לזהות את המכשיר. לא משמש לאימות.
    public String getSimpleDeviceId() {
        SharedPreferences prefs = getSharedPreferences("LockSettings", MODE_PRIVATE);
        String savedId = prefs.getString("simple_device_id", null);
        if (savedId != null && savedId.length() == 4) {
            return savedId;
        }
        int generated = 1000 + new Random().nextInt(9000);
        String newId = String.valueOf(generated);
        prefs.edit().putString("simple_device_id", newId).apply();
        return newId;
    }

    // בקשת רשת אסינכרונית עבור ה-JS (עוקף מגבלות CORS של file://).
    // מותר רק HTTPS לשרתי Firebase, כדי שהגשר לא ישמש לשום דבר אחר.
    private static final String[] ALLOWED_HTTP_HOSTS = {
        "firestore.googleapis.com",
        "identitytoolkit.googleapis.com",
        "securetoken.googleapis.com"
    };

    private static boolean isAllowedHost(String host) {
        if (host == null) return false;
        for (String allowed : ALLOWED_HTTP_HOSTS) {
            if (allowed.equalsIgnoreCase(host)) return true;
        }
        return false;
    }

    public void httpRequestAsync(final String callbackId, final String url, final String method,
                                 final String headersJson, final String body) {
        new Thread(() -> {
            int status = 0;
            String responseBody = "";
            HttpURLConnection conn = null;
            try {
                URL u = new URL(url);
                if (!"https".equalsIgnoreCase(u.getProtocol()) || !isAllowedHost(u.getHost())) {
                    throw new IllegalArgumentException("Host not allowed");
                }
                String m = method == null ? "GET" : method.toUpperCase();
                if (!m.equals("GET") && !m.equals("POST") && !m.equals("DELETE")) {
                    throw new IllegalArgumentException("Method not allowed");
                }
                conn = (HttpURLConnection) u.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setUseCaches(false);
                conn.setRequestMethod(m);
                if (headersJson != null && !headersJson.isEmpty()) {
                    JSONObject headers = new JSONObject(headersJson);
                    Iterator<String> keys = headers.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        conn.setRequestProperty(key, headers.optString(key, ""));
                    }
                }
                if (body != null && !body.isEmpty() && m.equals("POST")) {
                    conn.setDoOutput(true);
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(bytes);
                    }
                }
                status = conn.getResponseCode();
                InputStream is = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
                if (is != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                        StringBuilder sb = new StringBuilder();
                        char[] buf = new char[4096];
                        int n;
                        while ((n = reader.read(buf)) != -1) sb.append(buf, 0, n);
                        responseBody = sb.toString();
                    }
                }
            } catch (Exception e) {
                status = 0;
                responseBody = "";
            } finally {
                if (conn != null) conn.disconnect();
            }

            final String js;
            try {
                JSONObject result = new JSONObject();
                result.put("status", status);
                result.put("body", responseBody);
                js = "window.__magicNativeHttpCallback && window.__magicNativeHttpCallback("
                        + JSONObject.quote(callbackId) + "," + result.toString() + ");";
            } catch (Exception e) {
                return;
            }
            runOnUiThread(() -> {
                if (webView != null) webView.evaluateJavascript(js, null);
            });
        }).start();
    }

    public void forceUnlockAndExit() {
        runOnUiThread(() -> {
            moveTaskToBack(true);
            finishAndRemoveTask();
            if (android.os.Build.VERSION.SDK_INT >= 34) {
                overrideActivityTransition(OVERRIDE_TRANSITION_CLOSE, 0, 0);
            }
            overridePendingTransition(0, 0);
        });
    }

    @JavascriptInterface
    public void exitToHomeScreen() {
        forceUnlockAndExit();
    }

    // ------------------------------------------------------------------
    // התראות: הצצה לשעון החכם + חשיפה בהתראה
    // ------------------------------------------------------------------
    private static final String PEEK_CHANNEL_ID = "peek_sync_silent";
    private static final String REVEAL_CHANNEL_ID = "reveal_messages";
    private static final int PEEK_NOTIFICATION_ID = 7101;
    private static final int REVEAL_NOTIFICATION_ID = 7102;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 2001;

    private static void ensureNotificationChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        // ערוץ שקט: לא מצלצל, לא רוטט ולא קופץ על הטלפון - רק מועבר לשעון
        NotificationChannel peek = new NotificationChannel(PEEK_CHANNEL_ID, "סנכרון", NotificationManager.IMPORTANCE_DEFAULT);
        peek.setSound(null, null);
        peek.enableVibration(false);
        peek.setShowBadge(false);
        nm.createNotificationChannel(peek);
        // ערוץ הודעות רגיל: קופץ בראש המסך עם צליל, כמו הודעה אמיתית
        NotificationChannel reveal = new NotificationChannel(REVEAL_CHANNEL_ID, "הודעות", NotificationManager.IMPORTANCE_HIGH);
        reveal.enableVibration(true);
        nm.createNotificationChannel(reveal);
    }

    private static Notification.Builder newBuilder(Context ctx, String channelId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return new Notification.Builder(ctx, channelId);
        }
        return new Notification.Builder(ctx);
    }

    public boolean areNotificationsAllowed() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            return nm != null && nm.areNotificationsEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    public void requestNotificationPermission() {
        runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= 33
                    && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
            }
        });
    }

    // הקוד שהוקלד נשלח כהתראה שקטה. השעון החכם שמחובר לטלפון מציג אותה,
    // והיא נמחקת לבד אחרי דקה כדי שלא תישאר במגירת ההתראות של הטלפון.
    public boolean sendWatchPeek(String title, String text) {
        try {
            Context ctx = getApplicationContext();
            ensureNotificationChannels(ctx);
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || !nm.areNotificationsEnabled()) return false;
            Notification.Builder b = newBuilder(ctx, PEEK_CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.stat_notify_sync)
                    .setContentTitle(title == null ? "" : title)
                    .setContentText(text == null ? "" : text)
                    .setAutoCancel(true)
                    .setShowWhen(false);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                b.setTimeoutAfter(60000);
            } else {
                b.setPriority(Notification.PRIORITY_DEFAULT);
                b.setSound(null);
                b.setVibrate(null);
            }
            nm.notify(PEEK_NOTIFICATION_ID, b.build());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // תמונת שולח עגולה: התמונה שהקוסם בחר, או עיגול צבעוני עם האות הראשונה של השם
    private static final int[] AVATAR_COLORS = {0xFF0EA5E9, 0xFF22C55E, 0xFFF59E0B, 0xFFEC4899, 0xFF8B5CF6, 0xFFEF4444, 0xFF14B8A6};

    private static Bitmap buildSenderAvatar(String sender, String dataUrl) {
        final int size = 192;
        Bitmap out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        Path circle = new Path();
        circle.addCircle(size / 2f, size / 2f, size / 2f, Path.Direction.CW);

        Bitmap photo = null;
        try {
            if (dataUrl != null && dataUrl.startsWith("data:image") && dataUrl.indexOf(',') > 0) {
                byte[] bytes = Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), Base64.DEFAULT);
                photo = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            }
        } catch (Exception ignored) {
        }

        canvas.clipPath(circle);
        if (photo != null) {
            int side = Math.min(photo.getWidth(), photo.getHeight());
            Rect src = new Rect((photo.getWidth() - side) / 2, (photo.getHeight() - side) / 2,
                    (photo.getWidth() + side) / 2, (photo.getHeight() + side) / 2);
            canvas.drawBitmap(photo, src, new Rect(0, 0, size, size), paint);
        } else {
            String name = sender == null ? "" : sender.trim();
            int color = AVATAR_COLORS[Math.abs(name.hashCode()) % AVATAR_COLORS.length];
            paint.setColor(color);
            canvas.drawRect(0, 0, size, size, paint);
            String initial = name.isEmpty() ? "?" : name.substring(0, name.offsetByCodePoints(0, 1));
            paint.setColor(Color.WHITE);
            paint.setTextAlign(Paint.Align.CENTER);
            paint.setTextSize(size * 0.48f);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            Paint.FontMetrics fm = paint.getFontMetrics();
            canvas.drawText(initial, size / 2f, size / 2f - (fm.ascent + fm.descent) / 2f, paint);
        }
        return out;
    }

    // "חשיפה בהתראה": הודעה אמיתית שמגיעה אחרי השהיה, גם אחרי שהאפליקציה נסגרה למסך הבית
    public boolean scheduleRevealNotification(final String sender, final String message, int delayMs) {
        return scheduleRevealNotificationV2(sender, message, delayMs, null);
    }

    // גרסה עם תמונת שולח: ההודעה מוצגת כהודעת צ'אט עם תמונה עגולה של "איש הקשר"
    public boolean scheduleRevealNotificationV2(final String sender, final String message, int delayMs, final String avatarDataUrl) {
        try {
            final Context ctx = getApplicationContext();
            ensureNotificationChannels(ctx);
            NotificationManager check = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (check == null || !check.areNotificationsEnabled()) return false;
            final int delay = Math.max(0, Math.min(delayMs, 60000));
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm == null) return;
                    String body = message == null ? "" : message;
                    String name = sender == null ? "" : sender;
                    Bitmap avatar = buildSenderAvatar(name, avatarDataUrl);
                    Notification.Builder b = newBuilder(ctx, REVEAL_CHANNEL_ID)
                            .setSmallIcon(android.R.drawable.sym_action_chat)
                            .setLargeIcon(avatar)
                            .setContentTitle(name)
                            .setContentText(body)
                            .setCategory(Notification.CATEGORY_MESSAGE)
                            .setAutoCancel(true)
                            .setShowWhen(true);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        // תצוגת צ'אט: התמונה של השולח בגדול, כמו הודעה מאיש קשר אמיתי
                        Person me = new Person.Builder().setName("אני").build();
                        Person from = new Person.Builder()
                                .setName(name)
                                .setIcon(Icon.createWithBitmap(avatar))
                                .build();
                        Notification.MessagingStyle style = new Notification.MessagingStyle(me);
                        style.addMessage(new Notification.MessagingStyle.Message(body, System.currentTimeMillis(), from));
                        b.setStyle(style);
                    } else {
                        b.setStyle(new Notification.BigTextStyle().bigText(body));
                    }
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                        b.setPriority(Notification.PRIORITY_HIGH);
                        b.setDefaults(Notification.DEFAULT_ALL);
                    }
                    nm.notify(REVEAL_NOTIFICATION_ID, b.build());
                } catch (Exception ignored) {
                }
            }, delay);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void unlockDevice() {
        forceUnlockAndExit();
    }

    @JavascriptInterface
    public boolean requestPinQuickWidget() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AppWidgetManager appWidgetManager = getSystemService(AppWidgetManager.class);
                ComponentName myProvider = new ComponentName(this, QuickTriggerWidgetProvider.class);
                if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                    return appWidgetManager.requestPinAppWidget(myProvider, null, null);
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    @JavascriptInterface
    public String getAppVersionName() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            if (info != null && info.versionName != null && !info.versionName.isEmpty()) {
                return info.versionName;
            }
        } catch (Exception ignored) {}
        return APP_VERSION_NAME;
    }

    @JavascriptInterface
    public boolean downloadAndInstallApk(String apkUrl, String versionLabel) {
        if (apkUrl == null || apkUrl.trim().isEmpty()) return false;
        try {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl.trim()));
            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(browserIntent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public static class AndroidBridge {
        private final MainActivity activity;
        private final Context context;

        public AndroidBridge(MainActivity activity) {
            this.activity = activity;
            this.context = activity;
        }

        @JavascriptInterface
        public String getSimpleDeviceId() {
            return activity.getSimpleDeviceId();
        }

        @JavascriptInterface
        public void httpRequestAsync(String callbackId, String url, String method, String headersJson, String body) {
            activity.httpRequestAsync(callbackId, url, method, headersJson, body);
        }

        @JavascriptInterface
        public void forceUnlockAndExit() {
            activity.forceUnlockAndExit();
        }

        @JavascriptInterface
        public boolean areNotificationsAllowed() {
            return activity.areNotificationsAllowed();
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            activity.requestNotificationPermission();
        }

        @JavascriptInterface
        public boolean sendWatchPeek(String title, String text) {
            return activity.sendWatchPeek(title, text);
        }

        @JavascriptInterface
        public boolean scheduleRevealNotification(String sender, String message, int delayMs) {
            return activity.scheduleRevealNotification(sender, message, delayMs);
        }

        @JavascriptInterface
        public boolean scheduleRevealNotificationV2(String sender, String message, int delayMs, String avatarDataUrl) {
            return activity.scheduleRevealNotificationV2(sender, message, delayMs, avatarDataUrl);
        }

        @JavascriptInterface
        public void exitToHomeScreen() {
            activity.forceUnlockAndExit();
        }

        @JavascriptInterface
        public void unlockDevice() {
            activity.forceUnlockAndExit();
        }

        @JavascriptInterface
        public boolean requestPinQuickWidget() {
            return activity.requestPinQuickWidget();
        }

        @JavascriptInterface
        public String getAppVersionName() {
            return activity.getAppVersionName();
        }

        @JavascriptInterface
        public boolean downloadAndInstallApk(String apkUrl, String versionLabel) {
            return activity.downloadAndInstallApk(apkUrl, versionLabel);
        }

        @JavascriptInterface
        public void vibrate(String patternJson) {
            try {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator == null || !vibrator.hasVibrator()) return;

                JSONArray arr = new JSONArray(patternJson);
                if (arr.length() == 1) {
                    long ms = Math.max(10L, arr.getLong(0));
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        vibrator.vibrate(ms);
                    }
                } else if (arr.length() > 1) {
                    long[] timings = new long[arr.length() + 1];
                    timings[0] = 0L;
                    for (int i = 0; i < arr.length(); i++) {
                        timings[i + 1] = Math.max(10L, arr.getLong(i));
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(timings, -1));
                    } else {
                        vibrator.vibrate(timings, -1);
                    }
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public int getBatteryLevel() {
            try {
                BatteryManager bm = (BatteryManager) context.getSystemService(Context.BATTERY_SERVICE);
                if (bm != null) {
                    return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
                }
            } catch (Exception ignored) {
            }
            return 88;
        }
    }
}
