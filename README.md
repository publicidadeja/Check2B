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
    *   Create a `.env` file in the root directory (you can copy `.env.example` if one exists, or create it from scratch).
    *   Open the `.env` file and replace the placeholder values with your **actual Firebase project credentials and other necessary keys**.

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

    # reCAPTCHA v3 Site Key (Required for Firebase App Check)
    # This is the "Chave do Site" (Site Key) obtained from the Google Cloud Console for reCAPTCHA v3.
    # See "Configuring Firebase App Check with reCAPTCHA v3" section below.
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY=SUA_CHAVE_DO_SITE_RECAPTCHA_VAI_AQUI

    # Firebase App Check Debug Token (Optional - Recommended for localhost development)
    # See "Configuring Firebase App Check with reCAPTCHA v3" section below.
    # NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=YOUR_APPCHECK_DEBUG_TOKEN_HERE
    ```
    **Note on reCAPTCHA Keys:**
    *   The `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is for the **Chave do Site (Site Key)**.
    *   The **Chave Secreta (Secret Key)** for reCAPTCHA v3 is used by Google's services and Firebase App Check on the backend. You typically do **not** put the Secret Key directly into your Next.js application's environment variables for this setup. You provide it when registering your site with reCAPTCHA in the Google Cloud Console, and Firebase handles the server-side verification.

