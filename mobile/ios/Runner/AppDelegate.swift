import UIKit
import Flutter

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
  
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Configure for local notifications
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
    }
    
    GeneratedPluginRegistrant.register(with: self)
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // Handle notification presentation when app is in foreground
  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    // Show notification even when app is in foreground
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge, .list])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }
  
  // Handle notification tap
  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }
  
  // Keep app processing in background
  override func applicationDidEnterBackground(_ application: UIApplication) {
    // Only request a new background task if one isn't already active
    if backgroundTask == .invalid {
      backgroundTask = application.beginBackgroundTask { [weak self] in
        self?.endBackgroundTask(application)
      }
    }
  }
  
  // Clean up background task when app returns to foreground
  override func applicationWillEnterForeground(_ application: UIApplication) {
    endBackgroundTask(application)
  }
  
  private func endBackgroundTask(_ application: UIApplication) {
    if backgroundTask != .invalid {
      application.endBackgroundTask(backgroundTask)
      backgroundTask = .invalid
    }
  }
}
