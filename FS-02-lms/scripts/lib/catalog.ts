import type { Types } from 'mongoose';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CatalogCourse {
  title: string;
  description: string;
  category: string;
  level: CourseLevel;
  priceCents: number;
  tags: string[];
  instructor: 'web' | 'data' | 'ops';
  live: boolean;
  thumbnail?: string;
}

/** Prices are round INR amounts (499 / 799 / 1299 / 1999) or free (0). */
export const CATALOG: CatalogCourse[] = [
  {
    title: 'Complete React Development Bootcamp',
    description:
      'Master React from fundamentals to advanced patterns. Build real-world applications with hooks, context, and modern best practices.',
    category: 'Web Development',
    level: 'advanced',
    priceCents: 199900,
    tags: ['react', 'javascript', 'frontend'],
    instructor: 'web',
    live: false,
  },
  {
    title: 'TypeScript for Professionals',
    description:
      'Level up your JavaScript with static typing. Learn advanced types, generics, and practical patterns for large-scale applications.',
    category: 'Web Development',
    level: 'intermediate',
    priceCents: 129900,
    tags: ['typescript', 'javascript', 'types'],
    instructor: 'web',
    live: false,
  },
  {
    title: 'Node.js Backend Mastery',
    description:
      'Build scalable REST APIs and microservices with Node.js. Covers Express, databases, authentication, and deployment strategies.',
    category: 'Web Development',
    level: 'beginner',
    priceCents: 0,
    tags: ['nodejs', 'express', 'backend'],
    instructor: 'web',
    live: false,
  },
  {
    title: 'Python Data Science Fundamentals',
    description:
      'Start your data science journey with Python. Learn pandas, NumPy, visualization, and exploratory data analysis techniques.',
    category: 'Data Science',
    level: 'intermediate',
    priceCents: 79900,
    tags: ['python', 'pandas', 'data-analysis'],
    instructor: 'data',
    live: false,
  },
  {
    title: 'Machine Learning with TensorFlow',
    description:
      'Build and deploy ML models with TensorFlow. Covers neural networks, CNNs, RNNs, and model serving in production.',
    category: 'Machine Learning',
    level: 'advanced',
    priceCents: 199900,
    tags: ['tensorflow', 'machine-learning', 'deep-learning'],
    instructor: 'data',
    live: false,
  },
  {
    title: 'React Native Mobile Development',
    description:
      'Build cross-platform mobile apps with React Native. Learn navigation, native modules, and app store deployment.',
    category: 'Mobile Development',
    level: 'intermediate',
    priceCents: 129900,
    tags: ['react-native', 'mobile', 'android'],
    instructor: 'web',
    live: false,
  },
  {
    title: 'Docker & Kubernetes Essentials',
    description:
      'Containerize applications and orchestrate with Kubernetes. Master Dockerfiles, Helm charts, and production deployments.',
    category: 'DevOps',
    level: 'advanced',
    priceCents: 129900,
    tags: ['docker', 'kubernetes', 'containers'],
    instructor: 'ops',
    live: false,
  },
  {
    title: 'AWS Cloud Practitioner',
    description:
      'Prepare for AWS certification. Core services, security, pricing, and architecture best practices for cloud solutions.',
    category: 'DevOps',
    level: 'beginner',
    priceCents: 49900,
    tags: ['aws', 'cloud', 'certification'],
    instructor: 'ops',
    live: false,
  },
  {
    title: 'GraphQL API Design',
    description:
      'Design flexible APIs with GraphQL. Schema design, resolvers, subscriptions, and performance optimization techniques.',
    category: 'Web Development',
    level: 'intermediate',
    priceCents: 79900,
    tags: ['graphql', 'api', 'schema'],
    instructor: 'web',
    live: false,
    thumbnail: '/thumbnails/GraphQL API Design.png',
  },
  {
    title: 'Next.js Full-Stack Development',
    description:
      'Build production-ready apps with Next.js 14. App Router, Server Components, authentication, and database integration.',
    category: 'Web Development',
    level: 'intermediate',
    priceCents: 129900,
    tags: ['nextjs', 'react', 'fullstack'],
    instructor: 'web',
    live: false,
    thumbnail: '/thumbnails/Next.js Full-Stack Development.jfif',
  },
  {
    title: 'Vue.js 3 Composition API',
    description:
      'Modern Vue development with Composition API. Pinia state management, TypeScript, and testing strategies.',
    category: 'Web Development',
    level: 'beginner',
    priceCents: 0,
    tags: ['vue', 'javascript', 'composition-api'],
    instructor: 'web',
    live: false,
    thumbnail: '/thumbnails/Vue.js 3 Composition API.webp',
  },
  {
    title: 'PostgreSQL Database Design',
    description:
      'Design robust relational databases. Normalization, indexing, query optimization, and advanced PostgreSQL features.',
    category: 'Databases',
    level: 'intermediate',
    priceCents: 79900,
    tags: ['postgresql', 'sql', 'database-design'],
    instructor: 'data',
    live: false,
    thumbnail: '/thumbnails/PostgreSQL Database Design.png',
  },
  {
    title: 'Redis Caching Strategies',
    description:
      'Boost application performance with Redis. Caching patterns, pub/sub, streams, and cluster management.',
    category: 'Databases',
    level: 'intermediate',
    priceCents: 79900,
    tags: ['redis', 'caching', 'performance'],
    instructor: 'ops',
    live: false,
    thumbnail: '/thumbnails/redis-caching.jfif',
  },
  {
    title: 'Microservices Architecture',
    description:
      'Design and deploy microservices. Service discovery, API gateways, event-driven communication, and observability.',
    category: 'DevOps',
    level: 'advanced',
    priceCents: 199900,
    tags: ['microservices', 'architecture', 'distributed-systems'],
    instructor: 'ops',
    live: false,
    thumbnail: '/thumbnails/Microservices Architecture.png',
  },
  {
    title: 'CI/CD Pipeline with GitHub Actions',
    description:
      'Automate build, test, and deploy workflows. Matrix builds, custom actions, and deployment strategies.',
    category: 'DevOps',
    level: 'beginner',
    priceCents: 49900,
    tags: ['cicd', 'github-actions', 'automation'],
    instructor: 'ops',
    live: false,
    thumbnail: '/thumbnails/CI-CD.jpg',
  },
  {
    title: 'Web Security Fundamentals',
    description:
      'Secure your applications against OWASP Top 10. Authentication, authorization, encryption, and secure coding practices.',
    category: 'Security',
    level: 'intermediate',
    priceCents: 129900,
    tags: ['security', 'owasp', 'authentication'],
    instructor: 'ops',
    live: false,
    thumbnail: '/thumbnails/webApplicationSecurity.jfif',
  },
  {
    title: 'Performance Optimization',
    description:
      'Profile and optimize web applications. Bundle analysis, lazy loading, caching strategies, and Core Web Vitals.',
    category: 'Web Development',
    level: 'advanced',
    priceCents: 79900,
    tags: ['performance', 'web-vitals', 'optimization'],
    instructor: 'web',
    live: false,
    thumbnail: '/thumbnails/front-end-performance-optimization-techniques-cover.png',
  },
  {
    title: 'Testing React Applications',
    description:
      'Comprehensive testing strategies. Unit, integration, and E2E testing with Jest, React Testing Library, and Cypress.',
    category: 'Web Development',
    level: 'intermediate',
    priceCents: 49900,
    tags: ['testing', 'jest', 'react'],
    instructor: 'web',
    live: true,
    thumbnail: '/thumbnails/testingReactApplications.webp',
  },
  {
    title: 'State Management with Redux Toolkit',
    description:
      'Scale React state with Redux Toolkit. RTK Query, slices, middleware, and TypeScript integration.',
    category: 'Web Development',
    level: 'beginner',
    priceCents: 0,
    tags: ['redux', 'react', 'state-management'],
    instructor: 'web',
    live: true,
    thumbnail: '/thumbnails/stateManagementWithReduxToolkit.webp',
  },
  {
    title: 'Serverless Functions with AWS Lambda',
    description:
      'Build serverless backends. Event-driven architecture, API Gateway, DynamoDB, and cold start optimization.',
    category: 'DevOps',
    level: 'intermediate',
    priceCents: 129900,
    tags: ['lambda', 'serverless', 'aws'],
    instructor: 'ops',
    live: true,
    thumbnail: '/thumbnails/Serverless Functions with AWS Lambda.jfif',
  },
];

export function generateSlug(title: string, index: number): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 80) + `-${index}`
  );
}

export const LIVE_SLUGS: string[] = CATALOG.map((c, i) => (c.live ? generateSlug(c.title, i) : null)).filter(
  (s): s is string => s !== null,
);

export interface InstructorAccounts {
  web: Types.ObjectId;
  data: Types.ObjectId;
  ops: Types.ObjectId;
}
