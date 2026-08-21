import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const FORMATO_USUARIO = /^[a-z0-9_]{3,20}$/;
const DOMINIO_SINTETICO = "nexo.local";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const clienteLlamante = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await clienteLlamante.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: "No autorizado" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: esDuenoRows } = await admin
      .from("usuarios_negocio")
      .select("rol")
      .eq("usuario_id", userData.user.id)
      .eq("rol", "dueño")
      .limit(1);

    if (!esDuenoRows || esDuenoRows.length === 0) {
      return jsonResponse({ error: "Solo un dueño puede administrar usuarios" }, 403);
    }

    const body = await req.json();
    const accion = body.accion;

    if (accion === "crear") {
      const { usuario, nombre_completo, password, accesos } = body;

      if (!usuario || !FORMATO_USUARIO.test(usuario)) {
        return jsonResponse(
          { error: "Usuario inválido: minúsculas, números o guión bajo, 3 a 20 caracteres." },
          400,
        );
      }
      if (!password || password.length < 6) {
        return jsonResponse({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
      }
      if (!Array.isArray(accesos) || accesos.length === 0) {
        return jsonResponse({ error: "Elige al menos un negocio." }, 400);
      }

      const email = `${usuario}@${DOMINIO_SINTETICO}`;

      const { data: nuevoUsuario, error: crearError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (crearError || !nuevoUsuario.user) {
        return jsonResponse({ error: crearError?.message ?? "No se pudo crear el usuario." }, 400);
      }

      const nuevoId = nuevoUsuario.user.id;

      const { error: perfilError } = await admin.from("perfiles").insert({
        usuario_id: nuevoId,
        usuario,
        nombre_completo: nombre_completo ?? null,
      });

      if (perfilError) {
        await admin.auth.admin.deleteUser(nuevoId);
        return jsonResponse({ error: perfilError.message }, 400);
      }

      const filasAcceso = accesos.map((a: { negocio_id: string; rol: string }) => ({
        usuario_id: nuevoId,
        negocio_id: a.negocio_id,
        rol: a.rol,
      }));

      const { error: accesoError } = await admin.from("usuarios_negocio").insert(filasAcceso);

      if (accesoError) {
        await admin.auth.admin.deleteUser(nuevoId);
        return jsonResponse({ error: accesoError.message }, 400);
      }

      return jsonResponse({ usuario_id: nuevoId }, 200);
    }

    if (accion === "listar") {
      const { data: perfiles, error: perfilesError } = await admin
        .from("perfiles")
        .select("usuario_id, usuario, nombre_completo");

      if (perfilesError) return jsonResponse({ error: perfilesError.message }, 400);

      const { data: accesos, error: accesosError } = await admin
        .from("usuarios_negocio")
        .select("usuario_id, rol, negocios(id, nombre)");

      if (accesosError) return jsonResponse({ error: accesosError.message }, 400);

      const usuarios = (perfiles ?? []).map((p: { usuario_id: string; usuario: string; nombre_completo: string | null }) => ({
        usuario_id: p.usuario_id,
        usuario: p.usuario,
        nombre_completo: p.nombre_completo,
        accesos: (accesos ?? [])
          .filter((a: { usuario_id: string }) => a.usuario_id === p.usuario_id)
          .map((a: { rol: string; negocios: { id: string; nombre: string } | null }) => ({
            negocio_id: a.negocios?.id,
            negocio_nombre: a.negocios?.nombre,
            rol: a.rol,
          })),
      }));

      return jsonResponse({ usuarios }, 200);
    }

    if (accion === "resetear_password") {
      const { usuario_id, password_nueva } = body;
      if (!usuario_id || !password_nueva || password_nueva.length < 6) {
        return jsonResponse({ error: "Datos inválidos." }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(usuario_id, { password: password_nueva });
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ ok: true }, 200);
    }

    if (accion === "revocar_acceso") {
      const { usuario_id, negocio_id } = body;
      if (!usuario_id || !negocio_id) return jsonResponse({ error: "Datos inválidos." }, 400);
      const { error } = await admin
        .from("usuarios_negocio")
        .delete()
        .eq("usuario_id", usuario_id)
        .eq("negocio_id", negocio_id);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ ok: true }, 200);
    }

    return jsonResponse({ error: "Acción no reconocida." }, 400);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
