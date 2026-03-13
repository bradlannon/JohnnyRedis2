/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CAMERA_WEBCAM_URL?: string
  readonly VITE_CAMERA_PI_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
