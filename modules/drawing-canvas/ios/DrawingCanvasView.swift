import UIKit
import ExpoModulesCore

public final class DrawingCanvasView: ExpoView {
  private var backingImage: UIImage?
  private var currentPath: UIBezierPath?
  private var lastPoint: CGPoint = .zero

  // GPU-accelerated layer for the in-progress stroke — avoids setNeedsDisplay on every event
  private let strokeLayer = CAShapeLayer()

  private let strokeWidth: CGFloat = 5.0
  private var strokeColor: UIColor = .black
  private let bgColor: UIColor = .white

  required public init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = bgColor
    isMultipleTouchEnabled = false

    strokeLayer.strokeColor = strokeColor.cgColor
    strokeLayer.fillColor = UIColor.clear.cgColor
    strokeLayer.lineWidth = strokeWidth
    strokeLayer.lineCap = .round
    strokeLayer.lineJoin = .round
    // Disable implicit path animation so updates are instant
    strokeLayer.actions = ["path": NSNull()]
    layer.addSublayer(strokeLayer)
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    strokeLayer.frame = bounds
    if backingImage == nil { createFreshBackingImage() }
  }

  public override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard let touch = touches.first else { return }
    let point = touch.location(in: self)
    lastPoint = point

    let path = UIBezierPath()
    path.lineWidth = strokeWidth
    path.lineCapStyle = .round
    path.lineJoinStyle = .round
    path.move(to: point)
    // Tiny stub so round caps render a dot the instant the finger lands
    path.addLine(to: CGPoint(x: point.x + 0.001, y: point.y))
    currentPath = path
    strokeLayer.path = path.cgPath
  }

  public override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard let touch = touches.first, let path = currentPath else { return }
    // Coalesced touches give all intermediate positions between display frames
    let allTouches = event?.coalescedTouches(for: touch) ?? [touch]
    for t in allTouches {
      let current = t.location(in: self)
      // Draw directly to the touch point — tracks the finger exactly
      path.addLine(to: current)
      lastPoint = current
    }
    strokeLayer.path = path.cgPath
  }

  public override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard let path = currentPath else { return }
    if let touch = touches.first { path.addLine(to: touch.location(in: self)) }
    commitStroke(path)
    currentPath = nil
    strokeLayer.path = nil
    setNeedsDisplay()
  }

  public override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    currentPath = nil
    strokeLayer.path = nil
    setNeedsDisplay()
  }

  public override func draw(_ rect: CGRect) {
    // The live stroke is handled by strokeLayer; just paint the committed image here.
    backingImage?.draw(in: bounds)
  }

  func setStrokeColor(_ hex: String) {
    strokeColor = UIColor(hex: hex) ?? .black
    strokeLayer.strokeColor = strokeColor.cgColor
  }

  func clear() {
    createFreshBackingImage()
    currentPath = nil
    strokeLayer.path = nil
    setNeedsDisplay()
  }

  func makeImageSnapshot() -> String {
    let renderer = UIGraphicsImageRenderer(bounds: bounds)
    let image = renderer.image { ctx in
      bgColor.setFill()
      ctx.fill(bounds)
      backingImage?.draw(in: bounds)
      if let path = currentPath {
        strokeColor.setStroke()
        ctx.cgContext.setLineWidth(strokeWidth)
        ctx.cgContext.setLineCap(.round)
        ctx.cgContext.setLineJoin(.round)
        path.stroke()
      }
    }
    return (image.pngData() ?? Data()).base64EncodedString()
  }

  private func commitStroke(_ path: UIBezierPath) {
    let renderer = UIGraphicsImageRenderer(bounds: bounds)
    backingImage = renderer.image { ctx in
      bgColor.setFill()
      ctx.fill(bounds)
      backingImage?.draw(in: bounds)
      strokeColor.setStroke()
      ctx.cgContext.setLineWidth(strokeWidth)
      ctx.cgContext.setLineCap(.round)
      ctx.cgContext.setLineJoin(.round)
      path.stroke()
    }
  }

  private func createFreshBackingImage() {
    guard bounds.size.width > 0, bounds.size.height > 0 else { return }
    let renderer = UIGraphicsImageRenderer(bounds: bounds)
    backingImage = renderer.image { ctx in
      bgColor.setFill()
      ctx.fill(bounds)
    }
  }
}

private extension UIColor {
  convenience init?(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    guard hex.count == 6 else { return nil }
    var int: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&int)
    self.init(
      red: CGFloat((int >> 16) & 0xFF) / 255,
      green: CGFloat((int >> 8) & 0xFF) / 255,
      blue: CGFloat(int & 0xFF) / 255,
      alpha: 1
    )
  }
}
