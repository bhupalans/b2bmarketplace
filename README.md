# VBuySell – Development & Environment Guide

This repository powers **VBuySell**, a B2B marketplace application.

This README is intentionally **practical and lightweight**. It explains:
- how the project is structured
- how to run it locally
- how DEV and PROD are separated
- what data and configuration the app expects

If you follow this document, you can work safely without breaking production.

---

## 1. Environments Overview

### Production
- **URL:** https://vbuysell.com
- **Firebase project:** `b2b-marketplace-udg1v`
- **Data:** Real users, real products
- **Secrets:** Managed by Firebase / Hosting

### Development (DEV)
- **Local URL:** http://localhost:9002
- **Firebase project:** `vbuysell-dev`
- **Data:** Test users, test products only
- **Secrets:** Local only (`.env.local`, service account key)

> Rule: Never test directly on production.

---

## 2. Local Development – Quick Start

### Prerequisites
- Node.js (LTS)
- Git
- Project code checked out locally

### Install dependencies
```bash
npm install
```

### Run locally
```bash
npm run dev
```

The app will be available at:
```
http://localhost:9002
```

---

## 3. Environment Variables (Local Only)

Create a file in the project root:
```
.env.local
```

Add one of the following:
```env
GEMINI_API_KEY=your_api_key_here
# or
GOOGLE_API_KEY=your_api_key_here
```

Important:
- `.env.local` must **never** be committed
- Ensure `.gitignore` includes:
```
.env.local
secrets/
```

---

## 4. Firebase Admin SDK (Server-side)

The Admin SDK is used for secure server-side operations (Firestore, Auth, Storage).

### Local DEV
- Uses a **service account key** from `vbuysell-dev`
- Path is provided via:
```bash
GOOGLE_APPLICATION_CREDENTIALS=C:\Projects\vbuysell\secrets\vbuysell-dev.json
```

### Production
- Uses Firebase-managed credentials automatically
- No service account key is required in PROD

### Important rule
- **Never hardcode `projectId`** in Admin SDK initialization
- Project is inferred from credentials

---

## 5. Client Firebase SDK (Browser-side)

The client SDK (Auth, client Firestore reads, Storage uploads) must point to:
- `vbuysell-dev` in local development
- PROD Firebase only in production hosting

If Auth fails with `api-key-not-valid`, the client config is pointing to the wrong project.

---

## 6. Required DEV Firestore Data

Some pages render only when required data exists.

### Required collections

#### `users/{uid}`
```json
{
  "role": "admin" | "user",
  "name": "Optional but recommended"
}
```

#### `settings/branding`
```json
{
  "siteName": "VBuySell (DEV)"
}
```

#### `subscriptionPlans/{planId}`
```json
{
  "name": "Basic",
  "price": 0,
  "interval": "monthly",
  "isActive": true
}
```

### Optional but useful
- `categories`
- A few test `products`

---

## 7. Authentication (DEV)

- Email / Password auth must be enabled in `vbuysell-dev`
- DEV users are separate from PROD users
- Admin access is controlled via Firestore:
```json
{ "role": "admin" }
```

---

## 8. Firestore Rules

- Firestore rules are copied from PROD → DEV
- Client SDK is enforced by rules
- Admin SDK bypasses rules (uses IAM instead)

If data is inaccessible in DEV:
- Check rules
- Check user role

---

## 9. Firestore Indexes

Indexes are created **on demand**.

When Firestore throws an index error:
1. Click the provided link
2. Create the index
3. Reload the page

This is expected and normal in DEV.

---

## 10. Firebase Storage

### Storage usage
- Category images
- Product images

### Rules
- Storage rules are copied from PROD
- Adjusted so admins can upload category images

Expected admin path:
```
category-images/*
```

If uploads fail:
- Check Storage rules
- Verify admin role exists in Firestore

---

## 11. AI / Gemini Integration

- Uses Genkit with Gemini / Google AI
- Requires API key via `.env.local`
- Missing key will cause runtime Genkit errors

Restart dev server after changing env variables.

---

## 12. Common DEV Signals (Not Bugs)

| Symptom | Meaning |
|------|------|
| Blank page | Missing Firestore data |
| Permission denied | Rules / role mismatch |
| Index error | Index not created yet |
| `undefined.split` | UI assumption bug |
| Storage unauthorized | Storage rules too strict |

DEV errors are signals that PROD may have hidden assumptions.

---

## 13. DEV → PROD Promotion Checklist

Before promoting changes to production:
- Feature works locally
- Tested against `vbuysell-dev`
- No DEV API keys in code
- No secrets committed
- UI handles missing data safely

Promotion is manual and intentional.

---

## 14. Golden Rule

> If DEV breaks, PROD has a hidden assumption.

Fix it in DEV first.

---

This document is intentionally short and practical. It reflects how the project actually works today and should be updated only when behavior changes.

