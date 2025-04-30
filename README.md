# Check2B - Sistema de Avaliação Diária

This is a Next.js application for managing daily employee evaluations using a checklist system.

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Configure Firebase & Environment Variables:**
    *   Create a `.env` file in the root directory (you can copy `.env.example`).
    *   Open the `.env` file and replace the placeholder values with your **actual Firebase project credentials**. You can find these in your Firebase project settings (Project settings > General > Your apps > Web app > SDK setup and configuration > Config).
    *   **VERY IMPORTANT:** Ensure `NEXT_PUBLIC_FIREBASE_API_KEY` is correct. An invalid key will cause login errors (`auth/api-key-not-valid`). Double-check for typos or copy/paste errors.
    *   **Important:** Also generate a strong, unique `JWT_SECRET` for token verification in the middleware. You can use an online generator or a command-line tool like `openssl rand -base64 32`.
    *   **(Optional)** If using AI features, add your `GOOGLE_GENAI_API_KEY`.

    ```env
    # Firebase Configuration - Replace with your actual project values
    # FOUND IN: Firebase Console > Project Settings > General > Your Apps > Web App > SDK setup and configuration > Config
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE_COPY_PASTE_CAREFULLY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

    # JWT Secret for token verification (used in middleware) - Generate a strong secret key
    # Example command: openssl rand -base64 32
    JWT_SECRET=YOUR_STRONG_SECRET_KEY_FOR_JWT_MUST_BE_SET

    # Google Generative AI API Key (Optional - Needed for AI features)
    # GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

    Open [http://localhost:9002](http://localhost:9002) (or your configured port) with your browser to see the result.

## Project Structure

*   `src/app/`: Contains the application routes using the Next.js App Router.
    *   `(admin)`: Route group for administrative pages (Dashboard, Employees, Tasks, Evaluations, Challenges, Ranking, Settings). Root `/` also falls under this.
    *   `(colaborador)`: Route group for employee pages (Dashboard, Avaliações, Desafios, Ranking, Perfil).
    *   `login`: Login page.
*   `src/components/`: Reusable UI components.
    *   `ui/`: Components from shadcn/ui.
    *   `layout/`: Layout components (MainLayout, EmployeeLayout).
    *   Specific components (e.g., `employee/`, `task/`, `challenge/`, `department/`, `role/`).
*   `src/lib/`: Utility functions and core logic (e.g., `auth.ts`, `utils.ts`).
*   `src/hooks/`: Custom React hooks.
*   `src/types/`: TypeScript type definitions.
*   `src/middleware.ts`: Handles authentication and routing logic based on JWT stored in cookies.
*   `src/ai/`: Genkit AI related files (flows, instance).

## Key Features

*   **Employee Management:** Add, edit, manage, and view employee information. Activate/deactivate accounts.
*   **Task Management:** Create, categorize, assign (global, by role, department, or individual), and manage daily tasks. Includes criteria for evaluation.
*   **Daily Evaluations:** Admins evaluate task completion (10 or 0) with justifications and optional evidence upload.
*   **Ranking & Awards:** System to rank employees based on performance (checklist + challenges). Admins can configure and manage recurring or specific monthly awards.
*   **Challenges:** Admins create weekly challenges (optional/mandatory) with points, eligibility rules, and evaluation metrics. Employees can view, accept, and submit challenges.
*   **Department & Role Management:** Admins can define and manage departments and roles within the organization.
*   **Separate Interfaces:** Dedicated dashboards and views for Admins and Employees, enforced by middleware.
*   **Authentication:** Secure login with role-based access control, password management (reset by admin), and admin user management. Uses Firebase Auth and JWT cookies.
*   **Settings:** Configure general system parameters (bonus, zero limits), manage admin users, and handle basic backup/restore operations (simulated).
