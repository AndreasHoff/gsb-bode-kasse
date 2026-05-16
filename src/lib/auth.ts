import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  if (name.trim().length > 0) {
    await updateProfile(result.user, { displayName: name.trim() });
  }

  return result.user;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
