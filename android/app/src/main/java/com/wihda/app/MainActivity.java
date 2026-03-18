package com.wihda.app;

import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() == null || getBridge().getWebView() == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (v, insets) -> {
            int navBarPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            // Inject nav bar height as CSS variable so JS/CSS can use it
            String js = "document.documentElement.style.setProperty('--sab','" + navBarPx + "px');";
            v.post(() -> getBridge().getWebView().evaluateJavascript(js, null));
            // Let Capacitor apply its own inset padding (handles top safe area)
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
    }
}
