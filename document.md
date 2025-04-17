
# Nubinix Cloud Insights - Complete Application Documentation

## Table of Contents
1. Application Overview
2. Project Structure
3. Technology Stack
4. Setup Instructions
5. Application Workflow
6. Component Details
7. API Endpoints
8. Database Schema
9. Development Guidelines

## 1. Application Overview
Nubinix Cloud Insights is a web application for generating cloud resource utilization and billing reports. It supports AWS and Azure cloud providers and offers a step-by-step wizard interface for report generation.

## 2. Project Structure
```
├── client/                  # Frontend React application
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # React components
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utility functions
│       ├── pages/         # Page components
│       └── types/         # TypeScript type definitions
├── server/                 # Backend Express application
├── shared/                 # Shared code between frontend and backend
└── public/                # Generated reports storage
```

## 3. Technology Stack
- Frontend:
  - React 18
  - TypeScript
  - Vite
  - TailwindCSS
  - shadcn/ui
  - Zustand (State Management)
  - TanStack Query

- Backend:
  - Express.js
  - PostgreSQL
  - Drizzle ORM
  - PDFKit

## 4. Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- NPM or Yarn

### Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/nubinix_db
```

3. Initialize database:
```bash
npm run db:push
```

4. Start development server:
```bash
npm run dev
```

Application will be available at: http://0.0.0.0:5000

## 5. Application Workflow

### User Journey
1. **Home Page**
   - Select cloud provider (AWS/Azure)
   - Choose report type (Utilization/Billing)

2. **Cloud Provider Selection**
   - AWS configuration
   - Azure configuration

3. **Report Configuration**
   - Select resources
   - Choose time period
   - Set report frequency

4. **Report Generation**
   - Generate PDF report
   - Download/Email options

## 6. Component Details

### Key Components

#### Frontend (/client/src/components/)

1. **Layout Components**
   - AppLayout: Main application layout with header/footer
   - StoreProvider: Global state management wrapper

2. **Wizard Steps**
   - SelectCloudProvider: Cloud provider selection
   - SelectReportType: Report type selection
   - EnterCredentials: Cloud credentials input
   - SelectResources: Resource selection grid
   - FrequencySelection: Report frequency settings
   - GenerateReport: Report generation and download

3. **UI Components**
   - Custom buttons, cards, forms
   - Resource visualization components
   - Status indicators
   - Modal dialogs

#### Backend (/server/)

1. **Core Services**
   - aws-services.ts: AWS SDK integration
   - pdf-generator.ts: PDF report generation
   - storage.ts: Database operations
   - routes.ts: API endpoint definitions

## 7. API Endpoints

### Cloud Provider APIs
```typescript
POST /api/validate-credentials
GET  /api/resources
POST /api/generate-report
GET  /api/reports/:id
```

## 8. Database Schema

### Tables
1. **users**
   - id (PK)
   - username
   - password

2. **cloud_accounts**
   - id (PK)
   - userId (FK)
   - provider
   - credentials

3. **resources**
   - id (PK)
   - cloudAccountId (FK)
   - resourceId
   - type
   - metadata

4. **reports**
   - id (PK)
   - userId (FK)
   - type
   - status
   - downloadUrl

## 9. Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use functional components
- Implement proper error handling
- Write unit tests for critical components

### State Management
- Use Zustand for global state
- React Query for API state
- Local state for component-specific data

### Building for Production
```bash
npm run build
npm run start
```

### Expected Output
1. Resource utilization reports in PDF format
2. Cost analysis and recommendations
3. Interactive resource visualization
4. Real-time monitoring dashboards

This documentation provides a complete overview of the application structure, setup process, and development guidelines. Keep it updated as the application evolves.