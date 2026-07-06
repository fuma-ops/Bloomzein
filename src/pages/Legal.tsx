import { ArrowLeft } from "lucide-react";
import { AppIcon } from "@/components/bloom/AppIcon";

/* ------------------------------------------------------------------ *
 * Legal pages — Privacy Policy & Terms of Service.
 *
 * NOTE FOR LAUNCH: search for the [BRACKETED] placeholders below and
 * replace them with your real details before going live:
 *   [Company / legal entity]  ·  [Country/State jurisdiction]
 *   [contact email]  ·  [Supabase hosting region]
 * Then have the final text reviewed by a lawyer — this is a solid,
 * GDPR-aware starting point, not certified legal advice.
 * ------------------------------------------------------------------ */

const LAST_UPDATED = "July 6, 2026";
const CONTACT_EMAIL = "bloomzeinapp@gmail.com"; // [contact email]
const ENTITY = "Bloom & Zein"; // [Company / legal entity]

function LegalShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFF5F9] text-[#4a2338]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9D5C7E] hover:text-[#EC4899] transition">
          <ArrowLeft className="h-4 w-4" /> Back to Bloom &amp; Zein
        </a>
        <header className="mt-6 flex items-center gap-3">
          <AppIcon size={44} />
          <div>
            <h1 className="font-script text-3xl sm:text-4xl text-[#831843] leading-none">{title}</h1>
            <p className="mt-1 text-sm text-[#9D5C7E]">{subtitle}</p>
          </div>
        </header>
        <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[#C4849F]">Last updated · {LAST_UPDATED}</p>
        <div className="prose-legal mt-8 space-y-7 text-[14.5px] leading-relaxed text-[#5b3247]">{children}</div>
        <footer className="mt-12 border-t border-[#F4C6DD] pt-6 text-xs text-[#9D5C7E]">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="/privacy" className="font-semibold hover:text-[#EC4899]">Privacy Policy</a>
            <a href="/terms" className="font-semibold hover:text-[#EC4899]">Terms of Service</a>
            <a href="/" className="hover:text-[#EC4899]">Home</a>
          </div>
          <p className="mt-3">© {new Date().getFullYear()} {ENTITY}. Made with care for your softest era. ✿</p>
        </footer>
      </div>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-script text-2xl text-[#EC4899] leading-tight">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2">{children}</p>;
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-[#EC4899]">{children}</ul>;
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" subtitle="How we handle your data — plainly.">
      <section>
        <P>
          {ENTITY} (“we”, “us”) provides a wellness app for tracking your cycle, movement, nutrition,
          mood and more. This policy explains what we collect, why, and the choices you have. We built
          Bloom &amp; Zein to keep your data yours — we never sell it.
        </P>
        <P>
          The data controller is <b>{ENTITY}</b> [Company / legal entity], reachable at{" "}
          <a className="font-semibold text-[#EC4899]" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </P>
      </section>

      <section>
        <H>Sensitive health data &amp; your consent</H>
        <P>
          Some of what you log — menstrual cycle, symptoms, weight, mood, medication and dietary
          information — is “special category” health data under GDPR Article&nbsp;9. We process it
          <b> only with your explicit consent</b>, which you give when you create an account and can
          withdraw at any time by deleting your data or your account. We do not use this data for
          advertising or profiling, and we never share it with third parties for their own purposes.
        </P>
      </section>

      <section>
        <H>What we collect</H>
        <Ul>
          <li><b>Account data:</b> your email address, and (if you choose Google sign-in) the basic profile Google returns.</li>
          <li><b>Profile data:</b> optional details you enter such as name, age and weight.</li>
          <li><b>Wellness data you log:</b> cycle dates &amp; symptoms, workouts, meals &amp; diet preferences, mood, notes, budget entries, reminders and medication logs.</li>
          <li><b>Device &amp; technical data:</b> minimal data needed to run the app (e.g. push-notification tokens if you enable reminders). We do <b>not</b> run third-party advertising or analytics trackers.</li>
        </Ul>
      </section>

      <section>
        <H>How we use it</H>
        <Ul>
          <li>To provide the features you ask for — syncing your plans, showing your trends, sending reminders you enable.</li>
          <li>To keep your data available across your devices when you sign in.</li>
          <li>To secure the service and prevent abuse.</li>
        </Ul>
        <P>Our legal bases are your <b>explicit consent</b> (for health data), and <b>performance of our contract</b> with you (to run the account and features you request).</P>
      </section>

      <section>
        <H>Where your data lives &amp; how we protect it</H>
        <P>
          Your account and synced data are stored with our hosting provider, <b>Supabase</b>
          (PostgreSQL), in the [Supabase hosting region] region. Data is encrypted in transit (HTTPS)
          and protected by row-level security so each account can only access its own records. Some
          data is also cached on your device (local storage) so the app works quickly and offline.
        </P>
      </section>

      <section>
        <H>Who we share with</H>
        <P>We do not sell your data. We share it only with service providers that help us run the app, acting on our instructions:</P>
        <Ul>
          <li><b>Supabase</b> — database, authentication and hosting.</li>
          <li><b>Google</b> — only if you choose “Continue with Google” for sign-in.</li>
        </Ul>
        <P>We may disclose data if required by law, or to protect the rights and safety of our users.</P>
      </section>

      <section>
        <H>How long we keep it</H>
        <P>
          We keep your data for as long as your account is active. When you delete your data or account,
          we remove it from our live systems; backups are purged on a rolling schedule.
        </P>
      </section>

      <section>
        <H>Your rights</H>
        <P>Depending on where you live (including under GDPR), you can:</P>
        <Ul>
          <li>Access a copy of your data, or ask us to correct it.</li>
          <li>Delete your data or your entire account.</li>
          <li>Export your data (portability).</li>
          <li>Withdraw consent at any time, and object to or restrict certain processing.</li>
          <li>Lodge a complaint with your local data-protection authority.</li>
        </Ul>
        <P>To exercise any of these, email us at <a className="font-semibold text-[#EC4899]" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</P>
      </section>

      <section>
        <H>Cookies &amp; local storage</H>
        <P>
          We use only strictly-necessary storage — a sign-in session and locally-cached app data. We do
          not use advertising or cross-site tracking cookies.
        </P>
      </section>

      <section>
        <H>Children</H>
        <P>Bloom &amp; Zein is not intended for anyone under 16. We do not knowingly collect data from children under 16.</P>
      </section>

      <section>
        <H>Changes to this policy</H>
        <P>We may update this policy as the app evolves. We’ll revise the “last updated” date above and, for material changes, notify you in the app.</P>
      </section>

      <section>
        <H>Contact</H>
        <P>Questions about your privacy? Write to us at <a className="font-semibold text-[#EC4899]" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</P>
      </section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service" subtitle="The agreement between you and us.">
      <section>
        <P>
          Welcome to Bloom &amp; Zein. By creating an account or using the app, you agree to these Terms.
          Please read them together with our{" "}
          <a className="font-semibold text-[#EC4899]" href="/privacy">Privacy Policy</a>.
        </P>
      </section>

      <section>
        <H>Not medical advice</H>
        <P>
          Bloom &amp; Zein is a wellness and self-tracking tool for general information and personal
          organisation. It is <b>not a medical device</b> and does not provide medical, diagnostic or
          contraceptive advice. Cycle predictions and suggestions are estimates and must not be relied
          on for contraception, conception or diagnosing any condition. Always consult a qualified
          healthcare professional for medical decisions, and seek urgent care in an emergency.
        </P>
      </section>

      <section>
        <H>Who can use Bloom &amp; Zein</H>
        <P>You must be at least 16 years old and able to form a binding agreement to use the app.</P>
      </section>

      <section>
        <H>Your account</H>
        <Ul>
          <li>Keep your login details secure; you’re responsible for activity under your account.</li>
          <li>Provide accurate information and let us know of any unauthorised use.</li>
        </Ul>
      </section>

      <section>
        <H>Acceptable use</H>
        <P>Please don’t misuse the app — for example by attempting to break its security, disrupt the service, reverse-engineer it, or use it unlawfully or to harm others.</P>
      </section>

      <section>
        <H>Your content</H>
        <P>
          The wellness data and notes you enter remain yours. You grant us only the limited permission
          needed to store, process and display that content back to you so the app works. You can delete
          your content at any time.
        </P>
      </section>

      <section>
        <H>Our content</H>
        <P>The app’s design, text, graphics and software are owned by {ENTITY} and protected by intellectual-property laws. Please don’t copy or redistribute them without permission.</P>
      </section>

      <section>
        <H>Shop &amp; third-party links</H>
        <P>The app may show products or link to third parties. We’re not responsible for third-party content, products or policies; your dealings with them are between you and them.</P>
      </section>

      <section>
        <H>Service “as is” &amp; liability</H>
        <P>
          The app is provided “as is” without warranties of any kind. To the fullest extent permitted by
          law, {ENTITY} is not liable for indirect or consequential losses, or for decisions made in
          reliance on the app’s wellness information. Nothing in these Terms limits liability that cannot
          legally be limited.
        </P>
      </section>

      <section>
        <H>Ending your use</H>
        <P>You can stop using the app and delete your account at any time. We may suspend or end access if these Terms are breached or to protect the service and its users.</P>
      </section>

      <section>
        <H>Governing law</H>
        <P>These Terms are governed by the laws of [Country/State jurisdiction], without regard to conflict-of-law rules.</P>
      </section>

      <section>
        <H>Changes</H>
        <P>We may update these Terms as the app evolves. We’ll update the “last updated” date and, for material changes, notify you in the app. Continued use means you accept the updated Terms.</P>
      </section>

      <section>
        <H>Contact</H>
        <P>Questions about these Terms? Email <a className="font-semibold text-[#EC4899]" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</P>
      </section>
    </LegalShell>
  );
}
