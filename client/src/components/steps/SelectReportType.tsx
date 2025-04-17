import { useStore } from "@/lib/store";
import { BarChart3, Receipt } from "lucide-react";
import { ProviderCard } from "@/components/ui/provider-card";

export function SelectReportType() {
  const { reportType, setReportType } = useStore();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
          Select Report Type
        </h2>
        <p className="text-muted-foreground mt-2">
          Choose the type of report you want to generate
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <ProviderCard
          provider="utilization"
          name="Utilization Report"
          description="Resource usage metrics and optimization recommendations"
          selected={reportType === "utilization"}
          onClick={() => setReportType("utilization")}
          icon={<BarChart3 className="w-16 h-16 text-primary" />}
        />

        <ProviderCard
          provider="billing"
          name="Billing Report"
          description="Detailed cost breakdown and spending analytics"
          selected={reportType === "billing"}
          onClick={() => setReportType("billing")}
          icon={<Receipt className="w-16 h-16 text-primary" />}
        />
      </div>
    </div>
  );
}
