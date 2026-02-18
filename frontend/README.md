# Community Reporting Frontend Prototype

A frontend prototype for a community reporting platform built with React and Vite.

## Purpose

This app demonstrates the core user flow for reporting local issues and engaging with community posts:
- Account registration and login
- Browsing the report feed
- Creating new reports
- Viewing profiles
- Interacting with reports through likes and comments

## Tech Stack

- React 19
- Vite 7
- React Router 7
- Axios
- Tailwind CSS 4
- Lucide React icons

## Prototype Scope

Implemented in this prototype:
- Client-side routing
- Auth context and local auth service helpers
- Report feed and create flow
- Profile page
- Comment and like API integration

Not covered yet:
- Robust production auth/security
- End-to-end test coverage
- Deployment pipeline and environment hardening

## Project Structure

```text
frontend/
  src/
    components/      UI components (auth, header, comments, etc.)
    pages/           Route-level pages (Feed, CreateReport, Profile)
    services/        API and auth service modules
    context/         React context providers
```

## Getting Started

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

Default Vite URL:
- `http://localhost:5173`

### 3. Backend API

The frontend is configured to call:
- `http://localhost:5000/api`

If your backend runs elsewhere, update `baseURL` in:
- `src/services/api.js`

## Scripts

- `npm run dev` - start local development server
- `npm run build` - build production assets
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint

## Status

This is a working prototype intended for rapid iteration.
