import { Brand } from "@/components/layout/brand";
import { common } from "@/messages/es-MX";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto grid min-h-dvh max-w-lg content-start gap-10 px-5 py-8 sm:py-14">
      <a href="#main-content" className="skip-link">
        {common.skipLink}
      </a>
      <header>
        <Brand />
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
