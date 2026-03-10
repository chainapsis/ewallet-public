package com.okowallet.auth

import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.runBlocking

class OkoAuthBrowserModule : Module() {
    companion object {
        private const val CALLBACK_SCHEME = "oko.auth.callback"

        @Volatile
        private var pendingCallback: CompletableDeferred<String>? = null

        /**
         * Called by OkoAuthCallbackActivity when the redirect intent is received.
         */
        fun onCallbackReceived(url: String) {
            pendingCallback?.complete(url)
            pendingCallback = null
        }

        /**
         * Called by OkoAuthManagementActivity when auth session ends
         * without a callback (user pressed back).
         */
        fun cancelIfPending() {
            val current = pendingCallback
            if (current != null && current.isActive) {
                current.cancel()
                pendingCallback = null
            }
        }
    }

    override fun definition() = ModuleDefinition {
        Name("OkoAuthBrowser")

        AsyncFunction("openAuthSessionAsync") { url: String ->
            val activity = appContext.currentActivity
                ?: throw Exceptions.MissingActivity()

            pendingCallback?.cancel()

            val deferred = CompletableDeferred<String>()
            pendingCallback = deferred

            // Start ManagementActivity which opens AuthTabIntent.
            // AuthTabIntent (androidx.browser 1.9.0) tells the browser the callback
            // scheme so the browser intercepts the redirect internally — no external
            // intent, no "Open in app?" popup.
            val intent = Intent(activity, OkoAuthManagementActivity::class.java).apply {
                putExtra(OkoAuthManagementActivity.KEY_AUTH_URI, Uri.parse(url))
                putExtra(OkoAuthManagementActivity.KEY_CALLBACK_SCHEME, CALLBACK_SCHEME)
            }
            activity.startActivity(intent)

            return@AsyncFunction runBlocking { deferred.await() }
        }

        Function("cancelAuthSession") {
            pendingCallback?.cancel()
            pendingCallback = null
        }
    }
}
