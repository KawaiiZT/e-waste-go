/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEPOT_LAT?: string;
  readonly VITE_DEPOT_LNG?: string;
  readonly VITE_DEPOT_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
