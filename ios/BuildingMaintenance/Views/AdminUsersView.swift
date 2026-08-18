import SwiftUI

struct AdminUsersView: View {
    let buildingId: String

    @State private var users: [User] = []
    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var flatNumber = ""
    @State private var password = ""
    @State private var errorMessage: String?

    var body: some View {
        Form {
            Section("Add resident") {
                TextField("Name", text: $name)
                TextField("Flat number", text: $flatNumber)
                TextField("Email", text: $email).textInputAutocapitalization(.never).keyboardType(.emailAddress)
                TextField("Phone", text: $phone)
                SecureField("Temporary password", text: $password)
                if let errorMessage { Text(errorMessage).foregroundColor(.red) }
                Button("Add resident") { Task { await addUser() } }
                    .disabled(name.isEmpty || email.isEmpty || flatNumber.isEmpty || password.isEmpty)
            }

            Section("Residents") {
                ForEach(users) { user in
                    VStack(alignment: .leading) {
                        Text(user.name).bold()
                        Text("Flat \(user.flatNumber ?? "-") · \(user.email)").font(.footnote).foregroundColor(.secondary)
                    }
                }
                .onDelete { indexSet in
                    Task { await deleteUsers(at: indexSet) }
                }
                if users.isEmpty { Text("No residents yet.").foregroundColor(.secondary) }
            }
        }
        .navigationTitle("Manage residents")
        .task { await load() }
    }

    func load() async {
        do { users = try await APIService.shared.getUsers(buildingId: buildingId) }
        catch { errorMessage = error.localizedDescription }
    }

    func addUser() async {
        do {
            _ = try await APIService.shared.createUser(
                name: name, email: email, phone: phone, password: password,
                flatNumber: flatNumber, buildingId: buildingId
            )
            name = ""; email = ""; phone = ""; flatNumber = ""; password = ""
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteUsers(at offsets: IndexSet) async {
        for index in offsets {
            try? await APIService.shared.deleteUser(id: users[index].id)
        }
        await load()
    }
}
