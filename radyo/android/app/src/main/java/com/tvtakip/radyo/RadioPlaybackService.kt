package com.tvtakip.radyo

import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaLibraryService.LibraryParams
import androidx.media3.session.MediaLibraryService.MediaLibrarySession
import androidx.media3.session.MediaSession
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.SettableFuture
import java.util.concurrent.Executors

/**
 * Android Auto / MediaSession ucu. Browse tree (favoriler + gruplar) RadioCatalog'tan,
 * caliniyorken anlik sarki bilgisi NowPlayingFetcher'dan gelir. WebView player'dan bagimsizdir.
 */
@UnstableApi
class RadioPlaybackService : MediaLibraryService() {

    private var mediaLibrarySession: MediaLibrarySession? = null
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private val nowPlayingRunnable = object : Runnable {
        override fun run() {
            refreshNowPlaying()
            mainHandler.postDelayed(this, NOW_PLAYING_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()

        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent("Mozilla/5.0")
            .setAllowCrossProtocolRedirects(true)
        val mediaSourceFactory = DefaultMediaSourceFactory(this).setDataSourceFactory(httpDataSourceFactory)

        val player = ExoPlayer.Builder(this)
            .setMediaSourceFactory(mediaSourceFactory)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                /* handleAudioFocus= */ true,
            )
            .setHandleAudioBecomingNoisy(true)
            .build()

        mediaLibrarySession = MediaLibrarySession.Builder(this, player, LibrarySessionCallback()).build()

        mainHandler.post(nowPlayingRunnable)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? = mediaLibrarySession

    override fun onTaskRemoved(rootIntent: Intent?) {
        val session = mediaLibrarySession ?: return
        if (!session.player.playWhenReady || session.player.mediaItemCount == 0) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        mediaLibrarySession?.run {
            player.release()
            release()
            mediaLibrarySession = null
        }
        ioExecutor.shutdown()
        super.onDestroy()
    }

    /** Calan kanal icin now-playing bilgisini ceker ve session metadata'sini gunceller. */
    private fun refreshNowPlaying() {
        val session = mediaLibrarySession ?: return
        val player = session.player
        if (!player.isPlaying) return
        val current = player.currentMediaItem ?: return
        val channel = RadioCatalog.findChannel(current.mediaId) ?: return
        ioExecutor.execute {
            val now = NowPlayingFetcher.fetch(channel)
            mainHandler.post {
                val p = mediaLibrarySession?.player ?: return@post
                if (p.currentMediaItem?.mediaId == channel.tvgId) {
                    p.replaceMediaItem(p.currentMediaItemIndex, buildPlaybackItem(channel, now))
                }
            }
        }
    }

    private inner class LibrarySessionCallback : MediaLibrarySession.Callback {

        override fun onGetLibraryRoot(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            params: LibraryParams?,
        ): ListenableFuture<LibraryResult<MediaItem>> =
            Futures.immediateFuture(LibraryResult.ofItem(RadioCatalog.browsableItem(ROOT_ID, "Radyo"), params))

        override fun onGetItem(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            mediaId: String,
        ): ListenableFuture<LibraryResult<MediaItem>> {
            val future = SettableFuture.create<LibraryResult<MediaItem>>()
            ioExecutor.execute {
                RadioCatalog.ensureLoaded()
                val channel = RadioCatalog.findChannel(mediaId)
                future.set(
                    if (channel != null) LibraryResult.ofItem(RadioCatalog.playableItem(channel), null)
                    else LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE)
                )
            }
            return future
        }

        override fun onGetChildren(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            parentId: String,
            page: Int,
            pageSize: Int,
            params: LibraryParams?,
        ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
            val future = SettableFuture.create<LibraryResult<ImmutableList<MediaItem>>>()
            ioExecutor.execute {
                RadioCatalog.ensureLoaded()
                val items = when {
                    parentId == ROOT_ID -> rootChildren()
                    parentId.startsWith(FAV_PREFIX) -> favoriteChildren(parentId)
                    parentId.startsWith(GROUP_PREFIX) -> groupChildren(parentId)
                    else -> emptyList()
                }
                future.set(LibraryResult.ofItemList(ImmutableList.copyOf(items), params))
            }
            return future
        }

        override fun onAddMediaItems(
            mediaSession: MediaSession,
            controller: MediaSession.ControllerInfo,
            mediaItems: MutableList<MediaItem>,
        ): ListenableFuture<MutableList<MediaItem>> {
            val future = SettableFuture.create<MutableList<MediaItem>>()
            ioExecutor.execute {
                RadioCatalog.ensureLoaded()
                val resolved = mediaItems.mapNotNull { item ->
                    RadioCatalog.findChannel(item.mediaId)?.let { buildPlaybackItem(it, null) }
                        ?: item.localConfiguration?.let { item }
                }.toMutableList()
                future.set(resolved)
                if (resolved.isNotEmpty()) {
                    mainHandler.postDelayed({ refreshNowPlaying() }, 1500)
                }
            }
            return future
        }

        private fun rootChildren(): List<MediaItem> {
            val items = mutableListOf<MediaItem>()
            RadioCatalog.favorites(applicationContext).forEachIndexed { i, fav ->
                if (RadioCatalog.resolveFavoriteChannels(fav).isNotEmpty()) {
                    items.add(RadioCatalog.browsableItem("$FAV_PREFIX$i", "⭐ ${fav.name}"))
                }
            }
            for (group in RadioCatalog.groups()) {
                items.add(RadioCatalog.browsableItem("$GROUP_PREFIX$group", group))
            }
            return items
        }

        private fun favoriteChildren(parentId: String): List<MediaItem> {
            val idx = parentId.removePrefix(FAV_PREFIX).toIntOrNull() ?: return emptyList()
            val fav = RadioCatalog.favorites(applicationContext).getOrNull(idx) ?: return emptyList()
            return RadioCatalog.resolveFavoriteChannels(fav).map { RadioCatalog.playableItem(it) }
        }

        private fun groupChildren(parentId: String): List<MediaItem> {
            val group = parentId.removePrefix(GROUP_PREFIX)
            return RadioCatalog.channelsInGroup(group).map { RadioCatalog.playableItem(it) }
        }
    }

    companion object {
        private const val ROOT_ID = "root"
        private const val FAV_PREFIX = "fav:"
        private const val GROUP_PREFIX = "group:"
        private const val NOW_PLAYING_INTERVAL_MS = 30_000L

        /** Calinacak MediaItem'i kurar; now-playing bilgisi varsa baslik/sanatci/kapak onunla doldurulur. */
        fun buildPlaybackItem(channel: RadioChannel, now: NowPlaying?): MediaItem {
            val builder = MediaMetadata.Builder()
                .setIsBrowsable(false)
                .setIsPlayable(true)
                .setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION)

            val hasSong = now != null && (now.title.isNotEmpty() || now.artist.isNotEmpty())
            if (hasSong) {
                builder.setTitle(now!!.title.ifEmpty { channel.name })
                if (now.artist.isNotEmpty()) builder.setArtist(now.artist)
                builder.setSubtitle(channel.name)
                val art = now.cover.ifEmpty { channel.logo }
                if (art.isNotEmpty()) builder.setArtworkUri(Uri.parse(art))
            } else {
                builder.setTitle(channel.name)
                if (channel.logo.isNotEmpty()) builder.setArtworkUri(Uri.parse(channel.logo))
            }

            return MediaItem.Builder()
                .setMediaId(channel.tvgId)
                .setUri(channel.url)
                .setMediaMetadata(builder.build())
                .build()
        }
    }
}
