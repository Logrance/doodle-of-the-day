import ExpoModulesCore

public class DrawingCanvasModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DrawingCanvas")

    View(DrawingCanvasView.self) {
      AsyncFunction("clear") { (view: DrawingCanvasView) in
        view.clear()
      }
      AsyncFunction("makeImageSnapshot") { (view: DrawingCanvasView) -> String in
        return view.makeImageSnapshot()
      }
    }
  }
}
