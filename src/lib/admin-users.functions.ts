import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createAgentSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional(),
});

export const createAgentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createAgentSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: isAdmin, error: roleErr } = await context.supabase
      .rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create the auth user (auto-confirmed)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, phone: data.phone ?? null },
    });
    if (createErr) throw new Error(createErr.message);
    const newUserId = created.user?.id;
    if (!newUserId) throw new Error("Failed to create user");

    // handle_new_user trigger already inserted 'user' role + profile. Add 'agent' role.
    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "agent" });
    if (roleInsertErr) throw new Error(roleInsertErr.message);

    return { ok: true, userId: newUserId };
  });
