import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yewmxiwqdwsbwwpbroht.supabase.co";
const supabaseAnonKey = "sb_publishable_1eZ5Al1yQG_OTus62L-dkQ_So1ido0P";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);