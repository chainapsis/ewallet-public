package com.okowallet.auth

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OkoAuthBrowserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val CALLBACK_SCHEME = "oko.auth.callback"

        @Volatile
        private var pendingPromise: Promise? = null

        /**
         * Called by OkoAuthCallbackActivity when the redirect intent is received.
         */
        fun onCallbackReceived(url: String) {
            pendingPromise?.resolve(url)
            pendingPromise = null
        }

        /**
         * Called by OkoAuthManagementActivity when auth session ends
         * without a callback (user pressed back).
         */
        fun cancelIfPending() {
            val current = pendingPromise
            if (current != null) {
                current.reject("CANCELLED", "Auth session cancelled")
                pendingPromise = null
            }
        }
    }

    override fun getName(): String = "OkoAuthBrowser"

    @ReactMethod
    fun openAuthSessionAsync(url: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity not available")
            return
        }

        pendingPromise?.reject("CANCELLED", "Auth session replaced by new request")
        pendingPromise = promise

        // Start ManagementActivity which opens AuthTabIntent.
        // AuthTabIntent (androidx.browser 1.9.0) tells the browser the callback
        // scheme so the browser intercepts the redirect internally — no external
        // intent, no "Open in app?" popup.
        val intent = Intent(activity, OkoAuthManagementActivity::class.java).apply {
            putExtra(OkoAuthManagementActivity.KEY_AUTH_URI, Uri.parse(url))
            putExtra(OkoAuthManagementActivity.KEY_CALLBACK_SCHEME, CALLBACK_SCHEME)
        }
        activity.startActivity(intent)
    }

    @ReactMethod
    fun cancelAuthSession() {
        pendingPromise?.reject("CANCELLED", "Auth session cancelled")
        pendingPromise = null
    }
}
