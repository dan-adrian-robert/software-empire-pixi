/**
 * Project template pool.
 * At the start of each day the Simulation draws from this pool to fill
 * `Company.availableProjects` up to a cap.
 *
 * Each template: { id, name, description, requirements, basePayout, insurance, milestones, tier }
 *   tier: 1 = startup  2 = local  3 = national  4 = enterprise
 *
 * `points` in each requirement = SP needed in that skill.
 * basePayout formula: base_sp × numSkills × 15
 *
 * Milestone deadlines are expressed in elapsed days from acceptance (inclusive).
 * insurance = Math.round(totalSP × 2.5)
 * Timing derived from buildProjectTiming(totalSp, tier).
 */
import { SKILLS } from './skills.js';

/**
 * Derive milestone deadlines and insurance cost from total SP and tier.
 * onTrack deadline = ceil(totalSp / (8 + tier * 4)), minimum 2.
 */
function buildProjectTiming(totalSp, tier) {
  const onTrack = Math.max(2, Math.ceil(totalSp / (8 + tier * 4)));
  return {
    milestones: {
      ahead:    Math.max(1, onTrack - 2),
      onTrack,
      delayed:  onTrack + 2,
      critical: onTrack + 4,
    },
    insurance: Math.round(totalSp * 2.5),
  };
}

