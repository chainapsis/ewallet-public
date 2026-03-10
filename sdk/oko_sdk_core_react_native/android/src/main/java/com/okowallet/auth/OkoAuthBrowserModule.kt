package com.okowallet.auth

import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.runBlocking

class OkoAuthBrowserModule : Module() {
    companion object {
        @Volatile
        private var pendingCallback: CompletableDeferred<String>? = null

        /**
         * Called by OkoAuthCallbackActivity when the redirect intent is received.
         */
        fun onCallbackReceived(url: String) {
            pendingCallback?.complete(url)
            pendingCallback = null
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

            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            customTabsIntent.launchUrl(activity, Uri.parse(url))

            return@AsyncFunction runBlocking { deferred.await() }
        }

        Function("cancelAuthSession") {
            pendingCallback?.cancel()
            pendingCallback = null
        }
    }
}
