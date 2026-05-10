import { getDoc, setDoc } from "firebase/firestore";
import { userDoc } from "./refs";
import type { User } from "../../types/domain";

export async function getUserProfile(userId: string): Promise<User | null> {
  const snap = await getDoc(userDoc(userId));
  return snap.exists() ? snap.data() : null;
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