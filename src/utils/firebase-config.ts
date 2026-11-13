// Shared Firebase settings for the browser SDK and the server Admin SDK.
// In development the app talks to the local Firebase Emulator Suite by default,
// using a `demo-` project ID so no hosted project or secrets are needed.

const env = import.meta.env;

export const useFirebaseEmulators =
  env.VITE_FIREBASE_USE_EMULATORS === "true" ||
  (env.DEV && env.VITE_FIREBASE_USE_EMULATORS !== "false");

export const firebaseEmulatorHosts = {
  auth: env.VITE_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099",
  firestore: env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080",
};

function requireValue(name: string, value: unknown, emulatorDefault: string): string {
  if (typeof value === "string" && value.trim() !== "") return value;
  if (useFirebaseEmulators) return emulatorDefault;
  throw new Error(`${name} is not configured.`);
}

export function getFirebaseProjectId() {
  return requireValue("VITE_FIREBASE_PROJECT_ID", env.VITE_FIREBASE_PROJECT_ID, "demo-jualokal");
}

export function getFirebaseWebConfig() {
  const projectId = getFirebaseProjectId();
  return {
    apiKey: requireValue("VITE_FIREBASE_API_KEY", env.VITE_FIREBASE_API_KEY, "demo-api-key"),
    authDomain: requireValue(
      "VITE_FIREBASE_AUTH_DOMAIN",
      env.VITE_FIREBASE_AUTH_DOMAIN,
      `${projectId}.firebaseapp.com`,
    ),
    projectId,
    appId: env.VITE_FIREBASE_APP_ID || undefined,
  };
}
