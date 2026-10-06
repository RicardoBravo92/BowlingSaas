# Bowling SaaS - Frontend

A React + TypeScript + Vite single-page application for the Bowling Alley management system. It consumes the [FastAPI backend](../backend/README.md) and provides the customer booking experience plus the staff/owner administrative suite.

## 🚀 Features

- **Authentication**: JWT-based session managed in `AuthContext`, with registration, login, and password reset (forgot/reset) flows.
- **Role-Based Access Control**: Routes and UI adapt to the user role (**Owner, Manager, Cashier, Maintenance, User**) via `ProtectedRoute`.
- **Booking Grid**: Availability view with slot selection and full reservation lifecycle.
- **Administrative Suite**: Owner-only dashboard with metrics, user/role management, booking status management, and lane/slot configuration.
- **Modern UI**: Tailwind CSS v4 with shadcn/ui (Radix UI) components, a collapsible sidebar, and a responsive layout.
- **Spanish-first UX**: All user-facing copy and validation messages are in Spanish.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 7](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) on top of [Radix UI](https://www.radix-ui.com/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **HTTP Client**: [Axios](https://axios-http.com/) with a centralized instance and 401 interceptor
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) via `@hookform/resolvers`
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Icons & Dates**: [Lucide](https://lucide.dev/) and [date-fns](https://date-fns.org/)

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) **20.19+ or 22.12+** (Vite 7 requirement)
- A running instance of the **Bowling SaaS API** (default `http://localhost:8000`)

## 🔧 Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure the API URL** (optional):
   By default the app expects the API at `http://localhost:8000/api/v1`. To override it, create a `.env` file in `frontend/`:
   ```bash
   VITE_API_URL=http://localhost:8000/api/v1
   ```

3. **Point the backend reset links at the frontend**:
   For password-reset emails to open the right page, set `FRONTEND_URL` in the backend `.env` to the Vite dev server:
   ```bash
   FRONTEND_URL=http://localhost:5173
   ```

## 🚀 Running the Application

Start the development server with hot-reload:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over the project |

## 🗺️ Routes

| Route | Description | Access |
| --- | --- | --- |
| `/` | Public landing page | Public |
| `/login` | Sign in | Public |
| `/register` | Create an account | Public |
| `/forgot-password` | Request a password-reset email | Public |
| `/reset-password` | Set a new password using a token from the email | Public |
| `/dashboard` | Overview; metrics visible to Owner only | Authenticated (Owner for data) |
| `/bookings` | Book a lane / view the reservation grid | Authenticated |
| `/admin-bookings` | Manage bookings, assign users, change status | Owner, Manager, Cashier |
| `/users` | Manage users and roles | Owner |
| `/settings` | Lane and price-slot configuration | Owner, Manager, Cashier |
| `/infrastructure` | Infrastructure management | Owner, Manager, Maintenance |

## 📂 Project Structure

```text
src/
├── api/             # Axios instance and typed endpoint helpers
├── components/
│   ├── auth/        # ProtectedRoute guard
│   ├── layout/      # MainLayout and Sidebar
│   └── ui/          # shadcn/ui primitives
├── contexts/        # AuthContext (session, user, refreshUser)
├── lib/             # Shared utilities (e.g. api-error helper)
├── pages/
│   ├── admin/       # Bookings, Users, Settings
│   ├── auth/        # Login, Register, Forgot/Reset password
│   ├── bookings/    # MyBookings and booking grid
│   ├── dashboard/   # Owner dashboard
│   ├── home/        # Landing page
│   └── infrastructure/
├── App.tsx          # Application routes
└── main.tsx         # Entry point
```

## 🧪 Quality

This project relies on TypeScript and ESLint for static checks. Run them before building:

```bash
npm run lint
npm run build
```

## 🛡️ License

This project is licensed under the MIT License.