import Foundation
import SwiftUI

@MainActor
final class SessionStore: ObservableObject {
    @Published var user: User?
    @Published var errorMessage: String?

    private let defaults = UserDefaults.standard

    init() {
        if let token = defaults.string(forKey: "bm_token"),
           let userData = defaults.data(forKey: "bm_user"),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            APIService.shared.token = token
            self.user = user
        }
    }

    func login(email: String, password: String) async -> Bool {
        errorMessage = nil
        do {
            let res = try await APIService.shared.login(email: email, password: password)
            APIService.shared.token = res.token
            user = res.user
            defaults.set(res.token, forKey: "bm_token")
            defaults.set(try? JSONEncoder().encode(res.user), forKey: "bm_user")
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func logout() {
        APIService.shared.token = nil
        user = nil
        defaults.removeObject(forKey: "bm_token")
        defaults.removeObject(forKey: "bm_user")
    }
}
