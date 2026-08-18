import SwiftUI

struct LoginView: View {
    @EnvironmentObject var session: SessionStore
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false

    var body: some View {
        VStack(spacing: 14) {
            Text("🏢 Building Maintenance").font(.title2).bold()
            Text("Sign in to raise or manage maintenance requests.")
                .font(.footnote).foregroundColor(.secondary)

            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textFieldStyle(.roundedBorder)

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)

            if let error = session.errorMessage {
                Text(error).foregroundColor(.red).font(.footnote)
            }

            Button(action: {
                loading = true
                Task {
                    _ = await session.login(email: email, password: password)
                    loading = false
                }
            }) {
                Text(loading ? "Signing in…" : "Sign in").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(loading || email.isEmpty || password.isEmpty)

            Text("Demo super admin: ks2.praveen@gmail.com / Admin@123")
                .font(.caption2).foregroundColor(.secondary)
        }
        .padding(24)
        .frame(maxWidth: 380)
    }
}
