import { useEffect, useState } from "react";
import { ArrowLeft, Lock, RefreshCw, Reply, Mail, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppIcon } from "@/components/bloom/AppIcon";

/* ------------------------------------------------------------------ *
 * Private admin inbox — only the owner can see contact-form messages.
 *
 * Security is enforced in TWO places:
 *  1. Supabase RLS: only a signed-in user whose email == ADMIN_EMAIL can
 *     SELECT from contact_messages (see the SQL you run once). Even if
 *     someone opens /admin, the query returns nothing for them.
 *  2. This page only renders the inbox when the logged-in user's email
 *     matches ADMIN_EMAIL — otherwise it shows a locked screen.
 * ------------------------------------------------------------------ */

const ADMIN_EMAIL = "bloomzeinapp@gmail.com";

interface Msg {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  message: string;
}

export function AdminMessagesPage() {
  const { user, loading } = useAuth();
  const isAdmin = !!user && user.email === ADMIN_EMAIL;
  const [rows, setRows] = useState<Msg[]>([]);
  const [state, setState] = useState<"loading" | "denied" | "ready" | "error">("loading");

  const load = async () => {
    setState("loading");
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id, created_at, name, email, message")
      .order("created_at", { ascending: false });
    if (error) { setState("error"); return; }
    setRows((data ?? []) as Msg[]);
    setState("ready");
  };

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) { setState("denied"); return; }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin]);

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
    catch { return iso; }
  };
  const isNewsletter = (m: Msg) => m.message.toLowerCase().startsWith("newsletter signup");

  return (
    <div className="min-h-screen bg-[#FFF5F9] text-[#4a2338]">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9D5C7E] hover:text-[#EC4899] transition">
          <ArrowLeft className="h-4 w-4" /> Back to Bloomzein
        </a>

        <header className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppIcon size={40} />
            <div>
              <h1 className="font-script text-3xl text-[#831843] leading-none">Your inbox ✿</h1>
              <p className="mt-1 text-sm text-[#9D5C7E]">Messages from your contact form</p>
            </div>
          </div>
          {state === "ready" && (
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-[#F4C6DD] bg-white px-3 py-1.5 text-xs font-bold text-[#EC4899] hover:bg-[#FCE7F3] transition">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          )}
        </header>

        {/* ── states ── */}
        {(loading || state === "loading") && (
          <div className="mt-16 grid place-items-center"><div className="animate-pulse"><AppIcon size={40} /></div></div>
        )}

        {state === "denied" && (
          <div className="mt-10 rounded-3xl border border-[#F4C6DD] bg-white p-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FCE7F3] text-[#EC4899]"><Lock className="h-7 w-7" /></span>
            <h2 className="mt-3 font-script text-2xl text-[#831843]">This area is private</h2>
            <p className="mt-1 text-sm text-[#8a5c74]">
              {user ? "This account doesn't have access to the admin inbox." : "Please sign in with the admin account to view messages."}
            </p>
            <a href="/app/me" className="mt-4 inline-block rounded-full bg-[#EC4899] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#DB2777] transition">Go to your account</a>
          </div>
        )}

        {state === "error" && (
          <div className="mt-10 rounded-2xl border border-[#F4C6DD] bg-white p-5 text-center text-sm text-[#8a5c74]">
            Couldn't load messages. Make sure the <code>contact_messages</code> table and its admin read-policy exist, then tap Refresh.
          </div>
        )}

        {state === "ready" && (
          <div className="mt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#C4849F]">{rows.length} message{rows.length === 1 ? "" : "s"}</p>
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-[#F4C6DD] bg-white p-8 text-center text-sm text-[#8a5c74]">No messages yet — your inbox is calm ✿</div>
            ) : (
              <div className="space-y-3">
                {rows.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-[#F4C6DD] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-[#831843]">
                          {isNewsletter(m)
                            ? <><Bell className="h-3.5 w-3.5 text-[#EC4899]" /> Newsletter signup</>
                            : <>{m.name || "Someone"}</>}
                        </p>
                        {m.email && <p className="text-[12px] text-[#9D5C7E] break-all">{m.email}</p>}
                      </div>
                      <span className="shrink-0 text-[11px] text-[#C4849F]">{fmt(m.created_at)}</span>
                    </div>
                    {!isNewsletter(m) && <p className="mt-2 whitespace-pre-wrap text-[14px] text-[#5b3247]">{m.message}</p>}
                    {m.email && (
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Bloomzein ✿")}`}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#EC4899] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#DB2777] transition"
                      >
                        <Reply className="h-3.5 w-3.5" /> Reply
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-10 flex items-center justify-center gap-1.5 text-[11px] text-[#C4849F]">
          <Mail className="h-3 w-3" /> Only you can see this page.
        </p>
      </div>
    </div>
  );
}
