import WidgetKit
import SwiftUI

// The app writes the snapshot into the shared App Group (src/services/widgetSync.ts).
// The group id is the app's bundle id with "group." in front; the widget's own id is "<app id>.<name>".
private enum Shared {
  static var group: String {
    let id = Bundle.main.bundleIdentifier ?? "jp.mobby.mobidou.MobiWalkWidget"
    let app = id.split(separator: ".").dropLast().joined(separator: ".")
    return "group.\(app)"
  }
  static let fallbackPet = "mobibou"
}

private func localDay(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.calendar = Calendar.current
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone.current
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter.string(from: date)
}

struct WalkEntry: TimelineEntry {
  let date: Date
  let petId: String
  let steps: Int
}

struct WalkProvider: TimelineProvider {
  private func snapshot() -> (petId: String, steps: Int, day: String) {
    let defaults = UserDefaults(suiteName: Shared.group)
    let stored = defaults?.string(forKey: "petId") ?? Shared.fallbackPet
    let petId = UIImage(named: "\(stored)_front") != nil ? stored : Shared.fallbackPet
    let steps = defaults?.object(forKey: "steps") as? Int ?? Int((defaults?.object(forKey: "steps") as? Double) ?? 0)
    return (petId, steps, defaults?.string(forKey: "day") ?? "")
  }

  private func entry(at date: Date) -> WalkEntry {
    let saved = snapshot()
    // A reading from yesterday is not today's count: show 0 until the app writes a new one.
    return WalkEntry(date: date, petId: saved.petId, steps: saved.day == localDay(date) ? max(0, saved.steps) : 0)
  }

  func placeholder(in context: Context) -> WalkEntry {
    WalkEntry(date: Date(), petId: Shared.fallbackPet, steps: 4280)
  }

  func getSnapshot(in context: Context, completion: @escaping (WalkEntry) -> Void) {
    completion(context.isPreview ? placeholder(in: context) : entry(at: Date()))
  }

  // The picture is still: one entry for now, and one at the next midnight so the count falls back to 0 on a new day.
  // The app asks for a reload whenever the steps or the chosen Mobby change.
  func getTimeline(in context: Context, completion: @escaping (Timeline<WalkEntry>) -> Void) {
    let now = Date()
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(24 * 3600)
    completion(Timeline(entries: [entry(at: now), entry(at: midnight)], policy: .atEnd))
  }
}

private func adaptive(light: (Double, Double, Double), dark: (Double, Double, Double)) -> Color {
  Color(UIColor { traits in
    let c = traits.userInterfaceStyle == .dark ? dark : light
    return UIColor(red: c.0, green: c.1, blue: c.2, alpha: 1)
  })
}

private let paper = adaptive(light: (0.97, 0.94, 0.88), dark: (0.17, 0.14, 0.13))
private let ink = adaptive(light: (0.23, 0.18, 0.16), dark: (0.95, 0.92, 0.86))
private let vermilion = adaptive(light: (0.78, 0.27, 0.17), dark: (0.93, 0.45, 0.33))

struct FrontMobby: View {
  let entry: WalkEntry
  var body: some View {
    Image("\(entry.petId)_front")
      .resizable()
      .scaledToFit()
      .accessibilityHidden(true)
  }
}

struct StepsText: View {
  let steps: Int
  let big: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("今日の歩数")
        .font(.system(size: big ? 14 : 11, weight: .semibold))
        .foregroundStyle(vermilion)
      HStack(alignment: .lastTextBaseline, spacing: 2) {
        Text(steps.formatted(.number.grouping(.automatic)))
          .font(.system(size: big ? 40 : 26, weight: .bold, design: .rounded))
          .minimumScaleFactor(0.5)
          .lineLimit(1)
          .foregroundStyle(ink)
          .contentTransition(.numericText())
        Text("歩")
          .font(.system(size: big ? 16 : 12, weight: .semibold))
          .foregroundStyle(ink)
      }
    }
  }
}

struct MobiWalkWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: WalkEntry

  var body: some View {
    switch family {
    case .systemMedium:
      HStack(spacing: 12) {
        FrontMobby(entry: entry).frame(maxWidth: 110)
        StepsText(steps: entry.steps, big: true)
        Spacer(minLength: 0)
      }
    default:
      VStack(spacing: 4) {
        FrontMobby(entry: entry)
        StepsText(steps: entry.steps, big: false)
      }
    }
  }
}

struct MobiWalkWidget: Widget {
  let kind = "MobiWalkWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WalkProvider()) { entry in
      MobiWalkWidgetView(entry: entry)
        .containerBackground(for: .widget) { paper }
    }
    .configurationDisplayName("今日の歩数")
    .description("今日の歩数と、いっしょに歩くもびが見られます。")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
