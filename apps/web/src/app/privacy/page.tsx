import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Amgi",
  description: "How Amgi collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
        <p className="opacity-70 text-sm">
          Last updated: July 20, 2026 ·{" "}
          <Link href="/privacy/ko" className="underline">
            한국어
          </Link>
        </p>
      </div>

      <p>
        Amgi ("the app," "we," "us") is an independently operated language-learning
        app. This page explains what information we collect, how it&apos;s used,
        and your choices. If you have questions, contact{" "}
        <a href="mailto:kenyamjkim@gmail.com" className="underline">
          kenyamjkim@gmail.com
        </a>
        .
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Information we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account information.</strong> When you sign in with Google, we
            receive your name, email address, and profile photo from your Google
            account via Firebase Authentication. We never see or store a password —
            sign-in is handled entirely by Google.
          </li>
          <li>
            <strong>Learning data.</strong> Your selected native and study
            languages, saved vocabulary and flashcards (terms, translations,
            example sentences, and spaced-repetition scheduling data), and your
            study streak and progress.
          </li>
          <li>
            <strong>Local preferences.</strong> Your language settings are also
            cached on your device for a faster experience.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">How we use this information</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To run the core features: your saved words, review scheduling, and streaks.</li>
          <li>To personalize content in your native and study languages.</li>
          <li>
            To generate word explanations and example sentences using Google&apos;s
            Gemini AI — we send the word or phrase, optional sentence context, and
            your language settings (never your name, email, or account ID) to
            Gemini for this purpose.
          </li>
          <li>
            To generate pronunciation audio using Google Cloud Text-to-Speech —
            only the vocabulary text is sent for this purpose. The resulting audio
            is cached and served from a public storage URL.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Third-party services</h2>
        <p>
          Amgi is built on Google infrastructure. The following Google services
          process data on our behalf: Firebase Authentication and Cloud Firestore
          (sign-in and app data storage), Firebase Storage (cached pronunciation
          audio), the Gemini API (word explanations and examples), and Google Cloud
          Text-to-Speech (pronunciation audio). See{" "}
          <a
            href="https://policies.google.com/privacy"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google&apos;s Privacy Policy
          </a>{" "}
          for how Google handles this data.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What we don&apos;t do</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>We do not sell your information.</li>
          <li>We do not currently use any analytics, advertising, or tracking tools.</li>
          <li>We do not access your device&apos;s location, contacts, camera, or photos.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Data retention and deletion</h2>
        <p>
          Your data is retained as long as your account exists. Amgi does not yet
          have a self-service option to delete your account from within the app.
          To request deletion of your account and associated data, email{" "}
          <a href="mailto:kenyamjkim@gmail.com" className="underline">
            kenyamjkim@gmail.com
          </a>{" "}
          and we&apos;ll process the request.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Children&apos;s privacy</h2>
        <p>
          Amgi is not directed at children under 13, and we do not knowingly
          collect information from children under 13. If you believe a child has
          provided us information, contact us and we&apos;ll delete it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Changes to this policy</h2>
        <p>
          We may update this policy as the app changes. We&apos;ll update the
          &quot;Last updated&quot; date above whenever we do.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          Questions about this policy? Email{" "}
          <a href="mailto:kenyamjkim@gmail.com" className="underline">
            kenyamjkim@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
