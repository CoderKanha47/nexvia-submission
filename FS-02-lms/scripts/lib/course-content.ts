
export interface LessonPlanSection {
  section: string;
  lessons: Array<{ title: string; description: string }>;
}

export type QuizQuestion = {
  text: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  explanation: string;
};

/** Two sections of 2-3 video lessons per live course. */
export const COURSE_LESSONS: Record<string, LessonPlanSection[]> = {
  'complete-react-development-bootcamp-0': [
    {
      section: 'React Fundamentals',
      lessons: [
        { title: 'Introduction to React & JSX', description: 'Learn the basics of React components, JSX syntax, and the virtual DOM.' },
        { title: 'Components, Props & State', description: 'Build reusable components with props and manage local state with useState.' },
        { title: 'Event Handling & Forms', description: 'Handle user interactions, controlled components, and form validation.' },
      ],
    },
    {
      section: 'Hooks Deep Dive',
      lessons: [
        { title: 'useEffect & Lifecycle', description: 'Side effects, cleanup functions, and dependency arrays explained.' },
        { title: 'Custom Hooks & useContext', description: 'Extract reusable logic with custom hooks and global state with Context.' },
        { title: 'Performance with useMemo & useCallback', description: 'Optimize renders and prevent unnecessary recalculations.' },
      ],
    },
  ],
  'node-js-backend-mastery-2': [
    {
      section: 'Node.js Foundations',
      lessons: [
        { title: 'Node.js Runtime & Modules', description: 'Understand the event loop, CommonJS vs ES modules, and NPM ecosystem.' },
        { title: 'Express.js Fundamentals', description: 'Routing, middleware, request/response cycle, and error handling.' },
        { title: 'Async Patterns & Error Handling', description: 'Promises, async/await, and structured error handling in Express.' },
      ],
    },
    {
      section: 'Database & Auth',
      lessons: [
        { title: 'MongoDB with Mongoose', description: 'Schemas, models, queries, and data validation with Mongoose ODM.' },
        { title: 'JWT Authentication', description: 'Access/refresh tokens, password hashing, and protected routes.' },
      ],
    },
  ],
  'python-data-science-fundamentals-3': [
    {
      section: 'Python for Data Science',
      lessons: [
        { title: 'NumPy Arrays & Vectorization', description: 'Fast numerical computing with ndarrays, broadcasting, and universal functions.' },
        { title: 'Pandas DataFrames & Series', description: 'Data manipulation, cleaning, and transformation with pandas.' },
        { title: 'Data Visualization with Matplotlib & Seaborn', description: 'Create publication-quality statistical plots and interactive charts.' },
      ],
    },
    {
      section: 'Exploratory Data Analysis',
      lessons: [
        { title: 'Data Cleaning & Preprocessing', description: 'Handle missing values, outliers, and feature engineering techniques.' },
        { title: 'Statistical Analysis & Hypothesis Testing', description: 'Descriptive statistics, distributions, t-tests, and chi-square tests.' },
      ],
    },
  ],
  'docker-kubernetes-essentials-6': [
    {
      section: 'Container Fundamentals',
      lessons: [
        { title: 'Docker Images & Containers', description: 'Build, tag, and run containers; understand layers and caching.' },
        { title: 'Dockerfile Best Practices', description: 'Multi-stage builds, .dockerignore, security hardening, and optimization.' },
        { title: 'Docker Compose for Local Dev', description: 'Orchestrate multi-container apps with networks and volumes.' },
      ],
    },
    {
      section: 'Kubernetes Basics',
      lessons: [
        { title: 'Pods, Services & Deployments', description: 'Core K8s objects, labels, selectors, and rolling updates.' },
        { title: 'ConfigMaps, Secrets & Ingress', description: 'Configuration management, sensitive data, and external access.' },
        { title: 'Helm Charts & Production Patterns', description: 'Package management, values files, and GitOps workflows.' },
      ],
    },
  ],
  'testing-react-applications-17': [
    {
      section: 'Testing Fundamentals',
      lessons: [
        { title: 'Introduction to Testing & Jest', description: 'Why test? Jest setup, matchers, and running your first test suite.' },
        { title: 'React Testing Library Basics', description: 'Render components, query by role/text, and user-centric assertions.' },
        { title: 'Testing Async Code & Mocking', description: 'Wait for promises, mock API calls, and test loading states.' },
      ],
    },
    {
      section: 'Advanced Testing Strategies',
      lessons: [
        { title: 'Integration Testing with MSW', description: 'Mock Service Worker for realistic API integration tests.' },
        { title: 'E2E Testing with Cypress', description: 'Full browser automation, CI integration, and visual regression.' },
        { title: 'Test Organization & Coverage', description: 'Co-location, snapshots, and enforcing coverage thresholds.' },
      ],
    },
  ],
  'state-management-with-redux-toolkit-18': [
    {
      section: 'Redux Toolkit Essentials',
      lessons: [
        { title: 'Why Redux Toolkit?', description: 'Problems with vanilla Redux, RTK philosophy, and batteries-included approach.' },
        { title: 'createSlice & Reducers', description: 'Immer-powered reducers, action creators, and TypeScript types.' },
        { title: 'Configuring the Store', description: 'configureStore, middleware, devTools, and preloaded state.' },
      ],
    },
    {
      section: 'RTK Query & Advanced Patterns',
      lessons: [
        { title: 'RTK Query for Data Fetching', description: 'Auto-generated hooks, caching, invalidation, and optimistic updates.' },
        { title: 'Middleware & Listeners', description: 'Custom middleware, listener middleware, and non-serializable values.' },
        { title: 'Migrating from Legacy Redux', description: 'Step-by-step migration, compatibility, and common pitfalls.' },
      ],
    },
  ],
  'serverless-functions-with-aws-lambda-19': [
    {
      section: 'Serverless Foundations',
      lessons: [
        { title: 'Serverless Architecture Overview', description: 'Event-driven design, FaaS vs containers, and when to go serverless.' },
        { title: 'AWS Lambda Deep Dive', description: 'Runtime, handler, context, cold starts, and provisioned concurrency.' },
        { title: 'API Gateway Integration', description: 'REST vs HTTP APIs, request/response mapping, and custom domains.' },
      ],
    },
    {
      section: 'Data & Operations',
      lessons: [
        { title: 'DynamoDB for Serverless', description: 'Single-table design, GSIs, TTL, and conditional writes.' },
        { title: 'Event-Driven with EventBridge & SNS', description: 'Decoupling services, schemas, dead-letter queues, and retries.' },
        { title: 'Observability & Cost Optimization', description: 'X-Ray tracing, CloudWatch metrics, structured logging, and cost analysis.' },
      ],
    },
  ],
};

