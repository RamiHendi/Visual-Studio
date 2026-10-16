/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_APPS_SCRIPT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
