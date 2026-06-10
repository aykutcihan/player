package com.tvtakip.radyo

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.Calendar
import java.util.GregorianCalendar
import java.util.TimeZone

data class NowPlaying(
    val title: String = "",
    val artist: String = "",
    val cover: String = "",
    val progress: Double = 0.0,
    val duration: Double = 0.0,
)

/**
 * app/src/lib/powerplaying.ts + nowplaying.ts + epg.ts (currentProgramme) portu.
 * Native tarafta CORS olmadigindan worker/proxy ve raw GitHub JSON'lari dogrudan cekilir.
 */
object NowPlayingFetcher {
    private const val PROXY = "https://radio-proxy.tvtakip24.workers.dev"
    private const val BASE = "https://raw.githubusercontent.com/aykutcihan/tv-takip/main"
    private const val TTL = 28_000L

    private val RADIOKING_APIS = mapOf(
        "herkul.radyo" to "https://api.radioking.io/widget/radio/herkulradyo/track/current",
        "cihan.radyo" to "https://api.radioking.io/widget/radio/cihan-radyo/track/current",
        "cihan.sema" to "https://api.radioking.io/widgets/api/v1/radio/605425/track/current",
    )

    private var karnavalCache: Map<String, NowPlaying> = emptyMap()
    private var karnavalTs = 0L
    private var number1Cache: Map<String, NowPlaying> = emptyMap()
    private var number1Ts = 0L
    private var turkuvazCache: Map<String, NowPlaying> = emptyMap()
    private var turkuvazTs = 0L

    /** Verilen kanal icin anlik calan sarki/program bilgisini doner (yoksa null). Ag thread'inde cagirin. */
    fun fetch(channel: RadioChannel): NowPlaying? {
        val id = channel.tvgId
        return try {
            when {
                id.startsWith("powerapp.") -> fetchPower(id)
                id.startsWith("karnaval.") -> fetchKarnaval(id)
                id.startsWith("show.") -> fetchSimpleProxy("show", id.removePrefix("show."))
                id.startsWith("ozgur.") -> fetchOzgur()
                id.startsWith("fenomen.") -> fetchFenomen(id)
                id.startsWith("viva.") -> fetchSimpleProxy("viva", id.removePrefix("viva."))
                id.startsWith("radyo7.") -> fetchSimpleProxy("radyo7", id.removePrefix("radyo7."))
                id.startsWith("radyohome.") -> fetchSimpleProxy("radyohome", id.removePrefix("radyohome."))
                id.startsWith("herkul.") || id.startsWith("cihan.") -> fetchRadioKing(id)
                id.startsWith("number1.") -> fetchJsonCache(id, kind = "number1")
                id.startsWith("turkuvaz.") -> fetchJsonCache(id, kind = "turkuvaz")
                id.startsWith("trt.radyo.") -> fetchTrtEpg(id)
                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }

    // Power radyolari — anlik
    private fun fetchPower(id: String): NowPlaying? {
        val slug = id.removePrefix("powerapp.")
        val json = httpGetJson("$PROXY/power/$slug") ?: return null
        if (json.optJSONObject("meta")?.optInt("status") != 200) return null
        val data = json.optJSONObject("data") ?: return null
        val timeline = data.optJSONArray("timeline")?.optJSONObject(0) ?: return null
        val img = data.optJSONObject("image")
        val prefix = img?.optString("prefix") ?: ""
        val cover = if (prefix.isNotEmpty()) "${prefix}150x150${img?.optString("suffix") ?: ""}" else ""
        val duration = timeline.optDouble("duration", 0.0)
        val remaining = timeline.optDouble("remainingSeconds", 0.0)
        return NowPlaying(
            title = timeline.optString("songTitle", "").trim(),
            artist = timeline.optString("artistTitle", "").trim(),
            cover = cover,
            progress = duration - remaining,
            duration = duration,
        )
    }

    // Show / Viva / Radyo7 / Radyohome — HLS/JSON metadata (Worker uzerinden), ortak sekil
    private fun fetchSimpleProxy(path: String, slug: String): NowPlaying? {
        val json = httpGetJson("$PROXY/$path/$slug") ?: return null
        val title = json.optString("title", "")
        val artist = json.optString("artist", "")
        if (title.isEmpty() && artist.isEmpty()) return null
        return NowPlaying(title = title, artist = artist, cover = json.optString("cover", ""))
    }

    // Radyo Ozgur FM — ICY metadata (Worker uzerinden)
    private fun fetchOzgur(): NowPlaying? {
        val json = httpGetJson("$PROXY/ozgur") ?: return null
        val title = json.optString("title", "")
        val artist = json.optString("artist", "")
        if (title.isEmpty() && artist.isEmpty()) return null
        return NowPlaying(title = title, artist = artist)
    }

    // Radyo Fenomen — anlik sarki (Worker uzerinden)
    private fun fetchFenomen(id: String): NowPlaying? {
        val slug = id.removePrefix("fenomen.")
        val json = httpGetJson("$PROXY/fenomen/$slug") ?: return null
        val title = json.optString("title", "")
        val artist = json.optString("artist", "")
        if (title.isEmpty() && artist.isEmpty()) return null
        return NowPlaying(
            title = title,
            artist = artist,
            cover = json.optString("cover", ""),
            progress = json.optDouble("progress", 0.0),
            duration = json.optDouble("duration", 0.0),
        )
    }

    // Karnaval — tum kanallari tek seferde cek, cache'le
    @Synchronized
    private fun fetchKarnaval(id: String): NowPlaying? {
        val now = System.currentTimeMillis()
        if (now - karnavalTs > TTL) {
            val json = httpGetJson("$PROXY/karnaval")
            val data = if (json?.optBoolean("result", false) == true) json.optJSONObject("data") else null
            if (data != null) {
                val fresh = mutableMapOf<String, NowPlaying>()
                val keys = data.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val num = key.removePrefix("station_").toIntOrNull() ?: continue
                    val song = data.optJSONObject(key) ?: continue
                    val title = song.optString("title", "")
                    if (title.isNotEmpty()) {
                        fresh["karnaval.$num"] = NowPlaying(
                            title = title,
                            artist = song.optString("artist", ""),
                            cover = song.optString("album_cover_art", ""),
                            progress = song.optDouble("progress", 0.0),
                            duration = song.optDouble("duration_sec", 0.0),
                        )
                    }
                }
                karnavalCache = fresh
                karnavalTs = now
            }
        }
        return karnavalCache[id]
    }

    // RadioKing tabanli radyolar (Herkul/Cihan) — CORS acik, dogrudan cek
    private fun fetchRadioKing(id: String): NowPlaying? {
        val api = RADIOKING_APIS[id] ?: return null
        val json = httpGetJson(api) ?: return null
        val startedAt = json.optString("started_at", "")
        val endAt = json.optString("end_at", "")
        val start = if (startedAt.isNotEmpty()) parseIsoToMillis(startedAt) else 0L
        val end = if (endAt.isNotEmpty()) parseIsoToMillis(endAt) else 0L
        val now = System.currentTimeMillis()
        val duration = if (end > start) (end - start) / 1000.0 else json.optDouble("duration", 0.0)
        val progress = if (start > 0) maxOf(0.0, (now - start) / 1000.0) else 0.0
        val cover = if (json.optBoolean("default_cover", false)) "" else json.optString("cover", "")
        val title = json.optString("album", "").ifEmpty { json.optString("title", "") }
        return NowPlaying(
            title = title,
            artist = json.optString("artist", ""),
            cover = cover,
            progress = progress,
            duration = duration,
        )
    }

    // Number1 / Turkuvaz — GitHub JSON, cache'li
    private fun fetchJsonCache(id: String, kind: String): NowPlaying? {
        val now = System.currentTimeMillis()
        val isNumber1 = kind == "number1"
        val ts = if (isNumber1) number1Ts else turkuvazTs
        if (now - ts > TTL) {
            val url = if (isNumber1) "$BASE/number1-songs.json" else "$BASE/turkuvaz-songs.json"
            val json = httpGetJson(url)
            if (json != null) {
                val fresh = mutableMapOf<String, NowPlaying>()
                val keys = json.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val o = json.optJSONObject(key) ?: continue
                    fresh[key] = NowPlaying(
                        title = o.optString("title", ""),
                        artist = o.optString("artist", ""),
                        cover = o.optString("cover", ""),
                        progress = o.optDouble("progress", 0.0),
                        duration = o.optDouble("duration", 0.0),
                    )
                }
                if (isNumber1) { number1Cache = fresh; number1Ts = now } else { turkuvazCache = fresh; turkuvazTs = now }
            }
        }
        return if (isNumber1) number1Cache[id] else turkuvazCache[id]
    }

