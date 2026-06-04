import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL =", url);
console.log("KEY EXISTS =", !!key);
console.log("KEY LENGTH =", key?.length);

export const supabase = createClient(url!, key!);