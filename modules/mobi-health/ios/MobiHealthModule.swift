import ExpoModulesCore
import HealthKit

public class MobiHealthModule: Module {
  private let store = HKHealthStore()
  public func definition() -> ModuleDefinition {
    Name("MobiHealth")
    AsyncFunction("isAvailable") { () -> Bool in
      return HKHealthStore.isHealthDataAvailable()
    }
    AsyncFunction("requestPermission") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable(),
        let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
        promise.reject("UNAVAILABLE", "HealthKit is unavailable on this device")
        return
      }
      self.store.requestAuthorization(toShare: [], read: [steps]) { success, error in
        if let error = error { promise.reject("PERMISSION", error.localizedDescription) }
        else { promise.resolve(success) }
      }
    }
    AsyncFunction("readSteps") { (startMillis: Double, endMillis: Double, promise: Promise) in
      guard let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
        promise.reject("UNAVAILABLE", "Step count is unavailable")
        return
      }
      let start = Date(timeIntervalSince1970: startMillis / 1000)
      let end = Date(timeIntervalSince1970: endMillis / 1000)
      let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
      let query = HKStatisticsQuery(quantityType: steps, quantitySamplePredicate: predicate,
        options: .cumulativeSum) { _, statistics, error in
        if let error = error { promise.reject("READ", error.localizedDescription) }
        else { promise.resolve(statistics?.sumQuantity()?.doubleValue(for: .count()) ?? 0) }
      }
      self.store.execute(query)
    }
  }
}
