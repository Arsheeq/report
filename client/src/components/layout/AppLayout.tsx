import { ReactNode } from "react";
import { NubinixLogo } from "@/components/ui/nubinix-logo";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b py-4 px-6 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <NubinixLogo height={40} />
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent">
            Cloud Insights
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://www.nubinix.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent drop-shadow-md"
          >
            www.nubinix.com
          </a>
        </div>
      </header>

      {/* Main Content */}
      {children}

      {/* Footer */}
      <footer className="border-t py-4 px-6 bg-gradient-to-t from-black to-transparent">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <NubinixLogo height={24} />
            <span className="text-sm text-white">
              © {new Date().getFullYear()} Nubinix Cloud Insights. All rights reserved.
            </span>
          </div>
          <div className="flex gap-6">
            <a
              href="https://nubinix.com/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white hover:text-gray-300"
            >
              Privacy Policy
            </a>
            <a
              href="https://nubinix.com/terms-of-use/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white hover:text-gray-300"
            >
              Terms of Service
            </a>
            <a
              href="https://nubinix.com/contact-us/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white hover:text-gray-300"
            >
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

