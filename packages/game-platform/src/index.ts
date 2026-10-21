export type { AudioChannel, AudioPort } from './interfaces/Audio.js'
export type { HapticPattern, Haptics } from './interfaces/Haptics.js'
export type { InputSource } from './interfaces/Input.js'
export type { Lifecycle } from './interfaces/Lifecycle.js'
export type { Storage } from './interfaces/Storage.js'
export { DocumentLifecycle, NoopLifecycle } from './web/DocumentLifecycle.js'
export { KeyboardInputSource } from './web/KeyboardInput.js'
export { LocalStorageAdapter } from './web/LocalStorage.js'
export type { StickOrigin, StickPoint, TouchButton } from './web/TouchInput.js'
export {
  buttonsToInput,
  isPortrait,
  MIN_TOUCH_TARGET_PX,
  STICK_RADIUS_PX,
  stickAxis,
  TOUCH_BUTTONS,
  TouchInputSource,
  wantsTouchControls,
} from './web/TouchInput.js'
export { VibrationHaptics } from './web/Vibration.js'
export { WebAudioAdapter } from './web/WebAudio.js'
