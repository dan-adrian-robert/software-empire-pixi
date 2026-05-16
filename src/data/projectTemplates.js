/**
 * Project template pool.
 * At the start of each day the Simulation draws from this pool to fill
 * `Company.availableProjects` up to a cap.
 *
 * Each template: { id, name, description, requirements: [{skill, points}], payout, tier }
 *   tier: 1 = startup  2 = local  3 = national  4 = enterprise
 *
 * `points` in each requirement = SP needed in that skill (base_sp per skill).
 * Payout formula: base_sp × numSkills × 15
 */
import { SKILLS } from './skills.js';

export const PROJECT_TEMPLATES = [
  // ── Tier 1 — Startup / Freelance ─────────────────────────────────────────

  {
    id: 'frontend_001',
    name: 'Static Landing Page',
    description: 'A local business needs a clean, fast static landing page.',
    requirements: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, points: 20 }],
    payout: 300,    // 20 * 1 * 15
    tier: 1,
  },
  {
    id: 'frontend_002',
    name: 'Portfolio Website',
    description: 'A freelance designer needs a personal portfolio online.',
    requirements: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, points: 30 }],
    payout: 450,    // 30 * 1 * 15
    tier: 1,
  },
  {
    id: 'backend_001',
    name: 'REST API Service',
    description: 'A client needs a simple REST API for their data layer.',
    requirements: [{ skill: SKILLS.BACKEND_DEVELOPMENT, points: 35 }],
    payout: 525,    // 35 * 1 * 15
    tier: 1,
  },
  {
    id: 'mobile_001',
    name: 'Simple Mobile App',
    description: 'Build a straightforward single-screen utility mobile app.',
    requirements: [{ skill: SKILLS.MOBILE_DEVELOPMENT, points: 40 }],
    payout: 600,    // 40 * 1 * 15
    tier: 1,
  },
  {
    id: 'frontend_003',
    name: 'Admin Dashboard UI',
    description: 'A startup needs a data-rich admin panel to monitor KPIs.',
    requirements: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, points: 50 }],
    payout: 750,    // 50 * 1 * 15
    tier: 1,
  },
  {
    id: 'devops_001',
    name: 'CI/CD Pipeline',
    description: 'Set up automated build, test, and deploy workflows for a small team.',
    requirements: [{ skill: SKILLS.DEVOPS, points: 50 }],
    payout: 750,    // 50 * 1 * 15
    tier: 1,
  },

  // ── Tier 2 — Local Company ────────────────────────────────────────────────

  {
    id: 'backend_002',
    name: 'Authentication System',
    description: 'Design a secure sign-up, login, and session management service.',
    requirements: [{ skill: SKILLS.BACKEND_DEVELOPMENT, points: 55 }],
    payout: 825,    // 55 * 1 * 15
    tier: 2,
  },
  {
    id: 'mobile_002',
    name: 'Fitness Tracker App',
    description: 'A health startup wants a mobile app to log workouts and nutrition.',
    requirements: [{ skill: SKILLS.MOBILE_DEVELOPMENT, points: 70 }],
    payout: 1050,   // 70 * 1 * 15
    tier: 2,
  },
  {
    id: 'backend_003',
    name: 'Payment Processing Service',
    description: 'Integrate a secure payment gateway into an existing platform.',
    requirements: [{ skill: SKILLS.BACKEND_DEVELOPMENT, points: 80 }],
    payout: 1200,   // 80 * 1 * 15
    tier: 2,
  },
  {
    id: 'devops_002',
    name: 'Cloud Infrastructure Setup',
    description: 'Provision and configure scalable cloud resources for a growing SaaS.',
    requirements: [{ skill: SKILLS.DEVOPS, points: 85 }],
    payout: 1275,   // 85 * 1 * 15
    tier: 2,
  },
  {
    id: 'mobile_003',
    name: 'Social Chat Application',
    description: 'A community platform needs real-time messaging on mobile.',
    requirements: [{ skill: SKILLS.MOBILE_DEVELOPMENT, points: 100 }],
    payout: 1500,   // 100 * 1 * 15
    tier: 2,
  },
  {
    id: 'fullstack_001',
    name: 'Login System',
    description: 'Build a secure login flow with a matching backend API.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 60 },
      { skill: SKILLS.BACKEND_DEVELOPMENT,  points: 60 },
    ],
    payout: 1800,   // 60 * 2 * 15
    tier: 2,
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
    payout: 2700,   // 90 * 2 * 15
    tier: 3,
  },
  {
    id: 'mobile_devops_001',
    name: 'Mobile App Release Pipeline',
    description: 'Automate build, signing, and store deployment for a mobile product.',
    requirements: [
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 110 },
      { skill: SKILLS.DEVOPS,             points: 110 },
    ],
    payout: 3300,   // 110 * 2 * 15
    tier: 3,
  },
  {
    id: 'backend_devops_001',
    name: 'Scalable API Deployment',
    description: 'Harden and auto-scale a high-traffic API across multiple regions.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 120 },
      { skill: SKILLS.DEVOPS,              points: 120 },
    ],
    payout: 3600,   // 120 * 2 * 15
    tier: 3,
  },
  {
    id: 'fullstack_002',
    name: 'E-commerce Platform',
    description: 'A retailer needs a full storefront with cart, checkout, and admin.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 140 },
      { skill: SKILLS.BACKEND_DEVELOPMENT,  points: 140 },
    ],
    payout: 4200,   // 140 * 2 * 15
    tier: 3,
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
    payout: 18000,  // 300 * 4 * 15
    tier: 4,
  },
];
