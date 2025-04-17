
# Nubinix Cloud Insights Documentation

## Application Overview
Nubinix Cloud Insights is a cloud resource management and reporting application that helps users generate utilization and billing reports for AWS and Azure cloud resources.

## Technology Stack
- Frontend: React + TypeScript + Vite
- Backend: Express.js
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS + shadcn/ui components
- State Management: Zustand
- Routing: Wouter
- HTTP Client: TanStack Query

## Project Structure

### Frontend (client/src/)
- `App.tsx`: Main application component with routing setup
- `components/`: UI components organized by feature
  - `steps/`: Wizard steps for report generation
  - `ui/`: Reusable UI components
  - `wizard/`: Wizard flow control components
- `lib/`: Utility functions and API client
- `pages/`: Main application pages

### Backend (server/)
- `index.ts`: Server entry point, Express setup
- `routes.ts`: API route definitions
- `aws-services.ts`: AWS-specific functionality
- `pdf-generator.ts`: Report generation logic
- `storage.ts`: Database operations
- `vite.ts`: Development server configuration

### Shared (shared/)
- `schema.ts`: Database schema and type definitions

## Application Workflow

### 1. User Journey
1. Start at home page
2. Select cloud provider (AWS/Azure)
3. Choose report type (Utilization/Billing)
4. Enter cloud credentials
5. Select resources to analyze
6. Configure report frequency
7. Generate and download report

### 2. Data Flow
- Frontend makes API calls to backend
- Backend validates credentials with cloud providers
- Resources are fetched and displayed
- Report generation processes data
- PDF reports are generated and stored
- Users can download generated reports

### 3. Key Features
- Cloud provider integration (AWS/Azure)
- Resource discovery and selection
- PDF report generation
- Credential management
- Database storage for reports

### 4. Technical Implementation
- React + TypeScript frontend
- Express.js backend
- PostgreSQL database
- PDF generation with PDFKit
- Cloud SDK integrations

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database and environment variables

3. Push database schema:
```bash
npm run db:push
```

4. Start development server:
```bash
npm run dev
```

The application runs on port 5000 and can be accessed at http://0.0.0.0:5000

## Database Schema

### Users Table
- id: Serial Primary Key
- username: Text (unique)
- password: Text

### Cloud Accounts Table
- id: Serial Primary Key
- userId: Integer (Foreign Key)
- provider: Text
- credentials: JSON
- createdAt: Timestamp

### Resources Table
- id: Serial Primary Key
- cloudAccountId: Integer (Foreign Key)
- resourceId: Text
- name: Text
- type: Text
- region: Text
- status: Text
- metadata: JSON

### Reports Table
- id: Serial Primary Key
- userId: Integer (Foreign Key)
- cloudAccountId: Integer (Foreign Key)
- reportType: Text
- resourceIds: Text Array
- timeframe: JSON
- frequency: Text
- format: Text
- delivery: JSON
- status: Text
- createdAt: Timestamp
- completedAt: Timestamp
- downloadUrl: Text
