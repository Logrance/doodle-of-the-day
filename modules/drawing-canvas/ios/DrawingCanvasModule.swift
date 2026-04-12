import ExpoModulesCore

public class DrawingCanvasModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DrawingCanvas")

    View(DrawingCanvasView.self) {
      Prop("strokeColor") { (view: DrawingCanvasView, hex: String) in
        view.setStrokeColor(hex)
      }

      AsyncFunction("clear") { (view: DrawingCanvasView) in
        view.clear()
      }
      AsyncFunction("makeImageSnapshot") { (view: DrawingCanvasView) -> String in
        return view.makeImageSnapshot()
      }
    }
  }
}
