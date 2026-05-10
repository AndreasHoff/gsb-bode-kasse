# GSB Bødekasse 🏸

A modern, mobile-first **bødekasse** (fine pool) platform for Danish sports clubs.  
Built for badminton teams — social-first, not finance-first.

---

## What is this?

A club culture platform where players receive humorous/social fines during the season.  
The collected money funds team dinners, parties, and events.

Inspired by Teambox and PayTheHippo — but faster, more transparent, and better UX.

---

## Tech Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Frontend     | React + TypeScript (Vite 5)             |
| Styling      | TailwindCSS v4                          |
| Backend      | Firebase / Supabase *(TBD)*             |
| Mobile       | Capacitor *(future App Store wrapping)* |
| Payments     | MobilePay deep-link (no fintech infra)  |

---

## Getting Started

```bash
npm install
npm run dev
```

---

## Project Structure

```
src/
  features/
    overview/       # F004 – Team shared debt view
    personal/       # F005 – Personal debt overview
    fines/          # F001, F002 – Assign fine (single + bulk)
    activity/       # F007 – Activity log / audit trail
  lib/
    permissions.ts  # Role-based permission helpers
    utils.ts        # MobilePay deep-link, formatting
  types/
    domain.ts       # All domain entity types

docs/
  specs/
    domain/         # Entity definitions + business rules
    features/       # Per-feature specs (F001–F007+)
    flows/          # End-to-end flow diagrams
```

---

## Feature Specs

| ID   | Feature                  | Status        |
|------|--------------------------|---------------|
| F001 | Assign Fine (single)     | Spec complete |
| F002 | Bulk Fine Assignment     | Spec complete |
| F003 | Pay Fine (MobilePay)     | Spec complete |
| F004 | Team Overview            | Spec complete |
| F005 | Personal Debt Overview   | Spec complete |
| F006 | Delete / Undo Fine       | Spec complete |
| F007 | Activity Log             | Spec complete |
| F008 | Member Welcome & Auth    | Spec complete |

---

## Roles & Permissions

| Action                | Player | Captain | Treasurer | Admin |
|-----------------------|--------|---------|-----------|-------|
| View team overview    | ✓      | ✓       | ✓         | ✓     |
| Assign fine           |        | ✓       | ✓         | ✓     |
| Bulk assign fine      |        | ✓       | ✓         | ✓     |
| Delete fine           |        | ✓       |           | ✓     |
| Approve payment       |        |         | ✓         | ✓     |
| Manage members        |        |         |           | ✓     |
| Manage seasons        |        |         |           | ✓     |

---

## Payment Flow

Payments use **MobilePay deep-linking** — no fintech infrastructure required:

1. Player taps "Pay"
2. App opens MobilePay with prefilled amount + recipient
3. Player transfers manually
4. Admin/Treasurer confirms receipt in the app

---

## Development Philosophy

- **Spec-driven**: all features documented before implementation
- **Mobile-first**: designed for thumbs, not desktop
- **Social-first**: culture software, not accounting software
- **AI-friendly**: structured for GitHub Copilot, Claude, Cursor agents

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
