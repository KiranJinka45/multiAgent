export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
            <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-white/10 border-t-blue-500 animate-spin" />
                <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-t-blue-500/50 animate-spin blur-sm" />
            </div>
        </div>
    );
}
