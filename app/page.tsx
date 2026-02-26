import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirige automáticamente a la pantalla de login apenas entran a la web
  redirect("/login");
}