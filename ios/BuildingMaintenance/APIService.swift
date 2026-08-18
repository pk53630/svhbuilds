import Foundation

/// Talks to the same backend REST API used by the web app and the Android app.
final class APIService {
    static let shared = APIService()

    // iOS Simulator can reach your Mac's localhost directly.
    // For a real device or production, replace with your deployed API URL,
    // e.g. "https://api.yourdomain.com"
    private let baseURL = URL(string: "http://localhost:4000")!

    var token: String?

    private func request(
        _ path: String,
        method: String = "GET",
        body: [String: Any?]? = nil
    ) async throws -> Data {
        var url = baseURL.appendingPathComponent(path)
        if method == "GET", let body = body {
            var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            components.queryItems = body.compactMap { key, value in
                guard let value = value else { return nil }
                return URLQueryItem(name: key, value: "\(value)")
            }
            url = components.url!
        }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if method != "GET", let body = body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body.compactMapValues { $0 })
        }

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else {
            throw ApiError(message: "No response from server")
        }
        if !(200...299).contains(http.statusCode) {
            let decoded = try? JSONDecoder().decode(ApiErrorBody.self, from: data)
            throw ApiError(message: decoded?.error ?? "Request failed (\(http.statusCode))")
        }
        return data
    }

    private func decode<T: Decodable>(_ data: Data) throws -> T {
        try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: Auth

    func login(email: String, password: String) async throws -> LoginResponse {
        let data = try await request("/api/auth/login", method: "POST", body: ["email": email, "password": password])
        return try decode(data)
    }

    // MARK: Buildings

    func getBuildings() async throws -> [Building] {
        try decode(try await request("/api/buildings"))
    }

    func createBuilding(name: String, code: String, address: String) async throws -> Building {
        try decode(try await request("/api/buildings", method: "POST", body: ["name": name, "code": code, "address": address]))
    }

    func deleteBuilding(id: String) async throws {
        _ = try await request("/api/buildings/\(id)", method: "DELETE")
    }

    // MARK: Admins (super admin only)

    func getAdmins() async throws -> [User] {
        try decode(try await request("/api/admins"))
    }

    func createAdmin(name: String, email: String, phone: String, password: String, buildingId: String) async throws -> User {
        try decode(try await request("/api/admins", method: "POST", body: [
            "name": name, "email": email, "phone": phone, "password": password, "buildingId": buildingId,
        ]))
    }

    func deleteAdmin(id: String) async throws {
        _ = try await request("/api/admins/\(id)", method: "DELETE")
    }

    // MARK: Users / residents

    func getUsers(buildingId: String?) async throws -> [User] {
        var path = "/api/users"
        if let buildingId = buildingId { path += "?buildingId=\(buildingId)" }
        return try decode(try await request(path))
    }

    func createUser(name: String, email: String, phone: String, password: String, flatNumber: String, buildingId: String) async throws -> User {
        try decode(try await request("/api/users", method: "POST", body: [
            "name": name, "email": email, "phone": phone, "password": password,
            "flatNumber": flatNumber, "buildingId": buildingId,
        ]))
    }

    func deleteUser(id: String) async throws {
        _ = try await request("/api/users/\(id)", method: "DELETE")
    }

    // MARK: Tickets

    func getCategories() async throws -> [String] {
        try decode(try await request("/api/tickets/categories"))
    }

    func getTickets(status: String? = nil, buildingId: String? = nil) async throws -> [Ticket] {
        var path = "/api/tickets"
        var query: [String] = []
        if let status = status { query.append("status=\(status)") }
        if let buildingId = buildingId { query.append("buildingId=\(buildingId)") }
        if !query.isEmpty { path += "?" + query.joined(separator: "&") }
        return try decode(try await request(path))
    }

    func createTicket(category: String, description: String) async throws -> Ticket {
        try decode(try await request("/api/tickets", method: "POST", body: ["category": category, "description": description]))
    }

    func updateTicketStatus(id: String, status: String, resolutionNotes: String?) async throws -> Ticket {
        try decode(try await request("/api/tickets/\(id)/status", method: "PATCH", body: [
            "status": status, "resolutionNotes": resolutionNotes,
        ]))
    }
}
