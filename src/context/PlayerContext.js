import {
  createAudioPlayer,
  setAudioModeAsync,
  requestNotificationPermissionsAsync,
} from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as MusicCore from '../../modules/expo-music-core';
import { queueRepo } from '../db/repositories';
import { useLibrary } from './LibraryContext';
import { useSettings } from './SettingsContext';

const PlayerContext = createContext(null);

export const REPEAT_MODES = { OFF: 'off', ALL: 'all', ONE: 'one' };

const KEEP_AWAKE_TAG = 'minax-player';
const CROSSFADE_TICK_MS = 50;
/** Below this fraction of a track, "previous" restarts instead of stepping back. */
const RESTART_THRESHOLD_MS = 4000;

/**
 * The playback engine.
 *
 * expo-audio owns a single `AudioPlayer`; the queue, shuffle order, repeat mode, crossfade and
 * gapless preloading are all managed here so they behave identically whether the user drives
 * playback from the UI, the notification, or the lock screen.
 */
export function PlayerProvider({ children }) {
  const { settings, update } = useSettings();
  const { recordPlay, isFavorite, toggleFavorite } = useLibrary();

  const playerRef = useRef(null);
  /** Second player used only for the crossfade tail of the outgoing track. */
  const fadeOutPlayerRef = useRef(null);
  const preloadedRef = useRef(null);

  const [queue, setQueue] = useState([]);
  /** Indices into `queue`, in play order. Equal to 0..n-1 unless shuffle is on. */
  const [order, setOrder] = useState([]);
  const [orderPosition, setOrderPosition] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(REPEAT_MODES.OFF);
  const [sleepTimer, setSleepTimer] = useState(null); // { endsAt, endOfTrack }
  const [volume, setVolumeState] = useState(1);

  /**
   * In-app output level, 0–1. Every place that sets a player's volume scales by this, so the
   * crossfade ramp and the user's setting compose instead of overwriting each other.
   */
  const volumeRef = useRef(1);

  const listenStartRef = useRef(0);
  const listenedMsRef = useRef(0);
  const crossfadeTimerRef = useRef(null);
  const crossfadeArmedRef = useRef(false);
  const sleepTimeoutRef = useRef(null);
  const seekingRef = useRef(false);
  /**
   * Monotonic id for the live player. Every player instance captures the value it was created
   * with, so a disposed (or crossfading-out) player's late status updates can be ignored.
   * Keyed on generation rather than track id because repeat-one crossfades the same track into
   * itself, where both players would otherwise share an id.
   */
  const generationRef = useRef(0);

  const currentIndex = orderPosition >= 0 ? order[orderPosition] : -1;
  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  // Latest-value refs so callbacks registered once (status listener, native events) always
  // read current state without being re-registered on every render.
  const stateRef = useRef({});
  stateRef.current = {
    queue,
    order,
    orderPosition,
    repeatMode,
    shuffle,
    currentTrack,
    settings,
    isPlaying,
    positionMs,
    durationMs,
  };

  // ------------------------------------------------------------------ audio session

  useEffect(() => {
    (async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        // Lock-screen controls require exclusive focus, and it is also what users expect
        // from a music player when another app starts making noise.
        interruptionMode: settings.respectAudioFocus ? 'doNotMix' : 'mixWithOthers',
        shouldPlayInBackground: true,
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      }).catch(() => {});
      await requestNotificationPermissionsAsync().catch(() => {});
    })();
  }, [settings.respectAudioFocus]);

  // ------------------------------------------------------------------ equalizer restore

  useEffect(() => {
    if (!settings.equalizerEnabled) return;
    MusicCore.setEqualizerEnabled(true);
    if (settings.equalizerBands?.length) {
      MusicCore.setBandLevels(settings.equalizerBands);
    } else if (settings.equalizerPreset >= 0) {
      MusicCore.usePreset(settings.equalizerPreset);
    }
    MusicCore.setBassBoost(settings.bassBoost);
    MusicCore.setVirtualizer(settings.virtualizer);
    MusicCore.setLoudness(settings.loudness);
    MusicCore.setReverb(settings.reverb);
    // Runs once at start-up; the Equalizer screen applies live changes itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------ helpers

  const disposePlayer = useCallback((ref) => {
    const player = ref.current;
    ref.current = null;
    if (!player) return;
    try {
      player.pause();
      player.clearLockScreenControls?.();
      player.remove();
    } catch {
      // The player may already have been released by the OS.
    }
  }, []);

  const applyLockScreenMetadata = useCallback((player, track) => {
    if (!player || !track) return;
    const metadata = {
      title: track.title,
      artist: track.artist,
      albumTitle: track.album,
      artworkUrl: track.artworkUri ?? undefined,
    };
    try {
      player.setActiveForLockScreen(true, metadata, {
        showSeekBackward: false,
        showSeekForward: false,
        showSkipToNext: true,
        showSkipToPrevious: true,
      });
    } catch {
      // Older devices reject the options bag; fall back to the metadata-only form.
      try {
        player.setActiveForLockScreen(true, metadata);
      } catch {
        /* lock screen controls unavailable */
      }
    }
  }, []);

  const flushListen = useCallback(
    (track, completed) => {
      if (!track) return;
      const listened = listenedMsRef.current;
      listenedMsRef.current = 0;
      listenStartRef.current = 0;
      if (listened < 3000 && !completed) return; // ignore accidental taps
      recordPlay(track.id, listened, completed);
    },
    [recordPlay]
  );

  // ------------------------------------------------------------------ crossfade

  const cancelCrossfade = useCallback(() => {
    clearInterval(crossfadeTimerRef.current);
    crossfadeTimerRef.current = null;
    crossfadeArmedRef.current = false;
    disposePlayer(fadeOutPlayerRef);
  }, [disposePlayer]);

  /**
   * expo-audio has no native crossfade, so we ramp the outgoing player's volume down while the
   * incoming one ramps up. The outgoing player is a detached copy: the main player has already
   * moved on to the next source by the time the tail is still audible.
   */
  const runCrossfade = useCallback(
    (outgoingPlayer, incomingPlayer, seconds) => {
      if (!outgoingPlayer || !incomingPlayer || seconds <= 0) return;
      const steps = Math.max(1, Math.round((seconds * 1000) / CROSSFADE_TICK_MS));
      let step = 0;
      incomingPlayer.volume = 0;

      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = setInterval(() => {
        step += 1;
        const ratio = Math.min(1, step / steps);
        try {
          outgoingPlayer.volume = (1 - ratio) * volumeRef.current;
          incomingPlayer.volume = ratio * volumeRef.current;
        } catch {
          clearInterval(crossfadeTimerRef.current);
          crossfadeTimerRef.current = null;
          return;
        }
        if (ratio >= 1) {
          clearInterval(crossfadeTimerRef.current);
          crossfadeTimerRef.current = null;
          disposePlayer(fadeOutPlayerRef);
        }
      }, CROSSFADE_TICK_MS);
    },
    [disposePlayer]
  );

  // ------------------------------------------------------------------ core transport

  /**
   * Loads `queue[index]` into the player.
   * @param {{ autoPlay?: boolean, crossfadeFrom?: object, startAtMs?: number }} options
   */
  const loadOrderPosition = useCallback(
    (nextOrderPosition, options = {}) => {
      const { autoPlay = true, crossfadeFrom = null, startAtMs = 0 } = options;
      const { queue: currentQueue, order: currentOrder } = stateRef.current;

      const trackIndex = currentOrder[nextOrderPosition];
      const track = currentQueue[trackIndex];
      if (!track) return;

      const previousPlayer = playerRef.current;
      const crossfadeSeconds = crossfadeFrom ? settings.crossfadeSeconds : 0;

      // With crossfade the old player must keep sounding, so hand it to the fade-out slot
      // instead of destroying it.
      if (crossfadeSeconds > 0 && previousPlayer) {
        disposePlayer(fadeOutPlayerRef);
        fadeOutPlayerRef.current = previousPlayer;
        try {
          previousPlayer.clearLockScreenControls?.();
        } catch {
          /* noop */
        }
      } else if (previousPlayer) {
        disposePlayer(playerRef);
      }

      let player;
      // A track preloaded for gapless playback is already buffered — reuse it.
      if (preloadedRef.current?.trackId === track.id && preloadedRef.current.player) {
        player = preloadedRef.current.player;
        preloadedRef.current = null;
      } else {
        player = createAudioPlayer({ uri: track.uri }, { updateInterval: 250 });
      }
      playerRef.current = player;

      player.volume = crossfadeSeconds > 0 ? 0 : volumeRef.current;
      try {
        player.setPlaybackRate(settings.playbackSpeed, 'high');
      } catch {
        /* rate unsupported */
      }

      applyLockScreenMetadata(player, track);

      generationRef.current += 1;
      const generation = generationRef.current;
      player.addListener('playbackStatusUpdate', (status) => onStatus(status, generation));

      if (startAtMs > 0) {
        player.seekTo(startAtMs / 1000).catch(() => {});
      }
      if (autoPlay) {
        player.play();
        listenStartRef.current = Date.now();
      }

      if (crossfadeSeconds > 0) {
        runCrossfade(fadeOutPlayerRef.current, player, crossfadeSeconds);
      }

      setOrderPosition(nextOrderPosition);
      setPositionMs(startAtMs);
      setDurationMs(track.duration);
      crossfadeArmedRef.current = false;
      listenedMsRef.current = 0;
      // eslint-disable-next-line no-use-before-define
    },
    // onStatus is stable via ref indirection below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.crossfadeSeconds, settings.playbackSpeed, applyLockScreenMetadata, disposePlayer, runCrossfade]
  );

  const loadRef = useRef(loadOrderPosition);
  loadRef.current = loadOrderPosition;

  /** Computes the next position, honouring repeat and shuffle. Returns -1 when the queue ends. */
  const nextOrderPosition = useCallback((automatic) => {
    const { order: currentOrder, orderPosition: position, repeatMode: repeat } = stateRef.current;
    if (currentOrder.length === 0) return -1;
    if (automatic && repeat === REPEAT_MODES.ONE) return position;
    if (position < currentOrder.length - 1) return position + 1;
    if (repeat === REPEAT_MODES.ALL) return 0;
    return automatic ? -1 : 0;
  }, []);

  const advance = useCallback(
    (automatic) => {
      const next = nextOrderPosition(automatic);
      const { currentTrack: playing, settings: currentSettings } = stateRef.current;

      if (next < 0) {
        flushListen(playing, true);
        disposePlayer(playerRef);
        cancelCrossfade();
        setIsPlaying(false);
        setPositionMs(0);
        return;
      }

      flushListen(playing, automatic);
      const shouldCrossfade = currentSettings.crossfadeSeconds > 0;
      loadRef.current(next, { autoPlay: true, crossfadeFrom: shouldCrossfade ? playing : null });
    },
    [nextOrderPosition, flushListen, disposePlayer, cancelCrossfade]
  );

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  // ------------------------------------------------------------------ status handling

  const flushListenRef = useRef(flushListen);
  flushListenRef.current = flushListen;

  const sleepTimerRef = useRef(null);
  sleepTimerRef.current = sleepTimer;

  // Every player instance gets the same trampoline listener; the body below is swapped on each
  // render so it always closes over fresh state without re-subscribing.
  const onStatusRef = useRef(() => {});
  function onStatus(status, generation) {
    onStatusRef.current(status, generation);
  }

  onStatusRef.current = (status, generation) => {
    const { currentTrack: playing, settings: currentSettings } = stateRef.current;
    // Late update from a player we have already replaced.
    if (!playing || generation !== generationRef.current) return;

    setIsPlaying(status.playing);
    setIsBuffering(status.isBuffering);

    if (!seekingRef.current) {
      setPositionMs(status.currentTime * 1000);
    }
    if (status.duration > 0) {
      setDurationMs(status.duration * 1000);
    }

    if (status.playing && listenStartRef.current > 0) {
      const now = Date.now();
      listenedMsRef.current += now - listenStartRef.current;
      listenStartRef.current = now;
    } else if (status.playing) {
      listenStartRef.current = Date.now();
    } else {
      listenStartRef.current = 0;
    }

    // Crossfade has to start *before* the track ends.
    const crossfadeSeconds = currentSettings.crossfadeSeconds;
    if (
      crossfadeSeconds > 0 &&
      status.playing &&
      status.duration > 0 &&
      !crossfadeArmedRef.current &&
      status.duration - status.currentTime <= crossfadeSeconds
    ) {
      crossfadeArmedRef.current = true;
      advanceRef.current(true);
      return;
    }

    if (status.didJustFinish) {
      // The sleep timer set to "end of track" stops here rather than mid-song.
      if (sleepTimerRef.current?.endOfTrack) {
        sleepTimerRef.current = null;
        setSleepTimer(null);
        flushListenRef.current(playing, true);
        playerRef.current?.pause();
        setIsPlaying(false);
        return;
      }
      advanceRef.current(true);
    }
  };

  // ------------------------------------------------------------------ gapless preloading

  useEffect(() => {
    if (!settings.gaplessPlayback || settings.crossfadeSeconds > 0) return;
    const next = nextOrderPosition(true);
    if (next < 0 || next === orderPosition) return;

    const track = queue[order[next]];
    if (!track || preloadedRef.current?.trackId === track.id) return;

    // Build the next player early and leave it paused, so switching tracks costs no I/O.
    try {
      preloadedRef.current?.player?.remove();
    } catch {
      /* noop */
    }
    try {
      const player = createAudioPlayer({ uri: track.uri }, { updateInterval: 1000 });
      player.volume = volumeRef.current;
      preloadedRef.current = { trackId: track.id, player };
    } catch {
      preloadedRef.current = null;
    }
  }, [
    settings.gaplessPlayback,
    settings.crossfadeSeconds,
    orderPosition,
    order,
    queue,
    nextOrderPosition,
  ]);

  // ------------------------------------------------------------------ public transport API

  const buildOrder = useCallback((length, shuffled, startIndex) => {
    const indices = Array.from({ length }, (_, i) => i);
    if (!shuffled) return indices;

    // Fisher-Yates over everything except the requested start, which is pinned first so
    // "shuffle from this track" plays that track immediately.
    const rest = indices.filter((i) => i !== startIndex);
    for (let i = rest.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return startIndex >= 0 ? [startIndex, ...rest] : rest;
  }, []);

  const playQueue = useCallback(
    (tracks, startIndex = 0, { shuffled = null } = {}) => {
      if (!tracks.length) return;
      const useShuffle = shuffled ?? shuffle;
      const safeStart = Math.min(Math.max(0, startIndex), tracks.length - 1);
      const nextOrder = buildOrder(tracks.length, useShuffle, safeStart);
      const position = nextOrder.indexOf(safeStart);

      flushListen(stateRef.current.currentTrack, false);
      cancelCrossfade();

      setQueue(tracks);
      setOrder(nextOrder);
      setShuffle(useShuffle);

      stateRef.current = { ...stateRef.current, queue: tracks, order: nextOrder };
      loadRef.current(position >= 0 ? position : 0, { autoPlay: true });
    },
    [shuffle, buildOrder, flushListen, cancelCrossfade]
  );

  const shuffleAndPlay = useCallback(
    (tracks) => {
      if (!tracks.length) return;
      const start = Math.floor(Math.random() * tracks.length);
      playQueue(tracks, start, { shuffled: true });
    },
    [playQueue]
  );

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.play();
    listenStartRef.current = Date.now();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const skipNext = useCallback(() => advanceRef.current(false), []);

  const skipPrevious = useCallback(() => {
    const { orderPosition: position, order: currentOrder } = stateRef.current;
    const player = playerRef.current;

    // Standard music-player behaviour: restart the track unless we are near its start.
    if (player && positionMs > RESTART_THRESHOLD_MS) {
      player.seekTo(0).catch(() => {});
      setPositionMs(0);
      return;
    }
    if (position <= 0) {
      if (currentOrder.length === 0) return;
      player?.seekTo(0).catch(() => {});
      setPositionMs(0);
      return;
    }
    flushListen(stateRef.current.currentTrack, false);
    loadRef.current(position - 1, { autoPlay: true });
  }, [positionMs, flushListen]);

  const seekTo = useCallback((milliseconds) => {
    const player = playerRef.current;
    if (!player) return;
    seekingRef.current = true;
    setPositionMs(milliseconds);
    player
      .seekTo(milliseconds / 1000)
      .catch(() => {})
      .finally(() => {
        seekingRef.current = false;
      });
  }, []);

  /**
   * Jumps a fixed step relative to the live position — the ±10 s controls.
   *
   * Reads `positionMs` off the ref rather than closing over it so repeated taps compound
   * instead of all resolving against the position captured at the first render.
   */
  const seekBy = useCallback(
    (deltaMs) => {
      const player = playerRef.current;
      if (!player) return;
      const total = stateRef.current.durationMs || 0;
      const next = Math.max(0, stateRef.current.positionMs + deltaMs);
      seekTo(total > 0 ? Math.min(next, total) : next);
    },
    [seekTo]
  );

  const skipToQueueIndex = useCallback(
    (queueIndex) => {
      const position = order.indexOf(queueIndex);
      if (position < 0) return;
      flushListen(stateRef.current.currentTrack, false);
      loadRef.current(position, { autoPlay: true });
    },
    [order, flushListen]
  );

  /**
   * Sets the in-app output level. Applied to the live player immediately unless a crossfade
   * is mid-ramp — that interval owns the volume until it finishes, and picks the new level
   * up on its next tick.
   */
  const setVolume = useCallback((value) => {
    const clamped = Math.min(1, Math.max(0, value));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    if (crossfadeTimerRef.current) return;
    try {
      if (playerRef.current) playerRef.current.volume = clamped;
    } catch {
      /* player already released */
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((previous) => {
      const next = !previous;
      const { queue: currentQueue, order: currentOrder, orderPosition: position } = stateRef.current;
      if (currentQueue.length === 0) return next;

      const playingIndex = currentOrder[position];
      const rebuilt = buildOrder(currentQueue.length, next, playingIndex);
      setOrder(rebuilt);
      setOrderPosition(rebuilt.indexOf(playingIndex));
      stateRef.current = { ...stateRef.current, order: rebuilt };
      return next;
    });
  }, [buildOrder]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((previous) => {
      if (previous === REPEAT_MODES.OFF) return REPEAT_MODES.ALL;
      if (previous === REPEAT_MODES.ALL) return REPEAT_MODES.ONE;
      return REPEAT_MODES.OFF;
    });
  }, []);

  // ------------------------------------------------------------------ queue editing

  const addToQueue = useCallback((tracks) => {
    const list = Array.isArray(tracks) ? tracks : [tracks];
    setQueue((previous) => {
      const next = [...previous, ...list];
      setOrder((previousOrder) => {
        const appended = list.map((_, i) => previous.length + i);
        const nextOrder = [...previousOrder, ...appended];
        stateRef.current = { ...stateRef.current, queue: next, order: nextOrder };
        return nextOrder;
      });
      return next;
    });
  }, []);

  const playNext = useCallback((tracks) => {
    const list = Array.isArray(tracks) ? tracks : [tracks];
    setQueue((previous) => {
      const next = [...previous, ...list];
      const appended = list.map((_, i) => previous.length + i);
      setOrder((previousOrder) => {
        const position = stateRef.current.orderPosition;
        const nextOrder = [...previousOrder];
        nextOrder.splice(position + 1, 0, ...appended);
        stateRef.current = { ...stateRef.current, queue: next, order: nextOrder };
        return nextOrder;
      });
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((queueIndex) => {
    setOrder((previousOrder) => {
      const position = previousOrder.indexOf(queueIndex);
      if (position < 0 || position === stateRef.current.orderPosition) return previousOrder;
      const nextOrder = previousOrder.filter((i) => i !== queueIndex);
      if (position < stateRef.current.orderPosition) {
        setOrderPosition((p) => p - 1);
      }
      stateRef.current = { ...stateRef.current, order: nextOrder };
      return nextOrder;
    });
  }, []);

  const clearQueue = useCallback(() => {
    flushListen(stateRef.current.currentTrack, false);
    disposePlayer(playerRef);
    cancelCrossfade();
    setQueue([]);
    setOrder([]);
    setOrderPosition(-1);
    setIsPlaying(false);
    setPositionMs(0);
    setDurationMs(0);
  }, [flushListen, disposePlayer, cancelCrossfade]);

  // ------------------------------------------------------------------ sleep timer

  const startSleepTimer = useCallback(
    ({ minutes = 0, endOfTrack = false }) => {
      clearTimeout(sleepTimeoutRef.current);
      if (endOfTrack) {
        setSleepTimer({ endsAt: null, endOfTrack: true });
        return;
      }
      const endsAt = Date.now() + minutes * 60 * 1000;
      setSleepTimer({ endsAt, endOfTrack: false });
      sleepTimeoutRef.current = setTimeout(() => {
        playerRef.current?.pause();
        setIsPlaying(false);
        setSleepTimer(null);
      }, minutes * 60 * 1000);
    },
    []
  );

  const cancelSleepTimer = useCallback(() => {
    clearTimeout(sleepTimeoutRef.current);
    sleepTimeoutRef.current = null;
    setSleepTimer(null);
  }, []);

  // ------------------------------------------------------------------ side effects

  // Keep screen on.
  useEffect(() => {
    if (settings.keepScreenOn && isPlaying) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
      return () => deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    }
    return undefined;
  }, [settings.keepScreenOn, isPlaying]);

  // Pause on headphone disconnect.
  useEffect(() => {
    if (!settings.pauseOnHeadphoneDisconnect) return undefined;
    const subscription = MusicCore.addAudioBecomingNoisyListener(() => {
      if (stateRef.current.isPlaying) {
        playerRef.current?.pause();
        setIsPlaying(false);
      }
    });
    return () => subscription.remove();
  }, [settings.pauseOnHeadphoneDisconnect]);

  // Live playback-rate changes.
  useEffect(() => {
    try {
      playerRef.current?.setPlaybackRate(settings.playbackSpeed, 'high');
    } catch {
      /* rate unsupported */
    }
  }, [settings.playbackSpeed]);

  // Persist the queue so the app reopens where the user left off.
  useEffect(() => {
    if (!settings.rememberQueue || queue.length === 0) return;
    const handle = setTimeout(() => {
      queueRepo
        .save(queue.map((t) => t.id), currentIndex, positionMs)
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(handle);
  }, [settings.rememberQueue, queue, currentIndex, positionMs]);

  // Tear everything down on unmount.
  useEffect(
    () => () => {
      clearInterval(crossfadeTimerRef.current);
      clearTimeout(sleepTimeoutRef.current);
      try {
        preloadedRef.current?.player?.remove();
      } catch {
        /* noop */
      }
      disposePlayer(playerRef);
      disposePlayer(fadeOutPlayerRef);
    },
    [disposePlayer]
  );

  // ------------------------------------------------------------------ restore

  /** Rehydrates the last queue. Called by the splash screen once the library is scanned. */
  const restoreQueue = useCallback(
    async (resolveTracks) => {
      if (!settings.rememberQueue) return;
      const saved = await queueRepo.load().catch(() => null);
      if (!saved?.trackIds?.length) return;
      const tracks = resolveTracks(saved.trackIds);
      if (!tracks.length) return;

      const startIndex = Math.min(Math.max(0, saved.currentIndex), tracks.length - 1);
      const nextOrder = Array.from({ length: tracks.length }, (_, i) => i);
      setQueue(tracks);
      setOrder(nextOrder);
      stateRef.current = { ...stateRef.current, queue: tracks, order: nextOrder };
      loadRef.current(startIndex, { autoPlay: false, startAtMs: saved.positionMs });
      setIsPlaying(false);
    },
    [settings.rememberQueue]
  );

  const value = useMemo(
    () => ({
      queue,
      order,
      currentTrack,
      currentIndex,
      orderPosition,
      isPlaying,
      isBuffering,
      positionMs,
      durationMs: durationMs || currentTrack?.duration || 0,
      shuffle,
      repeatMode,
      sleepTimer,
      volume,
      hasQueue: queue.length > 0,
      upNext: order.slice(orderPosition + 1).map((i) => queue[i]).filter(Boolean),

      playQueue,
      shuffleAndPlay,
      play,
      pause,
      togglePlay,
      skipNext,
      skipPrevious,
      seekTo,
      seekBy,
      skipToQueueIndex,
      toggleShuffle,
      cycleRepeat,
      setVolume,
      addToQueue,
      playNext,
      removeFromQueue,
      clearQueue,
      startSleepTimer,
      cancelSleepTimer,
      restoreQueue,
      setPlaybackSpeed: (speed) => update('playbackSpeed', speed),

      isFavorite,
      toggleFavorite,
    }),
    [
      queue,
      order,
      currentTrack,
      currentIndex,
      orderPosition,
      isPlaying,
      isBuffering,
      positionMs,
      durationMs,
      shuffle,
      repeatMode,
      sleepTimer,
      volume,
      playQueue,
      shuffleAndPlay,
      play,
      pause,
      togglePlay,
      skipNext,
      skipPrevious,
      seekTo,
      seekBy,
      skipToQueueIndex,
      toggleShuffle,
      cycleRepeat,
      setVolume,
      addToQueue,
      playNext,
      removeFromQueue,
      clearQueue,
      startSleepTimer,
      cancelSleepTimer,
      restoreQueue,
      update,
      isFavorite,
      toggleFavorite,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return context;
}
