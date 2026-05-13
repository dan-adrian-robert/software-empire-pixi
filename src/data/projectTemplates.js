/**
 * Project template pool.
 * At the start of each day the HiringSystem/ProjectSystem draws from this
 * pool to fill `Company.availableProjects` up to a cap.
 *
 * Each template: { id, name, description, requirements: [{skill, points}], payout, tier }
 * tier: 1 = startup  2 = local  3 = national  4 = multinational
 */
import { SKILLS } from './skills.js';

export const PROJECT_TEMPLATES = [
  // ---- Tier 1 - Startup / Freelance ----
  {
    id: 'basic_website',
    name: 'Basic Website',
    description: 'A small business needs a simple website.',
    requirements: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, points: 100 }],
    payout: 1000,
    tier: 1,
  },
  {
    id: 'landing_page',
    name: 'Landing Page',
    description: 'Design and build a marketing landing page for a local shop.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 140 },
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 40 },
    ],
    payout: 1400,
    tier: 1,
  },
  {
    id: 'blog_platform',
    name: 'Blog Platform',
    description: 'A personal blogging platform with a simple CMS.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 100 },
      { skill: SKILLS.DEVOPS, points: 80 },
    ],
    payout: 2200,
    tier: 1,
  },
  {
    id: 'portfolio_site',
    name: 'Portfolio Site',
    description: 'An artist needs a visual portfolio website.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 120 },
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 50 },
    ],
    payout: 1600,
    tier: 1,
  },
  {
    id: 'bug_fixes',
    name: 'Bug Fix Contract',
    description: 'A startup needs several bugs squashed in their existing codebase.',
    requirements: [
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 80 },
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 60 },
    ],
    payout: 1200,
    tier: 1,
  },
  // ---- Tier 2 - Local Company ----
  {
    id: 'ecommerce_store',
    name: 'E-Commerce Store',
    description: 'Build a full online store for a local retailer.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 200 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 150 },
      { skill: SKILLS.DEVOPS, points: 120 },
    ],
    payout: 5500,
    tier: 2,
  },
  {
    id: 'crm_system',
    name: 'CRM System',
    description: 'A customer-relationship management tool for a mid-sized company.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 250 },
      { skill: SKILLS.DEVOPS, points: 200 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 100 },
    ],
    payout: 7000,
    tier: 2,
  },
  {
    id: 'inventory_app',
    name: 'Inventory App',
    description: 'Desktop inventory management for a warehouse company.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 180 },
      { skill: SKILLS.DEVOPS, points: 160 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 80 },
    ],
    payout: 5000,
    tier: 2,
  },
  {
    id: 'news_portal',
    name: 'News Portal',
    description: 'A content-heavy news website with article management.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 160 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 140 },
      { skill: SKILLS.DEVOPS, points: 100 },
    ],
    payout: 4800,
    tier: 2,
  },
  {
    id: 'mobile_fitness_app',
    name: 'Fitness Tracker App',
    description: 'A mobile app to track workouts and nutrition.',
    requirements: [
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 220 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 120 },
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 100 },
    ],
    payout: 6000,
    tier: 2,
  },
  // ---- Tier 3 - National ----
  {
    id: 'banking_app',
    name: 'Banking App',
    description: 'A financial company needs a secure mobile banking application.',
    requirements: [
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 500 },
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 400 },
      { skill: SKILLS.DEVOPS, points: 300 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 200 },
    ],
    payout: 25000,
    tier: 3,
  },
  {
    id: 'hospital_system',
    name: 'Hospital Management System',
    description: 'A large hospital needs a patient and scheduling system.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 500 },
      { skill: SKILLS.DEVOPS, points: 400 },
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 250 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 200 },
    ],
    payout: 28000,
    tier: 3,
  },
  {
    id: 'cloud_platform',
    name: 'Cloud Platform',
    description: 'Design a scalable cloud hosting dashboard for enterprise clients.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 400 },
      { skill: SKILLS.DEVOPS, points: 350 },
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 150 },
    ],
    payout: 22000,
    tier: 3,
  },
  // ---- Tier 4 - Multinational ----
  {
    id: 'ai_analytics',
    name: 'AI Analytics Platform',
    description: 'International firm wants an AI-driven business analytics suite.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 800 },
      { skill: SKILLS.DEVOPS, points: 600 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 500 },
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 300 },
    ],
    payout: 90000,
    tier: 4,
  },
  {
    id: 'global_erp',
    name: 'Global ERP Suite',
    description: 'A multinational corporation needs a full enterprise resource planner.',
    requirements: [
      { skill: SKILLS.BACKEND_DEVELOPMENT, points: 700 },
      { skill: SKILLS.DEVOPS, points: 600 },
      { skill: SKILLS.FRONTEND_DEVELOPMENT, points: 500 },
      { skill: SKILLS.MOBILE_DEVELOPMENT, points: 400 },
    ],
    payout: 100000,
    tier: 4,
  },
];
