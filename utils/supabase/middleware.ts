import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/utils/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Únicas rutas públicas del ERP: el login. El alta de usuarios es solo por
// invitación de un Administrador (Configuración > Usuarios), no hay registro
// público — ver docs/data-model/README.md y la decisión registrada en memoria
// de proyecto.
const RUTAS_PUBLICAS = ["/login"];

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() revalida el token contra Supabase Auth (a diferencia de
  // getSession(), que solo lee la cookie sin verificarla).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaPublica = RUTAS_PUBLICAS.includes(pathname);

  if (esRutaPublica && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!esRutaPublica && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
};
