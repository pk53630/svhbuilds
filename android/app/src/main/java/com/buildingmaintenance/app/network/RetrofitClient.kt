package com.buildingmaintenance.app.network

import com.buildingmaintenance.app.data.SessionManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    // Android emulator maps 10.0.2.2 to the host machine's localhost.
    // For a real device or production, replace with your deployed API URL,
    // e.g. "https://api.yourdomain.com/"
    private const val BASE_URL = "http://10.0.2.2:4000/"

    fun create(session: SessionManager): ApiService {
        val authInterceptor = Interceptor { chain ->
            val builder = chain.request().newBuilder()
            session.getToken()?.let { token -> builder.addHeader("Authorization", "Bearer $token") }
            chain.proceed(builder.build())
        }

        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
