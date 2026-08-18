package com.buildingmaintenance.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.buildingmaintenance.app.data.AppViewModel

@Composable
fun AppNavHost() {
    val navController: NavHostController = rememberNavController()
    val viewModel: AppViewModel = viewModel()
    val user by viewModel.user.collectAsState()

    NavHost(navController = navController, startDestination = if (user == null) "login" else "home") {
        composable("login") {
            LoginScreen(viewModel) {
                navController.navigate("home") { popUpTo("login") { inclusive = true } }
            }
        }
        composable("home") {
            HomeScreen(viewModel, navController)
        }
        composable("raise/{buildingId}") { backStackEntry ->
            val buildingId = backStackEntry.arguments?.getString("buildingId") ?: ""
            RaiseRequestScreen(viewModel, buildingId, navController)
        }
        composable("tickets/{buildingId}") { backStackEntry ->
            val buildingId = backStackEntry.arguments?.getString("buildingId") ?: ""
            TicketListScreen(viewModel, buildingId, navController)
        }
        composable("users/{buildingId}") { backStackEntry ->
            val buildingId = backStackEntry.arguments?.getString("buildingId") ?: ""
            AdminUsersScreen(viewModel, buildingId, navController)
        }
        composable("superadmin") {
            SuperAdminScreen(viewModel, navController)
        }
    }
}
