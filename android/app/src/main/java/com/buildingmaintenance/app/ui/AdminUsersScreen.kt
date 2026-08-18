package com.buildingmaintenance.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.buildingmaintenance.app.data.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminUsersScreen(viewModel: AppViewModel, buildingId: String, navController: NavHostController) {
    // Reuses the ticket/user list plumbing via the shared ViewModel's building-scoped calls.
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var flatNumber by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val error by viewModel.error.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("Manage residents") }) }) { padding ->
        Column(Modifier.padding(padding).padding(16.dp)) {
            Text("Add resident", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") })
            OutlinedTextField(value = flatNumber, onValueChange = { flatNumber = it }, label = { Text("Flat number") })
            OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") })
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") })
            OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Temporary password") })
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Spacer(Modifier.height(8.dp))
            Button(onClick = {
                viewModel.createUser(name, email, phone, password, flatNumber, buildingId) {
                    name = ""; email = ""; phone = ""; flatNumber = ""; password = ""
                }
            }) { Text("Add resident") }

            Spacer(Modifier.height(16.dp))
            Text(
                "Tip: the full resident list and delete action are available in the web app's " +
                    "Manage Residents page, which calls the same backend.",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
