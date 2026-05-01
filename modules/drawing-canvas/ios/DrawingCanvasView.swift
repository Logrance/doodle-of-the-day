import UIKit
import ExpoModulesCore

public final class DrawingCanvasView: ExpoView {
  private var backingImage: UIImage?
  private var currentPath: UIBezierPath?
  private var lastPoint: CGPoint = .zero
  private var hasMoved: Bool = false

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
    hasMoved = false

    let path = UIBezierPath()
    path.lineWidth = strokeWidth
    path.lineCapStyle = .round
    path.lineJoinStyle = .round
    path.move(to: point)
    // Tiny stub so a held-down finger shows immediate feedback;
    // overwritten in touchesEnded if it turns out to be a pure tap.
    path.addLine(to: CGPoint(x: point.x + 0.001, y: point.y))
    currentPath = path
    strokeLayer.path = path.cgPath
  }

  public override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard let touch = touches.first, let path = currentPath else { return }
    hasMoved = true

    // Real coalesced touches mutate the persistent path with midpoint
    // quadratic smoothing — the same shape Android's Skia path uses.
    let allTouches = event?.coalescedTouches(for: touch) ?? [touch]
    for t in allTouches {
      let current = t.location(in: self)
      let mid = CGPoint(x: (lastPoint.x + current.x) / 2,
                        y: (lastPoint.y + current.y) / 2)
      path.addQuadCurve(to: mid, controlPoint: lastPoint)
      lastPoint = current
    }

    // Predicted touches extend a *copy* of the path so they render as a
    // transient leading edge. When the next touchesMoved arrives, the
    // real coalesced touches replace these predictions.
    let displayPath = path.copy() as! UIBezierPath
    var predLast = lastPoint
    let predicted = event?.predictedTouches(for: touch) ?? []
    for t in predicted {
      let current = t.location(in: self)
      let mid = CGPoint(x: (predLast.x + current.x) / 2,
                        y: (predLast.y + current.y) / 2)
      displayPath.addQuadCurve(to: mid, controlPoint: predLast)
      predLast = current
    }
    strokeLayer.path = displayPath.cgPath
  }

  public override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    if !hasMoved, let touch = touches.first {
      // A pure tap — render an irregular spec instead of the round-cap dot.
      let spec = makeIrregularSpec(at: touch.location(in: self),
                                   majorRadius: touch.majorRadius)
      commitFilled(spec)
    } else if let path = currentPath, let touch = touches.first {
      let current = touch.location(in: self)
      let mid = CGPoint(x: (lastPoint.x + current.x) / 2,
                        y: (lastPoint.y + current.y) / 2)
      path.addQuadCurve(to: mid, controlPoint: lastPoint)
      commitStroke(path)
    }
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

  private func makeIrregularSpec(at point: CGPoint, majorRadius: CGFloat) -> UIBezierPath {
    // A small off-axis ellipse with random width/height/rotation so each tap
    // looks hand-placed rather than mathematically perfect.
    let baseRadius = majorRadius > 1 ? majorRadius * 0.55 : strokeWidth * 0.55
    let halfW = baseRadius * CGFloat.random(in: 0.75...1.3)
    let halfH = baseRadius * CGFloat.random(in: 0.75...1.3)
    let rect = CGRect(x: point.x - halfW, y: point.y - halfH,
                      width: halfW * 2, height: halfH * 2)
    let path = UIBezierPath(ovalIn: rect)
    let rotation = CGFloat.random(in: -0.4...0.4)
    var transform = CGAffineTransform(translationX: point.x, y: point.y)
    transform = transform.rotated(by: rotation)
    transform = transform.translatedBy(x: -point.x, y: -point.y)
    path.apply(transform)
    return path
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

  private func commitFilled(_ path: UIBezierPath) {
    let renderer = UIGraphicsImageRenderer(bounds: bounds)
    backingImage = renderer.image { ctx in
      bgColor.setFill()
      ctx.fill(bounds)
      backingImage?.draw(in: bounds)
      strokeColor.setFill()
      path.fill()
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
