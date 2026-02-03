# Ideation: Ramp Expense Reports Integration

## Meta

- Status: Ready for Kickoff
- Last Updated: 2025-02-03
- Sessions: 3
- **Outcome**: Buy (Ramp) + Integrate (App Portal) — not a custom build

## 1. Origin

- **Entry Type**: Solution idea with strong problem awareness
- **Initial Statement**: "I want a unified employee experience... This next app is intended to push my technical limits by adding QuickBooks API and plugging in our expense reports into a live, real QBO account for the nonprofit."
- **Refined Problem Statement**: Employees at a small nonprofit need a simple way to submit expense reports that flow directly into QuickBooks Online for reimbursement—without the friction of traditional expense apps that treat QBO integration as an afterthought rather than the primary destination.
- **Final Outcome**: Research revealed Ramp (already in use) covers ~80% of requirements for free. Decision: integrate Ramp into App Portal rather than build custom.

## 2. Jobs to be Done

- **Primary Job**: Submit expenses and get reimbursed through QuickBooks Online
- **Related Jobs**:
  - Reconcile personal card statements to catch forgotten reimbursable expenses
  - Document business travel expenses efficiently post-trip
  - Calculate mileage reimbursement without manual math
  - Maintain audit trail with receipt images
  - Approve/reject employee expense submissions (admin job)

- **How Ramp Addresses These**:
  - ✅ Out-of-pocket reimbursement for non-Ramp card purchases
  - ✅ Mileage: Enter origin/destination → Google Maps calculates distance → IRS rate applied
  - ✅ Receipt capture via mobile app, email, text, or web upload
  - ✅ QBO sync (expenses sync directly, reimbursements as bills)
  - ✅ Approval workflows with policy enforcement

## 3. User Segments

### Segment 1: Employee Submitter

- **Context**: Sitting at desktop after a business trip or when remembering forgotten expenses
- **Motivation**: Get reimbursed quickly with minimal data entry
- **Solution**: Use Ramp's web interface or mobile app

### Segment 2: External Contractor/Consultant

- **Context**: Occasional expense submission for project-related costs
- **Motivation**: Simple submission process; clear status on reimbursement
- **Solution**: Ramp supports guest/contractor access

### Segment 3: Admin Approver

- **Context**: Reviews submitted expense reports; ensures proper coding before QBO sync
- **Motivation**: Quick review with all info visible
- **Solution**: Ramp's approval dashboard with policy enforcement

---

## 4. Market Landscape

### Critical Discovery: Ramp Already Does What We Need

| Requirement                 | Ramp Capability                            |
| --------------------------- | ------------------------------------------ |
| Out-of-pocket reimbursement | ✅ Full support                            |
| Mileage reimbursement       | ✅ Google Maps + IRS rates                 |
| Receipt capture             | ✅ Mobile, email, text, web upload         |
| Bulk receipt submission     | ✅ Drag multiple receipts                  |
| Trip grouping               | ✅ "Is this a travel expense?" toggle      |
| Approval workflows          | ✅ Multi-level approval                    |
| QBO integration             | ✅ Syncs expenses, reimbursements as bills |
| ACH payment to employees    | ✅ 3-5 business days                       |

**Remaining gaps** (not worth building for):

- CSV statement reconciliation — nice-to-have, quarterly use
- Desktop webcam batch capture — Ramp mobile/email works fine
- Unified auth — addressable via SAML SSO (see v2)

