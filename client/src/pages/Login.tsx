import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useAppAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Calendar, Loader2, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import logoImg from "@/assets/logo-sga-480.webp";

// Google SDK types
interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (config: any) => void;
      renderButton: (element: HTMLElement, config: any) => void;
      prompt: () => void;
    };
  };
}

function getGoogleAccounts(): GoogleAccounts | undefined {
  return (window as any).google;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  drift: number;
  opacity: number;
};

function InteractiveParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const particles: Particle[] = [];
    const pointer = { x: 0, y: 0, active: false };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frameId = 0;

    const createParticles = () => {
      const desiredCount = Math.min(78, Math.max(34, Math.floor((width * height) / 13500)));

      while (particles.length < desiredCount) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          radius: Math.random() * 1.6 + 0.8,
          phase: Math.random() * Math.PI * 2,
          drift: Math.random() * 0.06 + 0.025,
          opacity: Math.random() * 0.28 + 0.38,
        });
      }
      particles.length = desiredCount;
    };

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createParticles();
    };

    const updatePointer = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
    };

    const clearPointer = () => {
      pointer.active = false;
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        if (!reduceMotion) {
          if (pointer.active) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            const interactionRadius = 115;

            if (distance > 0 && distance < interactionRadius) {
              const force = Math.pow((interactionRadius - distance) / interactionRadius, 2);
              particle.vx += (dx / distance) * force * 0.016;
              particle.vy += (dy / distance) * force * 0.016;
            }
          }

          particle.vx *= 0.996;
          particle.vy *= 0.996;
          particle.x += particle.vx + Math.cos(time * 0.00035 + particle.phase) * particle.drift;
          particle.y += particle.vy + Math.sin(time * 0.00028 + particle.phase) * particle.drift;

          if (particle.x < -10) particle.x = width + 10;
          if (particle.x > width + 10) particle.x = -10;
          if (particle.y < -10) particle.y = height + 10;
          if (particle.y > height + 10) particle.y = -10;
        }

        for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
          const other = particles[otherIndex];
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          if (distance < 105) {
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(other.x, other.y);
            context.strokeStyle = `rgba(251, 247, 239, ${(1 - distance / 105) * 0.14})`;
            context.lineWidth = 0.6;
            context.stroke();
          }
        }

        context.beginPath();
        const pulse = 0.88 + Math.sin(time * 0.0012 + particle.phase) * 0.12;
        context.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
        context.fillStyle = `rgba(251, 247, 239, ${particle.opacity * pulse})`;
        context.fill();
      });

      if (!reduceMotion) frameId = window.requestAnimationFrame(draw);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    container.addEventListener("pointermove", updatePointer);
    container.addEventListener("pointerleave", clearPointer);
    resize();
    draw();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", updatePointer);
      container.removeEventListener("pointerleave", clearPointer);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function ScheduleBackdrop() {
  const calendarDays = ["", "", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const [dateStep, setDateStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setDateStep(step => (step + 1) % 5), 2800);
    return () => window.clearInterval(interval);
  }, []);

  const selectedDay = String(8 + dateStep);
  const eventDay = 24 + dateStep;
  const rangeStart = String(8 + dateStep).padStart(2, "0");
  const rangeEnd = String(12 + dateStep).padStart(2, "0");

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-white" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path
          d="M-80 690 C 230 490, 390 780, 690 590 S 1110 340, 1520 520"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="8 14"
        />
        <path
          d="M-40 220 C 260 400, 440 90, 720 260 S 1110 480, 1490 190"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.55"
        />
      </svg>

      <div className="absolute -left-16 top-[12%] hidden h-64 w-64 rounded-full border border-white/15 bg-white/5 shadow-2xl backdrop-blur-[2px] sm:block">
        <div className="absolute inset-7 rounded-full border border-dashed border-white/25" />
        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 opacity-65">
          <span className="absolute left-1/2 top-2 h-2 w-px -translate-x-1/2 bg-white/45" />
          <span className="absolute bottom-2 left-1/2 h-2 w-px -translate-x-1/2 bg-white/45" />
          <span className="absolute left-2 top-1/2 h-px w-2 -translate-y-1/2 bg-white/45" />
          <span className="absolute right-2 top-1/2 h-px w-2 -translate-y-1/2 bg-white/45" />
          <span className="login-clock-hour absolute bottom-1/2 left-1/2 h-8 w-1 rounded-full bg-white/55" />
          <span className="login-clock-minute absolute bottom-1/2 left-1/2 h-11 w-0.5 rounded-full bg-white/70" />
          <span className="login-clock-second absolute bottom-1/2 left-1/2 h-12 w-px rounded-full bg-champagne/90" />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-lg" />
        </div>
      </div>

      <div className="absolute -right-10 bottom-[8%] hidden w-72 rotate-[-7deg] rounded-3xl border border-white/20 bg-white/8 p-5 shadow-2xl backdrop-blur-sm md:block">
        <div className="mb-4 flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-white/60">
            <Calendar className="h-4 w-4" />
            JULHO
          </div>
          <span className="text-[10px] text-white/40">2026</span>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[8px] font-medium text-white/35">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-white/55">
          {calendarDays.map((day, index) => (
            <span
              key={`${day}-${index}`}
              className={`flex aspect-square items-center justify-center rounded-full transition-all duration-700 ${day === selectedDay ? "scale-110 bg-white/25 text-white shadow-lg" : ""}`}
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute right-[11%] top-[10%] rotate-6 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 shadow-xl backdrop-blur-sm">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Próximo evento</p>
        <div className="mt-1 flex items-end gap-3">
          <span key={eventDay} className="login-date-tick text-3xl font-light text-white/70">{eventDay}</span>
          <span className="pb-1 text-xs text-white/45">18:30</span>
        </div>
      </div>

      <div className="absolute bottom-[13%] left-[10%] -rotate-6 rounded-2xl border border-white/15 bg-white/8 px-5 py-3 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 text-white/50">
          <Calendar className="h-5 w-5 stroke-[1.2]" />
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em]">Agenda</p>
            <p key={`${rangeStart}-${rangeEnd}`} className="login-date-tick text-sm font-light">{rangeStart} — {rangeEnd}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const { user, refetch, setUser } = useAppAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      setUser(data.user);
      await refetch();
      toast.success("Bem-vindo ao SGA App!");
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message || "Credenciais inválidas"),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      setUser(data.user);
      await refetch();
      toast.success("Conta criada com sucesso!");
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message || "Erro ao criar conta"),
  });

  const googleLoginMutation = trpc.auth.googleLogin.useMutation({
    onSuccess: async (data) => {
      setSocialLoading(null);
      setUser(data.user);
      await refetch();
      toast.success("Login com Google realizado com sucesso!");
      navigate("/dashboard");
    },
    onError: (err) => {
      setSocialLoading(null);
      toast.error(err.message || "Erro ao fazer login com Google");
    },
  });

  // Google Sign-In callback
  const handleGoogleCallback = useCallback((response: any) => {
    if (response.credential) {
      setSocialLoading("google");
      googleLoginMutation.mutate({
        credential: response.credential,
        clientId: GOOGLE_CLIENT_ID,
      });
    }
  }, [googleLoginMutation]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
      const google = getGoogleAccounts();
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    // Try immediately, or wait for script to load
    const google = getGoogleAccounts();
    if (google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        const g = getGoogleAccounts();
        if (g?.accounts?.id) {
          initGoogle();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [handleGoogleCallback]);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Handle Google button click
  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Login com Google não configurado. Configure o VITE_GOOGLE_CLIENT_ID.");
      return;
    }
    const google = getGoogleAccounts();
    if (google?.accounts?.id) {
      google.accounts.id.prompt();
    } else {
      toast.error("Google Sign-In ainda não carregou. Tente novamente.");
    }
  };

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const glassInputClass = "h-10 border-white/35 bg-white/80 text-espresso placeholder:text-umber/60 shadow-inner transition-all duration-300 focus-visible:border-white/80 focus-visible:ring-white/30";

  const onLogin = (data: LoginForm) => loginMutation.mutate(data);
  const onRegister = (data: RegisterForm) => registerMutation.mutate({
    name: data.name,
    email: data.email,
    password: data.password,
  });

  const SocialButtons = () => (
    <div className="mt-4 space-y-2.5">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="rounded-full bg-espresso/35 px-3 py-0.5 text-white/70 backdrop-blur-md">Ou continue com</span>
        </div>
      </div>

      {/* Google Login */}
      <Button
        variant="outline"
        className="h-10 w-full border-white/35 bg-white/10 text-white transition-all duration-300 hover:bg-white/20 hover:text-white hover:shadow-md"
        onClick={handleGoogleLogin}
        disabled={socialLoading !== null || !GOOGLE_CLIENT_ID}
        type="button"
      >
        {socialLoading === "google" ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        {socialLoading === "google" ? "Entrando com Google..." : "Continuar com Google"}
      </Button>

      {/* Hidden Google button for rendering */}
      <div ref={googleBtnRef} className="hidden" />
    </div>
  );

  return (
    <div className="relative flex h-dvh min-h-0 overflow-hidden">
      {/* Left panel - decorative with sophisticated design */}
      <div
        className="hidden"
        style={{
          background: "linear-gradient(135deg, #2b2018 0%, #5d4633 52%, #8f6c35 100%)",
        }}
      >
        {/* Content */}
        <div className="relative z-10 text-center text-white px-12 max-w-md">
            {/* <div className="flex justify-center -mt-12 mb-6">
              <img
                src={logoImg}
                alt="SGA App Logo"
                className="h-40 md:h-45 w-auto object-contain drop-shadow-2xl"
              />
            </div> */}
          <p className="text-lg sm:text-xl opacity-90 font-light leading-relaxed mb-12">
            Organize seus agendamentos com precisão e elegância
          </p>

          {/* Feature cards */}
          <div className="space-y-4">
            {[
              { icon: Calendar, label: "Agendamentos", desc: "Controle completo de eventos" },
              { icon: Clock, label: "Cronograma", desc: "Organização em tempo real" },
              { icon: BarChart3, label: "Dashboard", desc: "Indicadores e análises" },
              { icon: CheckCircle2, label: "Organização", desc: "Gestão simplificada" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div      
                  key={item.label}
                  className="bg-white/10 rounded-xl p-4 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all duration-300 hover:border-white/40 transform hover:scale-105"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs opacity-75 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div
        className="relative flex h-dvh min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5"
        style={{
          background: "linear-gradient(135deg, #665343 0%, #927657 52%, #c2a675 100%)",
        }}
      >
        <InteractiveParticles />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.20),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-espresso/15" />
        <ScheduleBackdrop />

        <div className="relative z-10 max-h-full w-full max-w-md">
          {/* Mobile logo */}
          <Card className="gap-3 border-white/30 bg-white/15 py-4 text-white shadow-2xl shadow-espresso/30 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/10">
            <CardHeader className="space-y-0 px-6 text-center">
              <CardTitle className="flex justify-center">
                <img
                  src={logoImg}
                  alt="SGA App Logo"
                  className="h-20 w-auto scale-110 object-contain drop-shadow-xl sm:h-24"
                  width="480"
                  height="319"
                  decoding="async"
                  fetchPriority="high"
                />
              </CardTitle>
              {mode === "register" && (
                <p className="text-sm text-white/70">Preencha os dados para começar</p>
              )}
            </CardHeader>
            <CardContent>
              {mode === "login" ? (
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className={glassInputClass}
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`${glassInputClass} pr-10`}
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-umber/70 transition-colors hover:text-espresso"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="mt-1 h-10 w-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      className={glassInputClass}
                      {...registerForm.register("name")}
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className={glassInputClass}
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`${glassInputClass} pr-10`}
                        {...registerForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-umber/70 transition-colors hover:text-espresso"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className={glassInputClass}
                      {...registerForm.register("confirmPassword")}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="mt-1 h-10 w-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </Button>
                </form>
              )}

              <SocialButtons />

              <div className="mt-4 text-center text-sm text-white/70">
                {mode === "login" ? (
                  <>
                    Não tem conta?{" "}
                    <button
                      onClick={() => setMode("register")}
                      className="font-medium text-champagne transition-colors hover:text-white hover:underline"
                    >
                      Criar agora
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <button
                      onClick={() => setMode("login")}
                      className="font-medium text-champagne transition-colors hover:text-white hover:underline"
                    >
                      Entrar
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <nav
            aria-label="Links legais"
            className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-white/65"
          >
            <Link href="/politica-de-privacidade" className="transition-colors hover:text-foreground hover:underline">
              Política de Privacidade
            </Link>
            <Link href="/termos-de-servico" className="transition-colors hover:text-foreground hover:underline">
              Termos de Serviço
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