    // TRT radyolari — EPG'den su anki program
    private fun fetchTrtEpg(id: String): NowPlaying? {
        val json = httpGetJson("$BASE/epg/$id.json") ?: return null
        val programmes = json.optJSONArray("programmes") ?: return null
        val now = System.currentTimeMillis()
        for (i in 0 until programmes.length()) {
            val p = programmes.getJSONObject(i)
            val start = parseIsoToMillis(p.optString("start"))
            val stop = parseIsoToMillis(p.optString("stop"))
            if (start <= now && now < stop) {
                return NowPlaying(title = p.optString("title", ""), artist = p.optString("subTitle", ""))
            }
        }
        return null
    }

    private fun httpGetJson(urlStr: String): JSONObject? {
        return try {
            val conn = URL(urlStr).openConnection() as HttpURLConnection
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.setRequestProperty("User-Agent", "Mozilla/5.0")
            if (conn.responseCode !in 200..299) return null
            val text = conn.inputStream.use { stream ->
                BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { it.readText() }
            }
            JSONObject(text)
        } catch (e: Exception) {
            null
        }
    }

    private val ISO_REGEX =
        Regex("""(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?\s*(Z|[+-]\d{2}:?\d{2})?""")

    private fun parseIsoToMillis(s: String): Long {
        val m = ISO_REGEX.find(s.trim()) ?: return 0L
        val g = m.groupValues
        val cal = GregorianCalendar(TimeZone.getTimeZone("UTC"))
        cal.clear()
        cal.set(g[1].toInt(), g[2].toInt() - 1, g[3].toInt(), g[4].toInt(), g[5].toInt(), g[6].toInt())
        if (g[7].isNotEmpty()) cal.set(Calendar.MILLISECOND, g[7].padEnd(3, '0').substring(0, 3).toInt())
        var millis = cal.timeInMillis
        val offset = g[8]
        if (offset.isNotEmpty() && offset != "Z") {
            val sign = if (offset[0] == '+') 1 else -1
            val cleaned = offset.substring(1).replace(":", "")
            val oh = cleaned.substring(0, 2).toInt()
            val om = if (cleaned.length >= 4) cleaned.substring(2, 4).toInt() else 0
            millis -= sign * (oh * 3_600_000L + om * 60_000L)
        }
        return millis
    }
}
