import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { useLibrary } from '../context/LibraryContext';
import { useSettings } from '../context/SettingsContext';
import { Field, PrimaryButton } from './common';
import { Sheet, SheetItem } from './Sheet';

/** "Add to playlist" flow: pick an existing list or create one inline. */
export function PlaylistPickerSheet({ visible, tracks, onClose }) {
  const { t } = useSettings();
  const { playlists, addTracksToPlaylist, createPlaylist } = useLibrary();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCreating(false);
    setName('');
    setError(null);
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addTo = async (playlist) => {
    const inserted = await addTracksToPlaylist(playlist.id, tracks);
    handleClose();
    if (inserted > 0) {
      Alert.alert(t('addedToPlaylist', { name: playlist.name }));
    }
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('playlistName'));
      return;
    }
    setBusy(true);
    try {
      const id = await createPlaylist(trimmed);
      await addTracksToPlaylist(id, tracks);
      handleClose();
    } catch {
      // The unique index on playlists.name is the only realistic failure here.
      setError(t('playlistExists'));
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={creating ? t('newPlaylist') : t('choosePlaylist')}
      subtitle={creating ? null : t('trackCount', { count: tracks?.length ?? 0 })}
    >
      {creating ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Field
            label={t('playlistName')}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError(null);
            }}
            error={error}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <PrimaryButton label={t('create')} onPress={handleCreate} loading={busy} />
          <PrimaryButton
            label={t('cancel')}
            variant="outline"
            onPress={() => setCreating(false)}
            style={{ marginTop: 10 }}
          />
        </View>
      ) : (
        <>
          <SheetItem
            icon="add-outline"
            label={t('newPlaylist')}
            onPress={() => setCreating(true)}
          />
          {playlists.map((playlist) => (
            <SheetItem
              key={playlist.id}
              icon="musical-notes-outline"
              label={playlist.name}
              sublabel={t('trackCount', { count: playlist.track_count ?? 0 })}
              onPress={() => addTo(playlist)}
            />
          ))}
        </>
      )}
    </Sheet>
  );
}
