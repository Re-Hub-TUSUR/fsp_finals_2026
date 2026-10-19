/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_2GIS_KEY?: string;
  readonly VITE_2GIS_STYLE_ID?: string;
  readonly VITE_2GIS_STYLE_ID_DARK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
