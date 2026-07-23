import logoImg from "@/assets/logo-sga-480.webp";
import { useAppAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";

const features = [
  {
    icon: CalendarCheck2,
    title: "Agendamentos organizados",
    description:
      "Centralize datas, horários, clientes e detalhes de cada evento em um único lugar.",
  },
  {
    icon: BarChart3,
    title: "Visão clara da operação",
    description:
      "Acompanhe compromissos e indicadores em um painel criado para facilitar decisões.",
  },
  {
    icon: FileText,
    title: "Contratos e informações",
    description:
      "Mantenha os dados importantes do atendimento acessíveis para a sua equipe.",
  },
  {
    icon: Users,
    title: "Gestão de usuários",
    description:
      "Organize o acesso da equipe e concentre o trabalho no mesmo ambiente seguro.",
  },
];

export default function Home() {
  const { user } = useAppAuth();

  useEffect(() => {
    document.title = "SGA App | Gestão de agendamentos";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-6 px-4 py-2 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Página inicial do SGA App"
          >
            <img
              src={logoImg}
              alt="SGA App"
              className="h-12 w-auto object-contain"
              width="144"
              height="96"
            />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex" aria-label="Navegação principal">
            <a href="#recursos" className="transition-colors hover:text-foreground">
              Recursos
            </a>
            <a href="#google-agenda" className="transition-colors hover:text-foreground">
              Google Agenda
            </a>
            <Link href="/politica-de-privacidade" className="transition-colors hover:text-foreground">
              Privacidade
            </Link>
          </nav>

          <Link
            href={user ? "/dashboard" : "/login"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {user ? "Ir ao painel" : "Acessar o SGA App"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-border/60">
          <div
            className="absolute inset-0 -z-10"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--drf-champagne) 60%, transparent), transparent 34%), radial-gradient(circle at 12% 82%, color-mix(in srgb, var(--drf-gold) 18%, transparent), transparent 32%)",
            }}
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-32">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Gestão simples e eficiente
              </div>
              <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">
                Seus agendamentos,
                <span className="block text-primary">todos no lugar certo.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                O <strong className="font-semibold text-foreground">SGA App</strong> é uma
                plataforma de gestão de agendamentos que ajuda empresas a organizar eventos,
                clientes, contratos, equipe e compromissos em um só ambiente.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={user ? "/dashboard" : "/login"}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {user ? "Acessar meu painel" : "Entrar na plataforma"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card/80 px-6 font-semibold transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Conhecer o SGA App
                </a>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                A integração com o Google Agenda é opcional e controlada por você.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-primary/10 blur-2xl" />
              <div className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card p-5 shadow-2xl shadow-espresso/10 sm:p-7">
                <div className="flex items-center justify-between border-b border-border/70 pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Visão do dia
                    </p>
                    <p className="mt-1 font-serif text-2xl font-semibold">Tudo organizado</p>
                  </div>
                  <div className="rounded-xl bg-primary/15 p-3">
                    <CalendarCheck2 className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ["Agenda centralizada", "Eventos e compromissos"],
                    ["Informações completas", "Clientes e contratos"],
                    ["Equipe alinhada", "Acessos organizados"],
                  ].map(([title, description]) => (
                    <div
                      key={title}
                      className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/70 p-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="h-4 w-4 text-primary" />
                      </span>
                      <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="border-b border-border/60 bg-card py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Finalidade do aplicativo
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                  Menos tarefas dispersas. Mais controle.
                </h2>
              </div>
              <p className="text-lg leading-8 text-muted-foreground">
                O SGA App foi criado para apoiar a rotina de empresas que trabalham com
                agendamentos e eventos. A plataforma reúne o acompanhamento do serviço — da
                organização inicial ao compromisso confirmado — e reduz a dependência de
                anotações e ferramentas separadas.
              </p>
            </div>
          </div>
        </section>

        <section id="recursos" className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Recursos
              </p>
              <h2 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">
                A operação em uma visão única
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Informações essenciais para trabalhar com mais clareza, consistência e
                agilidade.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg sm:p-7"
                  >
                    <div className="mb-5 inline-flex rounded-xl bg-primary/15 p-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-serif text-2xl font-semibold">{feature.title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="google-agenda" className="border-y border-border/60 bg-espresso py-16 text-ivory sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
            <div>
              <div className="inline-flex rounded-2xl bg-gold/20 p-4">
                <CalendarCheck2 className="h-8 w-8 text-gold-light" />
              </div>
              <h2 className="mt-6 font-serif text-4xl font-semibold sm:text-5xl">
                Integração opcional com o Google Agenda
              </h2>
            </div>
            <div className="space-y-5 text-base leading-7 text-champagne sm:text-lg sm:leading-8">
              <p>
                Se o usuário escolher conectar sua conta Google, o SGA App solicita acesso
                para listar as agendas disponíveis e criar ou atualizar eventos na agenda
                selecionada pelo próprio usuário.
              </p>
              <p>
                A conexão pode ser removida pelo perfil a qualquer momento. O SGA App não
                importa nem exibe eventos preexistentes da agenda e não compartilha esses
                dados para publicidade.
              </p>
              <Link
                href="/politica-de-privacidade"
                className="inline-flex items-center gap-2 font-semibold text-gold-light underline decoration-gold-light/40 underline-offset-4 hover:decoration-gold-light"
              >
                Saiba como tratamos seus dados
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              SGA App
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">
              Pronto para organizar sua rotina?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              Acesse sua conta e concentre a gestão dos seus agendamentos em um ambiente
              simples e seguro.
            </p>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {user ? "Ir ao painel" : "Acessar o SGA App"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} SGA App. Plataforma de gestão de agendamentos.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Links institucionais">
            <Link href="/politica-de-privacidade" className="hover:text-foreground hover:underline">
              Política de Privacidade
            </Link>
            <Link href="/termos-de-servico" className="hover:text-foreground hover:underline">
              Termos de Serviço
            </Link>
            <Link href="/login" className="hover:text-foreground hover:underline">
              Acessar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
