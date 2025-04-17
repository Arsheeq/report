
# Nubinix Cloud Insights - Technical Specification

## Overview
Nubinix Cloud Insights is a web application for generating cloud resource utilization and billing reports for AWS and Azure cloud providers. The application uses a step-by-step wizard interface to guide users through the report generation process.

## Technology Stack
- Frontend: React + TypeScript + Vite
- Backend: Django ORM,python
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS + shadcn/ui components
- State Management: Zustand
- Routing: Wouter
- HTTP Client: TanStack Query

## Design System

### Colors
- Primary Gradient: `from-[#3DB3E3] via-[#6866C1] to-[#E865A0]`
- Background: `bg-background`
- Text: `text-foreground`
- Border: `border-border`
- Accent: `accent`
- Muted: `muted`

### Typography
- Primary Font: System font stack (font-sans)
- Headings: 
  - Step Headings: `text-3xl font-bold` with gradient text
  - Section Headings: `text-xl font-semibold`
- Body Text: Base system font, 16px

### Components Library
Using shadcn/ui components with custom styling:
- Buttons: Primary, Secondary, Ghost variants
- Cards: Resource selection cards with hover effects
- Inputs: Form inputs with validation states
- Select: Dropdown menus for resource selection
- Toast: Notification system
- Dialog: Modal windows
- HoverCard: Resource details preview

## Application Flow

### 1. Cloud Provider Selection
- Path: `/components/steps/SelectCloudProvider.tsx`
- Features:
  - AWS and Azure provider options
  - Provider logo display
  - Selection card with hover effects

### 2. Report Type Selection
- Path: `/components/steps/SelectReportType.tsx`
- Options:
  - Utilization Report
  - Billing Report
- Each option has descriptive text and icons

### 3. Conditional Flow
#### For Billing Reports:
1. Year/Month Selection
   - Path: `/components/steps/YearMonthSelection.tsx`
   - Calendar component for date selection
   
2. Credentials Entry
   - Path: `/components/steps/EnterCredentials.tsx`
   - Secure credential input fields
   - Validation handling

#### For Utilization Reports:
1. Credentials Entry
2. Resource Selection
   - Path: `/components/steps/SelectResources.tsx`
   - Interactive resource grid
   - Search functionality
   - Resource status indicators
3. Frequency Selection
   - Path: `/components/steps/FrequencySelection.tsx`
   - Daily/Weekly/Monthly options

### 4. Report Generation
- Path: `/components/steps/GenerateReport.tsx`
- Progress indicator
- Download options
- Email delivery setup

## State Management
Using Zustand store with the following states:
- currentStep
- reportType
- selectedProvider
- credentials
- selectedResources
- reportFrequency
- reportFormat

## API Endpoints

### AWS Endpoints
- `POST /api/validate-aws-credentials`
- `GET /api/aws/resources`

### Azure Endpoints
- `POST /api/validate-azure-credentials`
- `GET /api/azure/resources`

### Report Endpoints
- `POST /api/generate-utilization-report`
- `POST /api/generate-billing-report`

## Error Handling
- Form validation using Zod schemas
- API error handling with toast notifications
- Graceful fallbacks for failed resource loading

## Assets
- Logo: `assets/3416d038-01be-47dd-85da-562cb4346ba8.png`
- Provider Icons: AWS and Azure logos
- Status Icons: Running, Stopped states

## Security Considerations
- Credential encryption in transit and at rest
- Session management
- Rate limiting on API endpoints
- Input sanitization

## Database Schema
Tables:
- users
- cloud_accounts
- resources
- reports

Each table has proper relationships and constraints as defined in `shared/schema.ts`.

## Build & Deployment
- Development: `npm run dev`
- Production: Replit deployment with automatic HTTPS
- Port: 5000 (forwarded to 80/443 in production)

## Monitoring & Logging
- Console logging for development
- Error tracking
- API request logging

This documentation provides a complete overview of the application architecture, components, and implementation details necessary for development and maintenance.
