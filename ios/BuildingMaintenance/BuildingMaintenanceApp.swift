import SwiftUI

@main
struct BuildingMaintenanceApp: App {
    @StateObject private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var session: SessionStore

    var body: some View {
        if session.user == nil {
            LoginView()
        } else {
            HomeView()
        }
    }
}
