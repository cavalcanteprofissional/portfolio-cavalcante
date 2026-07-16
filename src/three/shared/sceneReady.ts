let _ready = false;
const _listeners: Set<() => void> = new Set();

export function onSceneReady(cb: () => void) {
  if (_ready) {
    cb();
  } else {
    _listeners.add(cb);
  }
}

export function setSceneReady() {
  if (_ready) return;
  _ready = true;
  _listeners.forEach(cb => cb());
  _listeners.clear();
}
