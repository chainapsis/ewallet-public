package com.okowallet.auth

import android.content.Intent
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.atomic.AtomicReference

class OkoAuthBrowserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "OkoAuthBrowser"

        private val pendingPromise = AtomicReference<Promise?>(null)

        /**
         * Called by OkoAuthCallbackActivity when the redirect intent is received.
         */
        fun onCallbackReceived(url: String) {
            pendingPromise.getAndSet(null)?.resolve(url)
        }

        /**
         * Called by OkoAuthManagementActivity when auth session ends
         * without a callback (user pressed back).
         */
        fun cancelIfPending() {
            pendingPromise.getAndSet(null)?.reject("CANCELLED", "Auth session cancelled")
        }
    }

    override fun getName(): String = "OkoAuthBrowser"

    @ReactMethod
    fun openAuthSessionAsync(url: String, callbackScheme: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity not available")
            return
        }

        // Validate that an Activity is registered for the callback scheme.
        // AuthTabIntent works without manifest registration (browser handles
        // redirect internally), but the CustomTabs fallback requires it.
        val testIntent = Intent(Intent.ACTION_VIEW, Uri.parse("$callbackScheme://test"))
        val resolved = activity.packageManager.queryIntentActivities(testIntent, 0)
        if (resolved.isEmpty()) {
            Log.w(TAG, "No Activity registered for scheme '$callbackScheme'. " +
                "Check AndroidManifest.xml intent-filter matches your androidCallbackScheme config.")
        }

        val old = pendingPromise.getAndSet(promise)
        old?.reject("CANCELLED", "Auth session replaced by new request")

        val intent = Intent(activity, OkoAuthManagementActivity::class.java).apply {
            putExtra(OkoAuthManagementActivity.KEY_AUTH_URI, Uri.parse(url))
            putExtra(OkoAuthManagementActivity.KEY_CALLBACK_SCHEME, callbackScheme)
        }
        try {
            activity.startActivity(intent)
        } catch (e: Exception) {
            pendingPromise.getAndSet(null)?.reject("ACTIVITY_ERROR", "Failed to start auth: ${e.message}")
        }
    }

    @ReactMethod
    fun cancelAuthSession() {
        pendingPromise.getAndSet(null)?.reject("CANCELLED", "Auth session cancelled")
    }
}
