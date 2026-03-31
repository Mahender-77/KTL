declare namespace NodeJS {
  interface ProcessEnv {
    /** Base URL of the KTL API (no trailing slash). Required for production builds. */
    EXPO_PUBLIC_API_URL?: string;
  }
}
