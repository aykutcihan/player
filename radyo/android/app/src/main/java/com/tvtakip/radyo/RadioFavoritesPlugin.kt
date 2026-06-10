package com.tvtakip.radyo

import android.content.Context
import com.getcapacitor.JSArray
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * JS tarafindaki radio_favorites (useFavorites.ts) listesini SharedPreferences'a yazar,
 * boylece RadioCatalog.favorites() Android Auto icin ayni gruplari okuyabilir.
 */
@CapacitorPlugin(name = "RadioFavorites")
class RadioFavoritesPlugin : Plugin() {

    @PluginMethod
    fun setFavorites(call: PluginCall) {
        val groups: JSArray? = call.getArray("groups")
        if (groups == null) {
            call.reject("groups missing")
            return
        }
        context.getSharedPreferences(RadioCatalog.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(RadioCatalog.FAVORITES_KEY, groups.toString())
            .apply()
        call.resolve()
    }
}
