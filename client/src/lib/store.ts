import { create } from 'zustand';
import { CloudProvider, ReportType, ReportFrequency, ReportFormat } from '@shared/schema';
import { Resource } from '@/types';

// Define the steps for each report type
export const BILLING_STEPS = [
  { id: 'provider', title: 'Provider' },
  { id: 'reportType', title: 'Report Type' },
  { id: 'yearMonth', title: 'Period' },
  { id: 'credentials', title: 'Credentials' },
  { id: 'generate', title: 'Generate' }
];

export const UTILIZATION_STEPS = [
  { id: 'provider', title: 'Provider' },
  { id: 'reportType', title: 'Report Type' },
  { id: 'details', title: 'Details' },
  { id: 'frequency', title: 'Frequency' },
  { id: 'generate', title: 'Generate' }
];

// Get steps based on report type
export const getSteps = (type: ReportType | null) => {
  return type === 'billing' ? BILLING_STEPS : UTILIZATION_STEPS;
};

// Interface for credentials with account name
interface CredentialsWithAccountName {
  accountName: string;
  [key: string]: any;
}

// Define the state interface
interface WizardState {
  initialized: boolean;
  currentStep: number;
  selectedProvider: CloudProvider | null;
  reportType: ReportType | null;
  credentials: CredentialsWithAccountName | null;
  resources: Resource[]; // Added resources field
  selectedResources: Resource[];
  reportFrequency: ReportFrequency;
  reportFormat: ReportFormat;
  timeframe: { year: number, month: number } | null;
  emailReport: boolean;
  emailAddress: string;

  // Actions
  initialize: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  setSelectedProvider: (provider: CloudProvider) => void;
  setReportType: (type: ReportType) => void;
  setCredentials: (credentials: CredentialsWithAccountName) => void;
  setResources: (resources: Resource[]) => void; // Added setResources action
  setSelectedResources: (resources: Resource[]) => void;
  setReportFrequency: (frequency: ReportFrequency) => void;
  setReportFormat: (format: ReportFormat) => void;
  setTimeframe: (timeframe: { year: number, month: number }) => void;
  setEmailReport: (emailReport: boolean) => void;
  setEmailAddress: (email: string) => void;
  resetWizard: () => void;
  canProceed: () => boolean;
}

// Create the store
export const useStore = create<WizardState>((set, get) => ({
  initialized: false,
  currentStep: 1,
  selectedProvider: null,
  reportType: null,
  credentials: null,
  resources: [], // Initialize resources
  selectedResources: [],
  reportFrequency: 'once',
  reportFormat: 'pdf',
  timeframe: null,
  emailReport: true,
  emailAddress: '',

  // Initialize the store
  initialize: () => set({ initialized: true }),

  // Navigation actions
  nextStep: () => {
    const { currentStep, reportType } = get();
    const steps = getSteps(reportType);
    if (currentStep < steps.length) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },

  setStep: (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      set({ currentStep: step });
    }
  },

  // Data actions
  setSelectedProvider: (provider: CloudProvider) => set({ selectedProvider: provider }),

  setReportType: (type: ReportType) => set({ reportType: type }),

  setCredentials: (credentials: CredentialsWithAccountName) => set({ credentials }),

  setResources: (resources: Resource[]) => set({ resources: resources }), // Added setResources action

  setSelectedResources: (resources: Resource[]) => set({ selectedResources: resources }),

  setReportFrequency: (frequency: ReportFrequency) => set({ reportFrequency: frequency }),

  setReportFormat: (format: ReportFormat) => set({ reportFormat: format }),

  setTimeframe: (timeframe: { year: number, month: number }) => set({ timeframe }),

  setEmailReport: (emailReport: boolean) => set({ emailReport }),

  setEmailAddress: (email: string) => set({ emailAddress: email }),

  // Reset wizard state
  resetWizard: () => set({
    currentStep: 1,
    selectedProvider: null,
    reportType: null,
    credentials: null,
    resources: [], // Reset resources
    selectedResources: [],
    reportFrequency: 'once',
    reportFormat: 'pdf',
    timeframe: null,
    emailReport: true,
    emailAddress: '',
  }),

  // Check if we can proceed to next step
  canProceed: () => {
    const { currentStep, selectedProvider, reportType, timeframe, credentials, selectedResources } = get();

    switch (currentStep) {
      case 1: // Provider selection
        return !!selectedProvider;
      case 2: // Report type selection
        return !!reportType;
      case 3: // Conditional flow
        if (reportType === 'billing') {
          return !!timeframe; // Year/month selection
        } else {
          return !!credentials || selectedResources.length > 0;
        }
      case 4: // More details
        if (reportType === 'billing') {
          return !!credentials && !!credentials.accountName;
        } else {
          return selectedResources.length > 0;
        }
      default:
        return true;
    }
  }
}));