import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
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
      const desiredCount = Math.min(90, Math.max(38, Math.floor((width * height) / 11000)));

      while (particles.length < desiredCount) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 1.8 + 1,
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

    const draw = () => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        if (!reduceMotion) {
          if (pointer.active) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            const interactionRadius = 135;

            if (distance > 0 && distance < interactionRadius) {
              const force = (interactionRadius - distance) / interactionRadius;
              particle.vx += (dx / distance) * force * 0.075;
              particle.vy += (dy / distance) * force * 0.075;
            }
          }

          particle.vx *= 0.992;
          particle.vy *= 0.992;
          particle.x += particle.vx;
          particle.y += particle.vy;

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
            context.strokeStyle = `rgba(251, 247, 239, ${(1 - distance / 105) * 0.22})`;
            context.lineWidth = 0.7;
            context.stroke();
          }
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(251, 247, 239, 0.72)";
        context.fill();
      });

      if (pointer.active) {
        const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 120);
        glow.addColorStop(0, "rgba(229, 209, 163, 0.16)");
        glow.addColorStop(1, "rgba(229, 209, 163, 0)");
        context.fillStyle = glow;
        context.fillRect(pointer.x - 120, pointer.y - 120, 240, 240);
      }

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

  const onLogin = (data: LoginForm) => loginMutation.mutate(data);
  const onRegister = (data: RegisterForm) => registerMutation.mutate({
    name: data.name,
    email: data.email,
    password: data.password,
  });

  const SocialButtons = () => (
    <div className="mt-6 space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
        </div>
      </div>

      {/* Google Login */}
      <Button
        variant="outline"
        className="w-full h-11 transition-all duration-300 hover:shadow-md hover:border-primary/50"
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
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left panel - decorative with sophisticated design */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2b2018 0%, #5d4633 52%, #8f6c35 100%)",
        }}
      >
        <InteractiveParticles />

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
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="flex justify-center -mt-4">
            <img
              src={logoImg}
              alt="SGA App Logo"
              className="h-60 w-auto object-contain"
              width="480"
              height="319"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <Card className="-mt-6 border-border/50 shadow-2xl shadow-primary/10 backdrop-blur-sm bg-card/95">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {mode === "login" ? "Seja Bem-vindo" : "Criar sua conta"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mode === "login" ? (
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="transition-all duration-300 focus:shadow-md focus:shadow-primary/20"
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
                        className="pr-10 transition-all duration-300 focus:shadow-md focus:shadow-primary/20"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                    className="w-full h-11 mt-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
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
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      className="transition-all duration-300 focus:shadow-md focus:shadow-primary/20"
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
                      className="transition-all duration-300 focus:shadow-md focus:shadow-primary/20"
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
                        className="pr-10 transition-all duration-300 focus:shadow-md focus:shadow-primary/20"
                        {...registerForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                      className="transition-all duration-300 focus:shadow-md focus:shadow-primary/20"
                      {...registerForm.register("confirmPassword")}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 mt-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
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

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>
                    Não tem conta?{" "}
                    <button
                      onClick={() => setMode("register")}
                      className="text-primary hover:underline font-medium transition-colors"
                    >
                      Criar agora
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <button
                      onClick={() => setMode("login")}
                      className="text-primary hover:underline font-medium transition-colors"
                    >
                      Entrar
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