**Sources**: [Ramp Reimbursements](https://support.ramp.com/hc/en-us/articles/4417618448403-Submitting-reimbursements), [Ramp QBO Integration](https://support.ramp.com/hc/en-us/articles/4435536594067-QuickBooks-Online-overview)

### Auth Architecture Discovery

Your `internal-app-registry-auth` uses **Zitadel Cloud** as the identity provider.

**Key finding**: Zitadel can act as a **SAML 2.0 Identity Provider**, enabling true SSO with Ramp.

- SAML metadata: `https://renewal-initiatives-hgo6bh.us1.zitadel.cloud/saml/v2/metadata`
- SSO URL: `https://renewal-initiatives-hgo6bh.us1.zitadel.cloud/saml/v2/SSO`

**Sources**: [Ramp SSO Setup](https://support.ramp.com/hc/en-us/articles/24997409838739-Setting-up-single-sign-on-SSO-in-Ramp), [Zitadel SAML IdP](https://zitadel.com/docs/guides/integrate/login/saml)

---

## 5. Assumptions Log

| ID  | Assumption                     | Final Status      | Notes                                |
| --- | ------------------------------ | ----------------- | ------------------------------------ |
| A1  | Ramp doesn't meet our needs    | **INVALIDATED**   | Ramp covers ~80% of requirements     |
| A2  | CSV reconciliation is critical | **DEPRIORITIZED** | Nice-to-have, not worth custom build |
| A3  | Desktop webcam is needed       | **DEPRIORITIZED** | Ramp mobile/email works fine         |
| A4  | Need direct QBO API            | **MOOT**          | Ramp handles QBO sync                |
| A5  | Need AI receipt scanning       | **MOOT**          | Ramp has built-in OCR                |
| A10 | Unified auth required          | **ADDRESSABLE**   | SAML SSO via Zitadel (v2)            |

---

## 6. Solution: Ramp Integration (Two Phases)

### v1: Simple Portal Link

**Effort**: 5-10 minutes | **Deploy**: Immediately

Add Ramp to the App Portal as a linked external app.

**Implementation**:

1. In App Portal (Admin > Apps > Add New App):
   - **Name**: Expense Reports
   - **Slug**: `expense-reports`
   - **Description**: Submit expense reports and mileage for reimbursement via Ramp
   - **URL**: `https://app.ramp.com/home/my-reimbursements`
   - **Icon**: Ramp logo or custom expense icon

2. In Zitadel Console (Projects > Renewal Initiatives > Roles):
   - **Create role**: `app:expense-reports`
   - **Grant to**: Users who should see it in portal

**User Experience**:

```
User logs into App Portal
    → Sees "Expense Reports" card
    → Clicks card
    → Opens Ramp in new tab
    → Logs into Ramp (if not already authenticated)
```

**Pros**: Zero code, done immediately
**Cons**: Separate Ramp login required

---

### v2: SAML SSO Integration

**Effort**: 1-2 hours | **Deploy**: When v1 feels clunky

Configure Zitadel as Ramp's SAML Identity Provider for true SSO.

**Implementation**:

1. **In Zitadel Console**:
   - Create new SAML application for Ramp
   - Configure ACS URL and entity ID from Ramp
   - Note metadata URL: `https://renewal-initiatives-hgo6bh.us1.zitadel.cloud/saml/v2/metadata`

2. **In Ramp** (Settings > Security > Identity Providers):
   - Click "Add provider" > "Custom identity provider"
   - Enter Zitadel SAML metadata URL
   - Map email attribute to match Zitadel users
   - Enable for `renewalinitiatives.org` domain

3. **Configure login methods**:
   - Require SSO for cardholders
   - Allow password fallback for guests if needed

**User Experience**:

```
User logs into App Portal (via Zitadel)
    → Sees "Expense Reports" card
    → Clicks card
    → Opens Ramp
    → Already authenticated via SAML (no second login)
```

**Prerequisites**:

- Ramp users' email addresses must exactly match Zitadel users
- Admin access to both Zitadel Console and Ramp Settings

**Pros**: True SSO, unified experience
**Cons**: More setup, requires SAML configuration and testing

---

## 7. Open Questions for Kickoff

### For v1 (Simple Link)

- [ ] What icon to use? (Ramp logo or custom?)
- [ ] Should all users see it, or only those with Ramp accounts?
- [ ] Best direct link? (`/home/my-reimbursements` vs `/home`)

### For v2 (SAML SSO)

- [ ] Do all Ramp users have matching email addresses in Zitadel?
- [ ] Any Ramp users who shouldn't be in Zitadel?
- [ ] Require SSO or allow password fallback?

### Confirmed Out of Scope

- ❌ Custom expense report application
- ❌ Direct QBO API integration
- ❌ AI receipt scanning implementation
- ❌ CSV statement reconciliation tool
- ❌ Desktop webcam batch capture

---

## 8. Research Log

| Date       | Topic             | Source                                                                    | Key Findings                                          |
| ---------- | ----------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| 2025-02-03 | Intake session    | User interview                                                            | QBO integration #1 constraint; batch workflow desired |
| 2025-02-03 | User has Ramp     | User clarification                                                        | Ramp is current corporate card                        |
| 2025-02-03 | Ramp capabilities | [Ramp Support](https://support.ramp.com)                                  | Covers out-of-pocket, mileage, QBO sync, bulk upload  |
| 2025-02-03 | Ramp mileage      | [Ramp Docs](https://support.ramp.com/hc/en-us/articles/4417618448403)     | Origin/destination → Google Maps → IRS rate           |
| 2025-02-03 | Auth architecture | internal-app-registry-auth                                                | Zitadel Cloud, OIDC, SAML IdP capable                 |
| 2025-02-03 | Zitadel SAML      | [Zitadel Docs](https://zitadel.com/docs/guides/integrate/login/saml)      | Can be SAML IdP for third-party apps                  |
| 2025-02-03 | Ramp SSO          | [Ramp Support](https://support.ramp.com/hc/en-us/articles/24997409838739) | Supports custom SAML identity providers               |
| 2025-02-03 | Decision          | Synthesis                                                                 | Buy (Ramp) + Integrate (Portal) beats Build           |

---

## 9. Recommendation

**Do not build a custom expense report app.**

Ramp already provides excellent expense management for free with your corporate card. The originally envisioned features (QBO sync, mileage calculation, receipt scanning, approval workflows) are all covered.

**Deploy in two phases:**

| Phase  | What                        | When                           | Effort   |
| ------ | --------------------------- | ------------------------------ | -------- |
| **v1** | Add Ramp link to App Portal | Now                            | 5-10 min |
| **v2** | SAML SSO via Zitadel        | When v1 friction is noticeable | 1-2 hrs  |

---

## 10. Next Steps

1. **v1**: Add "Expense Reports" to App Portal with link to Ramp
2. **v2**: Configure SAML SSO when/if the separate login becomes annoying
3. **Learning pivot**: If still interested in QBO API / AI vision / webcam APIs, find a different project that fills an actual gap

---

_Project renamed: `expense-reports` → `ramp-expense-reports` to reflect integration approach_
