import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { Auth, UserCredential } from "firebase/auth";

import { createSession } from "./auth";
import { firebaseEmulatorHosts, getFirebaseWebConfig, useFirebaseEmulators } from "./firebase-config";

// The browser SDK is only used to prove who the person is. The server turns the
// resulting ID token into an httpOnly session cookie, so nothing is kept in
// browser storage (in-memory persistence) and the client user is signed out
// again straight after the exchange.

let clientAuth: Promise<Auth> | null = null;

function getClientAuth() {
  clientAuth ??= (async () => {
    const app = getApps()[0] ?? initializeApp(getFirebaseWebConfig());
    const auth = getAuth(app);
    if (useFirebaseEmulators) {
      connectAuthEmulator(auth, `http://${firebaseEmulatorHosts.auth}`, {
        disableWarnings: true,
      });
    }
    await setPersistence(auth, inMemoryPersistence);
    return auth;
  })();
  return clientAuth;
}

export type ClientAuthResult = { status: "authenticated" } | { status: "error"; message: string };

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
}

async function startServerSession(auth: Auth, credential: UserCredential): Promise<ClientAuthResult> {
  try {
    const idToken = await credential.user.getIdToken();
    const result = await createSession({ data: { idToken } });
    return result.ok
      ? { status: "authenticated" }
      : { status: "error", message: "Your session could not be started. Try again." };
  } finally {
    await signOut(auth);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<ClientAuthResult> {
  const auth = await getClientAuth();
  let credential: UserCredential;
  try {
    credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    if (errorCode(error) === "auth/too-many-requests") {
      return { status: "error", message: "Too many attempts. Wait a moment and try again." };
    }
    return { status: "error", message: "Email or password is incorrect." };
  }
  return startServerSession(auth, credential);
}

export async function registerWithEmail(email: string, password: string): Promise<ClientAuthResult> {
  const auth = await getClientAuth();
  let credential: UserCredential;
  try {
    credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  } catch {
    return {
      status: "error",
      message: "Account creation failed. Check your details or try signing in.",
    };
  }
  return startServerSession(auth, credential);
}

export async function signInWithGoogle(): Promise<ClientAuthResult> {
  const auth = await getClientAuth();
  let credential: UserCredential;
  try {
    credential = await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    const code = errorCode(error);
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return { status: "error", message: "Google sign-in was cancelled." };
    }
    return {
      status: "error",
      message: "Google sign-in is unavailable. Use email and password instead.",
    };
  }
  return startServerSession(auth, credential);
}
