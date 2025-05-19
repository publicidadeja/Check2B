
import type { Plan } from '@/types/plan';

export let mockPlans: Plan[] = [
  {
    id: 'plan_basic_monthly',
    name: 'Básico Mensal',
    description: 'Ideal para pequenas equipes começando.',
    priceMonthly: 29.90,
    features: ['Até 10 usuários', 'Funcionalidades Essenciais', 'Suporte por Email'],
    userLimit: 10,
    adminLimit: 1,
    status: 'active',
    createdAt: new Date(2023, 0, 1),
  },
  {
    id: 'plan_premium_monthly',
    name: 'Premium Mensal',
    description: 'Para equipes em crescimento com necessidades avançadas.',
    priceMonthly: 79.90,
    features: ['Até 50 usuários', 'Todas Funcionalidades', 'Desafios e Ranking Avançado', 'Suporte Prioritário'],
    userLimit: 50,
    adminLimit: 5,
    status: 'active',
    isPopular: true,
    createdAt: new Date(2023, 0, 1),
  },
  {
    id: 'plan_enterprise_yearly',
    name: 'Enterprise Anual',
    description: 'Solução completa para grandes organizações.',
    priceMonthly: 199.90, // Pode ser usado para calcular o anual ou ter um preço anual direto
    priceYearly: 1999.00,
    features: ['Usuários Ilimitados', 'Funcionalidades Personalizadas', 'SLA Dedicado', 'Suporte Premium 24/7', 'Gestor de Contas'],
    userLimit: 'unlimited',
    adminLimit: 'unlimited',
    status: 'active',
    createdAt: new Date(2023, 0, 1),
  },
  {
    id: 'plan_legacy_free',
    name: 'Legado Gratuito (Inativo)',
    description: 'Plano antigo, não mais oferecido.',
    priceMonthly: 0,
    features: ['Funcionalidades básicas limitadas'],
    userLimit: 5,
    adminLimit: 1,
    status: 'inactive',
    createdAt: new Date(2022, 0, 1),
  },
];
