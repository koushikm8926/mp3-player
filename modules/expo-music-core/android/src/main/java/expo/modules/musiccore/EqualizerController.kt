package expo.modules.musiccore

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.LoudnessEnhancer
import android.media.audiofx.PresetReverb
import android.media.audiofx.Virtualizer
import android.util.Log

/**
 * Wraps the platform AudioFx effects.
 *
 * Session 0 is the global output mix, which is what we attach to: expo-audio owns the ExoPlayer
 * instance and does not expose its audio session id, and attaching to the output mix also means
 * the user's EQ curve survives a track change (each new MediaItem would otherwise get a new
 * session). [attachToSession] is kept for the case where a session id becomes available.
 */
class EqualizerController {

  companion object {
    private const val TAG = "MusicCoreEq"
    const val GLOBAL_SESSION = 0
    private const val PRIORITY = 1000
  }

  private var equalizer: Equalizer? = null
  private var bassBoost: BassBoost? = null
  private var virtualizer: Virtualizer? = null
  private var loudness: LoudnessEnhancer? = null
  private var reverb: PresetReverb? = null

  private var sessionId: Int = GLOBAL_SESSION
  private var enabled: Boolean = false

  /** Levels the user set, replayed onto a fresh effect if the session is rebuilt. */
  private var pendingBandLevels: ShortArray? = null
  private var pendingBassBoost: Short = 0
  private var pendingVirtualizer: Short = 0
  private var pendingLoudness: Int = 0
  private var pendingReverb: Short = 0

  @Synchronized
  fun attachToSession(newSessionId: Int) {
    if (equalizer != null && sessionId == newSessionId) return
    sessionId = newSessionId
    release()
    ensureCreated()
  }

  @Synchronized
  private fun ensureCreated(): Boolean {
    if (equalizer != null) return true
    return try {
      equalizer = Equalizer(PRIORITY, sessionId).apply { setEnabled(this@EqualizerController.enabled) }
      bassBoost = runCatching {
        BassBoost(PRIORITY, sessionId).apply { setEnabled(this@EqualizerController.enabled) }
      }.getOrNull()
      virtualizer = runCatching {
        Virtualizer(PRIORITY, sessionId).apply { setEnabled(this@EqualizerController.enabled) }
      }.getOrNull()
      loudness = runCatching {
        LoudnessEnhancer(sessionId).apply { setEnabled(this@EqualizerController.enabled) }
      }.getOrNull()
      reverb = runCatching {
        PresetReverb(PRIORITY, sessionId).apply { setEnabled(this@EqualizerController.enabled) }
      }.getOrNull()
      restorePending()
      true
    } catch (e: Throwable) {
      // Some OEM ROMs refuse effects on the global mix, or the device is already at its
      // effect limit. The UI degrades to "unsupported" rather than crashing playback.
      Log.w(TAG, "Unable to create audio effects for session $sessionId", e)
      release()
      false
    }
  }

  private fun restorePending() {
    val eq = equalizer ?: return
    pendingBandLevels?.let { levels ->
      val count = eq.numberOfBands.toInt()
      for (i in 0 until minOf(count, levels.size)) {
        runCatching { eq.setBandLevel(i.toShort(), levels[i]) }
      }
    }
    runCatching { bassBoost?.setStrength(pendingBassBoost) }
    runCatching { virtualizer?.setStrength(pendingVirtualizer) }
    runCatching { loudness?.setTargetGain(pendingLoudness) }
    runCatching { reverb?.setPreset(pendingReverb) }
  }

  @Synchronized
  fun isSupported(): Boolean = ensureCreated()

  @Synchronized
  fun setEnabled(value: Boolean) {
    enabled = value
    if (!ensureCreated()) return
    runCatching { equalizer?.setEnabled(value) }
    runCatching { bassBoost?.setEnabled(value) }
    runCatching { virtualizer?.setEnabled(value) }
    runCatching { loudness?.setEnabled(value) }
    runCatching { reverb?.setEnabled(value) }
  }

  @Synchronized
  fun isEnabled(): Boolean = enabled

