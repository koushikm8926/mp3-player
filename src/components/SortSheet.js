import React from 'react';
import { View } from 'react-native';

import { useSettings } from '../context/SettingsContext';
import { SORT_KEYS } from '../services/musicLibrary';
import { Sheet, SheetItem } from './Sheet';

const LABEL_KEYS = {
  [SORT_KEYS.TITLE]: 'sortTitle',
  [SORT_KEYS.ARTIST]: 'sortArtist',
  [SORT_KEYS.ALBUM]: 'sortAlbum',
  [SORT_KEYS.DURATION]: 'sortDuration',
  [SORT_KEYS.DATE_ADDED]: 'sortDateAdded',
  [SORT_KEYS.YEAR]: 'sortYear',
  [SORT_KEYS.SIZE]: 'sortSize',
  [SORT_KEYS.PLAY_COUNT]: 'sortPlayCount',
  [SORT_KEYS.TRACK_NUMBER]: 'sortTrackNumber',
};

export function SortSheet({ visible, onClose, options, sortKey, ascending, onChange }) {
  const { t } = useSettings();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('sortBy')}>
      {options.map((key) => (
        <SheetItem
          key={key}
          label={t(LABEL_KEYS[key] ?? key)}
          selected={sortKey === key}
          onPress={() => {
            // Tapping the active key flips direction, which is the usual convention.
            onChange(key, sortKey === key ? !ascending : true);
            onClose();
          }}
        />
      ))}
      <View style={{ height: 8 }} />
      <SheetItem
        icon="arrow-up"
        label={t('ascending')}
        selected={ascending}
        onPress={() => {
          onChange(sortKey, true);
          onClose();
        }}
      />
      <SheetItem
        icon="arrow-down"
        label={t('descending')}
        selected={!ascending}
        onPress={() => {
          onChange(sortKey, false);
          onClose();
        }}
      />
    </Sheet>
  );
}
