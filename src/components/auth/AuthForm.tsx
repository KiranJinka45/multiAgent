"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Github, Chrome } from "lucide-react";
import { userAuthSchema, userRegisterSchema, type UserAuthSchema, type UserRegisterSchema } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useSearchParams, useRouter } from "next/navigation";

type AuthMode = "login" | "register";

export function AuthForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = (searchParams.get("mode") === "register" ? "register" : "login") as AuthMode;
    const [isLoading, setIsLoading] = useState(false);

    // safe initialization
    const [supabase] = useState(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key || url.includes("YOUR_SUPABASE_URL")) {
            return null;
        }
        return createClientComponentClient();
    });

    // Login Form
    const loginForm = useForm<UserAuthSchema>({
        resolver: zodResolver(userAuthSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // Register Form
    const registerForm = useForm<UserRegisterSchema>({
        resolver: zodResolver(userRegisterSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    // Reset forms when mode changes
    useEffect(() => {
        loginForm.reset();
        registerForm.reset();
    }, [mode, loginForm, registerForm]);

    async function onLogin(data: UserAuthSchema) {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                console.error("Login error:", error.message);
                // TODO: Show toast notification
                return;
            }

            router.refresh();
            router.push("/");
        } catch (error) {
            console.error("Login error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function onRegister(data: UserRegisterSchema) {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (error) {
                console.error("Register error:", error.message);
                // TODO: Show toast notification
                return;
            }

            // TODO: Show success message (check email)
            console.log("Registration successful, check email");
        } catch (error) {
            console.error("Register error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const toggleMode = () => {
        const newMode = mode === "login" ? "register" : "login";
        const params = new URLSearchParams(searchParams.toString());
        if (newMode === "login") {
            params.delete("mode");
        } else {
            params.set("mode", "register");
        }
        router.push(`/login?${params.toString()}`);
    };

    const handleSocialLogin = async (provider: 'github' | 'google') => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (error) {
                console.error(`${provider} login error:`, error.message);
            }
        } catch (error) {
            console.error(`${provider} login error:`, error);
        } finally {
            // Note: effectively we redirect away so loading state might persist until unload
            // keeping it true avoids double clicks
        }
    };

    return (
        <div className="w-full max-w-md mx-auto relative z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl opacity-20 pointer-events-none rounded-full" />

            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
                <div className="text-center mb-8">
                    <motion.h1
                        key={mode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight"
                    >
                        {mode === "login" ? "Welcome Back" : "Create Account"}
                    </motion.h1>
                    <p className="text-neutral-400 mt-2 text-sm">
                        {mode === "login" ? "Enter your credentials to access your mission." : "Join the fleet and start your journey."}
                    </p>
                </div>

                {!supabase && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center">
                        Auth is not configured. Missing Supabase keys.
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {mode === "login" ? (
                        <motion.form
                            key="login"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={loginForm.handleSubmit(onLogin)}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    {...loginForm.register("email")}
                                    error={loginForm.formState.errors.email?.message}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Password"
                                    {...loginForm.register("password")}
                                    error={loginForm.formState.errors.password?.message}
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" disabled={isLoading || !supabase} className="w-full">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </Button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="register"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={registerForm.handleSubmit(onRegister)}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    {...registerForm.register("email")}
                                    error={registerForm.formState.errors.email?.message}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Password"
                                    {...registerForm.register("password")}
                                    error={registerForm.formState.errors.password?.message}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirm Password"
                                    {...registerForm.register("confirmPassword")}
                                    error={registerForm.formState.errors.confirmPassword?.message}
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" disabled={isLoading || !supabase} className="w-full">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign Up
                            </Button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#0a0a0a] px-2 text-neutral-500">
                            Or continue with
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" type="button" disabled={isLoading || !supabase} onClick={() => handleSocialLogin('github')}>
                        <Github className="mr-2 h-4 w-4" />
                        GitHub
                    </Button>
                    <Button variant="outline" type="button" disabled={isLoading || !supabase} onClick={() => handleSocialLogin('google')}>
                        <Chrome className="mr-2 h-4 w-4" />
                        Google
                    </Button>
                </div>

                <div className="mt-8 text-center text-sm">
                    <span className="text-neutral-400">
                        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                        onClick={toggleMode}
                        className="text-white hover:underline underline-offset-4 focus:outline-none font-medium transition-colors hover:text-blue-400"
                    >
                        {mode === "login" ? "Sign Up" : "Login"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Internal UI Components for Pro styling
// In a real app, these would be separate files in /components/ui

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <div className="relative">
                <input
                    className={cn(
                        "flex h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 text-white shadow-inner",
                        error && "border-red-500/50 focus-visible:ring-red-500/50",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <span className="text-xs text-red-400 mt-1 absolute -bottom-5 left-1">{error}</span>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline";
}

function Button({ className, variant = "default", ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-11 px-8 active:scale-[0.98]",
                variant === "default" && "bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_-10px_rgba(255,255,255,0.5)]",
                variant === "outline" && "border border-white/10 bg-transparent hover:bg-white/5 hover:text-white text-neutral-300",
                className
            )}
            {...props}
        />
    );
}
