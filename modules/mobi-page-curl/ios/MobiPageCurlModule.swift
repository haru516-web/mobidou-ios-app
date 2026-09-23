import ExpoModulesCore

public final class MobiPageCurlModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MobiPageCurl")

    View(MobiPageCurlView.self) {
      Events("onPageChange", "onBusyChange", "onOpenDetail")

      Prop("pagesJson") { (view: MobiPageCurlView, value: String) in
        view.setPages(json: value)
      }

      Prop("selectedIndex") { (view: MobiPageCurlView, value: Int) in
        view.setSelectedIndex(value)
      }

      AsyncFunction("turn") { (view: MobiPageCurlView, direction: Int) in
        view.turn(direction: direction)
      }
    }
  }
}
