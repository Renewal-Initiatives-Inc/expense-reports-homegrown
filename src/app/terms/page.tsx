import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Expense Reports',
  description: 'Terms of service for the Expense Reports application',
}

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Expense Reports Homegrown (&quot;the Application&quot;),
            you agree to be bound by these Terms of Service. If you do not agree to these
            terms, please do not use the Application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
          <p>
            The Application is an internal expense management system for Renewal Initiatives
            employees. It allows users to submit expense reports for out-of-pocket purchases
            and mileage reimbursement, which are then routed through an approval workflow
            and synced to QuickBooks Online.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Eligibility</h2>
          <p>
            The Application is available only to authorized Renewal Initiatives employees
            and contractors with valid credentials. Access requires authentication through
            the organization&apos;s identity provider (Zitadel).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. User Responsibilities</h2>
          <p className="mb-4">As a user of the Application, you agree to:</p>
          <ul className="list-disc list-inside mb-4">
            <li>Submit only accurate and truthful expense information</li>
            <li>Upload only legitimate receipts for actual business expenses</li>
            <li>Not share your account credentials with others</li>
            <li>Report any suspected fraudulent activity immediately</li>
            <li>Comply with your organization&apos;s expense policies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. QuickBooks Online Integration</h2>
          <p className="mb-4">
            The Application integrates with QuickBooks Online (QBO) to sync expense data.
            By using this Application, you acknowledge that:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Approved expense reports will be created as bills in QBO</li>
            <li>Your expense data will be visible to users with QBO access</li>
            <li>Categories and projects are sourced from QBO and may change</li>
            <li>QBO integration is managed by administrators</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. AI-Powered Features</h2>
          <p className="mb-4">
            The Application uses AI (Claude Vision) to extract data from receipt images.
            You understand that:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>AI extraction may not always be accurate</li>
            <li>You are responsible for verifying all extracted data before submission</li>
            <li>Receipt images are processed by Anthropic&apos;s Claude Vision API</li>
            <li>Confidence indicators are provided but should not be solely relied upon</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Intellectual Property</h2>
          <p>
            The Application and its original content, features, and functionality are
            owned by Renewal Initiatives. The Application is intended for internal use only.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Renewal Initiatives shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages resulting
            from your use of the Application, including but not limited to errors in expense
            calculations, data loss, or QBO sync failures.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Service Availability</h2>
          <p>
            We strive to maintain high availability but do not guarantee uninterrupted service.
            The Application may be temporarily unavailable for maintenance, updates, or due to
            circumstances beyond our control.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">10. Termination</h2>
          <p>
            Access to the Application may be terminated or suspended at any time, with or
            without cause, if you violate these terms or at the discretion of the organization.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the
            Application after changes constitutes acceptance of the modified terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">12. Contact</h2>
          <p>
            For questions about these terms, please contact:{' '}
            <a href="mailto:admin@renewalinitiatives.org" className="text-primary hover:underline">
              admin@renewalinitiatives.org
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
