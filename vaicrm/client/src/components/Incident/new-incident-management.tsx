// client/src/components/Incident/new-incident-management.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { z } from 'zod';
import {
  ArrowLeft,
  RotateCcw,
  Send,
  Search,
  BookOpen,
  Monitor,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { useAuthContext } from '@/context/AuthProvider';
import { incidentApi, RegisterTicketPayload, CommonSelectionData } from '@/lib/incidentApi';
import { apiRequest } from '@/lib/queryClient';
import { newIncidentSchema, type IncidentFormData } from '@/lib/form-utils';

// --- UTILS ---

// Helper to remove duplicates from API response based on name
const getUniqueOptions = (items: any[]) => {
  if (!items) return [];
  const uniqueMap = new Map();
  items.forEach(item => {
    const normalizedName = item.name?.trim();
    if (normalizedName && !uniqueMap.has(normalizedName)) {
      uniqueMap.set(normalizedName, { ...item, name: normalizedName, value: String(item.value || '').trim() });
    }
  });
  return Array.from(uniqueMap.values());
};

// Helper to filter options by country code
const getOptionsByCountryCode = (items: any[], countryCode: string | undefined) => {
  if (!items || !countryCode) return getUniqueOptions(items);
  const filtered = items.filter(item => item.countryCode === countryCode);
  return getUniqueOptions(filtered.length > 0 ? filtered : items);
};

// Helper to find option value by name (case-insensitive)
const findOptionValueByName = (options: any[], name: string | undefined | null): string => {
  if (!name) return '';
  const normalizedName = name.trim().toLowerCase();
  const option = options.find(opt => opt.name?.trim().toLowerCase() === normalizedName);
  return option?.value || '';
};


// Helper to get SLA hours from sdPrioritySla structure
const getSlaHoursForPriority = (
  sdPrioritySla: any[],
  countryCode: string | undefined,
  priorityName: string
): number | null => {
  if (!sdPrioritySla || !Array.isArray(sdPrioritySla) || !priorityName) {
    return null;
  }

  // Find the country entry
  const countryEntry = sdPrioritySla.find(entry => entry.countryCode === countryCode);

  if (!countryEntry || !countryEntry.groups || !Array.isArray(countryEntry.groups)) {
    // If no country match, try to find in any country (fallback)
    for (const entry of sdPrioritySla) {
      if (entry.groups && Array.isArray(entry.groups)) {
        const priorityEntry = entry.groups.find(
          (g: any) => g.priority?.trim().toUpperCase() === priorityName.trim().toUpperCase()
        );
        if (priorityEntry && priorityEntry.slaHours !== undefined) {
          return parseInt(priorityEntry.slaHours, 10);
        }
      }
    }
    return null;
  }

  // Find the priority within the country's groups
  const priorityEntry = countryEntry.groups.find(
    (g: any) => g.priority?.trim().toUpperCase() === priorityName.trim().toUpperCase()
  );

  if (priorityEntry && priorityEntry.slaHours !== undefined) {
    return parseInt(priorityEntry.slaHours, 10);
  }

  return null;
};

// Schema and type moved to @/lib/form-utils to avoid duplication

export default function NewIncidentManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
const [customerSearchType, setCustomerSearchType] = useState<'auto' | 'mobile' | 'sapBpId' | 'firstName' | 'smartCard'>('auto');

  // Get user's country code from salesOrg
  const userCountryCode = user?.salesOrg || '';

  // --- STATE ---
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [showKBSearch, setShowKBSearch] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showMobileHeaderDetails, setShowMobileHeaderDetails] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  // State for common selection auto-populated values
  const [commonSelectionData, setCommonSelectionData] = useState<CommonSelectionData | null>(null);
  const [isLoadingCommonSelection, setIsLoadingCommonSelection] = useState(false);

  // State for SLA target resolve
  const [targetResolveDate, setTargetResolveDate] = useState<string>('');
  const [targetResolveTime, setTargetResolveTime] = useState<string>('');
  const [isLoadingSla, setIsLoadingSla] = useState(false);

  // Modal State
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [createdIncidentNumber, setCreatedIncidentNumber] = useState('');
  const [pendingFormData, setPendingFormData] = useState<IncidentFormData | null>(null);

  // --- QUERIES ---

  // 1. Fetch Business Organizations (Clients)
  const { data: busOrgsData, isLoading: isLoadingBusOrgs } = useQuery({
    queryKey: ['business-organizations', user?.salesOrg],
    queryFn: () => apiRequest('/organization/bus-orgs', 'POST', { objId: null, name: null, orgId: user?.salesOrg }),
    staleTime: 1000 * 60 * 60,
    enabled: !!user,
  });

  // 2. Fetch Service Desk Dropdowns (Categories, SubCats, etc.)
  const { data: dropdownsData, isLoading: isLoadingDropdowns } = useQuery({
    queryKey: ['service-desk-dropdowns'],
    queryFn: () => apiRequest('/organization/service-desk-dropdowns', 'GET'),
    staleTime: 1000 * 60 * 60,
  });

  // 3. Fetch Sequence Number
  const {
    data: sequenceData,
    isLoading: isLoadingSequence,
    refetch: refetchSequence
  } = useQuery({
    queryKey: ['incident-sequence'],
    queryFn: () => apiRequest('/organization/sequence', 'POST', { sequenceName: 'INCIDENT' }),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // 4. Customer Search Query
  const { data: customerSearchData, isLoading: isLoadingCustomers } = useQuery({
  queryKey: ['customer-search', userSearchQuery, customerSearchType],
  queryFn: async () => {
    const payload: any = { salesOrg: user?.salesOrg || "" };
    const trimmedQuery = userSearchQuery.trim();
    
    switch (customerSearchType) {
      case 'mobile':
        payload.mobile = trimmedQuery;
        break;
      case 'sapBpId':
        payload.sapBpId = trimmedQuery;
        break;
      case 'firstName':
        payload.firstName = trimmedQuery;
        break;
      case 'smartCard':
        payload.smartCard = trimmedQuery;
        break;
      case 'auto':
      default:
        // Auto-detect based on input pattern
        const isNumeric = /^\d+$/.test(trimmedQuery);
        
        if (isNumeric) {
          // Mobile: 10+ digits, SAP BP ID: < 10 digits
          if (trimmedQuery.length >= 10) {
            payload.mobile = trimmedQuery;
          } else {
            payload.sapBpId = trimmedQuery;
          }
        } else if (/^[A-Za-z0-9]+$/.test(trimmedQuery) && trimmedQuery.length >= 8) {
          // Alphanumeric with 8+ chars = likely smartcard
          payload.smartCard = trimmedQuery;
        } else {
          payload.firstName = trimmedQuery;
        }
        break;
    }
    
    return apiRequest('/subscriptions/search-customers', 'POST', payload);
  },
  enabled: userSearchQuery.length >= 3,
});

  // 5. Asset Search Query
  const { data: assetSearchData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['asset-search', assetSearchQuery],
    queryFn: () => incidentApi.searchAssets(assetSearchQuery),
    enabled: assetSearchQuery.length >= 3,
  });

  // 6. Agent Search Query
  const { data: agentSearchData, isLoading: isLoadingAgents } = useQuery({
    queryKey: ['agent-search', agentSearchQuery],
    queryFn: async () => {
      const isNumeric = /^\d+$/.test(agentSearchQuery);
      const payload: any = { type: 'Agent', salesOrg: user?.salesOrg || "" };
      if (isNumeric) {
        payload.sapBpId = agentSearchQuery;
        payload.mobile = agentSearchQuery;
      } else {
        payload.firstName = agentSearchQuery;
      }
      return apiRequest('/agents/user-details', 'POST', payload);
    },
    enabled: agentSearchQuery.length >= 3,
  });

  // --- DATA PROCESSING ---
  const businessOrganizations = busOrgsData?.data?.data || [];
  const rawDropdowns = dropdownsData?.data || {};

  // Extract dropdown options filtered by user's country code
  const categoryOptions = useMemo(() =>
    getOptionsByCountryCode(rawDropdowns.sdIncidentCategory, userCountryCode),
    [rawDropdowns.sdIncidentCategory, userCountryCode]
  );

  const subCategoryOptions = useMemo(() =>
    getOptionsByCountryCode(rawDropdowns.sdIncidentSubCategory, userCountryCode),
    [rawDropdowns.sdIncidentSubCategory, userCountryCode]
  );

  const priorityOptions = useMemo(() =>
    getOptionsByCountryCode(rawDropdowns.sdIncidentPriority, userCountryCode),
    [rawDropdowns.sdIncidentPriority, userCountryCode]
  );

  const assignmentGroupOptions = useMemo(() =>
    getOptionsByCountryCode(rawDropdowns.sdIncidentAssignmentGroup, userCountryCode),
    [rawDropdowns.sdIncidentAssignmentGroup, userCountryCode]
  );

  const channelOptions = useMemo(() =>
    getOptionsByCountryCode(rawDropdowns.sdIncidentChannel, userCountryCode),
    [rawDropdowns.sdIncidentChannel, userCountryCode]
  );

  const commonFaultsOptions = useMemo(() =>
    getOptionsByCountryCode(rawDropdowns.sdCommonFault, userCountryCode),
    [rawDropdowns.sdCommonFault, userCountryCode]
  );

  // Extract Priority SLA data (nested structure)
  const prioritySlaData = rawDropdowns.sdPrioritySla || [];

  // Helper to extract customer data
  const processCustomerResults = (responseData: any) => {
    const details = responseData?.customerDetails || responseData?.data || [];
    if (!Array.isArray(details)) return [];

    return details.map((cust: any) => {
      const mobileContact = cust.contactMedium?.find((c: any) => c.type === 'mobile' || c.type === 'phone');
      const address = cust.contactMedium?.find((c: any) => c.type === 'INSTALLATION_ADDRESS' || c.type === 'BILLING_ADDRESS');
      const related = cust.relatedParty?.[0] || {};

      return {
        ...cust,
        firstName: cust.firstName,
        lastName: cust.lastName,
        mobile: mobileContact?.value || cust.mobile || '',
        city: address?.city || cust.city || '',
        region: address?.region || cust.region || '',
        sapBpId: related.sapBpId || cust.sapBpId || '',
        sapCaId: related.sapCaId || cust.sapCaId || '',
        contractNo: related.contractNo || cust.contractNo || '',
        macId: related.Mac || cust.Mac || '',
        custId: cust.custId || related.sapBpId || '',
      };
    });
  };

  const customerSearchResults = processCustomerResults(customerSearchData?.data);
  const agentSearchResults = processCustomerResults(agentSearchData?.data);
  const incidentNumber = sequenceData?.data?.generatedSequence || '';
  const [openedTimestamp] = useState(() => new Date());

  // --- FORM CONFIG ---
  const form = useForm<IncidentFormData>({
    resolver: zodResolver(newIncidentSchema),
    defaultValues: {
      client: '',
      commonFaults: '',
      category: '',
      subCategory: '',
      status: 'OPEN',
      priority: '',
      userId: '',
      configurationItem: '',
      assignmentGroup: '',
      assignedTo: '',
      channel: '',
      alternateLocation: '',
      alternateContact: '',
      agentId: '',
      alternatePhone: '',
      shortDescription: '',
      additionalComments: '',
      parentIncidentId: '',
    },
  });

  const selectedCategory = form.watch('category');
  const selectedAssignmentGroup = form.watch('assignmentGroup');
  const selectedPriority = form.watch('priority');

  const selectedAssignmentGroupName = useMemo(() => {
    const group = assignmentGroupOptions.find(opt => opt.value === selectedAssignmentGroup);
    return group?.name || '';
  }, [selectedAssignmentGroup, assignmentGroupOptions]);

  // 7. Fetch User Queues (Agents) based on Assignment Group
  const { data: userQueuesData, isLoading: isLoadingUserQueues } = useQuery({
    queryKey: ['user-queues', selectedAssignmentGroupName, user?.username],
    queryFn: () => incidentApi.fetchUserQueues({
      userName: '',
      queueName: selectedAssignmentGroupName
    }),
    enabled: !!selectedAssignmentGroupName && !!user?.username,
    staleTime: 1000 * 60 * 5,
  });

  const availableAgents = useMemo(() => {
    const queueData = userQueuesData?.data?.data || [];
    const uniqueMap = new Map();
    queueData.forEach((queue: any) => {
      if (queue.assignedUser && !uniqueMap.has(queue.assignedUser)) {
        uniqueMap.set(queue.assignedUser, {
          assignedUser: queue.assignedUser,
          queueId: queue.queueId,
          title: queue.title,
          emailId: queue.emailId,
          description: queue.description,
          businessOrgName: queue.businessOrgName
        });
      }
    });
    return Array.from(uniqueMap.values());
  }, [userQueuesData]);

  // --- SLA GENERATION HANDLER ---
  const handlePriorityChange = useCallback(async (priorityValue: string) => {
    if (!priorityValue || prioritySlaData.length === 0) {
      setTargetResolveDate('');
      setTargetResolveTime('');
      return;
    }

    // Find the selected priority name from options
    const selectedPriorityOption = priorityOptions.find(opt => opt.value === priorityValue);
    const priorityName = selectedPriorityOption?.name?.trim();

    if (!priorityName) {
      return;
    }

    // Get SLA hours from the nested sdPrioritySla structure
    const slaHours = getSlaHoursForPriority(prioritySlaData, userCountryCode, priorityName);

    if (slaHours === null || isNaN(slaHours) || slaHours <= 0) {
      setTargetResolveDate('');
      setTargetResolveTime('');
      return;
    }

    setIsLoadingSla(true);

    try {
      const response = await incidentApi.generateSla(slaHours);

      // Handle different response structures
      let newDate = '';
      let newTime = '';

      if (response?.data?.newDate && response?.data?.newTime) {
        newDate = response.data.newDate;
        newTime = response.data.newTime;
      } else if (response?.newDate && response?.newTime) {
        newDate = response.newDate;
        newTime = response.newTime;
      }

      if (newDate && newTime) {
        setTargetResolveDate(newDate);
        setTargetResolveTime(newTime);
      } else {
        setTargetResolveDate('');
        setTargetResolveTime('');
      }
    } catch (error: any) {
      toast({
        title: "Warning",
        description: "Failed to generate target resolve date. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      setTargetResolveDate('');
      setTargetResolveTime('');
    } finally {
      setIsLoadingSla(false);
    }
  }, [priorityOptions, prioritySlaData, userCountryCode, toast]);

  // Watch for priority changes and generate SLA
  useEffect(() => {
    if (selectedPriority) {
      handlePriorityChange(selectedPriority);
    }
  }, [selectedPriority, handlePriorityChange]);

  // --- COMMON SELECTION API HANDLER ---
  const handleCommonFaultChange = useCallback(async (commonFaultName: string) => {
    if (!commonFaultName) {
      setCommonSelectionData(null);
      return;
    }

    setIsLoadingCommonSelection(true);

    try {
      const response = await incidentApi.fetchCommonSelection({
        orgId: "",
        type: commonFaultName,
        title: "",
        assignmentGroup: "",
        commonRequests2busOrg: ""
      });

      if (response?.status === 'Success' && response?.data?.data?.length > 0) {
        const selectionData = response.data.data[0];
        setCommonSelectionData(selectionData);

        // Auto-populate form fields based on response
        const categoryValue = findOptionValueByName(categoryOptions, selectionData.category);
        const subCategoryValue = findOptionValueByName(subCategoryOptions, selectionData.subCategory);
        const priorityValue = findOptionValueByName(priorityOptions, selectionData.priority);
        const assignmentGroupValue = findOptionValueByName(assignmentGroupOptions, selectionData.assignmentGroup);

        // Set form values
        if (categoryValue) {
          form.setValue('category', categoryValue);
        }
        if (subCategoryValue) {
          form.setValue('subCategory', subCategoryValue);
        }
        if (priorityValue) {
          form.setValue('priority', priorityValue);
          // SLA will be generated automatically via useEffect watching selectedPriority
        }
        if (assignmentGroupValue) {
          form.setValue('assignmentGroup', assignmentGroupValue);
          // Clear agent when assignment group changes
          form.setValue('agentId', '');
          setSelectedAgent(null);
        }

        // Set short description from title if available
        if (selectionData.title) {
          form.setValue('shortDescription', selectionData.title);
        }

        // Set description/additional comments if available
        if (selectionData.description) {
          form.setValue('additionalComments', selectionData.description);
        }

        toast({
          title: "Auto-populated",
          description: `Form fields updated based on "${commonFaultName}" selection.`,
          duration: 2000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Warning",
        description: "Failed to fetch common selection data. Please fill fields manually.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoadingCommonSelection(false);
    }
  }, [categoryOptions, subCategoryOptions, priorityOptions, assignmentGroupOptions, form, toast]);

  // Reset agent when assignment group changes
  useEffect(() => {
    if (selectedAssignmentGroup) {
      form.setValue('agentId', '');
      setSelectedAgent(null);
      setAgentSearchQuery('');
    }
  }, [selectedAssignmentGroup, form]);

  // Format target resolve display
  const targetResolveDisplay = useMemo(() => {
    if (!targetResolveDate && !targetResolveTime) {
      return '';
    }
    if (targetResolveDate && targetResolveTime) {
      // Format: 2026-02-19 14:20:23 -> readable format
      try {
        const dateTimeStr = `${targetResolveDate}T${targetResolveTime}`;
        const dateObj = new Date(dateTimeStr);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleString();
        }
      } catch {
        // Fall through to simple format
      }
      return `${targetResolveDate} ${targetResolveTime}`;
    }
    return targetResolveDate || targetResolveTime;
  }, [targetResolveDate, targetResolveTime]);

  // =============================================
  // Complete Form Reset Function
  // =============================================
  const resetEntireForm = useCallback(() => {
    // Reset main form fields
    form.reset({
      client: '',
      commonFaults: '',
      category: '',
      subCategory: '',
      status: 'OPEN',
      priority: '',
      severity: '',
      userId: '',
      configurationItem: '',
      assignmentGroup: '',
      assignedTo: '',
      channel: '',
      alternateLocation: '',
      alternateContact: '',
      agentId: '',
      alternatePhone: '',
      shortDescription: '',
      additionalComments: '',
      parentIncidentId: '',
    });

    // Reset selected entities
    setSelectedCustomer(null);
    setSelectedAsset(null);
    setSelectedAgent(null);
    setCustomerSearchType('auto');
    // Reset search queries
    setUserSearchQuery('');
    setAgentSearchQuery('');
    setAssetSearchQuery('');

    // Reset common selection data
    setCommonSelectionData(null);

    // Reset SLA data
    setTargetResolveDate('');
    setTargetResolveTime('');

    // Reset UI state
    setShowKBSearch(false);
    setHasUnsavedChanges(false);
    setIsFormSubmitted(false);
    setShowMobileHeaderDetails(false);

    // Reset modal state
    setPendingFormData(null);

    // Refetch sequence number for new incident
    refetchSequence();
  }, [form, refetchSequence]);

  // =============================================
  // Handle Reset Button Click (with modal)
  // =============================================
  const handleReset = () => {
    if (hasUnsavedChanges) {
      setShowResetConfirmModal(true);
    } else {
      resetEntireForm();
      toast({
        title: 'Form Reset',
        description: 'All form fields have been cleared.',
        duration: 2000,
      });
    }
  };

  const confirmReset = () => {
    resetEntireForm();
    setShowResetConfirmModal(false);
    toast({
      title: 'Form Reset',
      description: 'All form fields have been cleared.',
      duration: 2000,
    });
  };

  // =============================================
  // Handle Success Modal Close - Navigate to list
  // =============================================
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setCreatedIncidentNumber('');
    navigate('/my-work');
  };

  // Transform form data to API payload
  const transformToApiPayload = (data: IncidentFormData): RegisterTicketPayload => {
    const now = new Date();

    const selectedClient = businessOrganizations.find((c: any) => c.orgId === data.client);
    const asset = selectedAsset;

    const findName = (options: any[], value: string) => {
      const option = options.find(o => o.value == value);
      return option ? option.name : '';
    };

    const priorityName = findName(priorityOptions, data.priority);
    const categoryName = findName(categoryOptions, data.category);
    const subCategoryName = findName(subCategoryOptions, data.subCategory);
    const assignmentGroupName = findName(assignmentGroupOptions, data.assignmentGroup);
    const channelName = findName(channelOptions, data.channel);

    const customerName = selectedCustomer
      ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()
      : '';

    const location = selectedCustomer
      ? [selectedCustomer.city, selectedCustomer.region].filter(Boolean).join(', ')
      : '';

    // Use the SLA generated target resolve date/time
    const targetResolveDt = targetResolveDate || now.toISOString().split('T')[0];
    const targetResolveTs = targetResolveDate && targetResolveTime
      ? `${targetResolveDate}T${targetResolveTime}`
      : now.toISOString();

    return {
      idNumber: incidentNumber,
      title: data.shortDescription,
      createDt: now.toISOString().split('T')[0],
      createTs: now.toISOString(),
      updateDt: null,
      updateTs: null,
      phoneNum: selectedCustomer?.mobile,
      altPhoneNum: data.alternatePhone,
      agentPhone: selectedAgent?.mobile || selectedAgent?.emailId || '',
      incidentContact: customerName,
      agentId: selectedAgent?.assignedUser || selectedAgent?.sapBpId || data.agentId || '',
      agentSapBpId: selectedAgent?.assignedUser || selectedAgent?.sapBpId || data.agentId || '',
      agentName: selectedAgent?.assignedUser || selectedAgent?.title ||
        ((selectedAgent?.firstName || selectedAgent?.lastName)
          ? `${selectedAgent.firstName || ''} ${selectedAgent.lastName || ''}`.trim()
          : (data.agentId || '')),
      incidentLocation: location,
      altLocation: data.alternateLocation,
      altContact: data.alternateContact,
      caseHistory: data.additionalComments,
      incidentClient: selectedClient?.name,
      commonFault: data.commonFaults,
      assetRefNumber: data.configurationItem || selectedCustomer?.macId,
      assetType: asset?.type,
      assetTag: asset?.tag,
      assetNumber: asset?.number,
      assetDescription: asset?.name,
      targetResolveDt: targetResolveDt,
      targetResolveTs: targetResolveTs,
      firstResponseDt: now.toISOString().split('T')[0],
      firstResponseTs: now.toISOString(),
      firstCallResolution: 0,
      incidentCatagory: categoryName,
      incidentSubcatagory: subCategoryName,
      incidentCategoryName: categoryName,
      incidentSubCategoryName: subCategoryName,
      incidentChannel: channelName,
      incidentPriority: priorityName,
      incidentSeverity: data.severity,
      incidentStatus: 'Open',
      assignmentGroup: data.assignmentGroup,
      incidentPrevq2queue: isNaN(parseInt(data.assignmentGroup)) ? undefined : parseInt(data.assignmentGroup),
      incidentCurrq2queue: isNaN(parseInt(data.assignmentGroup)) ? undefined : parseInt(data.assignmentGroup),
      incidentFirstq2queue: isNaN(parseInt(data.assignmentGroup)) ? undefined : parseInt(data.assignmentGroup),
      incidentOwner2user: selectedAgent?.assignedUser || data.agentId || 0,
      incidentReporter2user: selectedCustomer?.custId,
      incidentOriginator2user: user?.username,
      incidentReporter2busOrg: selectedClient?.orgId,
      incidentReporter2site: 4001,
      incidentReporter2customer: selectedCustomer?.custId,
      incidentReporter2customerName: customerName,
      sapBpId: selectedCustomer?.sapBpId,
      sapCaId: selectedCustomer?.sapCaId,
      contractNo: selectedCustomer?.contractNo,
      parentIncident2incident: data.parentIncidentId ? parseInt(data.parentIncidentId) : null,
      survey: 0,
    };
  };

  // Create incident mutation
  const createIncidentMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      if (!incidentNumber) {
        throw new Error('Incident number has not been generated yet.');
      }
      const payload = transformToApiPayload(data);
      return incidentApi.create(payload);
    },
    onSuccess: async (response) => {
      // Close confirmation modal
      setShowSubmitConfirmModal(false);

      // Store the created incident number
      setCreatedIncidentNumber(incidentNumber);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['incidents'] });

      // Register activity entry
      try {
        await incidentApi.registerActivityEntry(
          incidentNumber,
          user?.username || 'system'
        );
      } catch (activityError: any) {

      }

      // Reset the form
      resetEntireForm();

      // Show success modal
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      setShowSubmitConfirmModal(false);
      toast({
        title: 'Error',
        description: error?.statusMessage || error?.message || 'Failed to create incident. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Handle form submit - show confirmation modal
  const onSubmit = (data: IncidentFormData) => {
    setPendingFormData(data);
    setShowSubmitConfirmModal(true);
  };

  // Confirm and submit the form
  const confirmSubmit = () => {
    if (pendingFormData) {
      createIncidentMutation.mutate(pendingFormData);
    }
  };

  // Watchers for unsaved changes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        setHasUnsavedChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Asset search results
  const assetSearchResults = assetSearchData?.data?.data || [];

  // Get display names for confirmation modal
  const getDisplayName = (options: any[], value: string) => {
    const option = options.find(o => o.value === value);
    return option?.name || value || 'Not selected';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 w-full transition-all duration-200">
        <div className="w-full px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between h-auto sm:h-12 py-2 sm:py-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 w-full">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/customer-specific')} className="h-8 w-8 p-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-bold text-gray-700 ml-2 sm:ml-0">New Incident</span>
                </div>
                <div className="sm:hidden">
                  <button
                    type="button"
                    className="p-2 rounded-full border border-gray-300 bg-white shadow-sm"
                    onClick={() => setShowMobileHeaderDetails(prev => !prev)}
                  >
                    {showMobileHeaderDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="hidden sm:flex items-center text-sm text-gray-500 sm:ml-4 ml-0">
                <span>Incident #:</span>
                <strong className="ml-1">
                  {isLoadingSequence ? (
                    <Loader2 className="h-3 w-3 inline animate-spin" />
                  ) : (
                    incidentNumber || 'Generating...'
                  )}
                </strong>
                <Badge className="bg-gray-100 text-gray-800 border-gray-300 ml-3">
                  {form.watch('priority') ? getDisplayName(priorityOptions, form.watch('priority')) : 'Select Priority'}
                </Badge>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-3 mt-0 w-auto justify-end">
              <Button
                type="button"
                disabled={createIncidentMutation.isPending || isLoadingSequence}
                onClick={form.handleSubmit(onSubmit)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 h-9 shadow-md shadow-teal-200 font-medium transition-all active:scale-95"
              >
                <Send className="h-4 w-4 mr-2" />
                {createIncidentMutation.isPending ? 'Submitting...' : 'Submit Incident'}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} className="border-gray-300 text-gray-600 hover:bg-gray-50 h-9 font-medium transition-all active:scale-95">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Mobile Details */}
          {showMobileHeaderDetails && (
            <div className="sm:hidden mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50 shadow-md">
              <div className="flex items-center text-xs text-gray-700 mb-2">
                <span className="font-semibold">Incident #:</span>
                <strong className="ml-1">
                  {isLoadingSequence ? (
                    <Loader2 className="h-3 w-3 inline animate-spin" />
                  ) : (
                    incidentNumber || 'Generating...'
                  )}
                </strong>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={createIncidentMutation.isPending || isLoadingSequence}
                  onClick={form.handleSubmit(onSubmit)}
                  className="bg-gradient-to-r from-teal-600 to-teal-700 text-white text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  {createIncidentMutation.isPending ? 'Submitting...' : 'Submit'}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} className="text-xs">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Container */}
      <div className="w-full flex-1 p-2 sm:p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-white shadow-xl shadow-slate-200/60 rounded-xl overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-slate-800 to-blue-600 text-white">
                <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">New Incident Management</h2>
                  <p className="text-xs text-blue-100/80 font-medium">Create incident tickets efficiently</p>
                </div>
              </div>

              <div className="p-4 lg:p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Left Column - Incident Details */}
                  <div className="space-y-3">
                    {/* Number (Read-only / Fetched Sequence) */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Number</label>
                      <div className="relative w-full">
                        <Input
                          value={incidentNumber || ''}
                          disabled
                          className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm w-full"
                          placeholder={isLoadingSequence ? "Fetching ID..." : ""}
                        />
                        {isLoadingSequence && (
                          <div className="absolute right-2 top-2.5">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Client Dropdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Client</label>
                      <FormField
                        control={form.control}
                        name="client"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingBusOrgs}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white">
                                  <SelectValue placeholder={isLoadingBusOrgs ? "Loading..." : "Please Specify"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {businessOrganizations.map((opt: any) => (
                                  <SelectItem key={opt.orgId} value={opt.orgId} className="text-xs">{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Common Faults - Triggers API call on change */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">
                        Common Faults
                        {isLoadingCommonSelection && (
                          <Loader2 className="h-3 w-3 ml-1 animate-spin text-teal-500" />
                        )}
                      </label>
                      <FormField
                        control={form.control}
                        name="commonFaults"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Find the name of the selected common fault
                                const selectedFault = commonFaultsOptions.find((opt: any) => opt.value === value);
                                if (selectedFault?.name) {
                                  handleCommonFaultChange(selectedFault.name);
                                }
                              }}
                              value={field.value}
                              disabled={isLoadingDropdowns || isLoadingCommonSelection}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white">
                                  <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Please Specify"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {commonFaultsOptions.map((opt: any, index: number) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Category Dropdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Category</label>
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue('subCategory', '');
                              }}
                              value={field.value}
                              disabled={isLoadingDropdowns}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white">
                                  <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Please Specify"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categoryOptions.map((opt: any, index) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Sub Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Sub Category</label>
                      <FormField
                        control={form.control}
                        name="subCategory"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDropdowns}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white">
                                  <SelectValue placeholder="Please Specify" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subCategoryOptions.map((opt: any, index) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* State (Read-only) */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Status</label>
                      <Input value="OPEN" disabled className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm" />
                    </div>

                    {/* Opened (Read-only) */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Opened</label>
                      <Input value={openedTimestamp.toLocaleString()} disabled className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm" />
                    </div>

                    {/* Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Priority</label>
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                              }}
                              value={field.value}
                              disabled={isLoadingDropdowns}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white">
                                  <SelectValue placeholder="Please Specify" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {priorityOptions.map((opt: any, index) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">
                                    {opt.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Target Resolve Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">
                        Target Resolve
                        {isLoadingSla && (
                          <Loader2 className="h-3 w-3 ml-1 animate-spin text-teal-500" />
                        )}
                      </label>
                      <div className="relative">
                        <Input
                          value={targetResolveDisplay}
                          disabled
                          className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm"
                          placeholder={selectedPriority ? (isLoadingSla ? "Calculating..." : "Select priority") : "Select priority first"}
                        />
                        {isLoadingSla && (
                          <div className="absolute right-2 top-2.5">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Assignment & Contact */}
                  <div className="space-y-3">
                    {/* Opened by (Read-only) */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Opened by</label>
                      <Input value={user?.username || ''} disabled className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm" />
                    </div>

                    {/* User ID with Search (Dynamic Customer) */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
  <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">
    Customer Id
  </label>
  <FormField
    control={form.control}
    name="userId"
    render={({ field }) => (
      <FormItem>
        <div className="relative">
          <div className="flex gap-2">
            {/* Search Type Selector */}
            <Select
              value={customerSearchType}
              onValueChange={(value: any) => setCustomerSearchType(value)}
            >
              <SelectTrigger className="h-8 w-24 text-xs border-gray-300 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto" className="text-xs">Auto</SelectItem>
                <SelectItem value="firstName" className="text-xs">Name</SelectItem>
                <SelectItem value="mobile" className="text-xs">Mobile</SelectItem>
                <SelectItem value="sapBpId" className="text-xs">BP ID</SelectItem>
                <SelectItem value="smartCard" className="text-xs">Smart Card</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Search Input */}
            <div className="relative flex-1">
              <FormControl>
                <Input
                  {...field}
                  placeholder={
                    customerSearchType === 'auto' ? "Search Name, Mobile or BP ID..." :
                    customerSearchType === 'firstName' ? "Enter customer name..." :
                    customerSearchType === 'mobile' ? "Enter mobile number..." :
                    customerSearchType === 'sapBpId' ? "Enter SAP BP ID..." :
                    "Enter smartcard number..."
                  }
                  className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white pr-16"
                  onChange={(e) => {
                    field.onChange(e);
                    if (e.target.value === '') {
                      setUserSearchQuery('');
                    }
                  }}
                  onBlur={(e) => {
                    field.onBlur();
                    if (e.target.value.length >= 3) {
                      setUserSearchQuery(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && field.value && field.value.length >= 3) {
                      e.preventDefault();
                      setUserSearchQuery(field.value);
                    }
                  }}
                />
              </FormControl>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                {isLoadingCustomers ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <span 
                    className="bg-[#e67c1a] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm cursor-pointer"
                    onClick={() => {
                      if (field.value && field.value.length >= 3) {
                        setUserSearchQuery(field.value);
                      }
                    }}
                  >
                    Search
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer Dropdown Results */}
          {userSearchQuery && customerSearchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-48 overflow-y-auto">
              {customerSearchResults.map((cust: any, index: number) => (
                <button
                  key={`${cust.custId}-${cust.sapBpId}-${index}`}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center text-xs border-b border-gray-100 last:border-0 group"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const displayName = `${cust.firstName} ${cust.lastName}`.trim();
                    field.onChange(displayName);
                    setUserSearchQuery('');
                    setSelectedCustomer(cust);

                    if (cust.macId) {
                      form.setValue('configurationItem', cust.macId);
                    }

                    toast({
                      title: "Customer Selected",
                      description: `Selected: ${displayName} (${cust.mobile})`,
                      duration: 2000,
                    });
                  }}
                >
                  <div className="bg-teal-100 p-1.5 rounded-full mr-3 group-hover:bg-teal-200">
                    <User className="h-3 w-3 text-teal-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">
                      {cust.firstName} {cust.lastName}
                    </div>
                    <div className="text-gray-500 flex flex-wrap gap-x-2">
                      {cust.mobile && <span>📱 {cust.mobile}</span>}
                      {cust.sapBpId && <span>🆔 {cust.sapBpId}</span>}
                      {cust.city && <span>📍 {cust.city}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* No Results Message */}
          {userSearchQuery && !isLoadingCustomers && customerSearchResults.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl p-3">
              <p className="text-xs text-gray-500 text-center">
                No customers found for "{userSearchQuery}"
              </p>
            </div>
          )}
        </div>
        <FormMessage className="text-xs" />
      </FormItem>
    )}
  />
</div>

                    {/* Location (Dynamic from selected customer) */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Location</label>
                      <Input
                        value={selectedCustomer ? [selectedCustomer.city, selectedCustomer.region].filter(Boolean).join(', ') : ''}
                        disabled
                        className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm"
                      />
                    </div>

                    {/* Contact (Dynamic from selected customer) */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Contact Phone</label>
                      <Input
                        value={selectedCustomer ? (selectedCustomer.mobile || selectedCustomer.phone || '') : ''}
                        disabled
                        className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm"
                      />
                    </div>

                    {/* Alternate Contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Atl Contact Name</label>
                      <FormField
                        control={form.control}
                        name="alternateContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} className="h-8 text-xs border-gray-300 rounded-md shadow-sm" placeholder="Entry Name" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
  <label className="text-xs font-medium text-black flex items-center">Alt Contact Phone</label>
  <FormField
    control={form.control}
    name="alternatePhone"
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <Input 
            {...field} 
            className="h-8 text-xs border-gray-300 rounded-md shadow-sm" 
            placeholder="Enter alternate phone number" 
          />
        </FormControl>
        <FormMessage className="text-xs" />
      </FormItem>
    )}
  />
</div>

                    {/* Configuration Item with search */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Asset/Device</label>
                      <FormField
                        control={form.control}
                        name="configurationItem"
                        render={({ field }) => (
                          <FormItem>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Search assets..."
                                  className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white pr-8"
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    setAssetSearchQuery(e.target.value);
                                  }}
                                />
                              </FormControl>
                              <Monitor className="h-3 w-3 absolute right-2 top-2 text-gray-400" />
                              {assetSearchQuery && assetSearchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-24 overflow-y-auto">
                                  {assetSearchResults.map((asset: any) => (
                                    <button
                                      key={asset.id}
                                      type="button"
                                      className="w-full text-left px-2 py-1.5 hover:bg-gray-100 flex items-center text-xs"
                                      onClick={() => {
                                        field.onChange(asset.id);
                                        setSelectedAsset(asset);
                                        setAssetSearchQuery('');
                                      }}
                                    >
                                      <Monitor className="h-3 w-3 mr-2" />
                                      <div>
                                        <div className="font-medium">{asset.name}</div>
                                        <div className="text-xs text-gray-500">{asset.id} - {asset.type}</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Assignment Group */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Assignment Group</label>
                      <FormField
                        control={form.control}
                        name="assignmentGroup"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDropdowns}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white">
                                  <SelectValue placeholder="Please Specify" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {assignmentGroupOptions.map((opt: any, index) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Agent ID / Assigned To */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Assigned To</label>
                      <FormField
                        control={form.control}
                        name="agentId"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                const agent = availableAgents.find((a: any) => a.assignedUser === value);
                                if (agent) {
                                  setSelectedAgent(agent);
                                  toast({
                                    title: "Agent Selected",
                                    description: `Selected: ${agent.assignedUser}`,
                                    duration: 2000,
                                  });
                                }
                              }}
                              value={field.value}
                              disabled={!selectedAssignmentGroup || isLoadingUserQueues}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white">
                                  <SelectValue
                                    placeholder={
                                      !selectedAssignmentGroup
                                        ? "Select Assignment Group first"
                                        : isLoadingUserQueues
                                          ? "Loading agents..."
                                          : availableAgents.length === 0
                                            ? "No agents available"
                                            : "Select Agent"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableAgents.map((agent: any, index: number) => (
                                  <SelectItem
                                    key={`${agent.assignedUser}-${agent.queueId}-${index}`}
                                    value={agent.assignedUser}
                                    className="text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3 text-teal-600" />
                                      <span>{agent.assignedUser}</span>
                                      {agent.title && (
                                        <span className="text-gray-400">({agent.title})</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Channel */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Channel</label>
                      <FormField
                        control={form.control}
                        name="channel"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDropdowns}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white">
                                  <SelectValue placeholder="Please Specify" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {channelOptions.map((opt: any, index) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">{opt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Full Width Description Fields */}
                <div className="mt-6 pt-4 border-t border-gray-300 bg-white rounded-lg p-3 shadow-sm">
                  <div className="space-y-3">
                    {/* Short Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-start group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Short Description</label>
                      <FormField
                        control={form.control}
                        name="shortDescription"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center space-x-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Brief summary of the issue"
                                  className="h-8 text-xs flex-1 border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white"
                                />
                              </FormControl>
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-md text-slate-500 border border-gray-200" onClick={() => setShowKBSearch(!showKBSearch)}>
                                <BookOpen className="h-3 w-3" />
                              </Button>
                            </div>
                            {showKBSearch && (
                              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <div className="text-sm text-gray-700">💡 KB Suggestions: Network troubleshooting, Software issues...</div>
                              </div>
                            )}
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Additional Comments */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-start group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Comments</label>
                      <FormField
                        control={form.control}
                        name="additionalComments"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={3}
                                placeholder="Detailed description of the issue..."
                                className="text-sm min-h-[80px] border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm bg-white resize-none"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-4 right-4 bg-amber-100 border border-amber-400 rounded-lg p-3 shadow-lg z-50">
            <div className="text-sm text-amber-800 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              You have unsaved changes
            </div>
          </div>
        )}
      </div>

      {/* =============================================
          CONFIRMATION MODAL - Submit Incident
          ============================================= */}
      <Dialog open={showSubmitConfirmModal} onOpenChange={setShowSubmitConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-teal-600" />
              Confirm Submit Incident
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 pt-2">
              Please review the incident details before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Incident Number:</span>
                  <span className="font-semibold text-gray-800">{incidentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category:</span>
                  <span className="font-medium text-gray-700">
                    {pendingFormData ? getDisplayName(categoryOptions, pendingFormData.category) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sub Category:</span>
                  <span className="font-medium text-gray-700">
                    {pendingFormData ? getDisplayName(subCategoryOptions, pendingFormData.subCategory) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Priority:</span>
                  <span className="font-medium text-gray-700">
                    {pendingFormData ? getDisplayName(priorityOptions, pendingFormData.priority) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assignment Group:</span>
                  <span className="font-medium text-gray-700">
                    {pendingFormData ? getDisplayName(assignmentGroupOptions, pendingFormData.assignmentGroup) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-medium text-gray-700">
                    {pendingFormData?.userId || '-'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Short Description:</span>
                  <p className="mt-1 text-gray-700 text-xs bg-white p-2 rounded border">
                    {pendingFormData?.shortDescription || 'No description provided'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Once submitted, you will be redirected to the customer list page.</span>
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSubmitConfirmModal(false);
                setPendingFormData(null);
              }}
              disabled={createIncidentMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmSubmit}
              disabled={createIncidentMutation.isPending}
              className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white"
            >
              {createIncidentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm & Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =============================================
          SUCCESS MODAL - After Successful Submission
          ============================================= */}
      <Dialog open={showSuccessModal} onOpenChange={handleSuccessModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-green-700">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              Incident Created Successfully
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
              <p className="text-sm text-green-800">
                Incident <span className="font-bold">{createdIncidentNumber}</span> has been created successfully.
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                You will be redirected to the customer list page.
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              onClick={handleSuccessModalClose}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8"
            >
              Go to Customer List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =============================================
          CONFIRMATION MODAL - Reset Form
          ============================================= */}
      <Dialog open={showResetConfirmModal} onOpenChange={setShowResetConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reset Form
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 pt-2">
              Are you sure you want to reset the form? All unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>This will clear all form fields including customer selection, asset details, and any other entered data.</span>
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResetConfirmModal(false)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmReset}
              className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}