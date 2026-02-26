import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    // 1. Borramos su perfil de nuestra tabla pública
    await supabaseAdmin.from("profiles").delete().eq("id", id);
    
    // 2. Lo borramos del sistema de autenticación de Supabase
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ message: "Usuario eliminado" }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Error desconocido" }, { status: 400 });
  }
}