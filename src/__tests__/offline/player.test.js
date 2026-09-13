import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

import { PlayerProvider, REPEAT_MODES, usePlayer } from '../../context/PlayerContext';
import { queueRepo } from '../../db/repositories';

const mockPlayers = [];

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn((source) => {
    const player = {
      source,
      volume: 1,
      listener: null,
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(() => Promise.resolve()),
      setPlaybackRate: jest.fn(),
      setActiveForLockScreen: jest.fn(),
      clearLockScreenControls: jest.fn(),
      addListener: jest.fn((event, callback) => {
        player.listener = callback;
        return { remove: jest.fn() };
      }),
    };
    mockPlayers.push(player);
    return player;
  }),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  requestNotificationPermissionsAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../services/api', () => ({ api: { reportSongDuration: jest.fn(() => Promise.resolve()) } }));
jest.mock('../../db/repositories', () => ({
  queueRepo: { save: jest.fn(() => Promise.resolve()), load: jest.fn(() => Promise.resolve(null)) },
}));

const mockRecordPlay = jest.fn();
const mockLibrary = {
  recordPlay: (...args) => mockRecordPlay(...args),
  isFavorite: () => false,
  toggleFavorite: jest.fn(),
};
jest.mock('../../context/LibraryContext', () => ({ useLibrary: () => mockLibrary }));

let mockSettingsValue;
jest.mock('../../context/SettingsContext', () => ({ useSettings: () => mockSettingsValue }));

const BASE_SETTINGS = {
  crossfadeSeconds: 0,
  gaplessPlayback: false,
  keepScreenOn: false,
  pauseOnHeadphoneDisconnect: true,
  playbackSpeed: 1,
  respectAudioFocus: true,
  rememberQueue: true,
  equalizerEnabled: false,
};

const TRACKS = ['a', 'b', 'c', 'd'].map((id) => ({
  id,
  uri: `file:///Music/${id}.mp3`,
  title: `Song ${id.toUpperCase()}`,
  artist: 'Artist',
  album: 'Album',
  duration: 180000,
}));
const EXTRA = { id: 'e', uri: 'file:///Music/e.mp3', title: 'Song E', artist: 'Artist', album: 'Album', duration: 120000 };

const wrapper = ({ children }) => <PlayerProvider>{children}</PlayerProvider>;

function setup(settings = {}) {
  mockSettingsValue = { settings: { ...BASE_SETTINGS, ...settings }, update: jest.fn() };
  return renderHook(() => usePlayer(), { wrapper }).result;
}

const livePlayer = () => mockPlayers[mockPlayers.length - 1];
const ids = (tracks) => tracks.map((t) => t.id);

/** Simulates a status tick from the native player. */
function emit(status, player = livePlayer()) {
  act(() => {
    player.listener({ playing: true, isBuffering: false, currentTime: 0, duration: 180, didJustFinish: false, ...status });
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPlayers.length = 0;
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('starting playback', () => {
  it('starts with nothing queued', () => {
    const result = setup();
    expect(result.current.hasQueue).toBe(false);
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });

  it('plays the chosen song from a list and queues the rest', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 1));

    expect(result.current.currentTrack.id).toBe('b');
    expect(ids(result.current.upNext)).toEqual(['c', 'd']);
    expect(livePlayer().source).toEqual({ uri: 'file:///Music/b.mp3' });
    expect(livePlayer().play).toHaveBeenCalled();
    expect(livePlayer().setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ title: 'Song B', artist: 'Artist' }),
      expect.anything()
    );
    expect(result.current.durationMs).toBe(180000);
  });

  it('ignores an empty list', () => {
    const result = setup();
    act(() => result.current.playQueue([]));
    expect(result.current.hasQueue).toBe(false);
    expect(mockPlayers).toHaveLength(0);
  });

  it('clamps an out-of-range start position', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 99));
    expect(result.current.currentTrack.id).toBe('d');
    act(() => result.current.playQueue(TRACKS, -3));
    expect(result.current.currentTrack.id).toBe('a');
  });

  it('applies the saved playback speed', () => {
    const result = setup({ playbackSpeed: 1.25 });
    act(() => result.current.playQueue(TRACKS, 0));
    expect(livePlayer().setPlaybackRate).toHaveBeenCalledWith(1.25, 'high');
  });
});