export const PROJECT_TEMPLATES = [
  // ── Tier 1 — Startup / Freelance ─────────────────────────────────────────

  {
    id: 'frontend_001',
    name: 'Static Landing Page',
    description: 'A local business needs a clean, fast static landing page.',
    requirements: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, points: 20 }],
    basePayout: 300,    // 20 * 1 * 15
    tier: 1,
    ...buildProjectTiming(20, 1),
  },
  {
    id: 'frontend_002',
    name: 'Portfolio Website',
    description: 'A freelance designer needs a personal portfolio online.',
    requirements: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, points: 30 }],
    basePayout: 450,    // 30 * 1 * 15
    tier: 1,
    ...buildProjectTiming(30, 1),
  },
  {
    id: 'backend_001',
    name: 'REST API Service',
    description: 'A client needs a simple REST API for their data layer.',
    requirements: [{ skill: SKILLS.BACKEND_DEVELOPMENT, points: 35 }],
    basePayout: 525,    // 35 * 1 * 15
    tier: 1,
    ...buildProjectTiming(35, 1),
  },
  {
    id: 'mobile_001',
    name: 'Simple Mobile App',
    description: 'Build a straightforward single-screen utility mobile app.',
    requirements: [{ skill: SKILLS.MOBILE_DEVELOPMENT, points: 40 }],
    basePayout: 600,    // 40 * 1 * 15
    tier: 1,
    ...buildProjectTiming(40, 1),
  },
  {
    id: 'frontend_003',
    name: 'Admin Dashboard UI',
    description: 'A startup needs a data-rich admin panel to monitor KPIs.',
    requirements: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, points: 50 }],
    basePayout: 750,    // 50 * 1 * 15
    tier: 1,
    ...buildProjectTiming(50, 1),
  },
  {
    id: 'devops_001',
    name: 'CI/CD Pipeline',
    description: 'Set up automated build, test, and deploy workflows for a small team.',
    requirements: [{ skill: SKILLS.DEVOPS, points: 50 }],
    basePayout: 750,    // 50 * 1 * 15
    tier: 1,
    ...buildProjectTiming(50, 1),
  },

  // ── Tier 2 — Local Company ────────────────────────────────────────────────

  {
    id: 'backend_002',
    name: 'Authentication System',
    description: 'Design a secure sign-up, login, and session management service.',
    requirements: [{ skill: SKILLS.BACKEND_DEVELOPMENT, points: 55 }],
    basePayout: 825,    // 55 * 1 * 15
    tier: 2,
    ...buildProjectTiming(55, 2),
  },
  {
    id: 'mobile_002',
    name: 'Fitness Tracker App',
    description: 'A health startup wants a mobile app to log workouts and nutrition.',
    requirements: [{ skill: SKILLS.MOBILE_DEVELOPMENT, points: 70 }],
    basePayout: 1050,   // 70 * 1 * 15
    tier: 2,
    ...buildProjectTiming(70, 2),
  },
  {
    id: 'backend_003',
    name: 'Payment Processing Service',
    description: 'Integrate a secure payment gateway into an existing platform.',
    requirements: [{ skill: SKILLS.BACKEND_DEVELOPMENT, points: 80 }],
    basePayout: 1200,   // 80 * 1 * 15
    tier: 2,
    ...buildProjectTiming(80, 2),
  },
  {
    id: 'devops_002',
    name: 'Cloud Infrastructure Setup',
    description: 'Provision and configure scalable cloud resources for a growing SaaS.',
    requirements: [{ skill: SKILLS.DEVOPS, points: 85 }],
    basePayout: 1275,   // 85 * 1 * 15
    tier: 2,
    ...buildProjectTiming(85, 2),
  },
  {
    id: 'mobile_003',
    name: 'Social Chat Application',
    description: 'A community platform needs real-time messaging on mobile.',
    requirements: [{ skill: SKILLS.MOBILE_DEVELOPMENT, points: 100 }],
    basePayout: 1500,   // 100 * 1 * 15
    tier: 2,
    ...buildProjectTiming(100, 2),
  },
  {
    id: 'fullstack_001',
    name: 'Login System',
    description: 'Build a secure login flow with a matching backend API.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 60 },
      { skill: SKILLS.BACKEND_DEVELOPMENT,  points: 60 },
    ],
    basePayout: 1800,   // 60 * 2 * 15
    tier: 2,
    ...buildProjectTiming(120, 2),
  },

  // ── Tier 3 — National ────────────────────────────────────────────────────

  {
    id: 'mobile_backend_001',
    name: 'Mobile Authentication App',
    description: 'A fintech client needs biometric auth on mobile backed by a secure API.',
    requirements: [
      { skill: SKILLS.MOBILE_DEVELOPMENT,   points: 90 },
      { skill: SKILLS.BACKEND_DEVELOPMENT,  points: 90 },
    ],
    basePayout: 2700,   // 90 * 2 * 15
    tier: 3,
    ...buildProjectTiming(180, 3),
  },
  {
    id: 'mobile_devops_001',
    name: 'Mobile App Release Pipeline',
    description: 'Automate build, signing, and store deployment for a mobile product.',
    requirements: [
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 110 },
      { skill: SKILLS.DEVOPS,             points: 110 },
    ],
    basePayout: 3300,   // 110 * 2 * 15
    tier: 3,
    ...buildProjectTiming(220, 3),
  },
  {
    id: 'backend_devops_001',
    name: 'Scalable API Deployment',
    description: 'Harden and auto-scale a high-traffic API across multiple regions.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 120 },
      { skill: SKILLS.DEVOPS,              points: 120 },
    ],
    basePayout: 3600,   // 120 * 2 * 15
    tier: 3,
    ...buildProjectTiming(240, 3),
  },
  {
    id: 'fullstack_002',
    name: 'E-commerce Platform',
    description: 'A retailer needs a full storefront with cart, checkout, and admin.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 140 },
      { skill: SKILLS.BACKEND_DEVELOPMENT,  points: 140 },
    ],
    basePayout: 4200,   // 140 * 2 * 15
    tier: 3,
    ...buildProjectTiming(280, 3),
  },

  // ── Tier 4 — Enterprise ───────────────────────────────────────────────────

  {
    id: 'enterprise_001',
    name: 'Enterprise SaaS Platform',
    description: 'A multinational corporation wants a full-stack SaaS product across web, mobile, and cloud.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 300 },
      { skill: SKILLS.BACKEND_DEVELOPMENT,  points: 300 },
      { skill: SKILLS.MOBILE_DEVELOPMENT,   points: 300 },
      { skill: SKILLS.DEVOPS,               points: 300 },
    ],
    basePayout: 18000,  // 300 * 4 * 15
    tier: 4,
    ...buildProjectTiming(1200, 4),
  },
];
