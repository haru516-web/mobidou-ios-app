import ExpoModulesCore
import HealthKit

public class MobiHealthModule: Module {
  private let store = HKHealthStore()
  private var observer: HKObserverQuery?
  private var pendingCompletion: HKObserverQueryCompletionHandler?
  private let backgroundKey = "mobi.health.backgroundDelivery"

  public func definition() -> ModuleDefinition {
    Name("MobiHealth")
    Events("onStepsChanged")
    OnCreate {
      // When iOS launched the app for new steps, the observer must be set up again at once or the wake-ups stop.
      if UserDefaults.standard.bool(forKey: self.backgroundKey) { self.startObserver() }
    }
    AsyncFunction("enableBackgroundDelivery") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable(),
        let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
        promise.resolve(false)
        return
      }
      self.store.enableBackgroundDelivery(for: steps, frequency: .hourly) { success, _ in
        if success {
          UserDefaults.standard.set(true, forKey: self.backgroundKey)
          self.startObserver()
        }
        promise.resolve(success)
      }
    }
    Function("finishBackgroundDelivery") {
      DispatchQueue.main.async { self.finishPending() }
    }
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
      let inRange = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
      // Steps typed into the Health app by hand do not count (samples without the key are kept).
      let typedIn = HKQuery.predicateForObjects(withMetadataKey: HKMetadataKeyWasUserEntered, operatorType: .equalTo, value: true)
      let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [inRange, NSCompoundPredicate(notPredicateWithSubpredicate: typedIn)])
      let query = HKStatisticsQuery(quantityType: steps, quantitySamplePredicate: predicate,
        options: .cumulativeSum) { _, statistics, error in
        if let error = error { promise.reject("READ", error.localizedDescription) }
        else { promise.resolve(statistics?.sumQuantity()?.doubleValue(for: .count()) ?? 0) }
      }
      self.store.execute(query)
    }
  }

  /** Watches for new steps. iOS wakes the app (about hourly) and calls this, even when the app is not open. */
  private func startObserver() {
    DispatchQueue.main.async {
      guard self.observer == nil, let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else { return }
      let query = HKObserverQuery(sampleType: steps, predicate: nil) { [weak self] _, completion, error in
        guard let self = self else { completion(); return }
        if error != nil { completion(); return }
        DispatchQueue.main.async {
          self.finishPending()
          self.pendingCompletion = completion
          self.sendEvent("onStepsChanged", [:])
          // iOS wants an answer within about half a minute: end the wake-up ourselves if JavaScript has not.
          DispatchQueue.main.asyncAfter(deadline: .now() + 25) { [weak self] in self?.finishPending() }
        }
      }
      self.store.execute(query)
      self.observer = query
    }
  }

  private func finishPending() {
    let completion = pendingCompletion
    pendingCompletion = nil
    completion?()
  }
}
