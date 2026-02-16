import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden">
            {/* ... (background elements remain the same, but for brevity in replacement I will keep them if I can match larger block or just wrap the specific part) */}
            {/* Background Elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <div className="absolute top-8 left-8 z-50">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>
            </div>

            <main className="w-full px-4 relative z-10">
                <div className="mb-8 text-center">
                    <h2 className="text-xl font-semibold tracking-tight text-white/90">AntiGravity</h2>
                </div>
                <Suspense fallback={<div>Loading...</div>}>
                    <AuthForm />
                </Suspense>
            </main>
        </div>
    );
}
