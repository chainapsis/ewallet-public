package com.okowallet.auth

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.browser.auth.AuthTabIntent
import androidx.browser.auth.AuthTabIntent.AuthResult
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Transparent coordinator Activity that opens an auth browser tab
 * and handles the callback.
 *
 * Uses AuthTabIntent (androidx.browser 1.9.0) — the browser intercepts
 * the redirect to [callbackScheme]:// internally and returns the result
 * via onActivityResult. No external intent is fired, so no "Open in app?" popup.
 *
 * Falls back to CustomTabsIntent if AuthTabIntent fails (older browsers).
 * In that case, OkoAuthCallbackActivity catches the external intent redirect
 * and brings this Activity back via CLEAR_TOP.
 */
@SuppressLint("UnsafeOptInUsageError", "UnsafeOptInUsageWarning")
class OkoAuthManagementActivity : ComponentActivity() {
    companion object {
        const val KEY_AUTH_STARTED = "authStarted"
        const val KEY_AUTH_URI = "authUri"
        const val KEY_CALLBACK_SCHEME = "callbackScheme"
        const val KEY_USING_AUTH_TAB = "usingAuthTab"

        fun createResponseHandlingIntent(context: Context): Intent {
            return Intent(context, OkoAuthManagementActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
        }
    }

    private var authStarted = false
    private var usingAuthTab = false
    private var authenticationUri: Uri? = null
    private var callbackScheme: String = "oko.auth.callback"

    private lateinit var authLauncher: ActivityResultLauncher<Intent>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Register the auth tab result launcher (must be called before onResume)
        authLauncher = AuthTabIntent.registerActivityResultLauncher(this, this::handleAuthResult)

        if (savedInstanceState != null) {
            authStarted = savedInstanceState.getBoolean(KEY_AUTH_STARTED, false)
            usingAuthTab = savedInstanceState.getBoolean(KEY_USING_AUTH_TAB, false)
            callbackScheme = savedInstanceState.getString(KEY_CALLBACK_SCHEME, "oko.auth.callback")
            authenticationUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                savedInstanceState.getParcelable(KEY_AUTH_URI, Uri::class.java)
            } else {
                @Suppress("DEPRECATION")
                savedInstanceState.getParcelable(KEY_AUTH_URI)
            }
        } else {
            callbackScheme = intent.getStringExtra(KEY_CALLBACK_SCHEME) ?: "oko.auth.callback"
            authenticationUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(KEY_AUTH_URI, Uri::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(KEY_AUTH_URI)
            }
        }
    }

    /**
     * Called when AuthTabIntent returns the auth result.
     * The browser intercepted the redirect to callbackScheme:// internally
     * and returned it here — no external intent, no popup.
     */
    private fun handleAuthResult(result: AuthResult) {
        when (result.resultCode) {
            AuthTabIntent.RESULT_OK -> {
                val url = result.resultUri?.toString()
                if (url != null) {
                    OkoAuthBrowserModule.onCallbackReceived(url)
                } else {
                    OkoAuthBrowserModule.cancelIfPending()
                }
            }
            else -> {
                // RESULT_CANCELED or other — user cancelled or error
                OkoAuthBrowserModule.cancelIfPending()
            }
        }
        finish()
    }

    override fun onResume() {
        super.onResume()

        if (!authStarted) {
            val uri = authenticationUri
            if (uri == null) {
                finish()
                return
            }

            try {
                // Primary: AuthTabIntent — browser handles redirect internally.
                val authTab = AuthTabIntent.Builder().build()
                authTab.launch(authLauncher, uri, callbackScheme)
                usingAuthTab = true
            } catch (_: Exception) {
                // Fallback: legacy CustomTabsIntent — redirect fires external intent,
                // caught by OkoAuthCallbackActivity which brings us back via CLEAR_TOP.
                if (isFinishing || isDestroyed) {
                    OkoAuthBrowserModule.cancelIfPending()
                    finish()
                    return
                }
                try {
                    val customTab = CustomTabsIntent.Builder()
                        .setShowTitle(true)
                        .build()
                    customTab.launchUrl(this, uri)
                    usingAuthTab = false
                } catch (_: Exception) {
                    OkoAuthBrowserModule.cancelIfPending()
                    finish()
                    return
                }
            }

            authStarted = true
        } else if (!usingAuthTab) {
            // Legacy path: user pressed back from Custom Tab, or
            // CallbackActivity brought us back via CLEAR_TOP.
            // If CallbackActivity already delivered the result, cancelIfPending is a no-op.
            OkoAuthBrowserModule.cancelIfPending()
            finish()
        }
        // If usingAuthTab=true and authStarted=true, do nothing —
        // handleAuthResult will be called by the auth tab launcher.
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(KEY_AUTH_STARTED, authStarted)
        outState.putBoolean(KEY_USING_AUTH_TAB, usingAuthTab)
        outState.putParcelable(KEY_AUTH_URI, authenticationUri)
        outState.putString(KEY_CALLBACK_SCHEME, callbackScheme)
    }
}
