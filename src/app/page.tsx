import { redirect } from 'next/navigation';

export default function Home() {
  // For now, redirect to the admin dashboard.
  // In the future, this could be a landing page or login page.
  redirect('/admin/dashboard');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">CheckInBonus</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Sistema de Avaliação por Checklist Diário
      </p>
    </div>
  );
}
