interface Props {
  onBack: () => void;
}

const SECTIONS = [
  {
    title: "1. Who We Are",
    body: [
      "TipMe (tipme.africa) is a digital tipping platform owned and operated by Sabraro Alpha (Pty) Ltd, a company registered in South Africa (\"Sabraro Alpha\", \"TipMe\", \"we\", \"us\", \"our\").",
      "By accessing or using TipMe, whether as a Tipper, a Service Worker, or an Employer/business managing Service Worker accounts, you agree to these Terms of Use. If you do not agree, please do not use the platform.",
    ],
  },
  {
    title: "2. Eligibility",
    body: [
      "You must be at least 16 years old to use TipMe, whether to send a tip or to receive tips as a registered Service Worker. By using the platform, you confirm that you meet this age requirement.",
    ],
  },
  {
    title: "3. Roles and Responsibilities",
    body: [
      "Tippers: You are responsible for entering the correct tip amount and sending payment directly to the Service Worker via PayShap, using the cellphone number shown on their TipMe QR code. Tips are a voluntary gesture of goodwill toward the Service Worker and are not payment for goods or services from TipMe.",
      "Service Workers: You are responsible for providing accurate personal details during registration, including a cellphone number correctly registered as your PayShap ShapID and the correct bank it is registered with (tippers pay your ShapID in the form cellphone number@bankname), so tippers can pay you directly. You sign in with your cellphone number and a password you choose, and you are responsible for keeping that password and your QR code secure. Your name, position and PayShap ID (your cellphone number and bank) are shown to anyone who scans your QR code or opens your tip link, so that they can pay you.",
      "Employers: If you register and manage Service Worker accounts on behalf of your business, you are responsible for ensuring each worker has consented to being added to the platform and that the details submitted are accurate.",
    ],
  },
  {
    title: "4. Payments, Fees and Payouts",
    body: [
      "Tips are paid directly from the Tipper to the Service Worker using PayShap, South Africa's real-time, cellphone-number-based payment system. TipMe is not involved in, and at no point holds, processes, or has access to, any tip funds — the payment passes directly from the Tipper's bank to the Service Worker's bank.",
      "TipMe does not charge a fee on tips. Service Workers instead pay TipMe a separate subscription fee for use of the platform. Your first month is free, after which the subscription is R20 per month. The subscription is collected in a way that will be communicated to you before the first payment is due, and we will give you notice before any change to the fee.",
      "Because TipMe does not process tip payments, payout timing is determined entirely by the Tipper's and Service Worker's own banks, not by TipMe.",
    ],
  },
  {
    title: "5. No Goods, No Shipping",
    body: [
      "TipMe does not sell, supply, or ship any physical or digital goods. Nothing on this platform constitutes a sale of goods. Shipping and delivery policies are therefore not applicable to any transaction made through TipMe.",
    ],
  },
  {
    title: "6. Refunds and Reversals",
    body: [
      "Tips are a voluntary payment sent directly from Tipper to Service Worker and are, as a general rule, final and non-refundable once processed. Because TipMe does not hold or process tip funds, it cannot itself reverse or refund a tip.",
      "In cases of a proven technical error, duplicate payment, or unauthorised transaction, Sabraro Alpha will review the matter in good faith and assist the parties involved in resolving it directly, including liaising with the relevant banks where appropriate. Any such request should be reported as soon as possible, and in any event within 14 days of the transaction, to jolwage@yahoo.com.",
    ],
  },
  {
    title: "7. Dispute Resolution",
    body: [
      "If you experience any difficulty with a transaction, or believe a transaction was made in error or without authorisation, please contact Johan Olwage at Sabraro Alpha directly using the details in the Contact Us section below. We will investigate in good faith and respond within a reasonable time.",
      "If a dispute cannot be resolved directly, either party may refer the matter to mediation or to the South African courts, as set out in the Governing Law section below.",
    ],
  },
  {
    title: "8. Privacy and Data Use",
    body: [
      "TipMe collects the minimum personal information needed to operate the platform: for Service Workers, this includes name, position, a cellphone number (used both as the login username and as the PayShap ShapID), the name of the bank the ShapID is registered with, and a password-protected login. We do not ask for or store bank account numbers or card details.",
      "Personal information is used solely to operate the platform, send notifications, and collect subscription fees. We do not sell personal information to third parties, and we never see or hold tip funds.",
      "Information may be shared with our SMS notification provider (BulkSMS) and with whichever provider we use to collect subscription fees, strictly as needed to deliver notifications and collect those fees.",
      "We process personal information in accordance with South Africa's Protection of Personal Information Act (POPIA). If you wish to access, correct, or request deletion of your personal information, contact jolwage@yahoo.com.",
    ],
  },
  {
    title: "9. Platform Availability and Liability",
    body: [
      "TipMe is provided on an \"as is\" and \"as available\" basis. While we aim for the platform to be reliable and secure, we do not guarantee uninterrupted access and are not liable for losses arising from downtime, third-party payment processing delays, or factors outside our reasonable control.",
      "To the fullest extent permitted by law, Sabraro Alpha's liability in connection with your use of TipMe is limited to the subscription fee paid by the relevant Service Worker in the month in which the claim arose.",
    ],
  },
  {
    title: "10. Changes to These Terms",
    body: [
      "We may update these Terms of Use from time to time to reflect changes to the platform or applicable law. The updated version will be posted on this page with a revised date. Continued use of TipMe after changes are posted constitutes acceptance of the updated Terms.",
    ],
  },
  {
    title: "11. Governing Law",
    body: [
      "These Terms are governed by the laws of the Republic of South Africa, and any disputes will be subject to the jurisdiction of the South African courts.",
    ],
  },
  {
    title: "12. Contact Us",
    body: [
      "Sabraro Alpha (Pty) Ltd — trading as TipMe",
      "Email: jolwage@yahoo.com",
      "WhatsApp: +27 84 308 8317",
      "Physical address: 997 De Swantje Close, Langebaan Country Estate, Langebaan, Western Cape, South Africa",
      "For any transaction difficulty, dispute, or reversal request, please contact Johan Olwage using the details above.",
    ],
  },
];

export default function TermsOfUse({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <header className="bg-white/70 backdrop-blur border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/tipme-icon.png" alt="TipMe" className="w-10 h-10 object-contain" />
          <span className="font-bold text-gray-800 text-xl">TipMe Platform</span>
        </div>
        <button
          onClick={onBack}
          className="text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-lg transition"
        >
          ← Back
        </button>
      </header>

      <section className="px-4 py-12 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Terms of Use</h1>
          <p className="text-xs text-gray-400 mb-6">Last updated: 22 November 2026</p>

          {SECTIONS.map((s) => (
            <div key={s.title} className="mb-6">
              <h2 className="font-semibold text-gray-800 text-sm mb-2">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-gray-600 leading-relaxed mb-2">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
