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
 * After receiving the callback:
 * 1. Delivers the URL to the pending OkoAuthBrowserModule promise
 * 2. Starts OkoAuthManagementActivity with CLEAR_TOP | SINGLE_TOP,
 *    which pops the Custom Tab off the task stack
 * 3. Finishes itself
 */
class OkoAuthCallbackActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val url = intent?.data?.toString()
        if (url != null) {
            OkoAuthBrowserModule.onCallbackReceived(url)
        }

        // Bring ManagementActivity to foreground with CLEAR_TOP,
        // which removes the Custom Tab from the task stack.
        startActivity(OkoAuthManagementActivity.createResponseHandlingIntent(this))
        finish()
    }
}
