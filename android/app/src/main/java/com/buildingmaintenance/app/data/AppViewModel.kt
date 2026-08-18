package com.buildingmaintenance.app.data

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.buildingmaintenance.app.model.*
import com.buildingmaintenance.app.network.RetrofitClient
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.ResponseBody

/** Central place holding auth state and calling the shared REST API. */
class AppViewModel(application: Application) : AndroidViewModel(application) {

    private val session = SessionManager(application)
    private val api = RetrofitClient.create(session)
    private val gson = Gson()

    private val _user = MutableStateFlow(session.getUser())
    val user: StateFlow<User?> = _user

    private val _buildings = MutableStateFlow<List<Building>>(emptyList())
    val buildings: StateFlow<List<Building>> = _buildings

    private val _tickets = MutableStateFlow<List<Ticket>>(emptyList())
    val tickets: StateFlow<List<Ticket>> = _tickets

    private val _categories = MutableStateFlow<List<String>>(emptyList())
    val categories: StateFlow<List<String>> = _categories

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private fun errorMessage(body: ResponseBody?): String {
        return try {
            gson.fromJson(body?.string(), ApiError::class.java)?.error ?: "Something went wrong"
        } catch (e: Exception) {
            "Something went wrong"
        }
    }

    fun login(email: String, password: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            _error.value = null
            try {
                val res = api.login(LoginRequest(email, password))
                if (res.isSuccessful && res.body() != null) {
                    val body = res.body()!!
                    session.save(body.token, body.user)
                    _user.value = body.user
                    onResult(true)
                } else {
                    _error.value = errorMessage(res.errorBody())
                    onResult(false)
                }
            } catch (e: Exception) {
                _error.value = "Could not reach the server: ${e.message}"
                onResult(false)
            }
        }
    }

    fun logout() {
        session.clear()
        _user.value = null
        _buildings.value = emptyList()
        _tickets.value = emptyList()
    }

    fun loadBuildings() {
        viewModelScope.launch {
            try {
                val res = api.getBuildings()
                if (res.isSuccessful) _buildings.value = res.body().orEmpty()
                else _error.value = errorMessage(res.errorBody())
            } catch (e: Exception) {
                _error.value = "Could not reach the server: ${e.message}"
            }
        }
    }

    fun loadCategories() {
        viewModelScope.launch {
            val res = api.getCategories()
            if (res.isSuccessful) _categories.value = res.body().orEmpty()
        }
    }

    fun loadTickets(buildingId: String? = null, status: String? = null) {
        viewModelScope.launch {
            try {
                val res = api.getTickets(status = status, buildingId = buildingId)
                if (res.isSuccessful) _tickets.value = res.body().orEmpty()
                else _error.value = errorMessage(res.errorBody())
            } catch (e: Exception) {
                _error.value = "Could not reach the server: ${e.message}"
            }
        }
    }

    fun createTicket(category: String, description: String, onResult: (Ticket?) -> Unit) {
        viewModelScope.launch {
            try {
                val res = api.createTicket(CreateTicketRequest(category, description))
                if (res.isSuccessful) onResult(res.body())
                else {
                    _error.value = errorMessage(res.errorBody())
                    onResult(null)
                }
            } catch (e: Exception) {
                _error.value = "Could not reach the server: ${e.message}"
                onResult(null)
            }
        }
    }

    fun updateTicketStatus(ticketId: String, status: String, resolutionNotes: String?, onDone: () -> Unit) {
        viewModelScope.launch {
            try {
                val res = api.updateTicketStatus(ticketId, UpdateTicketStatusRequest(status, resolutionNotes))
                if (!res.isSuccessful) _error.value = errorMessage(res.errorBody())
                onDone()
            } catch (e: Exception) {
                _error.value = "Could not reach the server: ${e.message}"
                onDone()
            }
        }
    }

    fun createBuilding(name: String, code: String, address: String, onDone: () -> Unit) {
        viewModelScope.launch {
            val res = api.createBuilding(CreateBuildingRequest(name, code, address))
            if (!res.isSuccessful) _error.value = errorMessage(res.errorBody())
            onDone()
        }
    }

    fun deleteBuilding(id: String, onDone: () -> Unit) {
        viewModelScope.launch {
            api.deleteBuilding(id)
            onDone()
        }
    }

    fun createUser(name: String, email: String, phone: String, password: String, flatNumber: String, buildingId: String, onDone: () -> Unit) {
        viewModelScope.launch {
            val res = api.createUser(CreateUserRequest(name, email, phone, password, flatNumber, buildingId))
            if (!res.isSuccessful) _error.value = errorMessage(res.errorBody())
            onDone()
        }
    }

    fun clearError() { _error.value = null }
}
