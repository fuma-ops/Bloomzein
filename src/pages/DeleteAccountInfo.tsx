// Public account-deletion information page — satisfies the Google Play
// "provide a URL where users can request account & data deletion" requirement.
// Reachable without signing in.
import { Trash2, ShieldCheck, Mail, ArrowLeft } from "lucide-react";

export function DeleteAccountInfoPage() {
  return (
    <div className="min-h-screen bg-[#FFF0F6] text-rose">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-hotpink transition hover:opacity-80">
          <ArrowLeft className="h-4 w-4" /> Back to Bloomzein
        </a>

        <div className="mt-6 flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-magenta/10 text-magenta"><Trash2 className="h-7 w-7" strokeWidth={1.7} /></span>
          <div>
            <h1 className="text-[1.9rem] font-extrabold leading-tight text-[#7a1247]">Delete your account &amp; data</h1>
            <p className="text-sm font-semibold text-rose/70">Bloomzein — bloomzein.com</p>
          </div>
        </div>

        <div className="mt-6 space-y-5 rounded-[1.5rem] border border-petal/50 bg-white/80 p-6 shadow-sm">
          <section>
            <h2 className="text-[17px] font-extrabold text-hotpink">Delete it yourself, in a tap</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-rose/85">
              The fastest way to permanently delete your account is inside the app:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] leading-relaxed text-rose/85">
              <li>Open Bloomzein and sign in.</li>
              <li>Go to <b className="text-rose">Me</b> (bottom navigation).</li>
              <li>Scroll to the bottom and tap <b className="text-rose">“Delete my account”</b>.</li>
              <li>Type <b className="text-magenta">DELETE</b> to confirm.</li>
            </ol>
            <p className="mt-2 text-[13px] text-rose/70">Your account and data are erased immediately and you're signed out.</p>
          </section>

          <section>
            <h2 className="flex items-center gap-1.5 text-[17px] font-extrabold text-hotpink"><ShieldCheck className="h-4 w-4" /> What gets deleted</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-rose/85">
              Everything tied to your account is permanently removed: your profile, cycle data,
              meals &amp; nutrition, workouts &amp; yoga, mood &amp; journal entries, water &amp; medication logs,
              budget, reminders and notification subscriptions. This cannot be undone.
            </p>
            <p className="mt-1.5 text-[13px] text-rose/70">
              Note: any active Bloom+ subscription should be cancelled separately through the store
              you purchased it from (Google Play or the web), as billing is handled there.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-1.5 text-[17px] font-extrabold text-hotpink"><Mail className="h-4 w-4" /> Prefer we do it for you?</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-rose/85">
              If you can't access the app, email us from your account's email address and we'll
              delete your account and data within 30 days:
            </p>
            <a href="mailto:hello@bloomzein.com?subject=Delete%20my%20account" className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-hotpink px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110">
              <Mail className="h-4 w-4" /> hello@bloomzein.com
            </a>
          </section>
        </div>

        <p className="mt-6 text-center text-xs text-rose/50">
          See also our <a href="/privacy" className="font-semibold hover:text-hotpink">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
