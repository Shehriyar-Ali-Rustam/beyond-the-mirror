import { Logo } from "@/components/ui/logo";
import { AuthAside } from "@/components/auth/auth-aside";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-center text-xs text-ink-3 lg:text-left">
          Not an emergency service. If you are in danger, contact emergency services or a trusted adult now.
        </p>
      </div>
      <AuthAside />
    </div>
  );
}
