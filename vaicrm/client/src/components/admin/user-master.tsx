import React, { useState, useMemo, useEffect } from "react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserFormDialog } from "./user-form-dialog";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Save,
    CheckSquare,
    Square,
    AlertTriangle,
    Shield,
    MoreVertical,
    Users,
    LayoutGrid,
    ChevronRight,
    ArrowLeft,
    User as UserIcon,
    Mail,
    Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import types and hooks
import {
    useUsers,
    useUserPermissions,
    useUserRoles,
    useCreateUserMutation,
    useUpdateUserMutation,
    useUpdateUserPermissionsMutation,
    type User,
    type UserStatus,
    type PagePermission,
    type UserRoleMapping,
} from "@/hooks/use-user-master";
import { useRoles, type Role } from "@/hooks/use-role-master";
import { useCountries } from "@/hooks/use-center-data";
import { adminApi } from "@/lib/adminApi";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthContext } from "@/context/AuthProvider";






export function UserMaster() {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const { user } = useAuthContext();
    const { data: users = [], isLoading: isUsersLoading } = useUsers({
        limit: 1000,
        country: user?.country || ""
    });

    const { data: roles = [], isLoading: isRolesLoading } = useRoles();

    const createUserMutation = useCreateUserMutation();
    const updateUserMutation = useUpdateUserMutation();
    const updateUserPermissionsMutation = useUpdateUserPermissionsMutation();

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string>("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const { data: userPermissions = [], isLoading: isLoadingPermissions } = useUserPermissions(selectedUserId);
    const { data: fetchedUserRoles = [], isLoading: isLoadingUserRoles } = useUserRoles(selectedUserId);

    // Tracks constraints on the selected user for edit
    const [localUserState, setLocalUserState] = useState<User | null>(null); // Use User type
    const [permissions, setPermissions] = useState<PagePermission[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Password Reset Local State
    const [isPasswordResetEnabled, setIsPasswordResetEnabled] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    // Assigned Roles State
    const [assignedRoles, setAssignedRoles] = useState<{ role: Role; assignedDate: string; ruId: string | null; status: string }[]>([]);

    const { data: countries = [], isLoading: isLoadingCountries } = useCountries();

    // Sync local state when a user is selected
    // Sync local state when a user is selected
    useEffect(() => {
        if (selectedUserId) {
            const user = users.find(u => u.userId === selectedUserId);
            if (user) {
                setLocalUserState({ ...user });

                // Sync assigned roles from the fetched API data
                if (fetchedUserRoles.length > 0) {
                    const mappedRoles = fetchedUserRoles.map((ur: UserRoleMapping) => {
                        const role = roles.find(r => r.roleId === ur.roleId) || {
                            roleId: ur.roleId,
                            roleName: ur.roleName,
                            roleDescription: `Assigned Role: ${ur.roleName}`,
                            status: ur.status as any
                        } as Role;
                        return {
                            role,
                            assignedDate: ur.createTs ? new Date(ur.createTs).toLocaleDateString() : new Date().toLocaleDateString(),
                            ruId: ur.ruId,
                            status: ur.status || "ACTIVE"
                        };
                    });
                    setAssignedRoles(mappedRoles);
                } else {
                    // Fallback to the user's primary role if no mappings fetched yet
                    const currentRole = roles.find(r => r.roleId === user.roleId);
                    if (currentRole) {
                        setAssignedRoles([{ role: currentRole, assignedDate: new Date().toLocaleDateString(), ruId: null, status: "ACTIVE" }]);
                    } else {
                        setAssignedRoles([]);
                    }
                }
            }
            // Permissions will be synced via useUserPermissions hook
            setPermissions(userPermissions);
            setHasChanges(false);

            // Reset password state
            setIsPasswordResetEnabled(false);
            setNewPassword("");
            setConfirmNewPassword("");
            setSelectedRoleToAssign("");
        } else {
            setLocalUserState(null);
            setPermissions([]);
            setAssignedRoles([]);
            setIsPasswordResetEnabled(false);
            setNewPassword("");
            setConfirmNewPassword("");
            setSelectedRoleToAssign("");
        }
    }, [selectedUserId, users, roles, userPermissions, fetchedUserRoles]);

    // Filter users
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch =
                (user.userName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.firstName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.lastName || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus =
                statusFilter === "ALL" || user.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [users, searchQuery, statusFilter]);

    // Group pages by navigation menu
    const groupedPages = useMemo(() => {
        const groups: Record<string, PagePermission[]> = {};
        permissions.forEach((page) => {
            const key = page.pageMenu;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(page);
        });
        return groups;
    }, [permissions]);

    const handleAdd = () => {
        setEditingUser(null);
        setIsFormOpen(true);
    };

    const handleDeactivate = (id: string) => {
        const userToDeactivate = users.find(u => u.userId === id);
        if (!userToDeactivate) return;

        const newStatus = userToDeactivate.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        // Build the payload for the update user API with new status
        const payload = {
            userId: userToDeactivate.userId,
            userType: userToDeactivate.userType,
            salutation: userToDeactivate.salutation,
            firstName: userToDeactivate.firstName,
            middleName: userToDeactivate.middleName || "",
            lastName: userToDeactivate.lastName,
            email: userToDeactivate.email,
            phone: userToDeactivate.phone || "",
            altPhone: userToDeactivate.altPhone || "",
            isEmployee: userToDeactivate.employee ? "Y" : "",
            employeeCode: userToDeactivate.employeeCode || "",
            isPwdReset: "N",
            roleId: userToDeactivate.roleId,
            status: newStatus,
            country: userToDeactivate.country,
            isMainPlant: userToDeactivate.mainPlant ? "Y" : "",
            isOtc: userToDeactivate.otc ? "Y" : "",
            // Map assigned roles if it's the currently selected user
            assignRole: id === selectedUserId ? assignedRoles.map((ar) => ({
                ruId: ar.ruId || "",
                roleId: ar.role.roleId,
                status: ar.role.status,
            })) : [],
        };

        updateUserMutation.mutate(payload, {
            onSuccess: (response: any) => {
                setDeleteId(null);
                const successMsg = response?.statusMessage || `User has been ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`;
                toast({
                    title: "Success",
                    description: successMsg,
                });
            },
            onError: (error: any) => {
                const errorMsg = error?.response?.data?.statusMessage || error?.statusMessage || error?.message || `Failed to ${newStatus === "ACTIVE" ? "activate" : "deactivate"} user.`;
                toast({
                    title: "Error",
                    description: errorMsg,
                    variant: "destructive",
                });
            }
        });
    };

    const handleSave = (user: User) => {
        // Use createUserMutation for both create and update since the backend handles it via saveUserMaster
        // (If strictly separate, use updateUserMutation for updates, but our updateUserMutation logic might need alignment)
        // Given the task is about integrating the create API, we use createUserMutation which uses saveUserMaster.

        createUserMutation.mutate(user, {
            onSuccess: (response: any) => {
                setIsFormOpen(false);
                setEditingUser(null);

                // If the edited user is currently selected, update local state
                if (selectedUserId === user.userId) {
                    setLocalUserState(user);
                }
                const successMsg = response?.statusMessage || (editingUser ? "User updated successfully" : "User created successfully");
                toast({
                    title: "Success",
                    description: successMsg,
                });
            },
            onError: (error: any) => {
                const errorMsg = error?.response?.data?.statusMessage || error?.statusMessage || error?.message || "Failed to save user. Please try again.";
                toast({
                    title: "Error",
                    description: errorMsg,
                    variant: "destructive",
                });
            }
        });
    };

    const handleSelectUser = (userId: string) => {
        if (hasChanges) {
            const confirmChange = window.confirm("You have unsaved changes. Are you sure you want to switch users?");
            if (!confirmChange) return;
        }
        setSelectedUserId(userId);
    };

    const handleAddRole = () => {
        if (!selectedRoleToAssign) return;

        const roleToAdd = roles.find((r) => r.roleId === selectedRoleToAssign);
        if (roleToAdd) {
            // Check if already assigned
            if (assignedRoles.some((ar) => ar.role.roleId === roleToAdd.roleId)) {
                toast({
                    title: "Role already assigned",
                    description: `${roleToAdd.roleName} is already assigned to this user.`,
                    variant: "destructive",
                });
                return;
            }

            setAssignedRoles((prev) => [
                ...prev,
                { role: roleToAdd, assignedDate: new Date().toLocaleDateString("en-GB"), ruId: "", status: "ACTIVE" },
            ]);
            setHasChanges(true);
        }
        setSelectedRoleToAssign("");
    };

    const handleToggleRoleStatus = (roleId: string, currentStatus: string) => {
        setAssignedRoles((prev) => prev.map((ar) => {
            if (ar.role.roleId === roleId) {
                return { ...ar, status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE" };
            }
            return ar;
        }));
        setHasChanges(true);
    };

    const updateUserField = (field: keyof User, value: any) => {
        if (!localUserState) return;

        // Handle special case for ROLE_ID change -> update ROLE_NAME and userType
        if (field === "roleId") {
            const role = roles.find(r => r.roleId === value);
            setLocalUserState(prev => prev ? {
                ...prev,
                [field]: value,
                roleName: role ? role.roleName : prev.roleName,
                userType: role ? role.roleName : prev.userType
            } : null);
        } else if (field === "userType") {
            const role = roles.find(r => r.roleName === value);
            setLocalUserState(prev => prev ? {
                ...prev,
                [field]: value,
                roleId: role ? role.roleId : prev.roleId,
                roleName: role ? role.roleName : prev.roleName
            } : null);
        } else {
            setLocalUserState(prev => prev ? { ...prev, [field]: value } : null);
        }
        setHasChanges(true);
    };

    const updatePermission = (
        pageId: string,
        field: keyof Pick<PagePermission, "viewAccess" | "addAccess" | "editAccess" | "exportAccess">,
        value: boolean
    ) => {
        setPermissions((prev) =>
            prev.map((p) => {
                if (p.pageId === pageId) {
                    const updated = { ...p, [field]: value };
                    // Auto-enable VIEW if any other permission is enabled
                    if (value && field !== "viewAccess") {
                        updated.viewAccess = true;
                    }
                    // Auto-disable dependent permissions if VIEW is disabled
                    if (!value && field === "viewAccess") {
                        updated.addAccess = false;
                        updated.editAccess = false;
                        updated.exportAccess = false;
                    }
                    return updated;
                }
                return p;
            })
        );
        setHasChanges(true);
    };

    const handleSaveChanges = async () => {
        if (!localUserState) return;

        // Password validation if reset is enabled
        if (isPasswordResetEnabled) {
            if (!newPassword) {
                toast({
                    title: "Validation Error",
                    description: "New password cannot be empty.",
                    variant: "destructive",
                });
                return;
            }
            if (newPassword !== confirmNewPassword) {
                toast({
                    title: "Validation Error",
                    description: "Passwords do not match.",
                    variant: "destructive",
                });
                return;
            }
        }

        try {
            // Build the payload for the update user API
            const payload = {
                userId: localUserState.userId, // mandatory
                userType: localUserState.userType,
                salutation: localUserState.salutation,
                firstName: localUserState.firstName,
                middleName: localUserState.middleName || "",
                lastName: localUserState.lastName,
                email: localUserState.email,
                phone: localUserState.phone || "",
                altPhone: localUserState.altPhone || "",
                isEmployee: localUserState.employee ? "Y" : "",
                employeeCode: localUserState.employeeCode || "",
                isPwdReset: isPasswordResetEnabled ? "Y" : "N",
                roleId: localUserState.roleId,
                status: localUserState.status,
                country: localUserState.country,
                isMainPlant: localUserState.mainPlant ? "Y" : "",
                isOtc: localUserState.otc ? "Y" : "",
                // Map assigned roles to the expected format
                assignRole: assignedRoles.map((ar) => ({
                    ruId: ar.ruId || "",
                    roleId: ar.role.roleId,
                    status: ar.status,
                })),
            };

            // If password reset is enabled, include password fields
            if (isPasswordResetEnabled) {
                (payload as any).password = newPassword;
                (payload as any).confirmPassword = confirmNewPassword;
            }

            updateUserMutation.mutate(payload, {
                onSuccess: (response: any) => {
                    const successMsg = response?.statusMessage || "User details have been updated successfully.";
                    toast({
                        title: "Success",
                        description: successMsg,
                    });

                    setHasChanges(false);
                    setIsPasswordResetEnabled(false);
                    setNewPassword("");
                    setConfirmNewPassword("");
                },
                onError: (error: any) => {
                    const errorMsg = error?.response?.data?.statusMessage || error?.statusMessage || error?.message || "Failed to update user details.";
                    toast({
                        title: "Error",
                        description: errorMsg,
                        variant: "destructive",
                    });
                }
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to update user details.",
                variant: "destructive",
            });
        }
    };

    const selectedUser = users.find(u => u.userId === selectedUserId);

    return (
        <div className="h-[calc(100vh-4rem)] bg-slate-50 p-4 sm:p-6 overflow-hidden flex flex-col">
            {/* Header Area */}
            <Card className="mb-6 bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg border-0">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">User Management</h1>
                                <p className="text-blue-100 text-xs mt-0.5">Manage users and their assignments</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Left Sidebar - User List */}
                <Card className={`flex flex-col h-full border-slate-200 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl ${isMobile ? (selectedUserId ? "hidden" : "w-full") : "w-1/3"}`}>
                    <CardHeader className="p-5 border-b border-slate-100 bg-white/50 sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Users</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Directory</p>
                                </div>
                            </div>
                            <Button onClick={handleAdd} size="sm" className="bg-azam-blue hover:bg-blue-700 shadow-md shadow-blue-200 text-xs h-8 px-3 rounded-lg transition-all hover:scale-105 active:scale-95">
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                New User
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm w-full rounded-lg"
                                />
                            </div>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) => setStatusFilter(value as UserStatus | "ALL")}
                            >
                                <SelectTrigger className="h-9 w-[130px] text-xs bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 rounded-lg">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Status</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>

                    {/* Table Header */}
                    <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3 sticky top-[73px] z-10 backdrop-blur-sm">
                        <div className="w-10" /> {/* Spacer for Icon */}
                        <div className="flex-1 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <div className="col-span-4">User Details</div>
                            <div className="col-span-5">Role</div>
                            <div className="col-span-3 text-right">Status</div>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 bg-slate-50/50 relative">
                        {isUsersLoading && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-azam-blue border-t-transparent" />
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Loading Users...</p>
                                </div>
                            </div>
                        )}
                        <div className="p-3 space-y-2">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.userId}
                                    onClick={() => handleSelectUser(user.userId)}
                                    className={`
                                        group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer
                                        ${selectedUserId === user.userId
                                            ? "bg-gradient-to-r from-blue-50/80 to-white/80 border-blue-200 shadow-sm ring-1 ring-blue-100"
                                            : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* User Icon */}
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                                            ${selectedUserId === user.userId ? "bg-white shadow-sm ring-1 ring-blue-50" : "bg-slate-50 group-hover:bg-blue-50"}
                                        `}>
                                            <UserIcon className={`w-5 h-5 ${selectedUserId === user.userId ? "text-azam-blue" : "text-slate-400"}`} />
                                        </div>

                                        <div className="flex-1 grid grid-cols-12 gap-2 items-center min-w-0">
                                            {/* User Name */}
                                            <div className="col-span-4 pr-2">
                                                <h4 className={`font-bold text-sm truncate ${selectedUserId === user.userId ? "text-slate-900" : "text-slate-700 group-hover:text-blue-700 transition-colors"}`}>
                                                    {user.userName}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 truncate">{user.firstName} {user.lastName}</p>
                                            </div>

                                            {/* Roles */}
                                            <div className="col-span-5 pr-2">
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 px-1.5 py-0 text-[10px]"
                                                >
                                                    {user.roleName}
                                                </Badge>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-3 flex justify-end">
                                                {user.status === "ACTIVE" ? (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inactive</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedUserId === user.userId && (
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-azam-blue rounded-r-full" />
                                    )}
                                </div>
                            ))}

                            {filteredUsers.length === 0 && (
                                <div className="text-center py-10 px-4">
                                    <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">No users found</p>
                                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 text-center">
                        {filteredUsers.length} users found
                    </div>
                </Card>

                {/* Right Content - Manage User & Permissions */}
                <Card className={`flex-1 flex flex-col h-full border-slate-200 shadow-sm overflow-hidden bg-white ${isMobile && !selectedUserId ? "hidden" : ""}`}>
                    {!selectedUserId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                            <div className="bg-white p-6 rounded-full shadow-lg mb-6 border border-slate-100 animate-in zoom-in-95 duration-300">
                                <div className="bg-blue-50 p-4 rounded-full">
                                    <UserIcon className="w-12 h-12 text-azam-blue" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Select a User to Manage</h3>
                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                Choose a user from the directory to view and modify their details and permissions.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between border-b border-slate-100 py-3 sm:py-4 px-4 sm:px-6 bg-white sticky top-0 z-20 gap-2">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {isMobile && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="-ml-2 h-8 w-8 shrink-0"
                                            onClick={() => setSelectedUserId("")}
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </Button>
                                    )}
                                    <div className="min-w-0">
                                        <div className={`flex items-center gap-2 text-sm text-slate-500 mb-1 ${isMobile ? "hidden" : "flex"}`}>
                                            <span>Management</span>
                                            <ChevronRight className="w-4 h-4" />
                                            <span className="font-medium text-azam-blue truncate max-w-[150px]">{selectedUser?.userName}</span>
                                        </div>
                                        <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                                            {isMobile ? selectedUser?.userName : "User Profile"}
                                        </h2>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1 border-r border-slate-200 pr-3 mr-1">
                                        {selectedUser && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => selectedUser && setDeleteId(selectedUser.userId)}
                                                    className={`h-8 px-2 sm:px-3 hover:bg-slate-100 ${selectedUser.status === "ACTIVE"
                                                        ? "text-slate-600 hover:text-red-600 hover:bg-red-50"
                                                        : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                                                        }`}
                                                    title={selectedUser.status === "ACTIVE" ? "Deactivate User" : "Activate User"}
                                                >
                                                    {selectedUser.status === "ACTIVE" ? (
                                                        <Trash2 className="w-4 h-4" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4" />
                                                    )}
                                                    <span className="hidden sm:inline ml-2">
                                                        {selectedUser.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                                    </span>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                    {hasChanges && (
                                        <Badge variant="outline" className="hidden sm:flex border-amber-200 bg-amber-50 text-amber-700 animate-pulse">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            Unsaved Changes
                                        </Badge>
                                    )}
                                    <Button
                                        onClick={handleSaveChanges}
                                        disabled={!hasChanges}
                                        size="sm"
                                        className="bg-azam-blue hover:bg-blue-700 shadow-sm transition-all h-8 px-2 sm:px-3"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span className="hidden sm:inline ml-2">Save Changes</span>
                                    </Button>
                                </div>
                            </div>

                            <Tabs defaultValue="manage" className="flex-1 flex flex-col min-h-0">
                                <div className="px-6 border-b border-slate-200 bg-white">
                                    <TabsList className="h-12 w-full justify-start bg-transparent p-0 gap-2">
                                        <TabsTrigger
                                            value="manage"
                                            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white data-[state=active]:shadow-none text-slate-500 rounded-md h-10 px-4 font-medium self-center"
                                        >
                                            Manage User
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="roles"
                                            className="data-[state=active]:bg-azam-orange data-[state=active]:text-white data-[state=active]:shadow-none text-slate-500 rounded-md h-10 px-4 font-medium self-center"
                                        >
                                            Assigned Roles
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="manage" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0 p-0">
                                    <ScrollArea className="flex-1">
                                        <div className="p-6 space-y-8">
                                            {/* Edit User Details */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                                                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                                    <Edit className="w-4 h-4 text-azam-blue" />
                                                    User Details
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">User Id</label>
                                                        <Input
                                                            value={localUserState?.userId || ""}
                                                            className="bg-slate-50 h-8 text-sm"
                                                            disabled
                                                        />
                                                    </div>
                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">User Name</label>
                                                        <Input
                                                            value={localUserState?.userName || ""}
                                                            onChange={(e) => updateUserField("userName", e.target.value)}
                                                            className="bg-white h-8 text-sm"
                                                            disabled
                                                        />
                                                        <p className="text-[10px] text-slate-500 mt-1">Username cannot be changed once created.</p>
                                                    </div>

                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">User Type</label>
                                                        <Select
                                                            value={localUserState?.userType}
                                                            onValueChange={(value) => updateUserField("userType", value)}
                                                            disabled
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Select Type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {roles.map((role) => (
                                                                    <SelectItem key={`manage-type-${role.roleId}`} value={role.roleName}>
                                                                        {role.roleId} - {role.roleName}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>


                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">Salutation</label>
                                                        <Select
                                                            value={localUserState?.salutation}
                                                            onValueChange={(value) => updateUserField("salutation", value)}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Mr/Ms" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Mr.">Mr.</SelectItem>
                                                                <SelectItem value="Mrs.">Mrs.</SelectItem>
                                                                <SelectItem value="Ms.">Ms.</SelectItem>
                                                                <SelectItem value="Dr.">Dr.</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">First Name</label>
                                                        <Input
                                                            value={localUserState?.firstName || ""}
                                                            onChange={(e) => updateUserField("firstName", e.target.value)}
                                                            className="bg-white h-8 text-sm"
                                                        />
                                                    </div>

                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">Middle Name</label>
                                                        <Input
                                                            value={localUserState?.middleName || ""}
                                                            onChange={(e) => updateUserField("middleName", e.target.value)}
                                                            className="bg-white h-8 text-sm"
                                                        />
                                                    </div>

                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">Last Name</label>
                                                        <Input
                                                            value={localUserState?.lastName || ""}
                                                            onChange={(e) => updateUserField("lastName", e.target.value)}
                                                            className="bg-white h-8 text-sm"
                                                        />
                                                    </div>

                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">Email</label>
                                                        <Input
                                                            value={localUserState?.email || ""}
                                                            onChange={(e) => updateUserField("email", e.target.value)}
                                                            className="bg-white h-8 text-sm"
                                                        />
                                                    </div>

                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">Phone</label>
                                                        <Input
                                                            value={localUserState?.phone || ""}
                                                            onChange={(e) => updateUserField("phone", e.target.value)}
                                                            className="bg-white h-8 text-sm"
                                                        />
                                                    </div>

                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">Alt Phone</label>
                                                        <Input
                                                            value={localUserState?.altPhone || ""}
                                                            onChange={(e) => updateUserField("altPhone", e.target.value)}
                                                            className="bg-white h-8 text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-0">
                                                        <label className="text-xs font-medium text-slate-700">Country</label>
                                                        <Select
                                                            value={localUserState?.country}
                                                            onValueChange={(value) => updateUserField("country", value)}
                                                            disabled={isLoadingCountries}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder={isLoadingCountries ? "Loading..." : "Select Country"} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {countries.map((c: any) => (
                                                                    <SelectItem key={c.countryCode || c.country} value={c.country}>
                                                                        {c.country}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Flags */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                                                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-azam-blue" />
                                                    Access Control
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                        <label className="text-xs font-medium text-slate-700">Active Status</label>
                                                        <Switch
                                                            checked={localUserState?.status === "ACTIVE"}
                                                            onCheckedChange={(c) => updateUserField("status", c ? "ACTIVE" : "INACTIVE")}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                        <label className="text-xs font-medium text-slate-700">OTC Access</label>
                                                        <Switch
                                                            checked={localUserState?.otc}
                                                            onCheckedChange={(c) => {
                                                                updateUserField("otc", c);
                                                                if (c) {
                                                                    updateUserField("employee", false);
                                                                    updateUserField("mainPlant", false);
                                                                }
                                                            }}
                                                            disabled={localUserState?.employee || localUserState?.mainPlant}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                        <label className="text-xs font-medium text-slate-700">Employee</label>
                                                        <Switch
                                                            checked={localUserState?.employee}
                                                            onCheckedChange={(c) => {
                                                                updateUserField("employee", c);
                                                                if (c) {
                                                                    updateUserField("otc", false);
                                                                    updateUserField("mainPlant", false);
                                                                }
                                                            }}
                                                            disabled={localUserState?.otc || localUserState?.mainPlant}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                        <label className="text-xs font-medium text-slate-700">Main Plant</label>
                                                        <Switch
                                                            checked={localUserState?.mainPlant}
                                                            onCheckedChange={(c) => {
                                                                updateUserField("mainPlant", c);
                                                                if (c) {
                                                                    updateUserField("otc", false);
                                                                    updateUserField("employee", false);
                                                                }
                                                            }}
                                                            disabled={localUserState?.otc || localUserState?.employee}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reset Password Section */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                                        <i className="pi pi-key text-azam-blue" />
                                                        Security
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs font-medium text-slate-700">Reset Password</label>
                                                        <Switch
                                                            checked={isPasswordResetEnabled}
                                                            onCheckedChange={(checked) => {
                                                                setIsPasswordResetEnabled(checked);
                                                                setHasChanges(true);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {isPasswordResetEnabled && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-slate-700">New Password</label>
                                                            <Input
                                                                type="password"
                                                                placeholder="Enter new password"
                                                                value={newPassword}
                                                                onChange={(e) => {
                                                                    setNewPassword(e.target.value);
                                                                    setHasChanges(true);
                                                                }}
                                                                className="bg-white h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-slate-700">Confirm Password</label>
                                                            <Input
                                                                type="password"
                                                                placeholder="Confirm new password"
                                                                value={confirmNewPassword}
                                                                onChange={(e) => {
                                                                    setConfirmNewPassword(e.target.value);
                                                                    setHasChanges(true);
                                                                }}
                                                                className="bg-white h-8 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="roles" className="flex-1 overflow-hidden data-[state=active]:flex flex-col m-0 p-0">
                                    <ScrollArea className="flex-1">
                                        <div className="p-6 space-y-6">
                                            {/* Assigned Roles Section */}
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-azam-blue" />
                                                    Assigned Roles
                                                </h3>

                                                {/* Add Role Control */}
                                                <div className="flex gap-3 mb-6 items-end">
                                                    <div className="flex-1 max-w-md">
                                                        <Select
                                                            value={selectedRoleToAssign}
                                                            onValueChange={setSelectedRoleToAssign}
                                                        >
                                                            <SelectTrigger className="w-full bg-slate-50 border-slate-200 focus:ring-blue-100">
                                                                <SelectValue placeholder="Select Role to Assign" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {roles.map((role) => (
                                                                    <SelectItem key={role.roleId} value={role.roleId}>
                                                                        {role.roleName}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button
                                                        onClick={handleAddRole}
                                                        className="bg-azam-orange hover:bg-orange-600 text-white shadow-sm"
                                                        disabled={!selectedRoleToAssign}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1.5" />
                                                        Add
                                                    </Button>
                                                </div>

                                                {/* Roles Table */}
                                                <div className="rounded-lg border border-slate-200 overflow-hidden">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-4 py-3 font-semibold text-azam-blue">Role Name</th>
                                                                <th className="px-4 py-3 font-semibold text-slate-500">Description</th>
                                                                <th className="px-4 py-3 font-semibold text-slate-500">Assigned Date</th>
                                                                <th className="px-4 py-3 font-semibold text-slate-500 text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {assignedRoles.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs italic">
                                                                        No roles assigned yet.
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                assignedRoles.map((assigned) => (
                                                                    <tr key={assigned.role.roleId} className="hover:bg-slate-50 transition-colors">
                                                                        <td className="px-4 py-3 font-semibold text-slate-700">
                                                                            {assigned.role.roleName}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-slate-500">
                                                                            {assigned.role.roleDescription}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-slate-500">
                                                                            {assigned.assignedDate}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <Switch
                                                                                checked={assigned.status === "ACTIVE"}
                                                                                onCheckedChange={() => handleToggleRoleStatus(assigned.role.roleId, assigned.status)}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </Card>

                <UserFormDialog
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    user={editingUser}
                    onSave={handleSave}
                    roles={roles}
                />

                <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {deleteId && users.find(u => u.userId === deleteId)?.status === "ACTIVE"
                                    ? `This action will deactivate the user "${users.find(u => u.userId === deleteId)?.userName}". They will not be able to log in.`
                                    : `This action will activate the user "${users.find(u => u.userId === deleteId)?.userName}".`
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    if (deleteId) handleDeactivate(deleteId);
                                }}
                                className={deleteId && users.find(u => u.userId === deleteId)?.status === "ACTIVE"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                }
                            >
                                {deleteId && users.find(u => u.userId === deleteId)?.status === "ACTIVE"
                                    ? "Deactivate User"
                                    : "Activate User"
                                }
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
