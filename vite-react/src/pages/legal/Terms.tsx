import { LegalLayout, Section, Bullets } from './LegalLayout'

const SUPPORT_EMAIL = 'support@stampdbahamas.com'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="July 18, 2026">
      <p className="text-[15px] text-gray-600 leading-relaxed">
        These Terms of Service ("Terms") govern your use of the Stampd Bahamas app and website
        ("Stampd"), operated by Rykno Tech Solutions in The Bahamas. By creating an account or using
        Stampd, you agree to these Terms. If you do not agree, please do not use the service.
      </p>

      <Section heading="Who can use Stampd">
        <p>
          You must be at least 13 years old to use Stampd. If you use Stampd on behalf of a business,
          you confirm that you are authorized to act for that business and to accept these Terms on
          its behalf.
        </p>
      </Section>

      <Section heading="Your account">
        <Bullets items={[
          'Provide accurate information when you sign up and keep it current.',
          'Keep your password and your personal PIN confidential. You are responsible for activity that happens under your account.',
          'Tell us promptly if you believe your account has been used without your permission.',
        ]} />
      </Section>

      <Section heading="How Stampd works">
        <p>
          Stampd is a digital loyalty platform. Participating businesses create their own loyalty
          cards, decide how many stamps a reward requires, and choose what the rewards are. When you
          show your PIN, a business adds stamps to your card, and you can redeem rewards with that
          business once you have earned them.
        </p>
      </Section>

      <Section heading="Rewards are between you and the business">
        <p>
          This is important. Rewards, discounts, and offers are provided by the individual businesses,
          not by Stampd. Each business is responsible for honoring its own rewards and for the quality
          of its products and services. Stampd provides the platform that tracks your stamps and
          rewards, but we are not a party to the transaction between you and a business, and we do not
          guarantee any reward.
        </p>
        <p>
          If a business changes its loyalty program, closes, or leaves Stampd, your stamps or rewards
          with that business may no longer be available. We will act reasonably to reflect such changes
          but are not responsible for offers a business chooses not to honor.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You agree not to:</p>
        <Bullets items={[
          'Use Stampd for any unlawful or fraudulent purpose, or to obtain stamps or rewards you did not genuinely earn.',
          'Share, sell, or transfer your PIN or account to gain rewards dishonestly.',
          'Interfere with, disrupt, or attempt to gain unauthorized access to the service or its systems.',
          'Copy, resell, or misuse the app, its content, or its branding.',
        ]} />
      </Section>

      <Section heading="For businesses">
        <p>If you use the Stampd dashboard as a business, you also agree that:</p>
        <Bullets items={[
          'You will honor the rewards your loyalty program advertises to customers.',
          'You are responsible for stamps issued by you and your staff, including any PINs you assign to them.',
          'Information you publish about your business (name, address, description, and photos) is accurate and something you have the right to use.',
          'Your account is subject to approval before your loyalty card appears to customers, and we may suspend accounts that misuse the platform.',
        ]} />
      </Section>

      <Section heading="Intellectual property">
        <p>
          Stampd, its name, logo, and software are owned by Rykno Tech Solutions and are protected by
          law. Businesses keep ownership of their own names, logos, and content, and grant us the right
          to display them in the app so customers can find and use their loyalty programs.
        </p>
      </Section>

      <Section heading="Service provided “as is”">
        <p>
          We work hard to keep Stampd reliable, but the service is provided "as is" and "as available"
          without warranties of any kind. We do not guarantee that the app will always be available,
          uninterrupted, or error-free.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Rykno Tech Solutions and Stampd will not be liable
          for any indirect, incidental, or consequential losses, or for the acts of any business,
          arising from your use of the service. Our total liability for any claim relating to Stampd is
          limited to the amount you paid us to use the service, which for consumers is zero.
        </p>
      </Section>

      <Section heading="Ending your use">
        <p>
          You can stop using Stampd and delete your account at any time from the Profile screen. We may
          suspend or end access for anyone who breaches these Terms or misuses the service.
        </p>
      </Section>

      <Section heading="Changes to these Terms">
        <p>
          We may update these Terms from time to time. When we make material changes, we will update
          the date above and, where appropriate, notify you in the app. Continuing to use Stampd after
          a change means you accept the updated Terms.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These Terms are governed by the laws of the Commonwealth of The Bahamas, and any dispute will
          be subject to the courts of The Bahamas.
        </p>
      </Section>

      <Section heading="Contact us">
        <p>
          Questions about these Terms? Email{' '}
          <a className="text-brand-600 font-medium hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  )
}
