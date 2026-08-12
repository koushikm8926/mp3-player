package expo.modules.musiccore

import android.content.ContentUris
import android.content.Context
import android.database.Cursor
import android.os.Build
import android.provider.MediaStore
import java.io.File

/**
 * Reads the device audio library straight out of MediaStore.
 *
 * expo-media-library only surfaces filename/duration for audio assets, which is not enough to
 * build the Albums / Artists / Genres / Folders browsers the app needs, so we query the columns
 * ourselves and hand JS a fully-populated record per track.
 */
object MediaStoreScanner {

  private val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
    MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
  } else {
    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
  }

  private val projection: Array<String>
    get() {
      val base = mutableListOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.TITLE,
        MediaStore.Audio.Media.ARTIST,
        MediaStore.Audio.Media.ARTIST_ID,
        MediaStore.Audio.Media.ALBUM,
        MediaStore.Audio.Media.ALBUM_ID,
        MediaStore.Audio.Media.DURATION,
        MediaStore.Audio.Media.SIZE,
        MediaStore.Audio.Media.DATA,
        MediaStore.Audio.Media.DISPLAY_NAME,
        MediaStore.Audio.Media.DATE_ADDED,
        MediaStore.Audio.Media.DATE_MODIFIED,
        MediaStore.Audio.Media.TRACK,
        MediaStore.Audio.Media.YEAR,
        MediaStore.Audio.Media.MIME_TYPE,
        MediaStore.Audio.Media.COMPOSER
      )
      // GENRE became a column on Media only in Android 10 (API 29). Older devices need the
      // separate Genres/Members tables, handled by [genreMapLegacy].
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        base.add(MediaStore.Audio.Media.GENRE)
        base.add(MediaStore.Audio.Media.BITRATE)
        base.add(MediaStore.Audio.Media.RELATIVE_PATH)
      }
      return base.toTypedArray()
    }

  fun scan(context: Context, minDurationMs: Long, includeAllFileTypes: Boolean): List<Map<String, Any?>> {
    val results = mutableListOf<Map<String, Any?>>()

    val selection = StringBuilder("${MediaStore.Audio.Media.IS_MUSIC} != 0")
    val args = mutableListOf<String>()
    if (minDurationMs > 0) {
      selection.append(" AND ${MediaStore.Audio.Media.DURATION} >= ?")
      args.add(minDurationMs.toString())
    }
    if (!includeAllFileTypes) {
      selection.append(" AND ${MediaStore.Audio.Media.MIME_TYPE} IN (?,?,?,?,?,?,?)")
      args.addAll(
        listOf(
          "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/flac",
          "audio/x-flac", "audio/ogg", "audio/wav"
        )
      )
    }

    val legacyGenres = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      genreMapLegacy(context)
    } else {
      emptyMap()
    }

    val cursor: Cursor = context.contentResolver.query(
      collection,
      projection,
      selection.toString(),
      args.toTypedArray(),
      "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC"
    ) ?: return results

    cursor.use { c ->
      val idCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
      val titleCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
      val artistCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
      val artistIdCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST_ID)
      val albumCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
      val albumIdCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
      val durationCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
      val sizeCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
      val dataCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
      val displayNameCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
      val dateAddedCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
      val dateModifiedCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
      val trackCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TRACK)
      val yearCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.YEAR)
      val mimeCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)
      val composerCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.COMPOSER)
      val genreCol = c.getColumnIndex(MediaStore.Audio.Media.GENRE)
      val bitrateCol = c.getColumnIndex(MediaStore.Audio.Media.BITRATE)

      while (c.moveToNext()) {
        val id = c.getLong(idCol)
        val path = c.getString(dataCol) ?: ""
        val parent = if (path.isNotEmpty()) File(path).parentFile else null
        val albumId = c.getLong(albumIdCol)
        // MediaStore encodes disc+track as (disc * 1000 + track) in the TRACK column.
        val rawTrack = c.getInt(trackCol)

        val genre = when {
          genreCol >= 0 -> c.getString(genreCol)
          else -> legacyGenres[id]
        }

        results.add(
          mapOf(
            "id" to id.toString(),
            "title" to (c.getString(titleCol) ?: c.getString(displayNameCol) ?: "Unknown"),
            "artist" to normalizeUnknown(c.getString(artistCol), "Unknown artist"),
            "artistId" to c.getLong(artistIdCol).toString(),
            "album" to normalizeUnknown(c.getString(albumCol), "Unknown album"),
            "albumId" to albumId.toString(),
            "genre" to (genre ?: "Unknown genre"),
            "duration" to c.getLong(durationCol),
            "size" to c.getLong(sizeCol),
            "uri" to ContentUris.withAppendedId(collection, id).toString(),
            "path" to path,
            "fileName" to (c.getString(displayNameCol) ?: ""),
            "folderPath" to (parent?.absolutePath ?: ""),
            "folderName" to (parent?.name ?: ""),
            "dateAdded" to c.getLong(dateAddedCol) * 1000L,
            "dateModified" to c.getLong(dateModifiedCol) * 1000L,
            "trackNumber" to if (rawTrack > 1000) rawTrack % 1000 else rawTrack,
            "discNumber" to if (rawTrack > 1000) rawTrack / 1000 else 1,
            "year" to c.getInt(yearCol),
            "mimeType" to (c.getString(mimeCol) ?: ""),
            "composer" to (c.getString(composerCol) ?: ""),
            "bitrate" to if (bitrateCol >= 0) c.getInt(bitrateCol) else 0,
            "artworkUri" to albumArtUri(albumId)
          )
        )
      }
    }
    return results
  }

  /** Pre-Android-10 devices keep genres in a join table. One pass builds trackId -> genre. */
  private fun genreMapLegacy(context: Context): Map<Long, String> {
    val map = mutableMapOf<Long, String>()
    val genreCursor = context.contentResolver.query(
      MediaStore.Audio.Genres.EXTERNAL_CONTENT_URI,
      arrayOf(MediaStore.Audio.Genres._ID, MediaStore.Audio.Genres.NAME),
      null, null, null
    ) ?: return map

    genreCursor.use { gc ->
      val gIdCol = gc.getColumnIndexOrThrow(MediaStore.Audio.Genres._ID)
      val gNameCol = gc.getColumnIndexOrThrow(MediaStore.Audio.Genres.NAME)
      while (gc.moveToNext()) {
        val genreId = gc.getLong(gIdCol)
        val genreName = gc.getString(gNameCol) ?: continue
        val members = context.contentResolver.query(
          MediaStore.Audio.Genres.Members.getContentUri("external", genreId),
          arrayOf(MediaStore.Audio.Genres.Members.AUDIO_ID),
          null, null, null
        ) ?: continue
        members.use { mc ->
          val audioIdCol = mc.getColumnIndexOrThrow(MediaStore.Audio.Genres.Members.AUDIO_ID)
          while (mc.moveToNext()) {
            map[mc.getLong(audioIdCol)] = genreName
          }
        }
      }
    }
    return map
  }

  fun albumArtUri(albumId: Long): String? {
    if (albumId <= 0) return null
    return ContentUris.withAppendedId(
      android.net.Uri.parse("content://media/external/audio/albumart"),
      albumId
    ).toString()
  }

  private fun normalizeUnknown(value: String?, fallback: String): String {
    if (value.isNullOrBlank() || value == "<unknown>") return fallback
    return value
  }

  /** Used by "Music Library Refresh" so newly copied files show up without a reboot. */
  fun rescanVolume(context: Context, paths: Array<String>) {
    android.media.MediaScannerConnection.scanFile(context, paths, null, null)
  }
}
