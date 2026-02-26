"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "../../src/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

// --- COMPONENTE DE LOGO: KOA LEARNING ---
const KoaLogo = () => (
  <div className="flex flex-col items-center justify-center mb-6">
    <div className="flex items-center gap-2.5 mb-1">
      {/* Texto Principal */}
      <span className="text-5xl font-black text-brand-navy tracking-tighter">Koa<span className="text-brand-green">.</span></span>
    </div>
    <span className="text-[11px] uppercase font-bold text-gray-400 tracking-[0.3em] ml-2">Learning</span>
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- 1. VALIDACIONES ELEGANTES ---
    if (!email) {
      return toast.error("Por favor, ingresa tu correo electrónico.");
    }

    // Expresión regular para verificar que el correo tenga un formato válido (ejemplo@dominio.com)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return toast.error("El formato del correo no es válido. Revisa que esté bien escrito.");
    }

    if (!password) {
      return toast.error("Por favor, ingresa tu contraseña.");
    }

    // --- 2. PROCESO DE LOGIN ---
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Contraseña o correo incorrectos. Intenta de nuevo.");
      setIsLoading(false);
    } else {
      toast.success("¡Bienvenido al portal!");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#f8fafc] overflow-hidden p-4">
      
      {/* --- FONDOS DECORATIVOS SUTILES --- */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-brand-green/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-brand-navy/5 rounded-full blur-[100px] pointer-events-none" />

      {/* --- TARJETA CENTRAL DE LOGIN --- */}
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-12 relative z-10 border border-gray-100/50 backdrop-blur-xl">
        
        <KoaLogo />
        
        <div className="text-center mb-8">
          <h2 className="text-lg font-bold text-brand-navy">Bienvenido de nuevo</h2>
          <p className="text-xs text-gray-500 mt-1">Ingresa tus credenciales para continuar</p>
        </div>

        {/* Agregamos noValidate para apagar las alertas feas del navegador */}
        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          
          {/* Campo Correo */}
          <div className="space-y-1.5">
            <label className="block text-[11px] uppercase font-bold text-gray-500 tracking-wider ml-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="ejemplo@koa.com"
              className="w-full px-5 py-3.5 border border-gray-200 rounded-xl outline-none bg-gray-50/50 focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/10 focus:bg-white transition-all cursor-text text-sm font-medium text-brand-navy placeholder:text-gray-400"
              disabled={isLoading}
            />
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5 relative">
            <label className="block text-[11px] uppercase font-bold text-gray-500 tracking-wider ml-1 mb-1.5">Contraseña</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••••••"
                className="w-full px-5 py-3.5 border border-gray-200 rounded-xl outline-none bg-gray-50/50 focus:border-brand-navy/30 focus:ring-4 focus:ring-brand-navy/5 focus:bg-white transition-all cursor-text text-sm font-medium text-brand-navy placeholder:text-gray-400 pr-12"
                disabled={isLoading}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-navy transition-colors cursor-pointer">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón Ingresar */}
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-brand-navy text-white font-bold py-4 rounded-xl cursor-pointer hover:bg-[#051b36] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 mt-4 text-sm uppercase tracking-wide flex justify-center items-center"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Validando...
              </span>
            ) : "Iniciar Sesión"}
          </button>
        </form>

        {/* --- MARCA DE AGUA / ÍCONO A TODO COLOR --- */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col items-center justify-center">
          
          <Image 
            src="/images/logoKoa.svg" 
            alt="Logo KOA" 
            width={120}
            height={40}
            className="h-8 w-auto object-contain mb-2" 
          />
          
          <p className="text-[9px] font-bold tracking-wider uppercase text-gray-400 text-center mt-1">
            © KOA C.F. S.A. Todos los derechos reservados
          </p>
        </div>

      </div>
    </div>
  );
}