describe('play / pause and seeking', () => {
  it('toggles between playing and paused', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(true);
    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(false);
    expect(livePlayer().pause).toHaveBeenCalledTimes(1);
  });

  it('follows the position reported by the player', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    emit({ currentTime: 42.5, duration: 181 });
    expect(result.current.positionMs).toBe(42500);
    expect(result.current.durationMs).toBe(181000);
    expect(result.current.isPlaying).toBe(true);
  });

  it('seeks to a position and clamps ±10 s jumps to the track', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => result.current.seekTo(30000));
    expect(livePlayer().seekTo).toHaveBeenLastCalledWith(30);
    expect(result.current.positionMs).toBe(30000);

    act(() => result.current.seekBy(10000));
    expect(result.current.positionMs).toBe(40000);
    act(() => result.current.seekBy(10_000_000));
    expect(result.current.positionMs).toBe(180000);
    act(() => result.current.seekBy(-10_000_000));
    expect(result.current.positionMs).toBe(0);
  });
});

describe('next / previous', () => {
  it('moves to the next song and releases the old player', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    const first = livePlayer();
    act(() => result.current.skipNext());
    expect(result.current.currentTrack.id).toBe('b');
    expect(first.remove).toHaveBeenCalled();
  });

  it('wraps to the first song when skipping past the end by hand', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 3));
    act(() => result.current.skipNext());
    expect(result.current.currentTrack.id).toBe('a');
  });

  it('restarts the song when more than 4 s in', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 2));
    emit({ currentTime: 10 });
    act(() => result.current.skipPrevious());
    expect(result.current.currentTrack.id).toBe('c');
    expect(livePlayer().seekTo).toHaveBeenLastCalledWith(0);
    expect(result.current.positionMs).toBe(0);
  });

  it('goes back a song near the start', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 2));
    emit({ currentTime: 1 });
    act(() => result.current.skipPrevious());
    expect(result.current.currentTrack.id).toBe('b');
  });

  it('restarts the first song instead of going back further', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => result.current.skipPrevious());
    expect(result.current.currentTrack.id).toBe('a');
    expect(livePlayer().seekTo).toHaveBeenLastCalledWith(0);
  });

  it('jumps to a song picked from the queue', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => result.current.skipToQueueIndex(3));
    expect(result.current.currentTrack.id).toBe('d');
  });
});

describe('end of song and repeat', () => {
  it('cycles repeat off → all → one → off', () => {
    const result = setup();
    expect(result.current.repeatMode).toBe(REPEAT_MODES.OFF);
    act(() => result.current.cycleRepeat());
    expect(result.current.repeatMode).toBe(REPEAT_MODES.ALL);
    act(() => result.current.cycleRepeat());
    expect(result.current.repeatMode).toBe(REPEAT_MODES.ONE);
    act(() => result.current.cycleRepeat());
    expect(result.current.repeatMode).toBe(REPEAT_MODES.OFF);
  });

  it('plays the next song automatically when one finishes', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    emit({ didJustFinish: true, playing: false, currentTime: 180 });
    expect(result.current.currentTrack.id).toBe('b');
    expect(mockRecordPlay).toHaveBeenCalledWith('a', expect.any(Number), true);
  });

  it('stops after the last song with repeat off', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 3));
    const last = livePlayer();
    emit({ didJustFinish: true, playing: false, currentTime: 180 });
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.positionMs).toBe(0);
    expect(last.remove).toHaveBeenCalled();
    expect(mockRecordPlay).toHaveBeenCalledWith('d', expect.any(Number), true);
  });

  it('starts the list again after the last song with repeat all', () => {
    const result = setup();
    act(() => result.current.cycleRepeat());
    act(() => result.current.playQueue(TRACKS, 3));
    emit({ didJustFinish: true, playing: false, currentTime: 180 });
    expect(result.current.currentTrack.id).toBe('a');
  });

  it('replays the same song with repeat one', () => {
    const result = setup();
    act(() => result.current.cycleRepeat());
    act(() => result.current.cycleRepeat());
    act(() => result.current.playQueue(TRACKS, 1));
    const before = livePlayer();
    emit({ didJustFinish: true, playing: false, currentTime: 180 });
    expect(result.current.currentTrack.id).toBe('b');
    expect(livePlayer()).not.toBe(before);
    expect(livePlayer().play).toHaveBeenCalled();
  });

  it('ignores late updates from a player that was already replaced', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    const old = livePlayer();
    act(() => result.current.skipNext());
    emit({ didJustFinish: true, playing: false }, old);
    expect(result.current.currentTrack.id).toBe('b');
  });
});

