import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Corre en todo excepto assets estáticos y de Next.js internos, para que
  // cualquier ruta nueva de módulo (app/(app)/<modulo>/...) quede protegida
  // automáticamente sin tener que listar cada path a mano en el matcher.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
