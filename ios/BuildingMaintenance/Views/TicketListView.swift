import SwiftUI

struct TicketListView: View {
    let buildingId: String

    @EnvironmentObject var session: SessionStore
    @State private var tickets: [Ticket] = []
    @State private var errorMessage: String?
    @State private var closingTicket: Ticket?
    @State private var resolutionNotes = ""

    var canManage: Bool { session.user?.role == "admin" || session.user?.role == "super_admin" }

    var body: some View {
        List(tickets) { ticket in
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(ticket.ticketNumber).font(.headline)
                    Spacer()
                    Text(ticket.status.replacingOccurrences(of: "_", with: " "))
                        .font(.caption).bold()
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(statusColor(ticket.status).opacity(0.15))
                        .foregroundColor(statusColor(ticket.status))
                        .clipShape(Capsule())
                }
                Text("Flat \(ticket.flatNumber ?? "-") · \(ticket.category)")
                    .font(.footnote).foregroundColor(.secondary)
                Text(ticket.description)
                if let notes = ticket.resolutionNotes {
                    Text("Resolution: \(notes)").font(.footnote).foregroundColor(.secondary)
                }

                if canManage && ticket.status != "closed" {
                    HStack {
                        if ticket.status == "open" {
                            Button("Mark In Progress") {
                                Task { await updateStatus(ticket, status: "in_progress", notes: nil) }
                            }.buttonStyle(.bordered)
                        }
                        Button("Close ticket") { closingTicket = ticket }
                            .buttonStyle(.borderedProminent)
                    }
                }
            }
            .padding(.vertical, 4)
        }
        .navigationTitle(canManage ? "Building requests" : "My requests")
        .task { await load() }
        .refreshable { await load() }
        .alert("Close \(closingTicket?.ticketNumber ?? "")", isPresented: Binding(
            get: { closingTicket != nil }, set: { if !$0 { closingTicket = nil } }
        )) {
            TextField("Resolution / closure notes", text: $resolutionNotes)
            Button("Close", role: .destructive) {
                if let ticket = closingTicket {
                    Task { await updateStatus(ticket, status: "closed", notes: resolutionNotes) }
                }
            }
            Button("Cancel", role: .cancel) { closingTicket = nil }
        }
        .overlay {
            if let errorMessage { Text(errorMessage).foregroundColor(.red).padding() }
        }
    }

    func statusColor(_ status: String) -> Color {
        switch status {
        case "open": return .orange
        case "in_progress": return .blue
        default: return .green
        }
    }

    func load() async {
        do {
            let scopedBuildingId = session.user?.role == "super_admin" ? buildingId : nil
            let all = try await APIService.shared.getTickets(buildingId: scopedBuildingId)
            tickets = all.filter { $0.buildingId == buildingId }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateStatus(_ ticket: Ticket, status: String, notes: String?) async {
        do {
            _ = try await APIService.shared.updateTicketStatus(id: ticket.id, status: status, resolutionNotes: notes)
            closingTicket = nil
            resolutionNotes = ""
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
