import SwiftUI

struct RaiseRequestView: View {
    let buildingId: String

    @State private var categories: [String] = []
    @State private var category = ""
    @State private var description = ""
    @State private var errorMessage: String?
    @State private var submittedTicket: Ticket?
    @State private var loading = false

    var wordCount: Int {
        description.trimmingCharacters(in: .whitespacesAndNewlines)
            .split(separator: " ").filter { !$0.isEmpty }.count
    }

    var body: some View {
        Group {
            if let ticket = submittedTicket {
                VStack(spacing: 12) {
                    Text("✅ Request submitted").font(.title2)
                    Text("Your service request number is:")
                    Text(ticket.ticketNumber).font(.largeTitle).bold().foregroundColor(.blue)
                    Text("The building admin and super admin have been notified by WhatsApp and email.")
                        .font(.footnote).foregroundColor(.secondary).multilineTextAlignment(.center)
                }
                .padding()
            } else {
                Form {
                    Picker("Issue type", selection: $category) {
                        Text("Select an issue…").tag("")
                        ForEach(categories, id: \.self) { Text($0).tag($0) }
                    }

                    Section("Description (max 50 words)") {
                        TextEditor(text: $description).frame(height: 100)
                        Text("\(wordCount) / 50 words")
                            .font(.caption)
                            .foregroundColor(wordCount > 50 ? .red : .secondary)
                    }

                    if let errorMessage { Text(errorMessage).foregroundColor(.red) }

                    Button(loading ? "Submitting…" : "Submit request") {
                        Task { await submit() }
                    }
                    .disabled(loading || category.isEmpty || description.isEmpty || wordCount > 50)
                }
            }
        }
        .navigationTitle("Raise a request")
        .task {
            categories = (try? await APIService.shared.getCategories()) ?? []
        }
    }

    func submit() async {
        loading = true
        errorMessage = nil
        do {
            submittedTicket = try await APIService.shared.createTicket(category: category, description: description)
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}
