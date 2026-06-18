/**
 * Research tree nodes.
 * Each node has an id, display name, emoji icon, R&D point cost, and dependency ids
 * that must be unlocked before this node becomes available.
 */
export const RESEARCH_NODES = [
  // ---- Skill unlocks ----
  {
    id: 'skill_frontend_dev',
    name: 'Frontend Development',
    icon: '🖥️',
    cost: 40,
    dependencies: [],
  },
  {
    id: 'skill_backend_dev',
    name: 'Backend Development',
    icon: '🔧',
    cost: 90,
    dependencies: ['skill_frontend_dev'],
  },
  {
    id: 'skill_mobile_dev',
    name: 'Mobile Development',
    icon: '📱',
    cost: 90,
    dependencies: ['skill_frontend_dev'],
  },
  {
    id: 'skill_devops',
    name: 'DevOps',
    icon: '🛠️',
    cost: 160,
    dependencies: ['skill_backend_dev'],
  },
  // ---- Team management ----
  {
    id: 'team_management',
    name: 'Team Management',
    icon: '🧑‍🤝‍🧑',
    cost: 80,
    dependencies: [],
  },
  {
    id: 'project_management',
    name: 'Project Management',
    icon: '📋',
    cost: 90,
    dependencies: [],
  },
  // ---- HR ----
  {
    id: 'hr_basics',
    name: 'HR Basics',
    icon: '👥',
    cost: 60,
    dependencies: [],
  },
  {
    id: 'hr_organised',
    name: 'HR Organised',
    icon: '🗂️',
    cost: 100,
    dependencies: ['hr_basics'],
  },
  {
    id: 'hr_leads_1',
    name: 'HR Leads 1',
    icon: '📈',
    cost: 120,
    dependencies: ['hr_organised'],
  },
  {
    id: 'hr_leads_2',
    name: 'HR Leads 2',
    icon: '📊',
    cost: 150,
    dependencies: ['hr_leads_1'],
  },
  // ---- General research ----
  {
    id: 'agile_workflow',
    name: 'Agile Workflow',
    icon: '🔄',
    cost: 50,
    dependencies: [],
  },
  {
    id: 'project_refresh',
    name: 'Project Refresh',
    icon: '🔃',
    cost: 100,
    dependencies: ['agile_workflow'],
  },
  {
    id: 'hire_refresh',
    name: 'Refresh Hire',
    icon: '🔃',
    cost: 100,
    dependencies: ['hr_basics'],
  },
  {
    id: 'work_schedule',
    name: 'Schedule',
    icon: '🕐',
    cost: 60,
    dependencies: ['agile_workflow'],
  },
  // ---- Company events ----
  {
    id: 'calendar_unlock',
    name: 'Company Calendar',
    icon: '📅',
    cost: 60,
    dependencies: ['work_schedule'],
  },
  {
    id: 'event_frequency_1',
    name: 'Event Planning I',
    icon: '🎉',
    cost: 80,
    dependencies: ['calendar_unlock'],
  },
  {
    id: 'event_frequency_2',
    name: 'Event Planning II',
    icon: '🎊',
    cost: 120,
    dependencies: ['event_frequency_1'],
  },
  // ---- Survival / lives ----
  {
    id: 'life_reserve_1',
    name: 'Reserve Fund I',
    icon: '🩷',
    cost: 70,
    dependencies: [],
  },
  {
    id: 'life_reserve_2',
    name: 'Reserve Fund II',
    icon: '❤️',
    cost: 110,
    dependencies: ['life_reserve_1'],
  },
  {
    id: 'life_reserve_3',
    name: 'Reserve Fund III',
    icon: '💖',
    cost: 150,
    dependencies: ['life_reserve_2'],
  },
  {
    id: 'life_reserve_4',
    name: 'Reserve Fund IV',
    icon: '💎',
    cost: 200,
    dependencies: ['life_reserve_3'],
  },
];
