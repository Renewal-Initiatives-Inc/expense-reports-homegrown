import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Expense Reports',
  description: 'Privacy policy for the Expense Reports application',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
          <p>
            Expense Reports Homegrown (&quot;the Application&quot;) is an internal expense management
            system operated by Renewal Initiatives. This privacy policy explains how we collect,
            use, and protect your information when you use the Application.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
          <h3 className="text-lg font-medium mb-2">Account Information</h3>
          <p className="mb-4">
            We receive your name, email address, and role information from our authentication
            provider (Zitadel) when you sign in with your Renewal Initiatives credentials.
          </p>

          <h3 className="text-lg font-medium mb-2">Expense Data</h3>
          <p className="mb-4">
            We collect expense report information you submit, including:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Expense amounts, dates, and descriptions</li>
            <li>Receipt images you upload</li>
            <li>Mileage information (addresses, distances)</li>
            <li>Category and project assignments</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Financial System Integration</h2>
          <p className="mb-4">
            This Application connects to our financial system to:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Read GL accounts and funding sources for expense categorization</li>
            <li>Submit approved expense reports for GL posting and payment processing</li>
          </ul>

          <h3 className="text-lg font-medium mb-2">Data Shared</h3>
          <p className="mb-4">
            When an expense report is approved, the following data is shared with the financial system:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Expense amounts, dates, and descriptions</li>
            <li>Selected GL account and funding source per line item</li>
            <li>Employee identifier for payment processing</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
          <p className="mb-4">
            Your data is stored securely using:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Vercel Postgres database with encryption at rest</li>
            <li>Vercel Blob storage for receipt images (signed URLs)</li>
            <li>HTTPS encryption for all data in transit</li>
            <li>Role-based access controls</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
          <p>
            Expense reports and associated data are retained indefinitely for accounting
            and audit purposes. Receipt images are stored as long as the associated expense
            report exists. You may request deletion of your data by contacting your administrator.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Third-Party Services</h2>
          <p className="mb-4">We use the following third-party services:</p>
          <ul className="list-disc list-inside mb-4">
            <li><strong>Zitadel</strong> - Authentication (SSO)</li>
            <li><strong>Anthropic (Claude Vision)</strong> - Receipt data extraction</li>
            <li><strong>Google Maps</strong> - Mileage distance calculation</li>
            <li><strong>Vercel</strong> - Hosting, database, and file storage</li>
          </ul>
          <p>
            Each of these services has their own privacy policies governing their use of data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Access and Sharing</h2>
          <p>
            Your expense data is accessible only to you and administrators of the Application.
            Approved expense reports are submitted to our financial system for GL posting and
            payment processing. We do not sell or share your personal information with third
            parties for marketing purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">8. Contact</h2>
          <p>
            For questions about this privacy policy or your data, please contact your
            system administrator or email:{' '}
            <a href="mailto:admin@renewalinitiatives.org" className="text-primary hover:underline">
              admin@renewalinitiatives.org
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Changes will be posted
            on this page with an updated revision date.
          </p>
        </section>
      </div>
    </div>
  )
}
