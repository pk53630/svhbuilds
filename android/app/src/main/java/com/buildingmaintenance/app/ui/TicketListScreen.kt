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
import com.buildingmaintenance.app.model.Ticket

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketListScreen(viewModel: AppViewModel, buildingId: String, navController: NavHostController) {
    val user by viewModel.user.collectAsState()
    val tickets by viewModel.tickets.collectAsState()
    var closingTicket by remember { mutableStateOf<Ticket?>(null) }
    var resolutionNotes by remember { mutableStateOf("") }

    val canManage = user?.role == "admin" || user?.role == "super_admin"

    fun reload() {
        viewModel.loadTickets(buildingId = if (user?.role == "super_admin") buildingId else null)
    }
    LaunchedEffect(Unit) { reload() }

    val scoped = tickets.filter { it.buildingId == buildingId }

    Scaffold(topBar = { TopAppBar(title = { Text(if (canManage) "Building requests" else "My requests") }) }) { padding ->
        LazyColumn(modifier = Modifier.padding(padding).padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(scoped) { ticket ->
                ElevatedCard {
                    Column(Modifier.padding(14.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text(ticket.ticketNumber, style = MaterialTheme.typography.titleMedium)
                            AssistChip(onClick = {}, label = { Text(ticket.status.replace("_", " ")) })
                        }
                        Text("Flat ${ticket.flatNumber} · ${ticket.category}", style = MaterialTheme.typography.bodySmall)
                        Text(ticket.description)
                        ticket.resolutionNotes?.let { Text("Resolution: $it", style = MaterialTheme.typography.bodySmall) }

                        if (canManage && ticket.status != "closed") {
                            Row(Modifier.padding(top = 8.dp)) {
                                if (ticket.status == "open") {
                                    TextButton(onClick = {
                                        viewModel.updateTicketStatus(ticket.id, "in_progress", null) { reload() }
                                    }) { Text("Mark In Progress") }
                                }
                                TextButton(onClick = { closingTicket = ticket }) { Text("Close ticket") }
                            }
                        }
                    }
                }
            }
            if (scoped.isEmpty()) {
                item { Text("No requests found.") }
            }
        }
    }

    closingTicket?.let { ticket ->
        AlertDialog(
            onDismissRequest = { closingTicket = null },
            title = { Text("Close ${ticket.ticketNumber}") },
            text = {
                OutlinedTextField(
                    value = resolutionNotes,
                    onValueChange = { resolutionNotes = it },
                    label = { Text("Resolution / closure notes") }
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.updateTicketStatus(ticket.id, "closed", resolutionNotes) {
                            closingTicket = null
                            resolutionNotes = ""
                            reload()
                        }
                    },
                    enabled = resolutionNotes.isNotBlank()
                ) { Text("Close") }
            },
            dismissButton = { TextButton(onClick = { closingTicket = null }) { Text("Cancel") } }
        )
    }
}