3.  **Configuring Firebase App Check with reCAPTCHA v3:**
    *   Firebase App Check helps protect your backend resources (like Cloud Functions) from abuse. For web apps, it often uses reCAPTCHA v3.
    *   **CRUCIAL:** Several Cloud Functions in this project have `enforceAppCheck: true`. Without proper App Check setup, these functions will fail.

    *   **3.1. Create a reCAPTCHA v3 Site Key and Secret Key:**
        *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
        *   Select your Firebase project.
        *   Navigate to "Security" > "reCAPTCHA Enterprise" (or the classic reCAPTCHA admin page if you've used it before).
        *   Create a new key:
            *   Choose **reCAPTCHA v3**.
            *   Add `localhost` to the list of domains for development.
            *   Add your production domain(s) once you deploy (e.g., `your-app.com`, `*.vercel.app`).
        *   After creation, you will get a **Chave do Site (Site Key)** and a **Chave Secreta (Secret Key)**.

    *   **3.2. Add Site Key to Environment Variables:**
        *   In your `.env` file (and on your Vercel deployment environment variables), set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to the **Chave do Site (Site Key)** you just copied.

    *   **3.3. Configure App Check in Firebase Console:**
        *   Go to your [Firebase Console](https://console.firebase.google.com/) > Project.
        *   Navigate to "App Check" (under "Build" or "Release & Monitor" in the left sidebar).
        *   Click on the "Apps" tab. Find your web application in the list and click on it (or register it if not present).
        *   Under "Provedores de atestado", click on "reCAPTCHA v3".
        *   Paste the **Chave do Site (Site Key)** (the same one you put in your `.env` file) into the appropriate field.
        *   Save the reCAPTCHA v3 configuration.
        *   **Importante (Aplicar App Check aos Serviços):** Depois de configurar o provedor (reCAPTCHA v3), o próximo passo crucial é **ativar a aplicação do App Check** para os serviços do Firebase que você deseja proteger.
            *   Ainda na seção 'App Check' do console do Firebase (onde você acabou de configurar o provedor), procure uma lista ou cartões representando os serviços do Firebase (por exemplo, Cloud Functions, Realtime Database, Cloud Storage, Cloud Firestore). Esta seção pode se chamar "Serviços" ou estar integrada na página principal do App Check.
            *   Clique em cada serviço que sua aplicação utiliza e para o qual você deseja proteção (especialmente **Cloud Functions**, pois as funções deste projeto têm `enforceAppCheck: true`).
            *   Dentro da configuração de cada serviço, você encontrará um botão ou chave para **'Aplicar' (Enforce)** ou **'Ativar aplicação de políticas'**. Certifique-se de que esta opção esteja ativada.
            *   Se você não aplicar o App Check aos seus Cloud Functions, as chamadas para eles serão bloqueadas.

    *   **3.4. (Optional but Recommended for Localhost) App Check Debug Token:**
        *   For testing on `localhost`, App Check might block requests unless you use a debug token.
        *   In the Firebase Console > App Check > Apps tab > Your Web App > (click the three-dot menu) > "Manage debug tokens".
        *   Click "Add debug token" and generate a new token.
        *   Copy this token and add it to your `.env` file:
            `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=PASTE_YOUR_DEBUG_TOKEN_HERE`
        *   The application code in `src/lib/firebase.ts` is already set up to use this environment variable if present on `localhost`.

    *   **3.5. Register Production Domains:**
        *   **After deploying your application**, remember to go back to the Google Cloud Console (reCAPTCHA settings for your key) and add your **production domain(s)** (e.g., `your-app.vercel.app`, `your-custom-domain.com`) to the list of allowed domains for your reCAPTCHA key. This ensures reCAPTCHA works on your live site.

4.  **Create Users in Firebase Authentication:**
    *   **CRUCIAL:** For users to be able to log in, they **MUST** be created manually in the Firebase Console. Go to your Firebase project -> Authentication -> Users -> Add user.
    *   Use the email address intended for login (e.g., `admin@check2b.com`, `leocorax@gmail.com`) and set the password you want them to use.
    *   The "Add Colaborador" feature in the admin panel **only adds user profile data** to Firestore; it **does not create authentication users** nor set their passwords or roles for login.
    *   To assign roles (super_admin, admin, collaborator) for proper redirection and permissions, you **must** set Custom Claims for each user. This is typically done using the Firebase Admin SDK (e.g., in a Cloud Function or a separate backend script). The provided `setCustomUserClaimsFirebase` Cloud Function can be used by a Super Admin for this purpose.

5.  **Run the Development Server:**
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
    *   `(superadmin)`: Route group for super administrative pages (Organizations, Plans, Global Settings).
    *   `login`: Login page.
*   `src/components/`: Reusable UI components.
    *   `ui/`: Components from shadcn/ui.
    *   `layout/`: Layout components (MainLayout, MobileLayout, SuperAdminLayout).
    *   Specific components (e.g., `employee/`, `task/`, `challenge/`, `department/`, `role/`, `organization/`, `plan/`).
*   `src/lib/`: Utility functions and core logic (e.g., `auth.ts`, `firebase.ts`, service files for Firestore collections).
*   `src/hooks/`: Custom React hooks.
*   `src/types/`: TypeScript type definitions.
*   `src/middleware.ts`: Handles authentication and routing logic based on JWT stored in cookies.
*   `src/ai/`: Genkit AI related files (flows, instance).
*   `functions/`: Firebase Cloud Functions.

## Key Features

*   **Employee Management:** Add, edit, manage, and view employee information. Activate/deactivate accounts. *(Note: This manages user profiles in Firestore. Actual authentication users must be created in Firebase Auth and have custom claims set for roles/organization.)*
*   **Task Management:** Create, categorize, assign (global, by role, department, or individual), and manage daily tasks. Includes criteria for evaluation.
*   **Daily Evaluations:** Admins evaluate task completion (10 or 0) with justifications and optional evidence upload.
*   **Ranking & Awards:** System to rank employees based on performance (checklist + challenges). Admins can configure and manage recurring or specific monthly awards.
*   **Challenges:** Admins create weekly challenges (optional/mandatory) with points, eligibility rules, and evaluation metrics. Employees can view, accept, and submit challenges.
*   **Department & Role Management:** Admins can define and manage departments and roles within the organization.
*   **Separate Interfaces:** Dedicated dashboards and views for Super Admins, Admins, and Employees, enforced by middleware.
*   **Authentication:** Secure login with role-based access control, password management, and user management capabilities for admins/super admins. Uses Firebase Auth and custom claims. *(Requires manual user creation in Firebase Console and custom claim setup for roles/orgs.)*
*   **Settings:** Configure general system parameters (bonus, zero limits), manage admin users (for organization admins), and handle basic backup/restore operations (simulated).
*   **Super Admin Panel:** Manage organizations, subscription plans, and global system settings.

## Firebase Cloud Functions (`functions/index.js`)

This project uses Firebase Cloud Functions (v2) for backend operations that require admin privileges or server-side logic. Key functions include:

*   `setCustomUserClaimsFirebase`: Called by a Super Admin to set roles (super_admin, admin, collaborator) and `organizationId` as custom claims on a Firebase Auth user. This is essential for role-based access control in the frontend and middleware.
*   `createOrganizationAdmin`: Called by a Super Admin to create a new organization and its first admin user. Sets appropriate custom claims.
*   `createOrganizationUser`: Called by an Admin (of their own organization) or Super Admin to create a new collaborator (employee) user within a specific organization. Sets 'collaborator' role and `organizationId` claims.
*   `deleteOrganizationUser`: Called by an Admin (for users in their org) or Super Admin to delete a user from Firebase Auth and their profile from Firestore.
*   `toggleUserStatusFirebase`: Called by an Admin (for users in their org) or Super Admin to activate/deactivate a user account (updates Firestore status and Firebase Auth `disabled` state).
*   `removeAdminFromOrganizationFirebase`: Called by a Super Admin to demote an Admin of an organization to a 'collaborator' role (updates custom claims and Firestore role).
*   `addAdminToMyOrg`: Called by an existing Admin to add another Admin to *their own* organization.
*   `demoteAdminInMyOrg`: Called by an existing Admin to demote another Admin in *their own* organization to 'collaborator'.
*   **Notification Triggers:** Firestore triggers (`onEvaluationWritten`, `onChallengeParticipationEvaluated`, `onAwardHistoryCreatedV2`, `onChallengePublished`) that automatically send real-time notifications to users based on events in the database.

**Important for Cloud Functions:**
*   **App Check Enforcement:** Many of these functions use `enforceAppCheck: true`. This means that **Firebase App Check must be correctly configured with reCAPTCHA v3 for your web app**, otherwise, these functions will fail with permission errors. Follow the "Configuring Firebase App Check with reCAPTCHA v3" section carefully.
*   **Deployment:** Deploy functions using `firebase deploy --only functions`.
*   **Logging:** Check Firebase Functions logs in the Google Cloud Console for debugging.

## Important Notes on User Management & Authentication (docs/important_notes.md)

Please refer to `docs/important_notes.md` for a detailed explanation of the distinction between **Employee Data Management** within the app and **Firebase Authentication User Management & Custom Claims**, which are crucial for login and role-based access.