/** Four single-choice questions (answer + explanation) per live course. */
export const COURSE_QUIZZES: Record<string, QuizQuestion[]> = {
  'complete-react-development-bootcamp-0': [
    {
      text: 'What is the purpose of the virtual DOM in React?',
      options: [
        { text: 'To directly manipulate the browser DOM', isCorrect: false },
        { text: 'To provide a lightweight representation of the UI for efficient updates', isCorrect: true },
        { text: 'To store component state persistently', isCorrect: false },
        { text: 'To compile JSX to JavaScript', isCorrect: false },
      ],
      explanation: 'The virtual DOM is a lightweight copy of the real DOM that React uses to compute minimal updates efficiently.',
    },
    {
      text: 'Which hook should you use to persist values across renders without triggering re-renders?',
      options: [
        { text: 'useState', isCorrect: false },
        { text: 'useRef', isCorrect: true },
        { text: 'useMemo', isCorrect: false },
        { text: 'useContext', isCorrect: false },
      ],
      explanation: 'useRef returns a mutable ref object whose .current property persists across renders without causing re-renders when changed.',
    },
    {
      text: 'What does the dependency array in useEffect control?',
      options: [
        { text: 'How many times the effect runs', isCorrect: false },
        { text: 'When the effect should re-run based on value changes', isCorrect: true },
        { text: 'Whether the effect runs on mount or unmount', isCorrect: false },
        { text: 'The order of effects in the component', isCorrect: false },
      ],
      explanation: 'The dependency array tells React to re-run the effect only when one of the listed values changes between renders.',
    },
    {
      text: 'Which is the correct way to update state based on the previous state?',
      options: [
        { text: 'setCount(count + 1)', isCorrect: false },
        { text: 'setCount(prev => prev + 1)', isCorrect: true },
        { text: 'count = count + 1', isCorrect: false },
        { text: 'setCount(() => count + 1)', isCorrect: false },
      ],
      explanation: 'Using the functional update form (prev => prev + 1) ensures you are working with the latest state value, avoiding stale closures.',
    },
  ],
  'node-js-backend-mastery-2': [
    {
      text: 'What is the purpose of middleware in Express.js?',
      options: [
        { text: 'To define database schemas', isCorrect: false },
        { text: 'To process requests before they reach route handlers', isCorrect: true },
        { text: 'To compile TypeScript code', isCorrect: false },
        { text: 'To manage environment variables', isCorrect: false },
      ],
      explanation: 'Middleware functions have access to req, res, and next, allowing them to execute code, modify request/response objects, or end the request-response cycle.',
    },
    {
      text: 'Which HTTP status code indicates a successful resource creation?',
      options: [
        { text: '200', isCorrect: false },
        { text: '201', isCorrect: true },
        { text: '204', isCorrect: false },
        { text: '400', isCorrect: false },
      ],
      explanation: '201 Created is the standard response for successful resource creation via POST/PUT requests.',
    },
    {
      text: 'What is the event loop in Node.js responsible for?',
      options: [
        { text: 'Compiling JavaScript to machine code', isCorrect: false },
        { text: 'Handling non-blocking I/O operations asynchronously', isCorrect: true },
        { text: 'Managing memory allocation', isCorrect: false },
        { text: 'Parsing JSON request bodies', isCorrect: false },
      ],
      explanation: 'The event loop enables Node.js to perform non-blocking I/O by offloading operations to the system kernel and executing callbacks when complete.',
    },
    {
      text: 'How do you securely store passwords in a database?',
      options: [
        { text: 'Store them as plain text for easy retrieval', isCorrect: false },
        { text: 'Encrypt them with a reversible algorithm', isCorrect: false },
        { text: 'Hash them with a slow algorithm like bcrypt', isCorrect: true },
        { text: 'Encode them with Base64', isCorrect: false },
      ],
      explanation: 'bcrypt is a slow, salted hashing algorithm designed for passwords. It protects against rainbow table and brute-force attacks.',
    },
  ],
  'python-data-science-fundamentals-3': [
    {
      text: 'What is the primary advantage of NumPy arrays over Python lists?',
      options: [
        { text: 'They can store mixed data types', isCorrect: false },
        { text: 'They support vectorized operations for faster computation', isCorrect: true },
        { text: 'They automatically visualize data', isCorrect: false },
        { text: 'They have unlimited size', isCorrect: false },
      ],
      explanation: 'NumPy arrays use contiguous memory and vectorized operations, enabling SIMD optimizations that are orders of magnitude faster than Python loops.',
    },
    {
      text: 'Which pandas method is used to handle missing data by filling with a specific value?',
      options: [
        { text: 'dropna()', isCorrect: false },
        { text: 'fillna()', isCorrect: true },
        { text: 'isna()', isCorrect: false },
        { text: 'replace()', isCorrect: false },
      ],
      explanation: 'fillna() replaces NaN values with a specified value or method (forward fill, backward fill, etc.).',
    },
    {
      text: 'What does broadcasting mean in NumPy?',
      options: [
        { text: 'Sending arrays over network', isCorrect: false },
        { text: 'Automatic alignment of arrays with different shapes for arithmetic', isCorrect: true },
        { text: 'Converting arrays to different data types', isCorrect: false },
        { text: 'Distributing computation across cores', isCorrect: false },
      ],
      explanation: 'Broadcasting allows NumPy to perform element-wise operations on arrays of different shapes by automatically expanding dimensions.',
    },
    {
      text: 'Which plot type is best for showing the distribution of a single continuous variable?',
      options: [
        { text: 'Scatter plot', isCorrect: false },
        { text: 'Histogram', isCorrect: true },
        { text: 'Line chart', isCorrect: false },
        { text: 'Pie chart', isCorrect: false },
      ],
      explanation: 'Histograms divide data into bins and show frequency counts, revealing the underlying distribution shape.',
    },
  ],
  'docker-kubernetes-essentials-6': [
    {
      text: 'What is the purpose of a .dockerignore file?',
      options: [
        { text: 'To specify the base image for a Dockerfile', isCorrect: false },
        { text: 'To exclude files from the Docker build context', isCorrect: true },
        { text: 'To define environment variables', isCorrect: false },
        { text: 'To configure container networking', isCorrect: false },
      ],
      explanation: '.dockerignore prevents unnecessary files (node_modules, .git, logs) from being sent to the Docker daemon, speeding up builds.',
    },
    {
      text: 'What is a Kubernetes Pod?',
      options: [
        { text: 'A container image registry', isCorrect: false },
        { text: 'The smallest deployable unit containing one or more containers', isCorrect: true },
        { text: 'A load balancer for external traffic', isCorrect: false },
        { text: 'A configuration file format', isCorrect: false },
      ],
      explanation: 'A Pod is the atomic unit in Kubernetes, grouping containers that share network, storage, and lifecycle.',
    },
    {
      text: 'What does a Kubernetes Service provide?',
      options: [
        { text: 'Container image building', isCorrect: false },
        { text: 'Stable network identity and load balancing for Pods', isCorrect: true },
        { text: 'Persistent storage volumes', isCorrect: false },
        { text: 'Automatic container restart policies', isCorrect: false },
      ],
      explanation: 'Services provide a stable IP/DNS name and distribute traffic across matching Pods via label selectors.',
    },
    {
      text: 'What is Helm used for in Kubernetes?',
      options: [
        { text: 'Container runtime', isCorrect: false },
        { text: 'Package manager for deploying templated K8s manifests', isCorrect: true },
        { text: 'Monitoring and logging', isCorrect: false },
        { text: 'Service mesh', isCorrect: false },
      ],
      explanation: 'Helm charts package Kubernetes resources with configurable values, enabling repeatable deployments and version management.',
    },
  ],
  'testing-react-applications-17': [
    {
      text: 'What is the primary purpose of React Testing Library?',
      options: [
        { text: 'Test implementation details like state and props', isCorrect: false },
        { text: 'Test components the way users interact with them', isCorrect: true },
        { text: 'Replace Jest as the test runner', isCorrect: false },
        { text: 'Only test CSS styles', isCorrect: false },
      ],
      explanation: 'React Testing Library encourages testing from the user\'s perspective, querying by role, label, and text rather than implementation details.',
    },
    {
      text: 'Which query method should you use for elements that may not exist yet?',
      options: [
        { text: 'getByRole', isCorrect: false },
        { text: 'findByRole', isCorrect: true },
        { text: 'queryByRole', isCorrect: false },
        { text: 'getAllByRole', isCorrect: false },
      ],
      explanation: 'findBy* queries return a Promise and wait for the element to appear, making them ideal for async assertions.',
    },
    {
      text: 'What does MSW (Mock Service Worker) enable in tests?',
      options: [
        { text: 'Mocking browser APIs like localStorage', isCorrect: false },
        { text: 'Intercepting network requests at the Service Worker level', isCorrect: true },
        { text: 'Running tests in a real browser', isCorrect: false },
        { text: 'Generating component snapshots', isCorrect: false },
      ],
      explanation: 'MSW intercepts fetch/XMLHttpRequest at the network level, allowing realistic API mocking without changing application code.',
    },
    {
      text: 'What is the recommended approach for organizing tests in a React project?',
      options: [
        { text: 'All tests in a single __tests__ folder', isCorrect: false },
        { text: 'Co-locate tests next to the components they test', isCorrect: true },
        { text: 'Separate unit and integration tests into different repos', isCorrect: false },
        { text: 'Only test page-level components', isCorrect: false },
      ],
      explanation: 'Co-location keeps tests close to the source, making them easier to find, maintain, and update during refactoring.',
    },
  ],
  'state-management-with-redux-toolkit-18': [
    {
      text: 'What problem does createSlice solve compared to vanilla Redux?',
      options: [
        { text: 'Eliminates the need for reducers entirely', isCorrect: false },
        { text: 'Auto-generates action creators and uses Immer for immutable updates', isCorrect: true },
        { text: 'Removes the need for a store', isCorrect: false },
        { text: 'Makes Redux synchronous only', isCorrect: false },
      ],
      explanation: 'createSlice reduces boilerplate by generating action creators and allowing "mutating" syntax via Immer that produces immutable state.',
    },
    {
      text: 'What is the purpose of the listener middleware in RTK?',
      options: [
        { text: 'Replace Redux Thunk entirely', isCorrect: false },
        { text: 'React to dispatched actions and trigger async logic', isCorrect: true },
        { text: 'Automatically persist state to localStorage', isCorrect: false },
        { text: 'Validate action payloads against a schema', isCorrect: false },
      ],
      explanation: 'Listener middleware lets you define "effects" that run when specific actions are dispatched, similar to Redux Saga but lighter weight.',
    },
    {
      text: 'How does RTK Query handle cache invalidation?',
      options: [
        { text: 'Manual invalidation only', isCorrect: false },
        { text: 'Automatic invalidation via tags on mutations', isCorrect: true },
        { text: 'Time-based expiration only', isCorrect: false },
        { text: 'Invalidation is not supported', isCorrect: false },
      ],
      explanation: 'RTK Query uses tags: mutations declare invalidatesTags, and queries provide tags, enabling automatic refetching when data changes.',
    },
    {
      text: 'What is the recommended pattern for TypeScript with createSlice?',
      options: [
        { text: 'Use any for state and payload', isCorrect: false },
        { text: 'Define a RootState interface and use PayloadAction<YourType>', isCorrect: true },
        { text: 'Avoid TypeScript with Redux', isCorrect: false },
        { text: 'Use interface merging for the slice state', isCorrect: false },
      ],
      explanation: 'Define state shape explicitly, use PayloadAction for typed payloads, and extend RootState for typed selector hooks.',
    },
  ],
  'serverless-functions-with-aws-lambda-19': [
    {
      text: 'What is a cold start in AWS Lambda?',
      options: [
        { text: 'The first invocation after deployment', isCorrect: false },
        { text: 'Latency from initializing a new execution environment', isCorrect: true },
        { text: 'A function that fails to start', isCorrect: false },
        { text: 'A function with no triggers configured', isCorrect: false },
      ],
      explanation: 'Cold starts occur when Lambda provisions a new microVM, loads the runtime, and runs initialization code before the handler.',
    },
    {
      text: 'Which API Gateway type is recommended for serverless workloads?',
      options: [
        { text: 'REST API (v1)', isCorrect: false },
        { text: 'HTTP API (v2)', isCorrect: true },
        { text: 'WebSocket API only', isCorrect: false },
        { text: 'Application Load Balancer', isCorrect: false },
      ],
      explanation: 'HTTP APIs offer lower latency, lower cost, and simpler configuration for Lambda integrations compared to REST APIs.',
    },
    {
      text: 'What is the primary benefit of single-table design in DynamoDB?',
      options: [
        { text: 'Easier SQL-like queries', isCorrect: false },
        { text: 'Fewer RCU/WCU consumed by reducing items fetched', isCorrect: true },
        { text: 'Automatic indexing', isCorrect: false },
        { text: 'Simpler backup and restore', isCorrect: false },
      ],
      explanation: 'Single-table design stores related entities in one table, enabling efficient queries via GSIs and reducing read capacity units.',
    },
    {
      text: 'How does EventBridge help with event-driven serverless architectures?',
      options: [
        { text: 'Replaces Lambda functions', isCorrect: false },
        { text: 'Decouples event producers from consumers with routing rules', isCorrect: true },
        { text: 'Provides managed databases', isCorrect: false },
        { text: 'Handles authentication', isCorrect: false },
      ],
      explanation: 'EventBridge acts as a central event bus: producers publish events, and rules route them to targets (Lambda, SQS, SNS) without direct coupling.',
    },
  ],
};
