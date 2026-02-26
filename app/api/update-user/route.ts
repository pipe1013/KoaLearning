import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: Request) {
  try {
    const { id, fullName, role } = await request.json();

    // Actualizamos su nombre y su nivel de permisos
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: fullName, role: role })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Usuario actualizado" }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ocurrió un error inesperado" }, { status: 400 });
  }
}