import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4">
      <p className="text-muted-foreground text-sm">Forgot password flow coming soon.</p>
      <Link
        href="/login"
        className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
      >
        Back to login
      </Link>
    </div>
  );
}
