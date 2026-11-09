package com.magic.lockscreen;

import android.Manifest;
import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    public static final String LOCAL_ASSET_URL = "file:///android_asset/index.html";
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;
    private static final int CAMERA_PERMISSION_CODE = 1002;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingWebPermissionRequest;

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
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        AndroidBridge bridge = new AndroidBridge(this);
        webView.addJavascriptInterface(bridge, "AndroidNative");
        webView.addJavascriptInterface(bridge, "Android");
        webView.addJavascriptInterface(bridge, "AndroidBridge");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new LockChromeClient(this));

        webView.loadUrl("file:///android_asset/index.html");
        QuickTriggerWidgetProvider.updateAllWidgets(this);
    }

    public void loadLatestLiveUrl() {
        if (webView == null) return;
        webView.loadUrl("file:///android_asset/index.html");
        QuickTriggerWidgetProvider.updateAllWidgets(this);
    }

    public void handleWebPermissionRequest(PermissionRequest request) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                this.pendingWebPermissionRequest = request;
                requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_CODE);
                return;
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            request.grant(request.getResources());
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_CODE && pendingWebPermissionRequest != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
                } else {
                    pendingWebPermissionRequest.deny();
                }
            }
            pendingWebPermissionRequest = null;
        }
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
        if (webView != null) {
            webView.evaluateJavascript(
                "if (typeof checkRemoteVersionAndReload === 'function') { checkRemoteVersionAndReload(); }",
                null
            );
        }
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
        // מונע יציאה ממסך הנעילה בלחיצה על חץ החזרה של המכשיר
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

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            activity.handleWebPermissionRequest(request);
        }
    }

    @JavascriptInterface
    public String getSimpleDeviceId() {
        // שליפת 4 הספרות האחרונות של מזהה המכשיר כדי שיהיה קצר ונוח לשליחה בווטסאפ
        String androidId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        if (androidId == null || androidId.length() < 4) {
            return "1234";
        }
        // לקיחת 4 תווים והפיכתם למספר פשוט
        int hash = Math.abs(androidId.hashCode() % 9000) + 1000;
        return String.valueOf(hash);
    }

    @JavascriptInterface
    public boolean activateApp(String enteredCode) {
        if (enteredCode == null) return false;
        enteredCode = enteredCode.trim();

        // 1. קוד מאסטר מיוחד עבור המפתח (עוקף הכל):
        if (enteredCode.equals("MASTER999")) {
            saveActivation();
            return true;
        }

        // 2. חישוב קוד המשתמש: מזהה המכשיר + מספר סודי (5555)
        try {
            int deviceIdNum = Integer.parseInt(getSimpleDeviceId());
            int expectedKey = deviceIdNum + 5555;

            if (enteredCode.equals(String.valueOf(expectedKey))) {
                saveActivation();
                return true;
            }
        } catch (Exception ignored) {}

        return false;
    }

    private void saveActivation() {
        SharedPreferences prefs = getSharedPreferences("LockSettings", MODE_PRIVATE);
        prefs.edit().putBoolean("is_activated", true).putBoolean("is_licensed", true).apply();
        SharedPreferences licensePrefs = getSharedPreferences("LicensePrefs", MODE_PRIVATE);
        licensePrefs.edit().putBoolean("is_licensed", true).apply();
    }

    @JavascriptInterface
    public void approveLicenseLocally() {
        saveActivation();
    }

    @JavascriptInterface
    public String getRawAndroidId() {
        String androidId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        return (androidId != null && !androidId.isEmpty()) ? androidId : getSimpleDeviceId();
    }

    @JavascriptInterface
    public boolean isActivated() {
        SharedPreferences prefs = getSharedPreferences("LockSettings", MODE_PRIVATE);
        return prefs.getBoolean("is_activated", false);
    }

    @JavascriptInterface
    public String getAndroidDeviceId() {
        return getSimpleDeviceId();
    }

    @JavascriptInterface
    public boolean verifyLicenseKey(String enteredKey) {
        return activateApp(enteredKey);
    }

    @JavascriptInterface
    public boolean isAppLicensed() {
        return isActivated();
    }

    @JavascriptInterface
    public void forceUnlockAndExit() {
        runOnUiThread(() -> {
            // העברת האפליקציה לרקע ללא אנימציית סגירת חלון
            moveTaskToBack(true);

            // סגירה מלאה והסרה מהזיכרון
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
    public String getGoogleServicesJson() {
        try {
            InputStream is = getAssets().open("google-services.json");
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[4096];
            int nRead;
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            is.close();
            return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "";
        }
    }

    @JavascriptInterface
    public String httpRequest(String urlStr, String method, String bodyJson) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setUseCaches(false);
            conn.setRequestProperty("Accept", "application/json");

            String upperMethod = (method != null) ? method.trim().toUpperCase() : "GET";
            if ("PATCH".equals(upperMethod)) {
                conn.setRequestMethod("POST");
                conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
            } else {
                conn.setRequestMethod(upperMethod);
            }

            if (bodyJson != null && !bodyJson.isEmpty() && !"GET".equals(upperMethod) && !"DELETE".equals(upperMethod)) {
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                byte[] outBytes = bodyJson.getBytes(StandardCharsets.UTF_8);
                OutputStream os = conn.getOutputStream();
                os.write(outBytes);
                os.flush();
                os.close();
            }

            int status = conn.getResponseCode();
            InputStream is = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
            String respBody = "";
            if (is != null) {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] data = new byte[4096];
                int nRead;
                while ((nRead = is.read(data, 0, data.length)) != -1) {
                    buffer.write(data, 0, nRead);
                }
                is.close();
                respBody = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
            }

            JSONObject result = new JSONObject();
            result.put("ok", status >= 200 && status < 300);
            result.put("status", status);
            result.put("body", respBody);
            return result.toString();
        } catch (Exception e) {
            try {
                JSONObject err = new JSONObject();
                err.put("ok", false);
                err.put("status", 0);
                err.put("error", e.getMessage() != null ? e.getMessage() : "Network error");
                return err.toString();
            } catch (Exception ignored) {
                return "{\"ok\":false,\"status\":0}";
            }
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
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
        public boolean activateApp(String enteredCode) {
            return activity.activateApp(enteredCode);
        }

        @JavascriptInterface
        public boolean isActivated() {
            return activity.isActivated();
        }

        @JavascriptInterface
        public String getDeviceId() {
            return activity.getSimpleDeviceId();
        }

        @JavascriptInterface
        public boolean verifyLicenseKey(String enteredKey) {
            return activity.activateApp(enteredKey);
        }

        @JavascriptInterface
        public boolean isAppLicensed() {
            return activity.isActivated();
        }

        @JavascriptInterface
        public void approveLicenseLocally() {
            activity.approveLicenseLocally();
        }

        @JavascriptInterface
        public String getRawAndroidId() {
            return activity.getRawAndroidId();
        }

        @JavascriptInterface
        public void forceUnlockAndExit() {
            activity.forceUnlockAndExit();
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
        public String getGoogleServicesJson() {
            return activity.getGoogleServicesJson();
        }

        @JavascriptInterface
        public String httpRequest(String urlStr, String method, String bodyJson) {
            return activity.httpRequest(urlStr, method, bodyJson);
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
