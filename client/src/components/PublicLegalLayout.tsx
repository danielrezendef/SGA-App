import logoImg from "@/assets/logo-sga-480.webp";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";

type PublicLegalLayoutProps = {
  title: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
};

export default function PublicLegalLayout({
  title,
  description,
  updatedAt,
  children,
}: PublicLegalLayoutProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | SGA App`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/login" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img
              src={logoImg}
              alt="SGA App"
              className="h-11 w-auto object-contain"
              width="132"
              height="88"
            />
            <span className="hidden border-l border-border pl-3 text-sm font-medium text-muted-foreground sm:block">
              Central de transparência
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao acesso
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60 bg-card">
          <div
            className="absolute inset-0 opacity-40"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--drf-gold) 25%, transparent), transparent 34%), radial-gradient(circle at 88% 10%, color-mix(in srgb, var(--drf-champagne) 40%, transparent), transparent 30%)",
            }}
          />
          <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              SGA App
            </div>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
            <p className="mt-5 text-sm text-muted-foreground">
              Última atualização: <time dateTime="2026-07-23">{updatedAt}</time>
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Documentos legais
            </p>
            <nav aria-label="Documentos legais" className="flex flex-col gap-1">
              <Link
                href="/politica-de-privacidade"
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/60"
              >
                Política de Privacidade
              </Link>
              <Link
                href="/termos-de-servico"
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/60"
              >
                Termos de Serviço
              </Link>
            </nav>
          </aside>

          <article className="legal-document min-w-0 rounded-2xl border border-border/70 bg-card px-5 py-7 shadow-sm sm:px-9 sm:py-10">
            {children}
          </article>
        </div>
      </main>

      <footer className="border-t border-border/70 bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} SGA App. Gestão de agendamentos com clareza e segurança.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/politica-de-privacidade" className="hover:text-foreground hover:underline">
              Privacidade
            </Link>
            <Link href="/termos-de-servico" className="hover:text-foreground hover:underline">
              Termos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