describe('shuffle', () => {
  const isPermutation = (order) => [...order].sort().join() === '0,1,2,3';

  it('plays the chosen song first and shuffles the rest', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 2, { shuffled: true }));
    expect(result.current.shuffle).toBe(true);
    expect(result.current.currentTrack.id).toBe('c');
    expect(result.current.order[0]).toBe(2);
    expect(isPermutation(result.current.order)).toBe(true);
  });

  it('shuffle-all picks a song from the list', () => {
    const result = setup();
    act(() => result.current.shuffleAndPlay(TRACKS));
    expect(result.current.shuffle).toBe(true);
    expect(ids(TRACKS)).toContain(result.current.currentTrack.id);
    expect(result.current.upNext).toHaveLength(3);
  });

  it('toggling shuffle keeps the current song and restores the order when turned off', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 1));
    act(() => result.current.toggleShuffle());
    expect(result.current.shuffle).toBe(true);
    expect(result.current.currentTrack.id).toBe('b');
    expect(isPermutation(result.current.order)).toBe(true);

    act(() => result.current.toggleShuffle());
    expect(result.current.shuffle).toBe(false);
    expect(result.current.order).toEqual([0, 1, 2, 3]);
    expect(result.current.currentTrack.id).toBe('b');
    expect(ids(result.current.upNext)).toEqual(['c', 'd']);
  });
});

describe('queue editing', () => {
  it('adds songs to the end of the queue', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS.slice(0, 2), 0));
    act(() => result.current.addToQueue(EXTRA));
    expect(ids(result.current.upNext)).toEqual(['b', 'e']);
    expect(result.current.queue).toHaveLength(3);
  });

  it('plays a song next', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS.slice(0, 3), 0));
    act(() => result.current.playNext([EXTRA]));
    expect(ids(result.current.upNext)).toEqual(['e', 'b', 'c']);
  });

  it('removes upcoming songs but never the one playing', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 2));
    act(() => result.current.removeFromQueue(2));
    expect(result.current.currentTrack.id).toBe('c');
    act(() => result.current.removeFromQueue(3));
    expect(result.current.upNext).toEqual([]);
    act(() => result.current.removeFromQueue(0));
    expect(result.current.currentTrack.id).toBe('c');
    expect(result.current.orderPosition).toBe(1);
  });

  it('clears the queue and stops playback', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    const player = livePlayer();
    act(() => result.current.clearQueue());
    expect(result.current.hasQueue).toBe(false);
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(player.remove).toHaveBeenCalled();
  });
});

describe('volume', () => {
  it('clamps volume between 0 and 1 and carries it to the next song', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => result.current.setVolume(0.3));
    expect(result.current.volume).toBe(0.3);
    expect(livePlayer().volume).toBe(0.3);
    act(() => result.current.setVolume(4));
    expect(result.current.volume).toBe(1);
    act(() => result.current.setVolume(-2));
    expect(result.current.volume).toBe(0);

    act(() => result.current.setVolume(0.5));
    act(() => result.current.skipNext());
    expect(livePlayer().volume).toBe(0.5);
  });
});

describe('sleep timer', () => {
  it('pauses when the countdown ends', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => result.current.play());
    act(() => result.current.startSleepTimer({ minutes: 15 }));
    expect(result.current.sleepTimer).toMatchObject({ endOfTrack: false, endsAt: expect.any(Number) });

    act(() => jest.advanceTimersByTime(14 * 60 * 1000));
    expect(livePlayer().pause).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(60 * 1000));
    expect(livePlayer().pause).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.sleepTimer).toBeNull();
  });

  it('does nothing once cancelled', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => result.current.startSleepTimer({ minutes: 5 }));
    act(() => result.current.cancelSleepTimer());
    act(() => jest.advanceTimersByTime(10 * 60 * 1000));
    expect(livePlayer().pause).not.toHaveBeenCalled();
    expect(result.current.sleepTimer).toBeNull();
  });

  it('"end of song" stops when the song finishes instead of moving on', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => result.current.startSleepTimer({ endOfTrack: true }));
    const playersBefore = mockPlayers.length;
    emit({ didJustFinish: true, playing: false, currentTime: 180 });
    expect(livePlayer().pause).toHaveBeenCalled();
    expect(result.current.currentTrack.id).toBe('a');
    expect(mockPlayers).toHaveLength(playersBefore);
    expect(result.current.sleepTimer).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });
});

