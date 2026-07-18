import { LegalLayout, Section, Bullets } from './LegalLayout'

const SUPPORT_EMAIL = 'support@stampdbahamas.com'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="July 18, 2026">
      <p className="text-[15px] text-gray-600 leading-relaxed">
        Stampd Bahamas ("Stampd", "we", "us") is a digital loyalty platform operated by Rykno Tech
        Solutions in The Bahamas. This policy explains what information we collect when you use the
        Stampd app or website, how we use it, and the choices you have. By creating an account you
        agree to the practices described here.
      </p>

      <Section heading="Information we collect">
        <p>We collect only what we need to run your loyalty cards:</p>
        <Bullets items={[
          <><strong>Account information</strong> — your first and last name, email address, and the password you set (stored securely and never visible to us in plain text).</>,
          <><strong>Your Stampd PIN</strong> — a personal code we generate so merchants can add stamps to your cards.</>,
          <><strong>Loyalty activity</strong> — the stamps you earn, rewards you unlock and redeem, and which businesses you collect from.</>,
          <><strong>Notifications</strong> — if you allow them, a device push token so we can send you stamp and reward alerts.</>,
          <><strong>Technical information</strong> — basic device and diagnostic data, including crash reports, used to keep the app working.</>,
        ]} />
        <p>
          We do not collect payment card details. Stampd does not process payments — you pay merchants
          directly, the same way you always have.
        </p>
      </Section>

      <Section heading="What merchants can see">
        <p>
          This is the most important thing to understand. When you show your PIN to a business so they
          can stamp you, that business can see your <strong>name</strong> and your <strong>loyalty
          activity with them</strong> — how many stamps you have on their card, and rewards you have
          earned or redeemed at their location.
        </p>
        <p>
          A business can only ever see activity for their own loyalty program. One merchant cannot see
          the cards, stamps, or rewards you hold with any other business, and they cannot see your email
          address or password.
        </p>
      </Section>

      <Section heading="How we use your information">
        <Bullets items={[
          'To create and run your account and loyalty cards.',
          'To let participating businesses add stamps and issue rewards when you present your PIN.',
          'To send you notifications about stamps, rewards, and reminders when a reward is close (only if you allow notifications).',
          'To keep the service secure, diagnose problems, and improve the app.',
        ]} />
        <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>
      </Section>

      <Section heading="How your information is shared">
        <p>We share information only in these limited ways:</p>
        <Bullets items={[
          <><strong>With businesses you use</strong> — as described above, limited to your name and your activity with that business.</>,
          <><strong>With service providers</strong> that operate the app for us — our database and hosting provider (Supabase), our push-notification delivery service (Expo and Apple), and our error-reporting tool (Sentry). They process data only to provide these services to us.</>,
          <><strong>When required by law</strong> — if we must comply with a legal obligation or protect our rights, users, or the public.</>,
        ]} />
      </Section>

      <Section heading="Notifications">
        <p>
          If you allow notifications, we use your device's push token to send stamp confirmations,
          reward alerts, and occasional reminders when you are close to a reward. You can turn
          notifications off at any time in your device settings, and the app will keep working
          without them.
        </p>
      </Section>

      <Section heading="Keeping and deleting your information">
        <p>
          We keep your information for as long as your account is active. You can delete your account
          at any time from the Profile screen in the app. Deleting your account permanently removes
          your profile, PIN, and loyalty activity from our systems. Businesses may retain their own
          separate records of transactions as required for their bookkeeping.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          We protect your information with encryption in transit and at rest, secure authentication,
          and access controls that limit what each business and staff member can see. No system is
          perfectly secure, but we work to safeguard your data and to respond quickly if a problem
          arises.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          Stampd is not intended for children under 13, and we do not knowingly collect information
          from them. If you believe a child has created an account, contact us and we will remove it.
        </p>
      </Section>

      <Section heading="Your choices">
        <Bullets items={[
          'Access or update your name from the Profile screen.',
          'Turn notifications on or off in your device settings.',
          'Delete your account and associated data at any time from the app.',
          <>Contact us with any privacy question at <a className="text-brand-600 font-medium hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</>,
        ]} />
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this policy from time to time. When we make material changes, we will update
          the date above and, where appropriate, notify you in the app. Continuing to use Stampd after
          a change means you accept the updated policy.
        </p>
      </Section>

      <Section heading="Contact us">
        <p>
          Questions about this policy or your information? Email{' '}
          <a className="text-brand-600 font-medium hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  )
}