  @Synchronized
  fun describe(): Map<String, Any?> {
    if (!ensureCreated()) {
      return mapOf(
        "supported" to false,
        "enabled" to false,
        "bands" to emptyList<Any>(),
        "presets" to emptyList<Any>(),
        "bandLevelRange" to listOf(-1500, 1500),
        "hasBassBoost" to false,
        "hasVirtualizer" to false,
        "hasLoudnessEnhancer" to false,
        "hasReverb" to false
      )
    }
    val eq = equalizer!!
    val range = eq.bandLevelRange
    val bands = (0 until eq.numberOfBands.toInt()).map { index ->
      val band = index.toShort()
      mapOf(
        "index" to index,
        "centerFrequency" to eq.getCenterFreq(band),
        "level" to eq.getBandLevel(band).toInt(),
        "lowerFrequency" to eq.getBandFreqRange(band)[0],
        "upperFrequency" to eq.getBandFreqRange(band)[1]
      )
    }
    val presets = (0 until eq.numberOfPresets.toInt()).map { index ->
      mapOf("index" to index, "name" to eq.getPresetName(index.toShort()))
    }
    return mapOf(
      "supported" to true,
      "enabled" to enabled,
      "bands" to bands,
      "presets" to presets,
      "bandLevelRange" to listOf(range[0].toInt(), range[1].toInt()),
      "currentPreset" to runCatching { eq.currentPreset.toInt() }.getOrDefault(-1),
      "bassBoost" to pendingBassBoost.toInt(),
      "virtualizer" to pendingVirtualizer.toInt(),
      "loudness" to pendingLoudness,
      "reverb" to pendingReverb.toInt(),
      "hasBassBoost" to (bassBoost != null),
      "hasVirtualizer" to (virtualizer != null),
      "hasLoudnessEnhancer" to (loudness != null),
      "hasReverb" to (reverb != null)
    )
  }

  @Synchronized
  fun setBandLevel(band: Int, millibels: Int) {
    if (!ensureCreated()) return
    val eq = equalizer ?: return
    val count = eq.numberOfBands.toInt()
    if (band < 0 || band >= count) return

    val levels = pendingBandLevels?.copyOf(count) ?: ShortArray(count) { eq.getBandLevel(it.toShort()) }
    val range = eq.bandLevelRange
    val clamped = millibels.coerceIn(range[0].toInt(), range[1].toInt()).toShort()
    levels[band] = clamped
    pendingBandLevels = levels
    runCatching { eq.setBandLevel(band.toShort(), clamped) }
  }

  @Synchronized
  fun setBandLevels(millibels: List<Int>) {
    if (!ensureCreated()) return
    millibels.forEachIndexed { index, value -> setBandLevel(index, value) }
  }

  @Synchronized
  fun usePreset(preset: Int) {
    if (!ensureCreated()) return
    val eq = equalizer ?: return
    if (preset < 0 || preset >= eq.numberOfPresets) return
    runCatching {
      eq.usePreset(preset.toShort())
      // Cache the resulting curve so a later session rebuild reproduces it.
      pendingBandLevels = ShortArray(eq.numberOfBands.toInt()) { eq.getBandLevel(it.toShort()) }
    }
  }

  /** 0..1000, the platform's "strength" scale. */
  @Synchronized
  fun setBassBoost(strength: Int) {
    if (!ensureCreated()) return
    pendingBassBoost = strength.coerceIn(0, 1000).toShort()
    runCatching { bassBoost?.setStrength(pendingBassBoost) }
  }

  @Synchronized
  fun setVirtualizer(strength: Int) {
    if (!ensureCreated()) return
    pendingVirtualizer = strength.coerceIn(0, 1000).toShort()
    runCatching { virtualizer?.setStrength(pendingVirtualizer) }
  }

  /** Target gain in millibels; used as a simple volume-boost / normalization control. */
  @Synchronized
  fun setLoudness(millibels: Int) {
    if (!ensureCreated()) return
    pendingLoudness = millibels.coerceIn(0, 2000)
    runCatching { loudness?.setTargetGain(pendingLoudness) }
  }

  @Synchronized
  fun setReverb(preset: Int) {
    if (!ensureCreated()) return
    pendingReverb = preset.coerceIn(0, 6).toShort()
    runCatching { reverb?.setPreset(pendingReverb) }
  }

  @Synchronized
  fun release() {
    runCatching { equalizer?.release() }
    runCatching { bassBoost?.release() }
    runCatching { virtualizer?.release() }
    runCatching { loudness?.release() }
    runCatching { reverb?.release() }
    equalizer = null
    bassBoost = null
    virtualizer = null
    loudness = null
    reverb = null
  }
}
