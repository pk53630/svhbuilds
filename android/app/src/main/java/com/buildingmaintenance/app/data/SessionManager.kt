package com.buildingmaintenance.app.data

import android.content.Context
import android.content.SharedPreferences
import com.buildingmaintenance.app.model.User
import com.google.gson.Gson

/** Stores the JWT token and logged-in user in SharedPreferences. */
class SessionManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("building_maintenance_session", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun getToken(): String? = prefs.getString("token", null)

    fun getUser(): User? {
        val json = prefs.getString("user", null) ?: return null
        return gson.fromJson(json, User::class.java)
    }

    fun save(token: String, user: User) {
        prefs.edit()
            .putString("token", token)
            .putString("user", gson.toJson(user))
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }
}
