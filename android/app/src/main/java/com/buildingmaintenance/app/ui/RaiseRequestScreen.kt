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
fun RaiseRequestScreen(viewModel: AppViewModel, buildingId: String, navController: NavHostController) {
    val categories by viewModel.categories.collectAsState()
    val error by viewModel.error.collectAsState()
    var expanded by remember { mutableStateOf(false) }
    var category by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var ticketNumber by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadCategories() }

    val wordCount = description.trim().split("\\s+".toRegex()).filter { it.isNotBlank() }.size

    Scaffold(topBar = { TopAppBar(title = { Text("Raise a request") }) }) { padding ->
        if (ticketNumber != null) {
            Column(Modifier.padding(padding).padding(24.dp)) {
                Text("✅ Request submitted", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                Text("Your service request number is:")
                Text(ticketNumber ?: "", style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(16.dp))
                Button(onClick = { navController.navigate("tickets/$buildingId") }) {
                    Text("View my requests")
                }
            }
        } else {
            Column(Modifier.padding(padding).padding(24.dp)) {
                Text("Issue type")
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                    OutlinedTextField(
                        value = category,
                        onValueChange = {},
                        readOnly = true,
                        modifier = Modifier.menuAnchor().fillMaxWidth(),
                        label = { Text("Select an issue") }
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        categories.forEach { option ->
                            DropdownMenuItem(text = { Text(option) }, onClick = {
                                category = option
                                expanded = false
                            })
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (max 50 words)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
                Text("$wordCount / 50 words", style = MaterialTheme.typography.bodySmall)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = {
                        loading = true
                        viewModel.createTicket(category, description) { ticket ->
                            loading = false
                            ticketNumber = ticket?.ticketNumber
                        }
                    },
                    enabled = !loading && category.isNotBlank() && description.isNotBlank() && wordCount <= 50
                ) {
                    Text(if (loading) "Submitting…" else "Submit request")
                }
            }
        }
    }
}
