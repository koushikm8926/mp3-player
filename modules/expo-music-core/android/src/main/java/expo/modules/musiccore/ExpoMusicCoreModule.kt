package expo.modules.musiccore

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.ContentObserver
import android.media.AudioManager
import android.media.audiofx.AudioEffect
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MissingContextException :
  CodedException("ERR_MUSIC_CORE_CONTEXT", "React context is not available", null)

class ExpoMusicCoreModule : Module() {

  private val context: Context
    get() = appContext.reactContext ?: throw MissingContextException()

  private val equalizer = EqualizerController()

  private var noisyReceiver: BroadcastReceiver? = null
  private var mediaObserver: ContentObserver? = null
  private var observing = false

  override fun definition() = ModuleDefinition {
    Name("ExpoMusicCore")

    Events("onAudioBecomingNoisy", "onMediaLibraryChanged")

    // ---------------------------------------------------------------- permissions

    AsyncFunction("getPermissionsAsync") { promise: Promise ->
      Permissions.getPermissionsWithPermissionsManager(
        appContext.permissions, promise, *requiredPermissions()
      )
    }

    AsyncFunction("requestPermissionsAsync") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions, promise, *requiredPermissions()
      )
    }

    // ---------------------------------------------------------------- library

    AsyncFunction("scanAudioAsync") { options: Map<String, Any?>? ->
      val minDuration = (options?.get("minDurationMs") as? Number)?.toLong() ?: 0L
      val includeAll = options?.get("includeAllFileTypes") as? Boolean ?: true
      MediaStoreScanner.scan(context, minDuration, includeAll)
    }

    AsyncFunction("refreshMediaStoreAsync") { paths: List<String>? ->
      val targets = paths?.takeIf { it.isNotEmpty() }?.toTypedArray()
        ?: arrayOf(android.os.Environment.getExternalStorageDirectory().absolutePath)
      MediaStoreScanner.rescanVolume(context, targets)
      true
    }

    Function("getAlbumArtworkUri") { albumId: String ->
      MediaStoreScanner.albumArtUri(albumId.toLongOrNull() ?: -1L)
    }

    // ---------------------------------------------------------------- equalizer

    Function("isEqualizerSupported") { equalizer.isSupported() }

    Function("getEqualizerState") { equalizer.describe() }

    Function("setEqualizerEnabled") { enabled: Boolean ->
      equalizer.setEnabled(enabled)
      equalizer.describe()
    }

    Function("setBandLevel") { band: Int, millibels: Int ->
      equalizer.setBandLevel(band, millibels)
    }

    Function("setBandLevels") { levels: List<Int> ->
      equalizer.setBandLevels(levels)
    }

    Function("usePreset") { preset: Int ->
      equalizer.usePreset(preset)
      equalizer.describe()
    }

    Function("setBassBoost") { strength: Int -> equalizer.setBassBoost(strength) }

    Function("setVirtualizer") { strength: Int -> equalizer.setVirtualizer(strength) }

    Function("setLoudness") { millibels: Int -> equalizer.setLoudness(millibels) }

    Function("setReverb") { preset: Int -> equalizer.setReverb(preset) }

    Function("attachEqualizerToSession") { sessionId: Int ->
      equalizer.attachToSession(sessionId)
    }

    /** Hands the user off to whatever system/OEM equalizer is installed. */
    Function("openSystemEqualizer") { sessionId: Int ->
      val intent = Intent(AudioEffect.ACTION_DISPLAY_AUDIO_EFFECT_CONTROL_PANEL).apply {
        putExtra(AudioEffect.EXTRA_AUDIO_SESSION, sessionId)
        putExtra(AudioEffect.EXTRA_PACKAGE_NAME, context.packageName)
        putExtra(AudioEffect.EXTRA_CONTENT_TYPE, AudioEffect.CONTENT_TYPE_MUSIC)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
        true
      } else {
        false
      }
    }

    // ---------------------------------------------------------------- device

    Function("isWiredHeadsetConnected") {
      val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      am.getDevices(AudioManager.GET_DEVICES_OUTPUTS).any {
        it.type == android.media.AudioDeviceInfo.TYPE_WIRED_HEADSET ||
          it.type == android.media.AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
          it.type == android.media.AudioDeviceInfo.TYPE_USB_HEADSET ||
          it.type == android.media.AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
      }
    }

    // ---------------------------------------------------------------- lifecycle

    OnStartObserving { startObserving() }

    OnStopObserving { stopObserving() }

    OnDestroy {
      stopObserving()
      equalizer.release()
    }
  }

  private fun requiredPermissions(): Array<String> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      arrayOf(Manifest.permission.READ_MEDIA_AUDIO)
    } else {
      arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
    }

  /**
   * Two listeners feed the JS layer:
   *  - AUDIO_BECOMING_NOISY, so "pause on headphone disconnect" can be honoured (and can be
   *    turned off in Settings, which is why it is surfaced as an event rather than handled here).
   *  - a MediaStore observer, so the library auto-refreshes when files are added or removed.
   */
  private fun startObserving() {
    if (observing) return
    observing = true
    val ctx = appContext.reactContext ?: return

    noisyReceiver = object : BroadcastReceiver() {
      override fun onReceive(receiverContext: Context?, intent: Intent?) {
        if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
          sendEvent("onAudioBecomingNoisy", mapOf("reason" to "headphonesDisconnected"))
        }
      }
    }
    val filter = IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ctx.registerReceiver(noisyReceiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      ctx.registerReceiver(noisyReceiver, filter)
    }

    mediaObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
      override fun onChange(selfChange: Boolean, uri: Uri?) {
        sendEvent("onMediaLibraryChanged", mapOf("uri" to uri?.toString()))
      }
    }.also {
      ctx.contentResolver.registerContentObserver(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, true, it
      )
    }
  }

  private fun stopObserving() {
    if (!observing) return
    observing = false
    val ctx = appContext.reactContext ?: return
    noisyReceiver?.let { runCatching { ctx.unregisterReceiver(it) } }
    mediaObserver?.let { runCatching { ctx.contentResolver.unregisterContentObserver(it) } }
    noisyReceiver = null
    mediaObserver = null
  }
}
