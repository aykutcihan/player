package com.tvtakip.radyo

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

data class RadioChannel(
    val tvgId: String,
    val name: String,
    val group: String,
    val logo: String,
    val url: String,
    val source: String,
)

data class FavGroup(val name: String, val channels: List<String>)

/**
 * Radyo kanal listesini ve favori gruplarini tutar. radios_playlist.m3u'yu
 * app/src/lib/m3u.ts (parseM3U + SOURCE_PRIORITY) ile ayni mantikla parse eder,
 * boylece Android Auto'daki gruplar/kanallar WebView ile birebir eslesir.
 */
object RadioCatalog {
    private const val TAG = "RadioCatalog"
    private const val PLAYLIST_URL = "https://raw.githubusercontent.com/aykutcihan/tv-takip/main/radios_playlist.m3u"
    private const val REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000L // 6 saat

    const val PREFS_NAME = "radio_prefs"
    const val FAVORITES_KEY = "radio_favorites"

    private val DEFAULT_FAVORITE_CHANNELS = listOf("karnaval.16", "fenomen.fenomenturk", "powerapp.powerpop")

    private val SOURCE_PRIORITY: List<Pair<String, Int>> = listOf(
        "youtube" to 0,
        "googlevideo" to 0,
        "medya.trt" to 0,
        "ercdn" to 1,
        "mncdn" to 1,
        "daioncdn" to 2,
        "uzunmuhalefet" to 2,
        "github" to 2,
        "tvkulesi" to 3,
        "kavuntv" to 4,
    )

    @Volatile private var groupOrder: List<String> = emptyList()
    @Volatile private var channelsByGroup: Map<String, List<RadioChannel>> = emptyMap()
    @Volatile private var channelsById: Map<String, RadioChannel> = emptyMap()
    @Volatile private var lastRefresh: Long = 0L

    /** Playlist henuz yuklenmemisse veya eskimisse senkron olarak indirir. Ag thread'inde cagirin. */
    fun ensureLoaded() {
        val now = System.currentTimeMillis()
        if (channelsById.isNotEmpty() && now - lastRefresh < REFRESH_INTERVAL_MS) return
        try {
            refresh()
        } catch (e: Exception) {
            Log.w(TAG, "playlist refresh failed", e)
        }
    }

    @Synchronized
    private fun refresh() {
        val text = httpGetText(PLAYLIST_URL)
        val parsed = parseM3U(text)
        if (parsed.isEmpty()) return

        val byGroup = LinkedHashMap<String, MutableList<RadioChannel>>()
        for (ch in parsed) {
            val g = ch.group.ifEmpty { "Diğer" }
            byGroup.getOrPut(g) { mutableListOf() }.add(ch)
        }
        channelsByGroup = byGroup
        groupOrder = byGroup.keys.toList()
        channelsById = parsed.associateBy { it.tvgId }
        lastRefresh = System.currentTimeMillis()
    }

    fun groups(): List<String> = groupOrder

    fun channelsInGroup(group: String): List<RadioChannel> = channelsByGroup[group] ?: emptyList()

    fun findChannel(tvgId: String): RadioChannel? = channelsById[tvgId]

    /** JS tarafindan RadioFavoritesPlugin ile yazilan favori gruplarini okur. */
    fun favorites(context: Context): List<FavGroup> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(FAVORITES_KEY, null)
        if (raw != null) {
            try {
                val arr = JSONArray(raw)
                val groups = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    val chArr = o.getJSONArray("channels")
                    val chs = (0 until chArr.length()).map { chArr.getString(it) }
                    FavGroup(o.optString("name", "Favori ${i + 1}"), chs)
                }
                if (groups.isNotEmpty()) return groups
            } catch (e: Exception) {
                Log.w(TAG, "favorites parse failed", e)
            }
        }
        return (1..3).map { FavGroup("Favori $it", DEFAULT_FAVORITE_CHANNELS) }
    }

    fun resolveFavoriteChannels(group: FavGroup): List<RadioChannel> =
        group.channels.mapNotNull { channelsById[it] }

    fun browsableItem(id: String, title: String): MediaItem {
        val metadata = MediaMetadata.Builder()
            .setTitle(title)
            .setIsBrowsable(true)
            .setIsPlayable(false)
            .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
            .build()
        return MediaItem.Builder().setMediaId(id).setMediaMetadata(metadata).build()
    }

    fun playableItem(ch: RadioChannel): MediaItem {
        val metadataBuilder = MediaMetadata.Builder()
            .setTitle(ch.name)
            .setIsBrowsable(false)
            .setIsPlayable(true)
            .setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION)
        if (ch.logo.isNotEmpty()) metadataBuilder.setArtworkUri(Uri.parse(ch.logo))
        return MediaItem.Builder()
            .setMediaId(ch.tvgId)
            .setUri(ch.url)
            .setMediaMetadata(metadataBuilder.build())
            .build()
    }

    // app/src/lib/m3u.ts parseM3U + SOURCE_PRIORITY portu
    private fun parseM3U(text: String): List<RadioChannel> {
        data class RawEntry(val tvgId: String, val name: String, val group: String, val logo: String, val url: String, val source: String)

        val attrRegex = Regex("(\\S+)=\"([^\"]*)\"")
        val nameRegex = Regex(",([^,]+)$")

        val raw = mutableListOf<RawEntry>()
        var extinf = ""
        var source = ""

        for (rawLine in text.split("\n")) {
            val line = rawLine.trim()
            when {
                line.startsWith("#EXTINF:") -> { extinf = line; source = "" }
                line.startsWith("# source:") -> source = line.removePrefix("# source:").trim()
                line.startsWith("http") && extinf.isNotEmpty() -> {
                    val attrs = mutableMapOf<String, String>()
                    for (m in attrRegex.findAll(extinf)) attrs[m.groupValues[1]] = m.groupValues[2]
                    val name = nameRegex.find(extinf)?.groupValues?.get(1)?.trim() ?: ""
                    raw.add(
                        RawEntry(
                            tvgId = attrs["tvg-id"] ?: "",
                            name = name,
                            group = attrs["group-title"] ?: "",
                            logo = attrs["tvg-logo"] ?: "",
                            url = line,
                            source = source,
                        )
                    )
                    extinf = ""
                    source = ""
                }
            }
        }

        val groups = LinkedHashMap<String, MutableList<RawEntry>>()
        for (e in raw) {
            val key = if (e.tvgId.isNotEmpty()) "${e.tvgId}|${e.group}" else "__${e.name}|${e.group}|${e.url}"
            groups.getOrPut(key) { mutableListOf() }.add(e)
        }

        return groups.values.map { entries ->
            val best = entries.minBy { sourcePriority(it.source, it.url) }
            RadioChannel(
                tvgId = best.tvgId,
                name = best.name,
                group = best.group,
                logo = best.logo,
                url = best.url,
                source = best.source,
            )
        }
    }

    private fun sourcePriority(source: String, url: String): Int {
        if (url.startsWith("http://192.168.")) return 999
        val s = (source + url).lowercase()
        for ((key, value) in SOURCE_PRIORITY) {
            if (s.contains(key)) return value
        }
        return 99
    }

    private fun httpGetText(urlStr: String): String {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.connectTimeout = 15000
        conn.readTimeout = 15000
        conn.setRequestProperty("User-Agent", "Mozilla/5.0")
        return conn.inputStream.use { stream ->
            BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
        }
    }
}
