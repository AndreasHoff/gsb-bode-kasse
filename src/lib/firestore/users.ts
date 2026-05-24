import { getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { usersCol } from "./refs";
import { userDoc } from "./refs";
import type { User } from "../../types/domain";

export async function getUserProfile(userId: string): Promise<User | null> {
  const snap = await getDoc(userDoc(userId));
  return snap.exists() ? snap.data() : null;
}

export async function getUsers(): Promise<User[]> {
  const snap = await getDocs(usersCol());
  return snap.docs.map((doc) => doc.data());
}

export async function ensureUserProfile(
  input: Pick<User, "id" | "name" | "email" | "avatarUrl">,
): Promise<User> {
  const existing = await getUserProfile(input.id);

  if (existing) {
    return existing;
  }

  const user: User = {
    id: input.id,
    name: input.name,
    email: input.email,
    avatarUrl: input.avatarUrl,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userDoc(user.id), user);
  return user;
}

/** Updates the mutable fields of a user profile (currently: name). */
export async function updateUserProfile(
  userId: string,
  updates: Pick<User, "name">,
): Promise<void> {
  await updateDoc(userDoc(userId), { name: updates.name });
}