describe('listening stats', () => {
  it('does not count accidental taps under 3 s', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => jest.advanceTimersByTime(1000));
    emit({ currentTime: 1 });
    act(() => result.current.skipNext());
    expect(mockRecordPlay).not.toHaveBeenCalled();
  });

  it('records a skip with the time actually listened', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 0));
    act(() => jest.advanceTimersByTime(10000));
    emit({ currentTime: 10 });
    act(() => result.current.skipNext());
    expect(mockRecordPlay).toHaveBeenCalledWith('a', 10000, false);
  });
});

describe('remember queue', () => {
  it('saves the queue shortly after it changes', () => {
    const result = setup();
    act(() => result.current.playQueue(TRACKS, 1));
    act(() => jest.advanceTimersByTime(1500));
    expect(queueRepo.save).toHaveBeenLastCalledWith(['a', 'b', 'c', 'd'], 1, 0);
  });

  it('does not save when the setting is off', () => {
    const result = setup({ rememberQueue: false });
    act(() => result.current.playQueue(TRACKS, 1));
    act(() => jest.advanceTimersByTime(5000));
    expect(queueRepo.save).not.toHaveBeenCalled();
  });

  it('restores the last queue paused at the saved position', async () => {
    queueRepo.load.mockResolvedValue({ trackIds: ['b', 'missing', 'c'], currentIndex: 1, positionMs: 42000 });
    const result = setup();
    const resolve = (trackIds) => trackIds.map((id) => TRACKS.find((t) => t.id === id)).filter(Boolean);

    await act(async () => {
      await result.current.restoreQueue(resolve);
    });

    expect(ids(result.current.queue)).toEqual(['b', 'c']);
    expect(result.current.currentTrack.id).toBe('c');
    expect(result.current.isPlaying).toBe(false);
    expect(livePlayer().play).not.toHaveBeenCalled();
    expect(livePlayer().seekTo).toHaveBeenCalledWith(42);
    expect(result.current.positionMs).toBe(42000);
  });

  it('skips restoring when the setting is off', async () => {
    const result = setup({ rememberQueue: false });
    await act(async () => {
      await result.current.restoreQueue(() => TRACKS);
    });
    expect(queueRepo.load).not.toHaveBeenCalled();
    expect(result.current.hasQueue).toBe(false);
  });
});

describe('gapless and crossfade', () => {
  it('preloads the next song and reuses it for a gapless switch', () => {
    const result = setup({ gaplessPlayback: true });
    act(() => result.current.playQueue(TRACKS, 0));
    expect(mockPlayers.map((p) => p.source.uri)).toEqual(['file:///Music/a.mp3', 'file:///Music/b.mp3']);
    const preloaded = mockPlayers[1];
    expect(preloaded.play).not.toHaveBeenCalled();

    act(() => result.current.skipNext());
    expect(result.current.currentTrack.id).toBe('b');
    expect(preloaded.play).toHaveBeenCalled();
    expect(mockPlayers.filter((p) => p.source.uri === 'file:///Music/b.mp3')).toHaveLength(1);
  });

  it('fades the next song in before the current one ends', () => {
    const result = setup({ crossfadeSeconds: 3 });
    act(() => result.current.playQueue(TRACKS, 0));
    const outgoing = livePlayer();

    emit({ currentTime: 178, duration: 180 });
    const incoming = livePlayer();
    expect(result.current.currentTrack.id).toBe('b');
    expect(incoming).not.toBe(outgoing);
    expect(outgoing.remove).not.toHaveBeenCalled();
    expect(incoming.volume).toBe(0);

    act(() => jest.advanceTimersByTime(3100));
    expect(incoming.volume).toBe(1);
    expect(outgoing.remove).toHaveBeenCalled();
  });
});

describe('usePlayer', () => {
  it('throws a clear error outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => usePlayer())).toThrow('usePlayer must be used inside <PlayerProvider>');
    console.error.mockRestore();
  });
});
