import UIKit
import ExpoModulesCore

public final class DrawingCanvasView: ExpoView {
  private var backingImage: UIImage?
  private var currentPath: UIBezierPath?
  private var lastPoint: CGPoint = .zero

  private let strokeWidth: CGFloat = 5.0
  private let strokeColor: UIColor = .black
  private let bgColor: UIColor = .white

  required public init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    self.backgroundColor = bgColor
    self.isMultipleTouchEnabled = false
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
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
    currentPath = path
  }

  public override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard let touch = touches.first, let path = currentPath else { return }
    let current = touch.location(in: self)
    let mid = CGPoint(x: (lastPoint.x + current.x) / 2, y: (lastPoint.y + current.y) / 2)
    path.addQuadCurve(to: mid, controlPoint: lastPoint)
    lastPoint = current
    setNeedsDisplay()
  }

  public override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard let path = currentPath else { return }
    if let touch = touches.first { path.addLine(to: touch.location(in: self)) }
    // Tap detection: if path has essentially no movement, add a tiny line segment
    // so the stroke renderer produces a visible dot (round caps, same strokeWidth).
    if path.bounds.width < 2.0 && path.bounds.height < 2.0 {
      path.addLine(to: CGPoint(x: lastPoint.x + 0.001, y: lastPoint.y))
    }
    commitPath(path)
    currentPath = nil
    setNeedsDisplay()
  }

  public override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    currentPath = nil
    setNeedsDisplay()
  }

  public override func draw(_ rect: CGRect) {
    backingImage?.draw(in: bounds)
    guard let path = currentPath, let ctx = UIGraphicsGetCurrentContext() else { return }
    ctx.saveGState()
    strokeColor.setStroke()
    ctx.setLineWidth(strokeWidth)
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    path.stroke()
    ctx.restoreGState()
  }

  func clear() {
    createFreshBackingImage()
    currentPath = nil
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

  private func commitPath(_ path: UIBezierPath) {
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
