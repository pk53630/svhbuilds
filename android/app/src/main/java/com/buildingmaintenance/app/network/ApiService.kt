package com.buildingmaintenance.app.network

import com.buildingmaintenance.app.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @GET("api/buildings")
    suspend fun getBuildings(): Response<List<Building>>

    @POST("api/buildings")
    suspend fun createBuilding(@Body body: CreateBuildingRequest): Response<Building>

    @DELETE("api/buildings/{id}")
    suspend fun deleteBuilding(@Path("id") id: String): Response<Unit>

    @GET("api/admins")
    suspend fun getAdmins(): Response<List<User>>

    @POST("api/admins")
    suspend fun createAdmin(@Body body: CreateAdminRequest): Response<User>

    @DELETE("api/admins/{id}")
    suspend fun deleteAdmin(@Path("id") id: String): Response<Unit>

    @GET("api/users")
    suspend fun getUsers(@Query("buildingId") buildingId: String?): Response<List<User>>

    @POST("api/users")
    suspend fun createUser(@Body body: CreateUserRequest): Response<User>

    @DELETE("api/users/{id}")
    suspend fun deleteUser(@Path("id") id: String): Response<Unit>

    @GET("api/tickets/categories")
    suspend fun getCategories(): Response<List<String>>

    @GET("api/tickets")
    suspend fun getTickets(
        @Query("status") status: String? = null,
        @Query("buildingId") buildingId: String? = null
    ): Response<List<Ticket>>

    @POST("api/tickets")
    suspend fun createTicket(@Body body: CreateTicketRequest): Response<Ticket>

    @PATCH("api/tickets/{id}/status")
    suspend fun updateTicketStatus(
        @Path("id") id: String,
        @Body body: UpdateTicketStatusRequest
    ): Response<Ticket>
}
