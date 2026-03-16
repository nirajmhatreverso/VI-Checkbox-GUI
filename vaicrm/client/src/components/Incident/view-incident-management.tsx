// client/src/components/Incident/view-incident-management.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
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
  Activity,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
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
import { incidentApi, RegisterTicketPayload, ActivityEntry } from '@/lib/incidentApi';
import { apiRequest } from '@/lib/queryClient';
import { newIncidentSchema, type IncidentFormData } from '@/lib/form-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// --- UTILS ---

// Country-aware dropdown filtering
const getCountrySpecificOptions = (
  items: any[],
  countryCode: string | null
) => {
  if (!items || items.length === 0) return [];

  let filteredItems = items;
  if (countryCode) {
    const countryFiltered = items.filter(
      (item) => item.countryCode === countryCode
    );
    if (countryFiltered.length > 0) {
      filteredItems = countryFiltered;
    }
  }

  const uniqueMap = new Map();
  filteredItems.forEach((item) => {
    const normalizedValue = String(item.value || '').trim();
    const normalizedName = String(item.name || '').trim();

    if (normalizedValue && !uniqueMap.has(normalizedValue)) {
      uniqueMap.set(normalizedValue, {
        value: normalizedValue,
        name: normalizedName,
        countryCode: item.countryCode,
      });
    }
  });

  return Array.from(uniqueMap.values());
};

// Helper to get SLA hours from sdPrioritySla structure
const getSlaHoursForPriority = (
  sdPrioritySla: any[],
  countryCode: string | undefined | null,
  priorityName: string
): number | null => {
  if (!sdPrioritySla || !Array.isArray(sdPrioritySla) || !priorityName) {
    return null;
  }

  const countryEntry = sdPrioritySla.find(entry => entry.countryCode === countryCode);

  if (!countryEntry || !countryEntry.groups || !Array.isArray(countryEntry.groups)) {
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

  const priorityEntry = countryEntry.groups.find(
    (g: any) => g.priority?.trim().toUpperCase() === priorityName.trim().toUpperCase()
  );

  if (priorityEntry && priorityEntry.slaHours !== undefined) {
    return parseInt(priorityEntry.slaHours, 10);
  }

  return null;
};

const ACTIVITY_TYPES = [
  { value: 'ACTIVITY', label: 'General Activity' },
  { value: 'NOTE', label: 'Note' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'STATUS_CHANGE', label: 'Status Change' },
  { value: 'ESCALATION', label: 'Escalation' },
  { value: 'RESOLUTION', label: 'Resolution' },
];

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
};

const formatRelativeTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDateTime(dateString);
};

export default function ViewIncidentManagement() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/view-incident/:id');
  const ticketId = match ? params.id : null;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const userCountryCode = user?.salesOrg?.toUpperCase() || null;
