# iOS app — setup

These are the Swift/SwiftUI source files for the native iOS app. Since creating an actual
`.xcodeproj` requires Xcode itself, set up the project shell once (a few minutes) and drop
these files in:

1. Install Xcode from the Mac App Store (free), open it.
2. File → New → Project → **iOS → App**.
   - Product Name: `BuildingMaintenance`
   - Interface: **SwiftUI**
   - Language: **Swift**
3. Delete the default `ContentView.swift` Xcode generated.
4. Drag the `BuildingMaintenance` folder from this repo (containing `Models.swift`,
   `APIService.swift`, `SessionStore.swift`, `BuildingMaintenanceApp.swift`, and the `Views/`
   folder) into your Xcode project navigator. Check "Copy items if needed."
5. In `APIService.swift`, confirm `baseURL` points at your backend:
   - iOS Simulator: `http://localhost:4000` works out of the box.
   - Physical iPhone: use your computer's LAN IP (e.g. `http://192.168.1.20:4000`) or your
     deployed API URL, and add an App Transport Security exception for `http://` in
     `Info.plist` during development (production should use `https://`).
6. Press ▶ Run with an iPhone simulator selected.

Login with the seeded super admin (`ks2.praveen@gmail.com` / `Admin@123`) after running
`npm run seed` in the `backend` folder.

See `docs/DEPLOYMENT_AND_APPSTORE_GUIDE.md` in the project root for App Store submission steps.
