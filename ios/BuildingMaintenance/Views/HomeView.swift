import SwiftUI

struct HomeView: View {
    @EnvironmentObject var session: SessionStore
    @State private var buildings: [Building] = []
    @State private var errorMessage: String?
    @State private var showSuperAdmin = false

    var visibleBuildings: [Building] {
        guard let user = session.user else { return [] }
        if user.role == "super_admin" { return buildings }
        return buildings.filter { $0.id == user.buildingId }
    }

    var body: some View {
        NavigationStack {
            List(visibleBuildings) { building in
                VStack(alignment: .leading, spacing: 4) {
                    Text(building.code).font(.caption).foregroundColor(.blue)
                    Text(building.name).font(.headline)
                    if let address = building.address { Text(address).font(.footnote).foregroundColor(.secondary) }

                    HStack {
                        if session.user?.role == "user" || session.user?.role == "super_admin" {
                            NavigationLink("Raise request") { RaiseRequestView(buildingId: building.id) }
                                .buttonStyle(.bordered)
                        }
                        NavigationLink("Requests") { TicketListView(buildingId: building.id) }
                            .buttonStyle(.bordered)
                    }
                    if session.user?.role == "admin" || session.user?.role == "super_admin" {
                        NavigationLink("Manage residents") { AdminUsersView(buildingId: building.id) }
                            .buttonStyle(.bordered)
                    }
                }
                .padding(.vertical, 6)
            }
            .navigationTitle("Buildings")
            .toolbar {
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    if session.user?.role == "super_admin" {
                        Button("Super Admin") { showSuperAdmin = true }
                    }
                    Button("Logout") { session.logout() }
                }
            }
            .sheet(isPresented: $showSuperAdmin) { SuperAdminView() }
            .task { await load() }
            .refreshable { await load() }
            .overlay {
                if let errorMessage { Text(errorMessage).foregroundColor(.red).padding() }
            }
        }
    }

    func load() async {
        do {
            buildings = try await APIService.shared.getBuildings()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
