import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transformIncidentFormData, type IncidentFormData } from "@/lib/form-utils";
import { useToast } from "@/hooks/use-toast";

/**
 * Custom hook for incident creation with proper error handling and optimistic updates
 */
export const useCreateIncident = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const transformedData = transformIncidentFormData(data);

      const response = await fetch('/api/system-incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create system incident');
      }

      return response.json();
    },
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-incidents'] });
      toast({
        title: 'Success',
        description: `System incident ${incident.incidentId} created successfully`,
      });
    },
    onError: (error: any) => {

      toast({
        title: 'Error',
        description: error.message || 'Failed to create system incident',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Custom hook for incident updates
 */
export const useUpdateIncident = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IncidentFormData> }) => {
      const transformedData = transformIncidentFormData(data as IncidentFormData);

      const response = await fetch(`/api/system-incidents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update system incident');
      }

      return response.json();
    },
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-incidents'] });
      toast({
        title: 'Success',
        description: `System incident ${incident.incidentId} updated successfully`,
      });
    },
    onError: (error: any) => {

      toast({
        title: 'Error',
        description: error.message || 'Failed to update system incident',
        variant: 'destructive',
      });
    },
  });
};