
import type { Task } from '@/types/task';

const DEFAULT_ORG_ID = 'org_default'; // Define a default org ID for mock data

export let mockTasks: Task[] = [
  { id: 't1', title: 'Verificar Emails', description: 'Responder a todos os emails pendentes.', criteria: 'Caixa de entrada zerada ou emails urgentes respondidos.', category: 'Comunicação', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'Recrutadora', organizationId: DEFAULT_ORG_ID },
  { id: 't2', title: 'Reunião Diária', description: 'Participar da reunião da equipe.', criteria: 'Presença e participação ativa.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'department', assignedEntityId: 'Engenharia', organizationId: DEFAULT_ORG_ID },
  { id: 't3', title: 'Atualizar CRM', description: 'Registrar novas interações no CRM.', criteria: 'CRM atualizado com atividades do dia.', category: 'Vendas', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'Executivo de Contas', organizationId: DEFAULT_ORG_ID },
  { id: 't4', title: 'Postar em Redes Sociais', description: 'Agendar/publicar post planejado.', criteria: 'Post publicado conforme planejado.', category: 'Marketing', periodicity: 'specific_days', assignedTo: 'role', assignedEntityId: 'Analista de Marketing', organizationId: DEFAULT_ORG_ID },
  { id: 't5', title: 'Revisar Código', description: 'Revisar pull requests designados.', criteria: 'PRs revisados com feedback.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'individual', assignedEntityId: '2' /* Beto Santos ID */, organizationId: DEFAULT_ORG_ID },
  { id: 't6', title: 'Relatório Semanal', description: 'Compilar dados e criar relatório.', criteria: 'Relatório completo e enviado.', category: 'Geral', periodicity: 'specific_days' /* e.g., Sextas */, organizationId: DEFAULT_ORG_ID },
];
