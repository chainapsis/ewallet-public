package com.okowallet.auth

import android.app.Activity
import android.os.Bundle

/**
 * Lightweight Activity that handles auth callback redirects from Chrome Custom Tabs.
 *
 * When the server-side page navigates to the callback scheme (e.g., oko.auth.callback://),
 * Android routes the intent here — the sole handler for this scheme.
 * No disambiguation popup because there is exactly one handler.
 *
 * Extracts the redirect URL, delivers it to the pending OkoAuthBrowserModule promise,
 * and finishes itself. The Custom Tab auto-closes as control returns to the app.
 */
class OkoAuthCallbackActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val url = intent?.data?.toString()
        if (url != null) {
            OkoAuthBrowserModule.onCallbackReceived(url)
        }

        finish()
    }
}
