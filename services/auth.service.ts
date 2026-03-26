import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User,
  type UserCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";

import { AUTH_SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { auth, db, googleAuthProvider } from "@/lib/firebase";

const USERS_COLLECTION = "users";

export { AUTH_SESSION_COOKIE_NAME };

/** Firestore `users/{uid}` document shape (read). */
export type UserFirestoreDoc = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  deletedAt: Timestamp | null;
  createdAt: Timestamp | null;
  lastLogin: Timestamp | null;
};

/** Legacy / partial read shape. */
export type UserProfile = {
  email: string;
  deletedAt: Timestamp | null;
};

export class AccountDeactivatedError extends Error {
  readonly code = "app/account-deactivated";

  constructor(message = "Tài khoản đã bị vô hiệu hóa") {
    super(message);
    this.name = "AccountDeactivatedError";
  }
}

/**
 * Ensures a Firestore user doc exists (create if missing; never overwrite full doc).
 * New docs include `lastLogin` at creation time.
 * Blocks login if existing doc has soft-delete.
 */
export async function ensureUserDocumentAndAssertActive(
  user: User
): Promise<{ created: boolean }> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      deletedAt: null,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
    return { created: true };
  }

  const data = snapshot.data() as Partial<UserFirestoreDoc>;
  if (data.deletedAt != null) {
    await signOut(auth);
    throw new AccountDeactivatedError();
  }
  return { created: false };
}

/**
 * Updates `lastLogin` only after Firebase auth has already succeeded.
 * Skips when the user doc was just created (setDoc already set lastLogin).
 */
async function updateLastLoginAfterSuccessfulAuthentication(
  user: User,
  documentWasJustCreated: boolean
): Promise<void> {
  if (documentWasJustCreated) {
    return;
  }
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  await updateDoc(userRef, {
    lastLogin: serverTimestamp(),
  });
}

function clearAuthSessionCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${AUTH_SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Persists Firebase ID token in a cookie so middleware can gate routes.
 * Call after sign-in; pass null on sign-out.
 */
export async function persistAuthSessionCookie(user: User | null): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }
  if (!user) {
    clearAuthSessionCookie();
    return;
  }
  const idToken = await user.getIdToken();
  const maxAge = 60 * 60 * 24 * 7;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(idToken)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

/**
 * Email/password sign-in, ensure Firestore user, session cookie.
 */
export async function loginWithEmailAndProfileCheck(
  email: string,
  password: string
): Promise<UserCredential> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const { created } = await ensureUserDocumentAndAssertActive(credential.user);
  await updateLastLoginAfterSuccessfulAuthentication(credential.user, created);
  await persistAuthSessionCookie(credential.user);
  return credential;
}

/**
 * Google sign-in, same provisioning and cookie.
 */
export async function loginWithGoogleAndProfileCheck(): Promise<UserCredential> {
  const credential = await signInWithPopup(auth, googleAuthProvider);
  const { created } = await ensureUserDocumentAndAssertActive(credential.user);
  await updateLastLoginAfterSuccessfulAuthentication(credential.user, created);
  await persistAuthSessionCookie(credential.user);
  return credential;
}

export async function signOutUser(): Promise<void> {
  clearAuthSessionCookie();
  await signOut(auth);
}

/** `true` if the user can sign in with email + password (not Google-only). */
export function userHasPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

/**
 * Re-authenticate with current password, then set a new password.
 * Required for Firebase email/password accounts.
 */
export async function changePasswordWithCurrent(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error("Không tìm thấy tài khoản hoặc email.");
  }
  if (!userHasPasswordProvider(user)) {
    throw new Error(
      "Tài khoản đăng nhập bằng Google. Đổi mật khẩu trong tài khoản Google."
    );
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
  await persistAuthSessionCookie(user);
}

/** Snapshot of Firebase Auth fields needed in the UI (no Firebase types leaked to components). */
export type AuthUserSnapshot = {
  uid: string;
  displayName: string | null;
  email: string | null;
};

function mapFirebaseUser(user: User): AuthUserSnapshot {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
  };
}

/**
 * Subscribe to auth state: sync Firestore user doc, session cookie, then notify listener.
 */
export function subscribeAuthState(
  listener: (user: AuthUserSnapshot | null) => void
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      clearAuthSessionCookie();
      listener(null);
      return;
    }
    try {
      await ensureUserDocumentAndAssertActive(user);
      await persistAuthSessionCookie(user);
      listener(mapFirebaseUser(user));
    } catch {
      clearAuthSessionCookie();
      try {
        await signOut(auth);
      } catch {
        /* ignore */
      }
      listener(null);
    }
  });
}

/** Label for header: displayName, else email. */
export function getAuthDisplayLabel(
  displayName: string | null,
  email: string | null
): string {
  const name = displayName?.trim();
  if (name) {
    return name;
  }
  return email?.trim() ?? "";
}

export function getAuthAvatarInitials(
  displayName: string | null,
  email: string | null
): string {
  const dn = displayName?.trim();
  if (dn) {
    const parts = dn.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]?.[0];
      const b = parts[parts.length - 1]?.[0];
      if (a && b) {
        return `${a}${b}`.toUpperCase();
      }
    }
    return dn.slice(0, 2).toUpperCase();
  }
  const em = email?.trim();
  if (em) {
    return em.slice(0, 2).toUpperCase();
  }
  return "?";
}

export function mapLoginErrorToMessage(error: unknown): string {
  if (error instanceof AccountDeactivatedError) {
    return error.message;
  }
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "Email không hợp lệ.";
      case "auth/user-disabled":
        return "Tài khoản đã bị vô hiệu hóa.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Email hoặc mật khẩu không đúng.";
      case "auth/too-many-requests":
        return "Quá nhiều lần thử. Vui lòng thử lại sau.";
      case "auth/popup-closed-by-user":
        return "Đăng nhập đã bị hủy.";
      case "auth/popup-blocked":
        return "Trình duyệt đã chặn cửa sổ đăng nhập.";
      case "auth/account-exists-with-different-credential":
        return "Tài khoản đã tồn tại với phương thức đăng nhập khác.";
      case "auth/network-request-failed":
        return "Lỗi mạng. Kiểm tra kết nối.";
      default:
        return error.message || "Đăng nhập thất bại.";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Đã xảy ra lỗi. Vui lòng thử lại.";
}

/** Legacy name for generic Firebase auth errors (e.g. logout). */
export function mapFirebaseAuthError(error: unknown): string {
  return mapLoginErrorToMessage(error);
}

export function mapPasswordChangeError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Mật khẩu hiện tại không đúng.";
      case "auth/weak-password":
        return "Mật khẩu mới quá yếu. Dùng ít nhất 6 ký tự và kết hợp ký tự mạnh hơn.";
      case "auth/requires-recent-login":
        return "Phiên hết hạn. Đăng xuất và đăng nhập lại, rồi thử đổi mật khẩu.";
      case "auth/too-many-requests":
        return "Quá nhiều lần thử. Vui lòng thử lại sau.";
      case "auth/network-request-failed":
        return "Lỗi mạng. Kiểm tra kết nối.";
      default:
        return error.message || "Không thể đổi mật khẩu.";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Không thể đổi mật khẩu. Vui lòng thử lại.";
}
