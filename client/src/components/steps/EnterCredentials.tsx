import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useStore } from "@/lib/store"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import { Loader2 } from "lucide-react"
import { useState } from "react"

// Create a common account name schema to use in both AWS and Azure schemas
const accountNameSchema = z.object({
  accountName: z.string().min(1, "Account name is required")
})

// AWS Credentials Schema
const awsCredentialsSchema = accountNameSchema.extend({
  accessKeyId: z.string().min(16, "Access Key ID should be at least 16 characters"),
  secretAccessKey: z.string().min(16, "Secret Access Key should be at least 16 characters"),
})

// Azure Credentials Schema
const azureCredentialsSchema = accountNameSchema.extend({
  tenantId: z.string().min(8, "Tenant ID is required"),
  clientId: z.string().min(8, "Client ID is required"),
  clientSecret: z.string().min(8, "Client Secret is required"),
})

export function EnterCredentials() {
  const { selectedProvider, setCredentials } = useStore()
  const { toast } = useToast()
  const [isValidating, setIsValidating] = useState(false)

  // Select the appropriate schema based on provider
  const formSchema = selectedProvider === "aws" ? awsCredentialsSchema : azureCredentialsSchema

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountName: "",
      ...(selectedProvider === "aws" 
        ? { accessKeyId: "", secretAccessKey: "" }
        : { tenantId: "", clientId: "", clientSecret: "" })
    },
  })

  // Submit handler
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsValidating(true)
    try {
      const response = await apiRequest("POST", "/api/validate-aws-credentials", data);
      const result = await response.json()

      if (result.valid && result.resources) {
        // Store both credentials and resources
        setCredentials(data)
        useStore.setState({ resources: result.resources })
        toast({
          title: "Credentials validated",
          description: "Your cloud credentials were validated successfully.",
        })
      } else {
        toast({
          title: "Invalid credentials",
          description: result.message || "Please check your credentials and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Validation error",
        description: "There was a problem validating your credentials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
          Enter Cloud Credentials
        </h2>
        <p className="text-muted-foreground mt-2">
          Provide your {selectedProvider === "aws" ? "AWS" : "Azure"} credentials to access resources
        </p>
      </div>

      <Card className="max-w-2xl mx-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account name" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this cloud account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedProvider === "aws" ? (
              // AWS Credentials Form
              <>
                <FormField
                  control={form.control}
                  name="accessKeyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AWS Access Key ID</FormLabel>
                      <FormControl>
                        <Input placeholder="AKIAIOSFODNN7EXAMPLE" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your AWS IAM Access Key ID
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="secretAccessKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AWS Secret Access Key</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your AWS IAM Secret Access Key
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              // Azure Credentials Form
              <>
                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Azure Tenant ID</FormLabel>
                      <FormControl>
                        <Input placeholder="00000000-0000-0000-0000-000000000000" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your Azure Active Directory Tenant ID
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Azure Client ID</FormLabel>
                      <FormControl>
                        <Input placeholder="00000000-0000-0000-0000-000000000000" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your Azure Application (client) ID
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Azure Client Secret</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Your secret value" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your Azure Application client secret
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
                disabled={isValidating}
              >
                {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Validate Credentials
              </button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  )
}
