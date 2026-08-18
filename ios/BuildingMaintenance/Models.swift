import Foundation

struct User: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let email: String
    let phone: String?
    let role: String // "super_admin" | "admin" | "user"
    let buildingId: String?
    let flatNumber: String?
}

struct Building: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let code: String
    let address: String?
}

struct Ticket: Codable, Identifiable, Equatable {
    let id: String
    let ticketNumber: String
    let buildingId: String
    let buildingName: String
    let userId: String
    let flatNumber: String?
    let category: String
    let description: String
    let status: String // "open" | "in_progress" | "closed"
    let resolutionNotes: String?
    let createdAt: String
    let updatedAt: String
    let closedAt: String?
}

struct LoginResponse: Codable {
    let token: String
    let user: User
}

struct ApiErrorBody: Codable {
    let error: String?
}

struct ApiError: Error, LocalizedError {
    let message: String
    var errorDescription: String? { message }
}
