package com.buildingmaintenance.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.buildingmaintenance.app.data.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(viewModel: AppViewModel, navController: NavHostController) {
    val user by viewModel.user.collectAsState()
    val buildings by viewModel.buildings.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadBuildings() }

    val visible = buildings.filter {
        user?.role == "super_admin" || it.id == user?.buildingId
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Buildings") },
                actions = {
                    if (user?.role == "super_admin") {
                        TextButton(onClick = { navController.navigate("superadmin") }) { Text("Super Admin") }
                    }
                    TextButton(onClick = {
                        viewModel.logout()
                        navController.navigate("login") { popUpTo(0) }
                    }) { Text("Logout") }
                }
            )
        }
    ) { padding ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.padding(padding).padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(visible) { building ->
                ElevatedCard(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text(building.code, style = MaterialTheme.typography.labelMedium)
                        Text(building.name, style = MaterialTheme.typography.titleMedium)
                        Text(building.address ?: "", style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(12.dp))
                        Row {
                            if (user?.role == "user" || user?.role == "super_admin") {
                                TextButton(onClick = { navController.navigate("raise/${building.id}") }) {
                                    Text("Raise request")
                                }
                            }
                            TextButton(onClick = { navController.navigate("tickets/${building.id}") }) {
                                Text("Requests")
                            }
                        }
                        if (user?.role == "admin" || user?.role == "super_admin") {
                            TextButton(onClick = { navController.navigate("users/${building.id}") }) {
                                Text("Manage residents")
                            }
                        }
                    }
                }
            }
        }
    }
}
