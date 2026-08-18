import SwiftUI

struct SuperAdminView: View {
    @State private var buildings: [Building] = []
    @State private var admins: [User] = []
    @State private var name = ""
    @State private var code = ""
    @State private var address = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Add building") {
                    TextField("Building name (e.g. Lasaya Home)", text: $name)
                    TextField("Short code (e.g. LH)", text: $code)
                    TextField("Address", text: $address)
                    if let errorMessage { Text(errorMessage).foregroundColor(.red) }
                    Button("Add building") { Task { await addBuilding() } }
                        .disabled(name.isEmpty || code.isEmpty)
                }

                Section("Buildings") {
                    ForEach(buildings) { building in
                        HStack {
                            Text("\(building.name) (\(building.code))")
                            Spacer()
                            Button("Delete", role: .destructive) {
                                Task { await deleteBuilding(building) }
                            }
                        }
                    }
                }

                Section("Building admins") {
                    ForEach(admins) { admin in
                        VStack(alignment: .leading) {
                            Text(admin.name).bold()
                            Text(admin.email).font(.footnote).foregroundColor(.secondary)
                        }
                    }
                    Text("Add admins from the web app's Super Admin page (calls the same backend).")
                        .font(.caption).foregroundColor(.secondary)
                }
            }
            .navigationTitle("Super Admin")
            .task { await load() }
        }
    }

    func load() async {
        do {
            buildings = try await APIService.shared.getBuildings()
            admins = try await APIService.shared.getAdmins()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func addBuilding() async {
        do {
            _ = try await APIService.shared.createBuilding(name: name, code: code, address: address)
            name = ""; code = ""; address = ""
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteBuilding(_ building: Building) async {
        try? await APIService.shared.deleteBuilding(id: building.id)
        await load()
    }
}
