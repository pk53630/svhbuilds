package com.buildingmaintenance.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.buildingmaintenance.app.data.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SuperAdminScreen(viewModel: AppViewModel, navController: NavHostController) {
    var name by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    val buildings by viewModel.buildings.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadBuildings() }

    Scaffold(topBar = { TopAppBar(title = { Text("Super Admin") }) }) { padding ->
        Column(Modifier.padding(padding).padding(16.dp)) {
            Text("Add building", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Building name") })
            OutlinedTextField(value = code, onValueChange = { code = it }, label = { Text("Short code (e.g. LH)") })
            OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Address") })
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Spacer(Modifier.height(8.dp))
            Button(onClick = {
                viewModel.createBuilding(name, code, address) {
                    name = ""; code = ""; address = ""
                    viewModel.loadBuildings()
                }
            }) { Text("Add building") }

            Spacer(Modifier.height(24.dp))
            Text("Buildings", style = MaterialTheme.typography.titleMedium)
            buildings.forEach { b ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("${b.name} (${b.code})")
                    TextButton(onClick = {
                        viewModel.deleteBuilding(b.id) { viewModel.loadBuildings() }
                    }) { Text("Delete") }
                }
            }
            Spacer(Modifier.height(16.dp))
            Text(
                "Tip: adding/removing building admins is available in the web app's Super Admin " +
                    "page, which calls the same backend.",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
