import SwiftUI

@main
struct AcousticGrooveBoxApp: App {
    var body: some Scene {
        WindowGroup {
            MainAppView()
                .preferredColorScheme(.dark)
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 1040, height: 740)
    }
}
