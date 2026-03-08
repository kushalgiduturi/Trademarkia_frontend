import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  updateProfile,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import type { AppUser } from "@/types";

// A palette of distinct, accessible colors for presence avatars
const PRESENCE_COLORS = [
  "#f87171", // red
  "#fb923c", // orange
  "#facc15", // yellow
  "#4ade80", // green
  "#34d399", // emerald
  "#22d3ee", // cyan
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#f472b6", // pink
  "#e879f9", // fuchsia
];

/** Assign a deterministic color from UID */
export function colorFromUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

export function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? "Anonymous",
    email: user.email,
    color: colorFromUid(user.uid),
    isAnonymous: user.isAnonymous,
  };
}

export async function signInWithGoogle(): Promise<AppUser> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return toAppUser(cred.user);
}

export async function signInAnon(displayName: string): Promise<AppUser> {
  const cred = await signInAnonymously(auth);
  await updateProfile(cred.user, { displayName });
  return toAppUser({ ...cred.user, displayName });
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onUser(callback: (user: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    callback(user ? toAppUser(user) : null);
  });
}
