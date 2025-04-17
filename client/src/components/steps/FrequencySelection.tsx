import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Calendar as CalendarIcon, 
  ClockIcon
} from "lucide-react";
import { useEffect } from "react";

export function FrequencySelection() {
  const { reportFrequency, setReportFrequency } = useStore();

  // Set default to daily if one-time or monthly is currently selected
  useEffect(() => {
    if (reportFrequency === 'once' || reportFrequency === 'monthly' || reportFrequency === 'quarterly') {
      setReportFrequency('daily');
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
          Select Report Frequency
        </h2>
        <p className="text-muted-foreground mt-2">
          How often would you like to generate this report?
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <RadioGroup
            value={reportFrequency}
            onValueChange={(value) => setReportFrequency(value as any)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer transform hover:scale-105 transition-transform duration-200">
                <RadioGroupItem value="daily" id="daily" />
                <Label
                  htmlFor="daily"
                  className="flex-1 flex items-center cursor-pointer"
                >
                  <ClockIcon className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <div className="font-medium">Daily</div>
                    <div className="text-sm text-muted-foreground">
                      Generate this report every day
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer transform hover:scale-105 transition-transform duration-200">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label
                  htmlFor="weekly"
                  className="flex-1 flex items-center cursor-pointer"
                >
                  <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <div className="font-medium">Weekly</div>
                    <div className="text-sm text-muted-foreground">
                      Generate this report every week
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
