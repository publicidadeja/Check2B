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

2.  **Configure Firebase:**
    *   Rename the `.env.example` file (if present) or create a `.env` file in the root directory.
    *   Open the `.env` file and replace the placeholder values with your actual Firebase project credentials. You can find these in your Firebase project settings.
    *   **Important:** Also generate a strong, unique `JWT_SECRET` for token verification in the middleware. You can use an online generator or a command-line tool like `openssl rand -base64 32`.

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
    *   `(admin)`: Route group for administrative pages.
    *   `(colaborador)`: Route group for employee pages.
    *   `login`: Login page.
*   `src/components/`: Reusable UI components.
    *   `ui/`: Components from shadcn/ui.
    *   `layout/`: Layout components (MainLayout, EmployeeLayout).
    *   Specific components (e.g., `employee/`, `task/`).
*   `src/lib/`: Utility functions and core logic (e.g., `auth.ts`, `utils.ts`).
*   `src/hooks/`: Custom React hooks.
*   `src/types/`: TypeScript type definitions.
*   `src/middleware.ts`: Handles authentication and routing logic.

## Key Features

*   **Employee Management:** Add, edit, and manage employee information.
*   **Task Management:** Create, categorize, and assign daily tasks.
*   **Daily Evaluations:** Admins evaluate task completion (10 or 0).
*   **Ranking & Awards:** System to rank employees based on performance and manage awards.
*   **Challenges:** Weekly challenges for extra points and engagement.
*   **Separate Interfaces:** Dedicated dashboards and views for Admins and Employees.
*   **Authentication:** Secure login and role-based access control.

