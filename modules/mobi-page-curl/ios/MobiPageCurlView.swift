import ExpoModulesCore
import UIKit

/// One open spread of the book, drawn by the app as a picture (left page, right page); the curl turns halves of it.
private struct GoshuinPage: Decodable {
  let imageUri: String?
}

private final class WashiPageView: UIView {
  var gutterOnLeft = false
  private let gutter = CAGradientLayer()

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = UIColor(red: 0.985, green: 0.967, blue: 0.922, alpha: 1)
    gutter.colors = [UIColor.clear.cgColor, UIColor(red: 0.43, green: 0.31, blue: 0.20, alpha: 0.23).cgColor]
    layer.addSublayer(gutter)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  override func layoutSubviews() {
    super.layoutSubviews()
    gutter.frame = CGRect(x: gutterOnLeft ? 0 : bounds.width - 15, y: 0, width: 15, height: bounds.height)
    gutter.colors = gutterOnLeft
      ? [UIColor(red: 0.43, green: 0.31, blue: 0.20, alpha: 0.23).cgColor, UIColor.clear.cgColor]
      : [UIColor.clear.cgColor, UIColor(red: 0.43, green: 0.31, blue: 0.20, alpha: 0.23).cgColor]
  }
}

private final class GoshuinFaceController: UIViewController {
  let faceIndex: Int
  private let page: GoshuinPage
  private let onOpen: (Int) -> Void

  init(faceIndex: Int, page: GoshuinPage, onOpen: @escaping (Int) -> Void) {
    self.faceIndex = faceIndex
    self.page = page
    self.onOpen = onOpen
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  /// Even faces are the left half of a spread, odd faces the right half.
  private func halfImage() -> UIImage? {
    guard let uri = page.imageUri,
          let url = uri.hasPrefix("/") ? URL(fileURLWithPath: uri) : URL(string: uri), url.isFileURL,
          let full = UIImage(contentsOfFile: url.path), let cg = full.cgImage else { return nil }
    let half = cg.width / 2
    let rect = CGRect(x: faceIndex % 2 == 1 ? half : 0, y: 0, width: half, height: cg.height)
    guard let part = cg.cropping(to: rect) else { return nil }
    return UIImage(cgImage: part, scale: full.scale, orientation: .up)
  }

  override func loadView() {
    let paper = UIImageView()
    paper.backgroundColor = UIColor(red: 0.985, green: 0.967, blue: 0.922, alpha: 1)
    paper.contentMode = .scaleToFill
    paper.clipsToBounds = true
    paper.image = halfImage()
    paper.isUserInteractionEnabled = true
    paper.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(openDetail)))
    view = paper
  }

  @objc private func openDetail() { onOpen(faceIndex / 2) }
}

final class MobiPageCurlView: ExpoView, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
  let onPageChange = EventDispatcher()
  let onBusyChange = EventDispatcher()
  let onOpenDetail = EventDispatcher()

  private let pageController = UIPageViewController(
    transitionStyle: .pageCurl,
    navigationOrientation: .horizontal,
    options: [.spineLocation: NSNumber(value: UIPageViewController.SpineLocation.mid.rawValue)]
  )
  private var pages: [GoshuinPage] = []
  private var selectedIndex = 0
  private var requestedIndex = 0
  private var isTurning = false
  private var attachedToParent = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = UIColor(red: 0.985, green: 0.967, blue: 0.922, alpha: 1)
    pageController.isDoubleSided = true
    pageController.dataSource = self
    pageController.delegate = self
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      if attachedToParent {
        pageController.willMove(toParent: nil)
        pageController.view.removeFromSuperview()
        pageController.removeFromParent()
        attachedToParent = false
      }
      return
    }
    guard !attachedToParent else { return }
    var responder: UIResponder? = next
    while let current = responder {
      if let parent = current as? UIViewController {
        parent.addChild(pageController)
        addSubview(pageController.view)
        pageController.view.frame = bounds
        pageController.didMove(toParent: parent)
        attachedToParent = true
        return
      }
      responder = current.next
    }
    // The page view can still render if a host temporarily has no controller
    // in its responder chain (for example while React Native re-parents it).
    addSubview(pageController.view)
    pageController.view.frame = bounds
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    pageController.view.frame = bounds
  }

  func setPages(json: String) {
    guard let data = json.data(using: .utf8),
          let decoded = try? JSONDecoder().decode([GoshuinPage].self, from: data) else { return }
    pages = decoded
    selectedIndex = max(0, min(requestedIndex, max(0, pages.count - 1)))
    showCurrentPage()
  }

  func setSelectedIndex(_ value: Int) {
    requestedIndex = value
    guard !pages.isEmpty else { return }
    let clamped = max(0, min(value, max(0, pages.count - 1)))
    guard selectedIndex != clamped else { return }
    selectedIndex = clamped
    showCurrentPage()
  }

  private func face(_ faceIndex: Int) -> GoshuinFaceController? {
    guard faceIndex >= 0, faceIndex < pages.count * 2 else { return nil }
    return GoshuinFaceController(faceIndex: faceIndex, page: pages[faceIndex / 2]) { [weak self] index in
      self?.onOpenDetail(["index": index])
    }
  }

  private func spread(_ index: Int) -> [UIViewController]? {
    guard let left = face(index * 2), let right = face(index * 2 + 1) else { return nil }
    return [left, right]
  }

  private func showCurrentPage() {
    guard !isTurning, let controllers = spread(selectedIndex) else { return }
    pageController.setViewControllers(controllers, direction: .forward, animated: false, completion: nil)
  }

  func turn(direction: Int) {
    guard !isTurning, direction == 1 || direction == -1 else { return }
    let target = selectedIndex + direction
    guard let controllers = spread(target) else { return }
    isTurning = true
    onBusyChange(["busy": true])
    pageController.setViewControllers(
      controllers,
      direction: direction == 1 ? .forward : .reverse,
      animated: true
    ) { [weak self] finished in
      guard let self else { return }
      if finished {
        self.selectedIndex = target
        self.requestedIndex = target
        self.onPageChange(["index": target])
      }
      self.isTurning = false
      self.onBusyChange(["busy": false])
    }
  }

  func pageViewController(_ controller: UIPageViewController, viewControllerBefore current: UIViewController) -> UIViewController? {
    guard let faceIndex = (current as? GoshuinFaceController)?.faceIndex else { return nil }
    return face(faceIndex - 1)
  }

  func pageViewController(_ controller: UIPageViewController, viewControllerAfter current: UIViewController) -> UIViewController? {
    guard let faceIndex = (current as? GoshuinFaceController)?.faceIndex else { return nil }
    return face(faceIndex + 1)
  }

  func pageViewController(_ controller: UIPageViewController, willTransitionTo pending: [UIViewController]) {
    isTurning = true
    onBusyChange(["busy": true])
  }

  func pageViewController(_ controller: UIPageViewController, didFinishAnimating finished: Bool,
                          previousViewControllers: [UIViewController], transitionCompleted completed: Bool) {
    if completed,
       let left = controller.viewControllers?.compactMap({ $0 as? GoshuinFaceController }).min(by: { $0.faceIndex < $1.faceIndex }) {
      let index = left.faceIndex / 2
      if index != selectedIndex {
        selectedIndex = index
        requestedIndex = index
        onPageChange(["index": index])
      }
    }
    isTurning = false
    onBusyChange(["busy": false])
  }
}
