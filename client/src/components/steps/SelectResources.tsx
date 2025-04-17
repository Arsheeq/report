import { useState } from "react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Resource } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Pagination } from "@/components/ui/pagination";
import { Loader2, Server, Database, Search } from "lucide-react";
import { formatResourceId } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SelectResources() {
  const [selectAllEC2, setSelectAllEC2] = useState(false);
  const [selectAllRDS, setSelectAllRDS] = useState(false);

  const handleSelectAllEC2 = () => {
    setSelectAllEC2(!selectAllEC2);
    const updatedResources = resources.map(resource => ({
      ...resource,
      selected: resource.type === 'ec2' ? !selectAllEC2 : resource.selected
    }));
    setResources(updatedResources);
  };

  const handleSelectAllRDS = () => {
    setSelectAllRDS(!selectAllRDS);
    const updatedResources = resources.map(resource => ({
      ...resource,
      selected: resource.type === 'rds' ? !selectAllRDS : resource.selected
    }));
    setResources(updatedResources);
  };
  const { selectedProvider, selectedResources, setSelectedResources } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ec2");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch resources based on selected provider
  const { data: resources, isLoading, error } = useQuery<Resource[]>({
    queryKey: [`/api/${selectedProvider}/resources`],
    enabled: !!selectedProvider,
    select: (data) => data.map(resource => ({
      ...resource,
      id: resource.resourceId,
      selected: false
    }))
  });

  // Check if the resource is an EC2 instance or RDS instance
  const isEC2Instance = (resource: Resource) => 
    resource.type.toLowerCase().includes("ec2") || 
    resource.type.toLowerCase().includes("instance") && 
    !resource.type.toLowerCase().includes("rds");

  const isRDSInstance = (resource: Resource) => 
    resource.type.toLowerCase().includes("rds") || 
    resource.type.toLowerCase().includes("database");

  // Filter resources based on search and selected tab (EC2 or RDS)
  const filteredResources = resources
    ? resources.filter(
        (resource) => {
          const matchesSearch = (
            resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.resourceId.toLowerCase().includes(searchQuery.toLowerCase())
          );
          
          if (activeTab === "ec2") {
            return matchesSearch && isEC2Instance(resource);
          } else if (activeTab === "rds") {
            return matchesSearch && isRDSInstance(resource);
          }
          
          return matchesSearch;
        }
      )
    : [];

  // Pagination
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResources = filteredResources.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Toggle resource selection
  const toggleResourceSelection = (resource: Resource) => {
    if (selectedResources.some((r) => r.id === resource.id)) {
      setSelectedResources(selectedResources.filter((r) => r.id !== resource.id));
    } else {
      setSelectedResources([...selectedResources, resource]);
    }
  };

  // Check if a resource is selected
  const isResourceSelected = (resource: Resource) => {
    return selectedResources.some((r) => r.id === resource.id);
  };

  const getStatusColor = (status: string) => {
    if (status === 'running' || status === 'active' || status === 'available') {
      return 'bg-green-100 text-green-800';
    } else if (status === 'stopped') {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
          Select Resources
        </h2>
        <p className="text-muted-foreground mt-2">
          Choose the resources to include in your report
        </p>
      </div>

      <Tabs 
        defaultValue="ec2" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full max-w-4xl mx-auto"
      >
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger 
            value="ec2" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-50"
          >
            <Server className="h-4 w-4" />
            EC2 Instances
          </TabsTrigger>
          <TabsTrigger 
            value="rds"
            className="flex items-center gap-2 data-[state=active]:bg-blue-50"
          >
            <Database className="h-4 w-4" />
            RDS Instances
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Search */}
          <div className="relative mb-6">
            <Input
              type="text"
              placeholder="Search instances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>

          {/* Resource table for both tabs */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-3 text-sm font-medium grid grid-cols-12 gap-4">
              <div className="col-span-1"></div>
              <div className="col-span-3">Instance ID</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Region</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-2">State</div>
            </div>

            {isLoading ? (
              <div className="py-8 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading resources...</span>
              </div>
            ) : error ? (
              <div className="py-8 text-center text-destructive">
                Error loading resources. Please try again.
              </div>
            ) : paginatedResources.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No {activeTab === "ec2" ? "EC2" : "RDS"} instances found matching your criteria.
              </div>
            ) : (
              paginatedResources.map((resource) => (
                <div
                  key={resource.id}
                  className="px-4 py-3 border-t grid grid-cols-12 gap-4 items-center hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  onClick={() => toggleResourceSelection(resource)}
                >
                  <div className="col-span-1">
                    <Checkbox
                      checked={isResourceSelected(resource)}
                      className="transition-transform group-hover:scale-110"
                      onCheckedChange={() => toggleResourceSelection(resource)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="col-span-3 font-mono text-sm">
                    {formatResourceId(resource.resourceId)}
                  </div>
                  <div className="col-span-3 font-medium group-hover:text-blue-600 transition-colors">
                    {resource.name}
                  </div>
                  <div className="col-span-2">{resource.region}</div>
                  <div className="col-span-1">
                    {activeTab === "ec2" ? "EC2" : "RDS"}
                  </div>
                  <div className="col-span-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(resource.status)}`}>
                      {resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!isLoading && paginatedResources.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium">
                  {filteredResources.length > 0
                    ? `${startIndex + 1}-${Math.min(
                        startIndex + itemsPerPage,
                        filteredResources.length
                      )}`
                    : "0"}
                </span>{" "}
                of <span className="font-medium">{filteredResources.length}</span>{" "}
                instances
              </div>
              
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </Tabs>

      {/* The CSS for bubble animation is added to index.css */}
    </div>
  );
}
