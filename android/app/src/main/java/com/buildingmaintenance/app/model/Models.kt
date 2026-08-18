package com.buildingmaintenance.app.model

data class User(
    val id: String,
    val name: String,
    val email: String,
    val phone: String?,
    val role: String, // "super_admin" | "admin" | "user"
    val buildingId: String?,
    val flatNumber: String?
)

data class Building(
    val id: String,
    val name: String,
    val code: String,
    val address: String?
)

data class Ticket(
    val id: String,
    val ticketNumber: String,
    val buildingId: String,
    val buildingName: String,
    val userId: String,
    val flatNumber: String?,
    val category: String,
    val description: String,
    val status: String, // "open" | "in_progress" | "closed"
    val resolutionNotes: String?,
    val createdAt: String,
    val updatedAt: String,
    val closedAt: String?
)

data class LoginRequest(val email: String, val password: String)
data class LoginResponse(val token: String, val user: User)

data class CreateBuildingRequest(val name: String, val code: String, val address: String)
data class CreateAdminRequest(
    val name: String,
    val email: String,
    val phone: String,
    val password: String,
    val buildingId: String
)
data class CreateUserRequest(
    val name: String,
    val email: String,
    val phone: String,
    val password: String,
    val flatNumber: String,
    val buildingId: String
)
data class CreateTicketRequest(val category: String, val description: String)
data class UpdateTicketStatusRequest(val status: String, val resolutionNotes: String?)
data class ApiError(val error: String?)
