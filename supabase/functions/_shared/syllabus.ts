export interface SyllabusTopic {
  category: string;
  subtopic: string;
}

export const SYLLABUS: SyllabusTopic[] = [
  // DSA
  {
    category: "DSA",
    subtopic: "Big O Notation & Time/Space Complexity Analysis",
  },
  {
    category: "DSA",
    subtopic: "Hash Tables: Internals, Collision Resolution & Use Cases",
  },
  {
    category: "DSA",
    subtopic: "Trees: Binary Search Trees, AVL Trees & Red-Black Trees",
  },
  {
    category: "DSA",
    subtopic: "Graphs: BFS, DFS, Dijkstra & Topological Sort",
  },
  {
    category: "DSA",
    subtopic: "Dynamic Programming: Memoization vs Tabulation",
  },
  { category: "DSA", subtopic: "Sliding Window & Two-Pointer Techniques" },

  // System Design
  {
    category: "System Design",
    subtopic: "CAP Theorem & Trade-offs in Distributed Systems",
  },
  {
    category: "System Design",
    subtopic: "Load Balancing: Algorithms & Layer 4 vs Layer 7",
  },
  {
    category: "System Design",
    subtopic:
      "Caching Strategies: Write-Through, Write-Back & Eviction Policies",
  },
  {
    category: "System Design",
    subtopic: "Database Sharding: Horizontal Partitioning & Consistent Hashing",
  },
  {
    category: "System Design",
    subtopic: "Message Queues: Kafka, RabbitMQ & Event-Driven Architecture",
  },

  // Fullstack & API
  {
    category: "Fullstack & API",
    subtopic: "REST vs gRPC vs GraphQL: Trade-offs & When to Use Each",
  },
  {
    category: "Fullstack & API",
    subtopic: "The Event Loop: Node.js Concurrency Model in Depth",
  },
  {
    category: "Fullstack & API",
    subtopic: "JWT & OAuth 2.0: Token-Based Authentication Flows",
  },
  {
    category: "Fullstack & API",
    subtopic: "Web Security: XSS, CSRF & Content Security Policies",
  },

  // Networks
  {
    category: "Networks",
    subtopic: "TCP vs UDP: Reliability, Flow Control & Congestion Handling",
  },
  {
    category: "Networks",
    subtopic: "DNS Resolution: Recursive Lookups, Caching & Anycast",
  },
  {
    category: "Networks",
    subtopic:
      "TLS Handshake: Certificate Chains, Key Exchange & Perfect Forward Secrecy",
  },

  // Operating Systems
  {
    category: "OS",
    subtopic: "Processes vs Threads: Scheduling, Context Switching & IPC",
  },
  {
    category: "OS",
    subtopic: "Deadlocks: Conditions, Detection, Prevention & Avoidance",
  },
  {
    category: "OS",
    subtopic: "Memory Management: Paging, Segmentation & Virtual Memory",
  },

  // DevOps
  {
    category: "DevOps",
    subtopic: "Containers: Docker Internals, Namespaces & Cgroups",
  },
  {
    category: "DevOps",
    subtopic: "Kubernetes Pods: Scheduling, Services & Autoscaling",
  },
  {
    category: "DevOps",
    subtopic: "CI/CD Pipelines: Build, Test & Deployment Automation",
  },
  {
    category: "DevOps",
    subtopic: "Infrastructure as Code: Terraform, Declarative vs Imperative",
  },
];
