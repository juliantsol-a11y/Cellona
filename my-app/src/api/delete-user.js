import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { adminEmail, userId } = req.body;

    if (adminEmail !== "admin@gmail.com") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: "User deleted successfully" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}