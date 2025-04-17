import { create } from 'zustand';
import { CloudProvider, ReportType, ReportFrequency, ReportFormat } from '@shared/schema';
import { Resource } from '@/types';

// Define the steps for the wizard
export const STEPS = [
  { id: 'provider', title: 'Provider' },
  { id: 'reportType', title: 'Report Type' },
  { id: 'details', title: 'Details' },
  { id: 'frequency', title: 'Frequency' },
  { id: 'generate', title: 'Generate' }
];

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
    const { currentStep } = get();
    if (currentStep < STEPS.length) {
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
