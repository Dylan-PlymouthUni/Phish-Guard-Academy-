declare module "redux" {
  // Minimal shims so Recharts' type definitions compile.
  export interface EmptyObject {
    // You can tighten this later if you actually use Redux.
    // For now it just needs to exist.
  }

  export interface CombinedState<S> extends EmptyObject {
    // In real redux types this is more detailed; we only need the name.
  }
}
