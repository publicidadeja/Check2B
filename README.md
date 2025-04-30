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
    *   Rename the `.env.example` file (if present) or create a `.env` file in the root directory.
    *   Open the `.env` file and replace the placeholder values with your actual Firebase project credentials. You can find these in your Firebase project settings.
    *   **Important:** Also generate a strong, unique `JWT_SECRET` for token verification in the middleware. You can use an online generator or a command-line tool like `openssl rand -base64 32`.
    *   **(Optional)** If using AI features, add your `GOOGLE_GENAI_API_KEY`.

    ```env
    # Firebase Configuration - Replace with your actual project values
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

    # JWT Secret for token verification (used in middleware) - Generate a strong secret key
    JWT_SECRET=YOUR_STRONG_SECRET_KEY_FOR_JWT

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
    *   `(admin)`: Route group for administrative pages (Dashboard, Employees, Tasks, Evaluations, Challenges, Ranking, Settings).
    *   `(colaborador)`: Route group for employee pages (Dashboard, Avaliações, Desafios, Ranking, Perfil).
    *   `login`: Login page.
*   `src/components/`: Reusable UI components.
    *   `ui/`: Components from shadcn/ui.
    *   `layout/`: Layout components (MainLayout, EmployeeLayout).
    *   Specific components (e.g., `employee/`, `task/`, `challenge/`, `department/`, `role/`).
*   `src/lib/`: Utility functions and core logic (e.g., `auth.ts`, `utils.ts`).
*   `src/hooks/`: Custom React hooks.
*   `src/types/`: TypeScript type definitions.
*   `src/middleware.ts`: Handles authentication and routing logic.
*   `src/ai/`: Genkit AI related files (flows, instance).

## Key Features

*   **Employee Management:** Add, edit, manage, and view employee information. Activate/deactivate accounts.
*   **Task Management:** Create, categorize, assign (global, by role, department, or individual), and manage daily tasks. Includes criteria for evaluation.
*   **Daily Evaluations:** Admins evaluate task completion (10 or 0) with justifications and optional evidence upload.
*   **Ranking & Awards:** System to rank employees based on performance (checklist + challenges). Admins can configure and manage recurring or specific monthly awards.
*   **Challenges:** Admins create weekly challenges (optional/mandatory) with points, eligibility rules, and evaluation metrics. Employees can view, accept, and submit challenges.
*   **Department & Role Management:** Admins can define and manage departments and roles within the organization.
*   **Separate Interfaces:** Dedicated dashboards and views for Admins and Employees.
*   **Authentication:** Secure login with role-based access control, password management, and admin user management.
*   **Settings:** Configure general system parameters (bonus, zero limits), manage admin users, and handle basic backup/restore operations (simulated).

