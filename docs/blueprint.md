# **App Name**: CheckUp

## Core Features:

- Employee Management: User-friendly interface for administrators to add, edit, and manage employees, including personal, professional, and contact information.
- Task Management: Administrators can create, edit, and categorize tasks, setting titles, descriptions, and criteria for completion. Tasks can be assigned to specific roles, departments, or individual employees.
- Daily Evaluations: Administrators use a streamlined interface to evaluate employee task completion with a binary (10 or 0) score. Justifications and evidence (photos, files) can be added for '0' scores. Reports are generated to show employee performance and bonus projections.

## Style Guidelines:

- Primary color: Clean white or light grey for a professional look.
- Secondary color: Soft blue or green to provide a sense of calm and reliability.
- Accent: Use a shade of teal (#008080) for interactive elements to draw attention.
- Clear and professional sans-serif fonts for all text.
- Consistent and easily recognizable icons for tasks and navigation.
- Clean and intuitive layout with clear hierarchy and spacing.

## Original User Request:
Prompt para Desenvolvimento de Aplicativo Mobile: Sistema de Avaliação por Checklist Diário
Visão Geral do Aplicativo
Desenvolva um aplicativo mobile multiplataforma (iOS e Android) para gerenciamento de avaliações diárias de colaboradores através de um sistema de checklist. O sistema deve permitir avaliações binárias (10 ou 0) para tarefas diárias e calcular automaticamente bonificações mensais com base no desempenho.

Requisitos Funcionais
1. Painel Administrativo (Acesso Admin)
Login exclusivo com credenciais administrativas
Dashboard administrativo completo com métricas gerais da equipe
Funções exclusivas do administrador:
Cadastrar, editar e remover colaboradores
Definir e gerenciar tarefas padrão por função/departamento
Atribuir tarefas específicas a colaboradores individuais
Realizar avaliações diárias de todos os colaboradores
Visualizar e exportar relatórios completos de desempenho
Configurar parâmetros do sistema (valores de bonificação, limites de "zeros")
Gerenciar outros usuários administrativos (criar contas admin adicionais)
Resetar senhas de colaboradores
Fazer backup e restauração de dados
2. Gestão de Usuários
Sistema de cadastro exclusivo para administradores
Administradores podem criar contas para colaboradores
Perfis de acesso claramente diferenciados: Administrador e Colaborador
Cadastro de colaboradores com informações detalhadas:
Dados pessoais (nome, ID, foto)
Informações profissionais (departamento, função, data de admissão)
Informações de contato (email, telefone)
Configurações de notificação
Opção para ativar/desativar/arquivar colaboradores
Histórico de alterações em cadastros
3. Gestão de Tarefas (Admin)
Interface intuitiva para cadastro de tarefas padrão por função/departamento
Editor de tarefas com:
Título da tarefa
Descrição detalhada
Critérios de cumprimento satisfatório (o que constitui nota 10)
Categoria/grupo da tarefa
Prioridade/importância
Periodicidade (diária, dias específicos, datas específicas)
Clonagem de tarefas para facilitar criação de listas similares
Organização de tarefas em grupos lógicos
Biblioteca de tarefas pré-configuradas para reutilização
Opção para importar/exportar listas de tarefas em formatos padrão (CSV, Excel)
4. Sistema de Avaliação (Admin)
Interface otimizada para avaliação rápida de múltiplos colaboradores
Avaliação binária: 10 (tarefa cumprida satisfatoriamente) ou 0 (não cumprida/insatisfatória)
Recursos durante avaliação:
Filtros por departamento/função para avaliar grupos específicos
Visualização de histórico recente do colaborador
Campo obrigatório de justificativa para notas zero
Capacidade de anexar evidências (fotos, arquivos)
Opção de salvar avaliação como rascunho
Possibilidade de revisão e edição de avaliações recentes (com registro de alterações)
Avaliações em lote para tarefas comuns a vários colaboradores
Opção para delegar avaliações específicas a outros administradores
Programação de avaliações para datas futuras
5. Dashboard e Relatórios Administrativos
Dashboard administrativo com:
Visão geral do desempenho da equipe em tempo real
Indicadores de desempenho por departamento/função
Colaboradores com melhor/pior desempenho no período
Tarefas com maior índice de falhas
Projeção de pagamentos de bonificação para o mês atual
Relatórios avançados:
Desempenho individual detalhado
Comparativo entre colaboradores/departamentos
Evolução temporal de desempenho
Análise de tarefas críticas
Projeção de custos com bonificações
Exportação de relatórios em múltiplos formatos (PDF, Excel, CSV)
Agendamento de relatórios periódicos por email
Relatórios personalizáveis com filtros avançados
6. Acesso de Colaboradores
Visão limitada às próprias avaliações e desempenho
Dashboard pessoal com:
Avaliações recentes
Contagem atual de zeros no mês
Histórico de desempenho
Projeção de bonificação para o mês atual
Feedback recebido dos avaliadores
Visualização das tarefas diárias esperadas
Alertas sobre desempenho crítico
Impossibilidade de alterar avaliações recebidas
7. Notificações e Comunicações
Sistema de notificações push configurável
Notificações automáticas para administradores:
Lembretes de avaliações pendentes
Alertas sobre colaboradores com desempenho crítico
Resumos periódicos de desempenho da equipe
Notificações para colaboradores:
Novas avaliações recebidas
Alertas sobre acúmulo de zeros no mês
Lembretes sobre tarefas específicas
Canal de comunicação direta entre admin e colaborador
Opção para envio de comunicados em massa
Requisitos Técnicos
1. Arquitetura e Tecnologia
Aplicativo nativo ou híbrido (React Native, Flutter ou similar)
Backend robusto com API RESTful
Banco de dados relacional para gerenciamento de dados
Autenticação segura com tokens JWT e níveis de permissão
Armazenamento em nuvem para evidências e anexos
2. Interface e UX
Painéis administrativos ricos e intuitivos
Fluxos de avaliação otimizados para rapidez e eficiência
Design responsivo adaptado a diferentes dispositivos
Experiência diferenciada para admin e colaborador
Atalhos e gestos para operações frequentes
Interface de avaliação em lote para maior produtividade
Modo offline para avaliação em áreas sem conectividade
3. Segurança e Auditoria
Sistema completo de logs para todas as ações administrativas
Registro de timestamp e usuário para todas as operações
Histórico detalhado de alterações em avaliações
Níveis de permissão configuráveis para diferentes tipos de admin
Bloqueio automático por inatividade
Criptografia de dados sensíveis
Conformidade com regulamentações de proteção de dados
4. Integração e Extensibilidade
API documentada para integração com sistemas de RH e folha de pagamento
Webhooks para eventos importantes
Importação/exportação de dados em formatos padrão
Sistema de plugins para funcionalidades adicionais
Arquitetura modular para facilitar expansões futuras
Fluxo Principal do Administrador
Login Administrativo:

Acesso via credenciais administrativas com autenticação de dois fatores opcional
Dashboard Principal:

Visão geral do sistema com métricas-chave e ações pendentes
Acesso rápido às principais funções administrativas
Gestão de Colaboradores:

Cadastrar novos colaboradores
Editar informações de colaboradores existentes
Ativar/desativar colaboradores
Visualizar histórico de desempenho individual
Gestão de Tarefas:

Criar e editar tarefas padrão por função/departamento
Organizar tarefas em categorias
Definir periodicidade e critérios de avaliação
Atribuir tarefas específicas a colaboradores individuais
Processo de Avaliação:

Selecionar colaborador ou grupo
Visualizar checklist de tarefas do dia
Avaliar cada item como 10 (satisfatório) ou 0 (insatisfatório)
Adicionar justificativa para itens avaliados como 0
Anexar evidências quando necessário
Finalizar e enviar avaliação
Análise e Relatórios:

Gerar relatórios de desempenho individual e coletivo
Analisar tendências e padrões
Identificar áreas problemáticas
Visualizar projeção de bonificações
Exportar dados para análise externa
Configurações do Sistema:

Ajustar parâmetros de bonificação (valores e limites)
Configurar notificações e lembretes
Gerenciar contas administrativas
Realizar backup do sistema
Considerações de Implementação
Implementar cache local para operações offline com sincronização posterior
Otimizar para avaliações em massa (vários colaboradores em sequência)
Desenvolver algoritmos de análise para identificar padrões problemáticos
Criar sistema de templates para facilitar a criação de checklists recorrentes
Garantir responsividade para uso tanto em smartphones quanto em tablets
Incluir tutoriais interativos para novos administradores
Entregáveis Esperados
Aplicativo mobile completo com interfaces diferenciadas para admin e colaborador
Painel administrativo web com funcionalidades avançadas
Backend robusto com API documentada
Banco de dados otimizado com sistema de backup
Documentação técnica e manuais de usuário (admin e colaborador)
Material de treinamento para administradores
Este sistema oferecerá uma solução completa para gestão de desempenho através de checklists diários, centralizando o controle nas mãos dos administradores, enquanto proporciona transparência aos colaboradores sobre seu desempenho e potenciais bonificações.
  