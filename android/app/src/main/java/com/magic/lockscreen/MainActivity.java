package com.magic.lockscreen;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
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
        webView.setBackgroundColor(Color.parseColor("#0f1026"));
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

        AndroidBridge bridge = new AndroidBridge(this);
        webView.addJavascriptInterface(this, "AndroidNative");
        webView.addJavascriptInterface(bridge, "Android");
        webView.addJavascriptInterface(bridge, "AndroidBridge");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new LockChromeClient(this));

        webView.loadUrl("file:///android_asset/index.html");
    }

    public void loadLatestLiveUrl() {
        if (webView == null) return;
        webView.loadUrl("file:///android_asset/index.html");
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
    public void forceUnlockAndExit() {
        runOnUiThread(() -> {
            // מעבר למסך הבית של הטלפון
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);
            homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(homeIntent);

            // מחיקה מוחלטת של האפליקציה מרשימת המשימות
            finishAndRemoveTask();
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

    public static class AndroidBridge {
        private final MainActivity activity;
        private final Context context;

        public AndroidBridge(MainActivity activity) {
            this.activity = activity;
            this.context = activity;
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
