import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 1. Ahora también recibimos el 'role' desde tu Dashboard
    const { email, password, fullName, role } = await request.json();

    // 2. Por seguridad, nos aseguramos de que solo pueda ser admin o viewer
    const userRole = role === 'admin' ? 'admin' : 'viewer';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, 
    });

    if (authError) throw authError;

    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            full_name: fullName,
            role: userRole, // 3. Guardamos el rol que tú elegiste
          },
        ]);

      if (profileError) throw profileError;
    }

    return NextResponse.json({ message: "Usuario creado exitosamente" }, { status: 200 });

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ocurrió un error inesperado al crear el usuario." }, { status: 400 });
  }
}