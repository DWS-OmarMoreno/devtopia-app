"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { tienePermiso as checkPermiso, type Accion, type Modulo, type PermisoRow } from "@/lib/rbac";
import type { Tables } from "@/utils/database.types";

const supabase = createClient();

interface UsuarioSesion {
  id: string;
  email?: string;
}

interface UserContextType {
  user: UsuarioSesion | null;
  perfil: Tables<"perfiles_usuario"> | null;
  rol: Tables<"roles"> | null;
  empresa: Tables<"empresas"> | null;
  permisos: PermisoRow[];
  loading: boolean;
  isAuthenticated: boolean;
  /** Solo para decidir qué mostrar en la UI — RLS es la autoridad real. */
  tienePermiso: (modulo: Modulo, accion: Accion, sublista?: string) => boolean;
  refrescarPerfil: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UsuarioSesion | null>(null);
  const [perfil, setPerfil] = useState<Tables<"perfiles_usuario"> | null>(null);
  const [rol, setRol] = useState<Tables<"roles"> | null>(null);
  const [empresa, setEmpresa] = useState<Tables<"empresas"> | null>(null);
  const [permisos, setPermisos] = useState<PermisoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const limpiarPerfil = () => {
    setPerfil(null);
    setRol(null);
    setEmpresa(null);
    setPermisos([]);
  };

  const cargarPerfil = useCallback(async (userId: string) => {
    const { data: perfilData } = await supabase
      .from("perfiles_usuario")
      .select("*")
      .eq("id", userId)
      .single();

    if (!perfilData) {
      limpiarPerfil();
      return;
    }

    setPerfil(perfilData);

    const [{ data: rolData }, { data: permisosData }, { data: empresaData }] = await Promise.all([
      supabase.from("roles").select("*").eq("id", perfilData.rol_id).single(),
      supabase.from("permisos").select("*").eq("rol_id", perfilData.rol_id),
      supabase.from("empresas").select("*").eq("id", perfilData.empresa_id).single(),
    ]);

    setRol(rolData ?? null);
    setPermisos(permisosData ?? []);
    setEmpresa(empresaData ?? null);
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        setUser(null);
        limpiarPerfil();
        setLoading(false);
        return;
      }

      setUser({ id: session.user.id, email: session.user.email });
      await cargarPerfil(session.user.id);
      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
        cargarPerfil(session.user.id);
      } else {
        setUser(null);
        limpiarPerfil();
      }
    });

    return () => subscription.unsubscribe();
  }, [cargarPerfil]);

  const tienePermisoFn = useCallback(
    (modulo: Modulo, accion: Accion, sublista?: string) =>
      checkPermiso(permisos, modulo, accion, sublista),
    [permisos]
  );

  const refrescarPerfil = useCallback(async () => {
    if (user) await cargarPerfil(user.id);
  }, [user, cargarPerfil]);

  return (
    <UserContext.Provider
      value={{
        user,
        perfil,
        rol,
        empresa,
        permisos,
        loading,
        isAuthenticated: !!user,
        tienePermiso: tienePermisoFn,
        refrescarPerfil,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return !error;
};