const [activeTab, setActiveTab] = useState('activity-log');
  // --- STATE ---
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [originalIncidentData, setOriginalIncidentData] = useState<any>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [showKBSearch, setShowKBSearch] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showMobileHeaderDetails, setShowMobileHeaderDetails] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isResolutionProcessing, setIsResolutionProcessing] = useState(false);

  // ✅ NEW: Customer search type state
  const [customerSearchType, setCustomerSearchType] = useState<'auto' | 'mobile' | 'sapBpId' | 'firstName' | 'smartCard'>('auto');

  // ✅ NEW: SLA Target Resolve State (like new-incident-management.tsx)
  const [targetResolveDate, setTargetResolveDate] = useState<string>('');
  const [targetResolveTime, setTargetResolveTime] = useState<string>('');
  const [isLoadingSla, setIsLoadingSla] = useState(false);

  // Resolution Tab State
  const [resolutionType, setResolutionType] = useState('');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [resolutionComment, setResolutionComment] = useState('');

  // Activity Log State
  const [activityPage, setActivityPage] = useState(0);
  const [activityPageSize, setActivityPageSize] = useState(10);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivityType, setNewActivityType] = useState('ACTIVITY');
  const [newActivityDescription, setNewActivityDescription] = useState('');

  // Initial Load Flag
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [savedAgentFromIncident, setSavedAgentFromIncident] = useState<string>('');
  const [isAgentPreselected, setIsAgentPreselected] = useState(false);

  // Confirmation Modal State
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [closedIncidentNumber, setClosedIncidentNumber] = useState('');

  // --- QUERIES ---

  // Fetch Business Organizations
  const { data: busOrgsData, isLoading: isLoadingBusOrgs } = useQuery({
    queryKey: ['business-organizations', user?.salesOrg],
    queryFn: () =>
      apiRequest('/organization/bus-orgs', 'POST', {
        objId: null,
        name: null,
        orgId: user?.salesOrg || null,
      }),
    staleTime: 1000 * 60 * 60,
    enabled: !!user,
  });

  const { data: dropdownsData, isLoading: isLoadingDropdowns } = useQuery({
    queryKey: ['service-desk-dropdowns'],
    queryFn: () => apiRequest('/organization/service-desk-dropdowns', 'GET'),
    staleTime: 1000 * 60 * 60,
  });

  const { data: sequenceData, isLoading: isLoadingSequence } = useQuery({
    queryKey: ['incident-sequence'],
    queryFn: () =>
      apiRequest('/organization/sequence', 'POST', {
        sequenceName: 'INCIDENT',
      }),
    staleTime: Infinity,
  });

  // ✅ UPDATED: Customer Search Query with search type
  const { data: customerSearchData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customer-search', userSearchQuery, customerSearchType],
    queryFn: async () => {
      const payload: any = { salesOrg: user?.salesOrg || '' };
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
          const isNumeric = /^\d+$/.test(trimmedQuery);
          if (isNumeric) {
            if (trimmedQuery.length >= 10) {
              payload.mobile = trimmedQuery;
            } else {
              payload.sapBpId = trimmedQuery;
            }
          } else if (/^[A-Za-z0-9]+$/.test(trimmedQuery) && trimmedQuery.length >= 8) {
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

  const { data: assetSearchData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['asset-search', assetSearchQuery],
    queryFn: () => incidentApi.searchAssets(assetSearchQuery),
    enabled: assetSearchQuery.length >= 3,
  });

  const { data: agentSearchData, isLoading: isLoadingAgents } = useQuery({
    queryKey: ['agent-search', agentSearchQuery],
    queryFn: async () => {
      const isNumeric = /^\d+$/.test(agentSearchQuery);
      const payload: any = {
        type: 'Agent',
        salesOrg: user?.salesOrg || '',
      };

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

  const { data: incidentData, isLoading: isLoadingIncident } = useQuery({
    queryKey: ['incident-details', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const res = await incidentApi.getById(ticketId);
      return res?.data;
    },
    enabled: !!ticketId,
  });

  const {
    data: activityData,
    isLoading: isLoadingActivity,
    refetch: refetchActivity,
    isFetching: isFetchingActivity,
  } = useQuery({
    queryKey: ['activity-entries', ticketId, activityPage, activityPageSize],
    queryFn: () =>
      incidentApi.getActivityEntries({
        incidentId: ticketId!,
        limit: activityPageSize,
        offset: activityPage * activityPageSize,
      }),
    enabled: !!ticketId,
  });

  // --- DATA PROCESSING ---
  const rawBusinessOrganizations = busOrgsData?.data?.data || [];

  const businessOrganizations = useMemo(() => {
    if (!rawBusinessOrganizations || rawBusinessOrganizations.length === 0) {
      return [];
    }

    if (!userCountryCode) {
      return rawBusinessOrganizations;
    }

    const filtered = rawBusinessOrganizations.filter((org: any) => {
      const orgCountry = (
        org.countryCode ||
        org.salesOrg ||
        org.orgCode ||
        ''
      ).toString().toUpperCase();

      return orgCountry === userCountryCode ||
        orgCountry.includes(userCountryCode) ||
        userCountryCode.includes(orgCountry);
    });

    return filtered.length > 0 ? filtered : rawBusinessOrganizations;
  }, [rawBusinessOrganizations, userCountryCode]);

  const rawDropdowns = dropdownsData?.data || {};

  // Extract Priority SLA data
  const prioritySlaData = rawDropdowns.sdPrioritySla || [];

  const categoryOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdIncidentCategory, userCountryCode),
    [rawDropdowns.sdIncidentCategory, userCountryCode]
  );

  const subCategoryOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdIncidentSubCategory, userCountryCode),
    [rawDropdowns.sdIncidentSubCategory, userCountryCode]
  );

  const priorityOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdIncidentPriority, userCountryCode),
    [rawDropdowns.sdIncidentPriority, userCountryCode]
  );

  const assignmentGroupOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdIncidentAssignmentGroup, userCountryCode),
    [rawDropdowns.sdIncidentAssignmentGroup, userCountryCode]
  );

  const channelOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdIncidentChannel, userCountryCode),
    [rawDropdowns.sdIncidentChannel, userCountryCode]
  );

  const statusOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdIncidentStatus, userCountryCode),
    [rawDropdowns.sdIncidentStatus, userCountryCode]
  );

  const commonFaultsOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdCommonFault, userCountryCode),
    [rawDropdowns.sdCommonFault, userCountryCode]
  );

  const resolutionTypeOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdResolutionMaster, userCountryCode),
    [rawDropdowns.sdResolutionMaster, userCountryCode]
  );

  const resolutionCriteriaOptions = useMemo(
    () => getCountrySpecificOptions(rawDropdowns.sdResolutionCrt, userCountryCode),
    [rawDropdowns.sdResolutionCrt, userCountryCode]
  );

  const processCustomerResults = (responseData: any) => {
    const details = responseData?.customerDetails || responseData?.data || [];
    if (!Array.isArray(details)) return [];

    return details.map((cust: any) => {
      const mobileContact = cust.contactMedium?.find(
        (c: any) => c.type === 'mobile' || c.type === 'phone'
      );
      const address = cust.contactMedium?.find(
        (c: any) =>
          c.type === 'INSTALLATION_ADDRESS' || c.type === 'BILLING_ADDRESS'
      );
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
  const assetSearchResults = assetSearchData?.data?.data || [];

  const activities: ActivityEntry[] = activityData?.data?.data || [];
  const totalActivityRecords = activityData?.data?.totalRecordCount || 0;
  const totalActivityPages = Math.ceil(totalActivityRecords / activityPageSize);

  const incidentNumber =
    incidentData?.idNumber ||
    ticketId ||
    sequenceData?.data?.generatedSequence ||
    '';

  // ✅ NEW: Format target resolve display (like new-incident-management.tsx)
  const targetResolveDisplay = useMemo(() => {
    if (!targetResolveDate && !targetResolveTime) {
      return '';
    }
    if (targetResolveDate && targetResolveTime) {
      try {
        const dateTimeStr = `${targetResolveDate}T${targetResolveTime}`;
        const dateObj = new Date(dateTimeStr);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleString();
        }
      } catch {
        // Fall through
      }
      return `${targetResolveDate} ${targetResolveTime}`;
    }
    return targetResolveDate || targetResolveTime;
  }, [targetResolveDate, targetResolveTime]);

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(newIncidentSchema),
    defaultValues: {
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
      agentId: '',
      agentPhone: '',
      alternatePhone: '',
      shortDescription: '',
      additionalComments: '',
      parentIncidentId: '',
    },
  });

  const selectedPriority = form.watch('priority');
  const selectedAssignmentGroup = form.watch('assignmentGroup');

  const selectedAssignmentGroupName = useMemo(() => {
    const group = assignmentGroupOptions.find(opt => opt.value === selectedAssignmentGroup);
    return group?.name || '';
  }, [selectedAssignmentGroup, assignmentGroupOptions]);

  // Fetch User Queues (Agents) based on Assignment Group
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

    // =============================================
  // SLA Generation Handler (like new-incident-management.tsx)
  // =============================================
  const handlePriorityChange = useCallback(async (priorityValue: string) => {
    if (!priorityValue || prioritySlaData.length === 0) {
      setTargetResolveDate('');
      setTargetResolveTime('');
      return;
    }

    const selectedPriorityOption = priorityOptions.find(opt => opt.value === priorityValue);
    const priorityName = selectedPriorityOption?.name?.trim();

    if (!priorityName) {
      return;
    }

    const slaHours = getSlaHoursForPriority(prioritySlaData, userCountryCode, priorityName);

    if (slaHours === null || isNaN(slaHours) || slaHours <= 0) {
      setTargetResolveDate('');
      setTargetResolveTime('');
      return;
    }

    setIsLoadingSla(true);

    try {
      const response = await incidentApi.generateSla(slaHours);

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

  // Watch for priority changes and generate SLA (only if not initial load with existing data)
  useEffect(() => {
    if (selectedPriority && !isInitialLoad) {
      handlePriorityChange(selectedPriority);
    }
  }, [selectedPriority, handlePriorityChange, isInitialLoad]);

  // Robust dropdown value matching
  const findDropdownValue = (options: any[], incomingValue: any) => {
    if (incomingValue === null || incomingValue === undefined || incomingValue === '') return '';
    const strVal = String(incomingValue).trim();

    const matchByValue = options.find(
      (opt) => String(opt.value).trim() === strVal
    );
    if (matchByValue) return matchByValue.value;

    const matchByValueCI = options.find(
      (opt) => String(opt.value).trim().toUpperCase() === strVal.toUpperCase()
    );
    if (matchByValueCI) return matchByValueCI.value;

    const matchByName = options.find(
      (opt) => opt.name?.trim() === strVal
    );
    if (matchByName) return matchByName.value;

    const matchByNameCI = options.find(
      (opt) => opt.name?.trim().toUpperCase() === strVal.toUpperCase()
    );
    if (matchByNameCI) return matchByNameCI.value;

    const matchByContains = options.find(
      (opt) =>
        opt.name?.trim().toUpperCase().includes(strVal.toUpperCase()) ||
        strVal.toUpperCase().includes(opt.name?.trim().toUpperCase())
    );
    if (matchByContains) return matchByContains.value;

    return strVal;
  };

  // Build change description for activity log
  const buildChangeDescription = (
    oldData: any,
    newData: IncidentFormData,
    categoryOpts: any[],
    subCategoryOpts: any[],
    priorityOpts: any[],
    channelOpts: any[],
    assignmentGroupOpts: any[]
  ): string => {
    if (!oldData) return 'Incident updated';

    const findName = (options: any[], value: string) => {
      const opt = options.find((o) => o.value === value);
      return opt ? opt.name : value;
    };

    const changes: string[] = [];

    const fieldMappings: {
      label: string;
      oldVal: any;
      newVal: any;
    }[] = [
      {
        label: 'Category',
        oldVal: oldData.incidentCatagory || oldData.incidentCategoryName,
        newVal: findName(categoryOpts, newData.category),
      },
      {
        label: 'Sub Category',
        oldVal: oldData.incidentSubcatagory || oldData.incidentSubCategoryName,
        newVal: findName(subCategoryOpts, newData.subCategory),
      },
      {
        label: 'Priority',
        oldVal: oldData.incidentPriority,
        newVal: findName(priorityOpts, newData.priority),
      },
      {
        label: 'Status',
        oldVal: oldData.incidentStatus,
        newVal: newData.status,
      },
      {
        label: 'Channel',
        oldVal: oldData.incidentChannel,
        newVal: findName(channelOpts, newData.channel),
      },
      {
        label: 'Assignment Group',
        oldVal: oldData.assignmentGroup || oldData.incidentCurrq2queue,
        newVal: findName(assignmentGroupOpts, newData.assignmentGroup),
      },
      {
        label: 'Assigned To',
        oldVal: oldData.agentName || oldData.incidentOwner2user,
        newVal: newData.assignedTo,
      },
      {
        label: 'Short Description',
        oldVal: oldData.title,
        newVal: newData.shortDescription,
      },
      {
        label: 'Client',
        oldVal: oldData.incidentClient,
        newVal: newData.client,
      },
      {
        label: 'Asset/Device',
        oldVal: oldData.assetRefNumber,
        newVal: newData.configurationItem,
      },
    ];

    fieldMappings.forEach(({ label, oldVal, newVal }) => {
      const oldStr = String(oldVal || '').trim();
      const newStr = String(newVal || '').trim();

      if (oldStr.toUpperCase() !== newStr.toUpperCase() && newStr !== '') {
        changes.push(`${label}: "${oldStr || '(empty)'}" → "${newStr}"`);
      }
    });

    if (changes.length === 0) {
      return 'Incident updated (no field changes detected)';
    }

    return `updated | Old : {${changes.map((c) => c.split('→')[0].trim()).join(', ')}} | New : {${changes.map((c) => c.split('→')[1]?.trim() || '').join(', ')}}`;
  };

  // Complete Form Reset Function
  const resetEntireForm = () => {
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
      agentId: '',
      agentPhone: '',
      alternatePhone: '',
      shortDescription: '',
      additionalComments: '',
      parentIncidentId: '',
    });

    setSelectedCustomer(null);
    setSelectedAsset(null);
    setSelectedAgent(null);
    setOriginalIncidentData(null);

    setUserSearchQuery('');
    setAgentSearchQuery('');
    setAssetSearchQuery('');

    // Reset customer search type
    setCustomerSearchType('auto');

    setResolutionType('');
    setResolutionCriteria('');
    setResolutionComment('');

    setNewNote('');
    setActivityPage(0);
    setShowAddActivity(false);
    setNewActivityType('ACTIVITY');
    setNewActivityDescription('');

    setShowKBSearch(false);
    setHasUnsavedChanges(false);
    setIsFormSubmitted(false);
    setShowMobileHeaderDetails(false);

    setIsInitialLoad(true);
    setSavedAgentFromIncident('');
    setIsAgentPreselected(false);
    setIsResolutionProcessing(false);

    // Reset SLA data
    setTargetResolveDate('');
    setTargetResolveTime('');
  };

  const handleReset = () => {
    setShowResetConfirmModal(true);
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

  const handleCloseAndResolve = () => {
    if (!resolutionType) {
      toast({
        title: 'Validation Error',
        description: 'Please select a Resolution Type.',
        variant: 'destructive',
      });
      return;
    }

    if (!resolutionCriteria) {
      toast({
        title: 'Validation Error',
        description: 'Please select a Resolution Criteria.',
        variant: 'destructive',
      });
      return;
    }

    if (!resolutionComment.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a Resolution Comment.',
        variant: 'destructive',
      });
      return;
    }

    if (!incidentNumber) {
      toast({
        title: 'Error',
        description: 'Incident number not available.',
        variant: 'destructive',
      });
      return;
    }

    setShowCloseConfirmModal(true);
  };

  const processResolution = async () => {
    setShowCloseConfirmModal(false);
    setIsResolutionProcessing(true);

    try {
      let activityEntryId = 0;

      try {
        const activityResponse = await incidentApi.registerActivityEntry(
          incidentNumber,
          user?.username || 'system',
          0,
          'INCIDENT_CLOSED',
          `Incident closed id ${incidentNumber}`
        );

        activityEntryId = parseInt(
          activityResponse?.data?.data?.actEntryId ||
          activityResponse?.data?.actEntryId ||
          activityResponse?.data?.data?.objId ||
          '0'
        ) || 0;

      } catch (activityError: any) {
        // Continue even if activity entry fails
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const nowDate = nowIso.split('T')[0];
      const nowTs = nowIso.replace('Z', '');

      const closerPayload = {
        closeTs: nowTs,
        closeDate: nowDate,
        resolvedTs: nowTs,
        resolvedDate: nowDate,
        downTime: 0,
        isAutoClosed: 0,
        summary: resolutionComment.trim(),
        previousClosedTs: null,
        previousClosedDate: null,
        resolveFirstTime: 1,
        assetReference: form.getValues('configurationItem') || null,
        kbReference: null,
        lastClose2case: incidentData?.objId || null,
        closer2user: user?.username || 'system',
        closeCase2actEntry: activityEntryId,
        closeResolution: resolutionType,
        closeCriteria: resolutionCriteria,
      };

      const closerResponse = await incidentApi.registerIncidentCloser(closerPayload);

      if (closerResponse?.status === 'SUCCESS' || closerResponse?.statusCode === 200) {
        try {
          const currentComments = form.getValues('additionalComments') || '';
          const resolutionEntry = `\n\n[Resolution - ${new Date().toLocaleString()}]\nType: ${resolutionType}\nCriteria: ${resolutionCriteria}\nComment: ${resolutionComment.trim()}`;

          form.setValue('status', 'CLOSED');
          form.setValue('additionalComments', currentComments + resolutionEntry);

          const updatePayload = transformToApiPayload(form.getValues());
          updatePayload.incidentStatus = 'CLOSED';
          await incidentApi.update(ticketId!, updatePayload);

        } catch (updateError: any) {
          // Continue even if update fails
        }

        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        queryClient.invalidateQueries({ queryKey: ['incident-details', ticketId] });
        queryClient.invalidateQueries({ queryKey: ['activity-entries', ticketId] });

        setClosedIncidentNumber(incidentNumber);
        setShowSuccessModal(true);

        resetEntireForm();

      } else {
        throw new Error(closerResponse?.statusMessage || 'Failed to close incident');
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.statusMessage || error?.message || 'Failed to close incident. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResolutionProcessing(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setClosedIncidentNumber('');
    navigate('/my-work');
  };

  // Populate form with incident data
  useEffect(() => {
    if (
      incidentData &&
      categoryOptions.length > 0 &&
      subCategoryOptions.length > 0 &&
      priorityOptions.length > 0 &&
      channelOptions.length > 0 &&
      assignmentGroupOptions.length > 0
    ) {
      const i = incidentData;

      const resolvedCategory = findDropdownValue(
        categoryOptions,
        i.incidentCatagory || i.incidentCategoryName || i.incidentCategory
      );

      const resolvedSubCategory = findDropdownValue(
        subCategoryOptions,
        i.incidentSubcatagory || i.incidentSubCategoryName || i.incidentSubCategory
      );

      const resolvedPriority = findDropdownValue(
        priorityOptions,
        i.incidentPriority
      );

      const resolvedChannel = findDropdownValue(
        channelOptions,
        i.incidentChannel
      );

      const resolvedAssignmentGroup = findDropdownValue(
        assignmentGroupOptions,
        i.assignmentGroup || i.incidentCurrq2queue || i.incidentFirstq2queue
      );

      const resolvedStatus = findDropdownValue(
        statusOptions,
        i.incidentStatus
      ) || i.incidentStatus || 'OPEN';

      const resolvedClient = i.incidentReporter2busOrgCode || (i.incidentReporter2busOrg ? String(i.incidentReporter2busOrg) : '');

      const customerDisplay =
        i.incidentReporter2customerName ||
        (i.incidentReporter2customer ? String(i.incidentReporter2customer) : '') ||
        i.incidentContact ||
        i.userId ||
        (i.incidentReporter2user ? String(i.incidentReporter2user) : '') ||
        '';

      // Save agent value for later preselection
      const agentValue = i.incidentOwner2userName || i.agentName || i.agentId || i.altContact || '';
      setSavedAgentFromIncident(agentValue);

      form.reset({
        client: resolvedClient,
        commonFaults: findDropdownValue(commonFaultsOptions, i.commonFault) || i.commonFault || '',
        category: resolvedCategory,
        subCategory: resolvedSubCategory,
        status: resolvedStatus,
        priority: resolvedPriority,
        severity: String(i.incidentSeverity || ''),
        userId: customerDisplay,
        configurationItem: i.assetRefNumber || i.configurationItem || '',
        assignmentGroup: resolvedAssignmentGroup,
        assignedTo: String(i.incidentOwner2user || ''),
        channel: resolvedChannel,
        alternateLocation: i.altLocation || '',
        agentId: '', // Will be set by agent selection effect
        agentPhone: i.agentPhone || i.altPhoneNum || '',
        alternatePhone: i.altPhoneNum || '',
        shortDescription: i.title || '',
        additionalComments: i.caseHistory || '',
        parentIncidentId: i.parentIncident2incident
          ? String(i.parentIncident2incident)
          : '',
      });

      // Set target resolve date from incident data
      if (i.targetResolveDt && i.targetResolveTs) {
        const datePart = i.targetResolveDt.split('T')[0];
        const timePart = i.targetResolveTs.split('T')[1]?.replace('Z', '') || '';
        setTargetResolveDate(datePart);
        setTargetResolveTime(timePart);
      } else if (i.targetResolveDt) {
        setTargetResolveDate(i.targetResolveDt.split('T')[0]);
        setTargetResolveTime('');
      }

      if (i.resolutionType) setResolutionType(i.resolutionType);
      if (i.resolutionCriteria) setResolutionCriteria(i.resolutionCriteria);
      if (i.resolutionComment) setResolutionComment(i.resolutionComment);

      if (!originalIncidentData) {
        setOriginalIncidentData({ ...incidentData });
      }
    }
  }, [
    incidentData,
    form,
    categoryOptions,
    subCategoryOptions,
    priorityOptions,
    channelOptions,
    assignmentGroupOptions,
    statusOptions,
    commonFaultsOptions,
    userCountryCode,
  ]);

  // ✅ FIXED: Agent preselection effect
  useEffect(() => {
    if (!isInitialLoad) return;
    if (!savedAgentFromIncident) return;
    if (!selectedAssignmentGroup) return;
    if (isLoadingUserQueues) return;
    if (isAgentPreselected) return;

    if (availableAgents.length > 0) {
      const matchedAgent = availableAgents.find(
        (agent: any) =>
          agent.assignedUser === savedAgentFromIncident ||
          agent.assignedUser?.toLowerCase() === savedAgentFromIncident.toLowerCase() ||
          agent.assignedUser?.trim() === savedAgentFromIncident.trim()
      );

      if (matchedAgent) {
        form.setValue('agentId', matchedAgent.assignedUser);
        setSelectedAgent(matchedAgent);
        setIsAgentPreselected(true);
      } else {
        // Agent not in current queue - still show the saved value
        form.setValue('agentId', savedAgentFromIncident);
        setIsAgentPreselected(true);
      }
    } else {
      // No agents available - still show the saved value
      form.setValue('agentId', savedAgentFromIncident);
      setIsAgentPreselected(true);
    }

    setIsInitialLoad(false);

  }, [
    savedAgentFromIncident,
    availableAgents,
    selectedAssignmentGroup,
    isLoadingUserQueues,
    isInitialLoad,
    isAgentPreselected,
    form
  ]);

  // Reset agent when assignment group changes (except on initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    if (!selectedAssignmentGroup) return;

    // Only reset if not during preselection
    if (!isAgentPreselected) {
      form.setValue('agentId', '');
      setSelectedAgent(null);
    }
  }, [selectedAssignmentGroup, isInitialLoad, isAgentPreselected]);

  // Transform form data to API payload
  const transformToApiPayload = (
    data: IncidentFormData
  ): RegisterTicketPayload => {
    const now = new Date();
    const selectedClient = businessOrganizations.find(
      (c: any) => c.code === data.client || c.orgId === data.client
    );
    const asset = selectedAsset;

    const findName = (options: any[], value: string) => {
      const option = options.find((o) => o.value === value);
      return option ? option.name : value;
    };

    const priorityName = findName(priorityOptions, data.priority);
    const categoryName = findName(categoryOptions, data.category);
    const subCategoryName = findName(subCategoryOptions, data.subCategory);
    const channelName = findName(channelOptions, data.channel);

    const customerName = selectedCustomer
      ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()
      : incidentData?.incidentReporter2customerName || '';

    const location = selectedCustomer
      ? [selectedCustomer.city, selectedCustomer.region]
        .filter(Boolean)
        .join(', ')
      : incidentData?.incidentLocation || '';

    // Use SLA generated target resolve date/time
    const targetResolveDt = targetResolveDate || now.toISOString().split('T')[0];
    const targetResolveTs = targetResolveDate && targetResolveTime
      ? `${targetResolveDate}T${targetResolveTime}`
      : now.toISOString();

    return {
      idNumber: incidentNumber,
      title: data.shortDescription,
      createDt: (incidentData?.createDt || now.toISOString()).split('T')[0],
      createTs: incidentData?.createTs || now.toISOString(),
      updateDt: now.toISOString().split('T')[0],
      updateTs: now.toISOString(),
      phoneNum: selectedCustomer?.mobile || incidentData?.phoneNum,
      altPhoneNum: data.alternatePhone || incidentData?.altPhoneNum,
      agentPhone: selectedAgent?.emailId || data.agentPhone || incidentData?.agentPhone,
      incidentContact: customerName,
      agentId: selectedAgent?.assignedUser || data.agentId || incidentData?.agentId,
      agentName: selectedAgent?.assignedUser || data.agentId || incidentData?.agentName,
      agentSapBpId: selectedAgent?.assignedUser || incidentData?.agentSapBpId || incidentData?.agentId,
      incidentOwner2user: data.agentId
        || selectedAgent?.assignedUser
        || incidentData?.incidentOwner2userName
        || incidentData?.incidentOwner2user
        || 0,
      incidentLocation: location,
      altLocation: data.alternateLocation,
      caseHistory: data.additionalComments,
      incidentClient: selectedClient?.name || incidentData?.incidentClient,
      commonFault: data.commonFaults,
      assetRefNumber:
        data.configurationItem ||
        selectedCustomer?.macId ||
        incidentData?.assetRefNumber,
      assetType: asset?.type,
      assetTag: asset?.tag,
      assetNumber: asset?.number,
      assetDescription: asset?.name,
      targetResolveDt: targetResolveDt,
      targetResolveTs: targetResolveTs,
      firstResponseDt: (
        incidentData?.firstResponseDt || now.toISOString()
      ).split('T')[0],
      firstResponseTs: incidentData?.firstResponseTs,
      firstCallResolution: 0,
      incidentCatagory: categoryName,
      incidentSubcatagory: subCategoryName,
      incidentCategoryName: categoryName,
      incidentSubCategoryName: subCategoryName,
      incidentChannel: channelName,
      incidentPriority: priorityName,
      incidentSeverity: data.severity,
      incidentStatus: data.status,
      assignmentGroup: data.assignmentGroup,
      incidentPrevq2queue: isNaN(parseInt(data.assignmentGroup))
        ? undefined
        : parseInt(data.assignmentGroup),
      incidentCurrq2queue: data.assignmentGroup,
      incidentFirstq2queue: isNaN(parseInt(data.assignmentGroup))
        ? undefined
        : parseInt(data.assignmentGroup),
      incidentReporter2user: selectedCustomer?.custId
        || incidentData?.incidentReporter2user
        || incidentData?.incidentReporter2customer
        || incidentData?.sapBpId
        || 0,
      incidentOriginator2user: incidentData?.incidentOriginator2user,
      incidentReporter2busOrg:
        selectedClient?.orgId || incidentData?.incidentReporter2busOrg,
      incidentReporter2site: 4001,
      incidentReporter2customer:
        selectedCustomer?.custId || incidentData?.incidentReporter2customer,
      incidentReporter2customerName: customerName,
      sapBpId: selectedCustomer?.sapBpId || incidentData?.sapBpId,
      sapCaId: selectedCustomer?.sapCaId || incidentData?.sapCaId,
      contractNo: selectedCustomer?.contractNo || incidentData?.contractNo,
      parentIncident2incident: data.parentIncidentId
        ? parseInt(data.parentIncidentId)
        : null,
      survey: 0,
    };
  };

  // Update Incident Mutation
  const updateIncidentMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      if (!ticketId) throw new Error('No ticket ID found');
      const payload = transformToApiPayload(data);
      return incidentApi.update(ticketId, payload);
    },
    onSuccess: async (response, submittedData) => {
      toast({
        title: 'Success',
        description: `Incident ${ticketId} has been updated successfully.`,
        duration: 2000,
      });
      setIsFormSubmitted(true);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({
        queryKey: ['incident-details', ticketId],
      });

      try {
        const changeDescription = buildChangeDescription(
          originalIncidentData,
          submittedData,
          categoryOptions,
          subCategoryOptions,
          priorityOptions,
          channelOptions,
          assignmentGroupOptions
        );

        await incidentApi.registerActivityEntry(
          incidentNumber,
          user?.username || 'system',
          0,
          'INCIDENT_UPDATED',
          changeDescription
        );

        queryClient.invalidateQueries({
          queryKey: ['activity-entries', ticketId],
        });

        setOriginalIncidentData(null);
      } catch (activityError: any) {
        toast({
          title: 'Warning',
          description: 'Incident updated but activity log entry failed to register.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description:
          error?.statusMessage ||
          error?.message ||
          'Failed to update incident.',
        variant: 'destructive',
      });
    },
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteDescription: string) => {
      if (!incidentNumber) throw new Error('No incident number found');
      if (!user?.username) throw new Error('User not authenticated');

      return incidentApi.registerNotesLog(
        incidentNumber,
        noteDescription,
        user.username
      );
    },
    onSuccess: () => {
      toast({
        title: 'Note Added',
        description: 'Internal note has been added successfully.',
        duration: 3000,
      });
      setNewNote('');
      queryClient.invalidateQueries({
        queryKey: ['activity-entries', ticketId],
      });
      refetchActivity();
    },
    onError: (error: any) => {
      toast({
        title: 'Error Adding Note',
        description:
          error?.statusMessage ||
          error?.message ||
          'Failed to add note. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Create Activity Mutation
  const createActivityMutation = useMutation({
    mutationFn: (payload: {
      type: string;
      addnlInfo: string;
      incidentId: string;
      user?: string;
    }) => {
      return incidentApi.createActivityEntry(payload);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Activity entry added successfully.',
        duration: 3000,
      });
      setNewActivityDescription('');
      setNewActivityType('ACTIVITY');
      setShowAddActivity(false);
      queryClient.invalidateQueries({
        queryKey: ['activity-entries', ticketId],
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err?.statusMessage || 'Failed to add activity entry.',
        variant: 'destructive',
      });
    },
  });

  const handleAddActivity = () => {
    if (!newActivityDescription.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a description for the activity.',
        variant: 'destructive',
      });
      return;
    }

    createActivityMutation.mutate({
      type: newActivityType,
      addnlInfo: newActivityDescription.trim(),
      incidentId: ticketId!,
      user: user?.username,
    });
  };

  const handleAddNote = () => {
    const trimmedNote = newNote.trim();

    if (!trimmedNote) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a note before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedNote.length < 5) {
      toast({
        title: 'Validation Error',
        description: 'Note must be at least 5 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (!incidentNumber) {
      toast({
        title: 'Error',
        description: 'Incident number not available. Cannot add note.',
        variant: 'destructive',
      });
      return;
    }

    addNoteMutation.mutate(trimmedNote);
  };

  const onSubmit = (data: IncidentFormData) => {
    updateIncidentMutation.mutate(data);
  };

  // Watch for form changes
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
        e.returnValue =
          'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

    return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 w-full transition-all duration-200">
        <div className="w-full px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between h-auto sm:h-12 py-2 sm:py-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 w-full">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/my-work')}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-bold text-gray-700 ml-2 sm:ml-0">
                    View/Edit Incident
                  </span>
                </div>
                <div className="sm:hidden">
                  <button
                    type="button"
                    className="p-2 rounded-full border border-gray-300 bg-white shadow-sm"
                    onClick={() => setShowMobileHeaderDetails((prev) => !prev)}
                  >
                    {showMobileHeaderDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
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
                {userCountryCode && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 ml-2 text-[10px]">
                    {userCountryCode}
                  </Badge>
                )}
                <Badge className="bg-gray-100 text-gray-800 border-gray-300 ml-2">
                  {form.watch('priority') || 'Select Priority'}
                </Badge>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-3 mt-0 w-auto justify-end">
              <Button
                type="button"
                disabled={updateIncidentMutation.isPending || isLoadingIncident}
                onClick={form.handleSubmit(onSubmit)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 h-9 shadow-md shadow-teal-200 font-medium transition-all active:scale-95"
              >
                <Send className="h-4 w-4 mr-2" />
                {updateIncidentMutation.isPending ? 'Updating...' : 'Update Incident'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="border-gray-300 text-gray-600 hover:bg-gray-50 h-9 font-medium transition-all active:scale-95"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {showMobileHeaderDetails && (
            <div className="sm:hidden mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50 shadow-md">
              <div className="flex items-center text-xs text-gray-700 mb-2">
                <span className="font-semibold">Incident #:</span>
                <strong className="ml-1">
                  {isLoadingIncident ? (
                    <Loader2 className="h-3 w-3 inline animate-spin" />
                  ) : (
                    ticketId || 'Loading...'
                  )}
                </strong>
                {userCountryCode && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 ml-2 text-[9px]">
                    {userCountryCode}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={updateIncidentMutation.isPending || isLoadingIncident}
                  onClick={form.handleSubmit(onSubmit)}
                  className="bg-gradient-to-r from-teal-600 to-teal-700 text-white text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  {updateIncidentMutation.isPending ? 'Updating...' : 'Update'}
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

      {/* Country Code Warning */}
      {!userCountryCode && (
        <div className="mx-2 sm:mx-4 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              No country/region detected for your account (salesOrg). Dropdown options may not be filtered correctly.
            </span>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="w-full flex-1 p-2 sm:p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-white shadow-xl shadow-slate-200/60 rounded-xl overflow-hidden border border-gray-100">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-slate-800 to-blue-600 text-white">
                <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">View/Edit Incident</h2>
                  <p className="text-xs text-blue-100/80 font-medium">Update incident details</p>
                </div>
              </div>

              <div className="p-4 lg:p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Left Column */}
                  <div className="space-y-3">
                    {/* Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Number</label>
                      <div className="relative w-full">
                        <Input
                          value={incidentNumber || ''}
                          disabled
                          className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm w-full"
                          placeholder={isLoadingSequence ? 'Fetching ID...' : ''}
                        />
                        {isLoadingSequence && (
                          <div className="absolute right-2 top-2.5">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Client */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Client</label>
                      <FormField
                        control={form.control}
                        name="client"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingBusOrgs}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white">
                                  <SelectValue
                                    placeholder={
                                      isLoadingBusOrgs
                                        ? 'Loading...'
                                        : businessOrganizations.length === 0
                                          ? 'No clients for your region'
                                          : 'Please Specify'
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {businessOrganizations.map((opt: any) => (
                                  <SelectItem key={opt.orgId} value={opt.code || opt.orgId} className="text-xs">
                                    {opt.name}
                                  </SelectItem>
                                ))}
                                {field.value && !businessOrganizations.find((o: any) => (o.code || o.orgId) === field.value) && (
                                  <SelectItem value={field.value} className="text-xs text-gray-400">
                                    {field.value} (other region)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Common Faults */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Common Faults</label>
                      <FormField
                        control={form.control}
                        name="commonFaults"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDropdowns}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white">
                                  <SelectValue placeholder={isLoadingDropdowns ? "Loading..." : "Please Specify"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {commonFaultsOptions.map((opt: any, index: number) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">{opt.name}</SelectItem>
                                ))}
                                {field.value && !commonFaultsOptions.find((o: any) => o.value === field.value) && (
                                  <SelectItem value={field.value} className="text-xs text-gray-400">
                                    {field.value} (other region)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Category */}
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
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white">
                                  <SelectValue
                                    placeholder={
                                      isLoadingDropdowns
                                        ? 'Loading...'
                                        : categoryOptions.length === 0
                                          ? 'No options for your region'
                                          : 'Please Specify'
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categoryOptions.map((opt: any, index: number) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">
                                    {opt.name}
                                  </SelectItem>
                                ))}
                                {field.value && !categoryOptions.find((o: any) => o.value === field.value) && (
                                  <SelectItem value={field.value} className="text-xs text-gray-400">
                                    {field.value} (other region)
                                  </SelectItem>
                                )}
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
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white">
                                  <SelectValue placeholder={isLoadingDropdowns ? 'Loading...' : 'Please Specify'} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subCategoryOptions.map((opt: any, index: number) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">
                                    {opt.name}
                                  </SelectItem>
                                ))}
                                {field.value && !subCategoryOptions.find((o: any) => o.value === field.value) && (
                                  <SelectItem value={field.value} className="text-xs text-gray-400">
                                    {field.value} (other region)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Status</label>
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            {statusOptions.length > 0 ? (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white">
                                    <SelectValue placeholder="Select Status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {statusOptions.map((opt: any, index: number) => (
                                    <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">
                                      {opt.name}
                                    </SelectItem>
                                  ))}
                                  {field.value && !statusOptions.find((o: any) => o.value === field.value) && (
                                    <SelectItem value={field.value} className="text-xs">
                                      {field.value}
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input {...field} disabled className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm" />
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Opened */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Opened</label>
                      <Input
                        value={incidentData?.createDt ? new Date(incidentData.createDt).toLocaleDateString() : ''}
                        disabled
                        className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm"
                      />
                    </div>

                    {/* ✅ UPDATED: Priority (moved above Target Resolve) */}
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
                                // Trigger SLA generation
                                handlePriorityChange(value);
                              }}
                              value={field.value}
                              disabled={isLoadingDropdowns}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white">
                                  <SelectValue placeholder="Please Specify" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {priorityOptions.map((opt: any, index: number) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">
                                    {opt.name}
                                  </SelectItem>
                                ))}
                                {field.value && !priorityOptions.find((o: any) => o.value === field.value) && (
                                  <SelectItem value={field.value} className="text-xs text-gray-400">
                                    {field.value} (other region)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* ✅ UPDATED: Target Resolve (now below Priority with SLA API) */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">
                        Target Resolve
                        {isLoadingSla && <Loader2 className="h-3 w-3 ml-1 animate-spin text-teal-500" />}
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

                  {/* Right Column */}
                  <div className="space-y-3">
                    {/* Opened by */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Opened by</label>
                      <Input
                        value={incidentData?.incidentOriginator2userName || ''}
                        disabled
                        className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm"
                      />
                    </div>

                    {/* ✅ UPDATED: Customer Id with Search Type Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center gap-1 after:content-['*'] after:text-red-500">Customer Id</label>
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
                                      className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white pr-16"
                                      onChange={(e) => {
                                        field.onChange(e);
                                        if (e.target.value === '') setUserSearchQuery('');
                                      }}
                                      onBlur={(e) => {
                                        field.onBlur();
                                        if (e.target.value.length >= 3) setUserSearchQuery(e.target.value);
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
                                  {customerSearchResults.map((cust: any, idx: number) => (
                                    <button
                                      key={`${cust.custId}-${idx}`}
                                      type="button"
                                      className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center text-xs border-b border-gray-100 last:border-0 group"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        const displayName = `${cust.firstName} ${cust.lastName}`.trim();
                                        field.onChange(displayName);
                                        setUserSearchQuery('');
                                        setSelectedCustomer(cust);
                                        if (cust.macId) form.setValue('configurationItem', cust.macId);
                                        toast({
                                          title: 'Customer Selected',
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

                    {/* Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Location</label>
                      <Input
                        value={
                          selectedCustomer
                            ? [selectedCustomer.city, selectedCustomer.region].filter(Boolean).join(', ')
                            : incidentData?.incidentLocation || ''
                        }
                        disabled
                        className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm"
                      />
                    </div>

                    {/* Alt Contact Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Contact Phone</label>
                      <Input
                        value={
                          selectedCustomer
                            ? selectedCustomer.mobile || selectedCustomer.phone || ''
                            : incidentData?.phoneNum || ''
                        }
                        disabled
                        className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm"
                      />
                    </div>

                    {/* Alt Contact Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-2 items-center group">
                      <label className="text-xs font-medium text-black flex items-center">Alt Contact Name</label>
                      <Input
                        value={
                          selectedCustomer
                            ? selectedCustomer.firstName + ' ' + selectedCustomer.lastName
                            : incidentData?.incidentContact || ''
                        }
                        disabled
                        className="h-8 text-xs border-gray-300 rounded-md bg-gray-50 text-gray-600 shadow-sm"
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

                    {/* Asset/Device */}
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
                                  className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white pr-8"
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
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Reset agent when assignment group changes (if not initial load)
                                if (!isInitialLoad) {
                                  form.setValue('agentId', '');
                                  setSelectedAgent(null);
                                  setIsAgentPreselected(false);
                                }
                              }}
                              value={field.value}
                              disabled={isLoadingDropdowns}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white">
                                  <SelectValue placeholder="Please Specify" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {assignmentGroupOptions.map((opt: any, index: number) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">
                                    {opt.name}
                                  </SelectItem>
                                ))}
                                {field.value && !assignmentGroupOptions.find((o: any) => o.value === field.value) && (
                                  <SelectItem value={field.value} className="text-xs text-gray-400">
                                    {field.value} (other region)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Assigned To */}
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
                                    title: 'Agent Selected',
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
                                        ? 'Select Assignment Group first'
                                        : isLoadingUserQueues
                                          ? 'Loading agents...'
                                          : availableAgents.length === 0 && !field.value
                                            ? 'No agents available'
                                            : 'Select Agent'
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
                                      {agent.title && <span className="text-gray-400">({agent.title})</span>}
                                    </div>
                                  </SelectItem>
                                ))}
                                {field.value && !availableAgents.find((a: any) => a.assignedUser === field.value) && (
                                  <SelectItem value={field.value} className="text-xs text-amber-600 bg-amber-50">
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3 text-amber-500" />
                                      <span>{field.value}</span>
                                      <span className="text-amber-400 text-[10px]">(previously assigned)</span>
                                    </div>
                                  </SelectItem>
                                )}
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
                                <SelectTrigger className="h-8 text-xs border-gray-300 rounded-md shadow-sm bg-white">
                                  <SelectValue placeholder="Please Specify" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {channelOptions.map((opt: any, index: number) => (
                                  <SelectItem key={`${opt.value}-${index}`} value={opt.value} className="text-xs">
                                    {opt.name}
                                  </SelectItem>
                                ))}
                                {field.value && !channelOptions.find((o: any) => o.value === field.value) && (
                                  <SelectItem value={field.value} className="text-xs text-gray-400">
                                    {field.value} (other region)
                                  </SelectItem>
                                )}
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
                                  className="h-8 text-xs flex-1 border-gray-300 rounded-md shadow-sm bg-white"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-slate-100 rounded-md text-slate-500 border border-gray-200"
                                onClick={() => setShowKBSearch(!showKBSearch)}
                              >
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

                    {/* Comments */}
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
                                className="text-sm min-h-[80px] border-gray-300 rounded-md shadow-sm bg-white resize-none"
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

        {/* ✅ UPDATED: Additional Information Section - Side by Side Layout */}
         {(isFormSubmitted || !!ticketId) && (
          <div className="bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden mt-6">
            <div className="p-4">
              <h3 className="text-base font-bold text-gray-700 mb-3 pb-2 border-b-2 border-gray-200 bg-orange-50 px-3 py-2 rounded-t-lg">
                📋 Additional Information
              </h3>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  {/* Activity Log Tab (LEFT) */}
                  <TabsTrigger
                    value="activity-log"
                    className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                  >
                    Activity Log
                  </TabsTrigger>
                  {/* Resolution Tab (RIGHT) */}
                  <TabsTrigger
                    value="resolution"
                    className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                  >
                    Resolution
                  </TabsTrigger>
                </TabsList>

                {/* Activity Log Tab Content */}
                <TabsContent value="activity-log" className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-teal-600" />
                        Create Additional Notes
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                      >
                        INTERNAL NOTE
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium">
                          Note Description{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                          placeholder="Enter your internal note here... (minimum 5 characters)"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="min-h-[100px] text-xs border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                          disabled={addNoteMutation.isPending}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">
                            {newNote.trim().length} characters
                          </span>
                          {newNote.trim().length > 0 &&
                            newNote.trim().length < 5 && (
                              <span className="text-[10px] text-amber-600">
                                Minimum 5 characters required
                              </span>
                            )}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                          <div>
                            <span className="font-medium">Created By:</span>{' '}
                            <span className="text-gray-700">
                              {user?.username || 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Incident:</span>{' '}
                            <span className="text-gray-700">
                              {incidentNumber || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>{' '}
                            <span className="text-gray-700">INTERNAL</span>
                          </div>
                          <div>
                            <span className="font-medium">Region:</span>{' '}
                            <span className="text-gray-700">
                              {userCountryCode || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewNote('')}
                          disabled={
                            !newNote.trim() || addNoteMutation.isPending
                          }
                          className="text-xs h-8 px-3"
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddNote}
                          disabled={
                            !newNote.trim() ||
                            newNote.trim().length < 5 ||
                            addNoteMutation.isPending ||
                            !incidentNumber
                          }
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-4"
                        >
                          {addNoteMutation.isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Adding Note...
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Add Note
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-sm text-gray-800">
                          Current Activity Log
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchActivity()}
                          disabled={isFetchingActivity}
                          className="h-7 text-xs"
                        >
                          <RefreshCw
                            className={`h-3 w-3 mr-1 ${isFetchingActivity ? 'animate-spin' : ''
                              }`}
                          />
                          Refresh
                        </Button>
                      </div>

                      <div className="bg-gray-50 p-4 rounded border border-gray-200 min-h-[200px] max-h-[400px] overflow-y-auto">
                        <div className="mb-3">
                          <span className="text-xs font-semibold text-gray-800">
                            Showing Activity ({totalActivityRecords})
                          </span>
                        </div>

                        <div className="space-y-3">
                          {isLoadingActivity ? (
                            <div className="text-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                              <span className="text-xs text-gray-500 mt-2 block">
                                Loading activities...
                              </span>
                            </div>
                          ) : activities.length > 0 ? (
                            activities.map(
                              (
                                activity: ActivityEntry,
                                index: number
                              ) => (
                                <div
                                  key={activity.objId || index}
                                  className="bg-white p-3 rounded border border-gray-200 shadow-sm"
                                >
                                  <div className="flex items-start space-x-2">
                                    <div
                                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${activity.type === 'NOTE' ||
                                        activity.notesDescription
                                        ? 'bg-green-500'
                                        : 'bg-blue-500'
                                        }`}
                                    ></div>
                                    <div className="flex-1">
                                      <div className="text-xs flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-800">
                                          {activity.type || 'ACTIVITY'}
                                        </span>
                                        {activity.notesDescription && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1 py-0 bg-green-50 text-green-700 border-green-200"
                                          >
                                            NOTE
                                          </Badge>
                                        )}
                                        <span className="text-gray-400">
                                          •
                                        </span>
                                        <span className="text-gray-500">
                                          {activity.createTimestamp
                                            ? formatRelativeTime(
                                              activity.createTimestamp
                                            )
                                            : 'Just now'}
                                        </span>
                                        <span className="text-gray-400">
                                          by
                                        </span>
                                        <span className="text-gray-700 font-medium">
                                          {activity.actEntry2UserName ||
                                            activity.createId ||
                                            'Unknown'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                                        {activity.addnlInfo ||
                                          activity.notesDescription ||
                                          'No description provided.'}
                                      </div>
                                      {activity.createTimestamp && (
                                        <div className="text-[10px] text-gray-400 mt-1">
                                          <Clock className="h-2.5 w-2.5 inline mr-1" />
                                          {formatDateTime(
                                            activity.createTimestamp
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            )
                          ) : (
                            <div className="text-center py-8 text-gray-500 text-xs">
                              No activity recorded yet.
                            </div>
                          )}
                        </div>

                        {totalActivityPages > 1 && (
                          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                            <div className="text-xs text-gray-500">
                              Showing{' '}
                              {activityPage * activityPageSize + 1} -{' '}
                              {Math.min(
                                (activityPage + 1) * activityPageSize,
                                totalActivityRecords
                              )}{' '}
                              of {totalActivityRecords}
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={String(activityPageSize)}
                                onValueChange={(val) => {
                                  setActivityPageSize(Number(val));
                                  setActivityPage(0);
                                }}
                              >
                                <SelectTrigger className="h-7 w-14 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">5</SelectItem>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="20">20</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setActivityPage((p) => p - 1)
                                }
                                disabled={activityPage === 0}
                                className="h-7 w-7 p-0"
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </Button>
                              <span className="text-xs text-gray-600">
                                {activityPage + 1} / {totalActivityPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setActivityPage((p) => p + 1)
                                }
                                disabled={
                                  activityPage >= totalActivityPages - 1
                                }
                                className="h-7 w-7 p-0"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Resolution Tab Content */}
                <TabsContent value="resolution" className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm text-gray-800">
                        Close / Resolve Incident
                      </h3>
                      {isResolutionProcessing && (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
                          Processing...
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Resolution Type <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={resolutionType}
                          onValueChange={setResolutionType}
                          disabled={isLoadingDropdowns || isResolutionProcessing}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue
                              placeholder={
                                isLoadingDropdowns
                                  ? 'Loading...'
                                  : 'Please Specify'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {resolutionTypeOptions.map(
                              (opt: any, index: number) => (
                                <SelectItem
                                  key={`${opt.value}-${index}`}
                                  value={opt.value}
                                  className="text-xs"
                                >
                                  {opt.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Resolution Criteria <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={resolutionCriteria}
                          onValueChange={setResolutionCriteria}
                          disabled={isLoadingDropdowns || isResolutionProcessing}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue
                              placeholder={
                                isLoadingDropdowns
                                  ? 'Loading...'
                                  : 'Please Specify'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {resolutionCriteriaOptions.map(
                              (opt: any, index: number) => (
                                <SelectItem
                                  key={`${opt.value}-${index}`}
                                  value={opt.value}
                                  className="text-xs"
                                >
                                  {opt.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Resolution Comment <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={resolutionComment}
                          onChange={(e) => setResolutionComment(e.target.value)}
                          disabled={isResolutionProcessing}
                          className="w-full h-20 text-xs border border-gray-300 rounded px-3 py-2 resize-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none disabled:bg-gray-50"
                          placeholder="Enter resolution details..."
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-gray-400">
                            {resolutionComment.trim().length} characters
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 rounded-md p-2 border border-blue-100 mt-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                        <div>
                          <span className="font-medium">Closed By:</span>{' '}
                          <span className="text-gray-700">
                            {user?.username || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Incident:</span>{' '}
                          <span className="text-gray-700">
                            {incidentNumber || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Close Date:</span>{' '}
                          <span className="text-gray-700">
                            {new Date().toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Asset:</span>{' '}
                          <span className="text-gray-700">
                            {form.getValues('configurationItem') || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isResolutionProcessing}
                      onClick={() => {
                        setResolutionType('');
                        setResolutionCriteria('');
                        setResolutionComment('');
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        isResolutionProcessing ||
                        !resolutionType ||
                        !resolutionCriteria ||
                        !resolutionComment.trim()
                      }
                      onClick={handleCloseAndResolve}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-xs"
                    >
                      {isResolutionProcessing ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Closing Incident...
                        </>
                      ) : (
                        'Close & Resolve'
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

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

      {/* Confirmation Modal - Close & Resolve */}
      <Dialog open={showCloseConfirmModal} onOpenChange={setShowCloseConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Close Incident
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 pt-2">
              Are you sure you want to close this incident?
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
                  <span className="text-gray-500">Resolution Type:</span>
                  <span className="font-medium text-gray-700">
                    {resolutionTypeOptions.find(o => o.value === resolutionType)?.name || resolutionType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolution Criteria:</span>
                  <span className="font-medium text-gray-700">
                    {resolutionCriteriaOptions.find(o => o.value === resolutionCriteria)?.name || resolutionCriteria}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Comment:</span>
                  <p className="mt-1 text-gray-700 text-xs bg-white p-2 rounded border">
                    {resolutionComment.trim() || 'No comment provided'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>This action cannot be undone. The incident will be marked as closed and you will be redirected to the customer list.</span>
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCloseConfirmModal(false)} disabled={isResolutionProcessing} className="flex-1 sm:flex-none">
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="button" onClick={processResolution} disabled={isResolutionProcessing} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white">
              {isResolutionProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm & Close
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={handleSuccessModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-green-700">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              Incident Closed Successfully
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
              <p className="text-sm text-green-800">
                Incident <span className="font-bold">{closedIncidentNumber}</span> has been closed successfully.
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">You will be redirected to the customer list page.</p>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button type="button" onClick={handleSuccessModalClose} className="bg-teal-600 hover:bg-teal-700 text-white px-8">
              Go to Customer List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Modal */}
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
                <span>This will clear all form fields including resolution details, notes, and any other unsaved data.</span>
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setShowResetConfirmModal(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="button" onClick={confirmReset} className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}