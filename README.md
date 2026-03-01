# Expense Reports

Internal expense report management system for [Renewal Initiatives](https://renewalinitiatives.org) — a 501(c)(3) nonprofit focused on affordable housing and regenerative agriculture.

## What It Does

- **Submit expense reports** with line items, receipts, and fund allocation
- **Approval workflow** for supervisor review
- **Zitadel SSO** for unified authentication across Renewal Initiatives apps
- **QuickBooks integration** for accounting sync

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Auth | Zitadel OIDC |
| Hosting | Vercel |

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Built With

Built by a non-developer + [Claude Code](https://claude.ai/claude-code) as a demonstration of AI-assisted application development.

## License

[MIT](LICENSE)
