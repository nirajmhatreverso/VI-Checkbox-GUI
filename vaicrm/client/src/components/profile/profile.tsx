"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/context/AuthProvider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  User,
  Shield,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  LogOut,
  Edit,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  Building2,
  Globe,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  AlertCircle
} from "lucide-react";

export default function ProfileLayout() {
  const { user, logout } = useAuthContext();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await apiRequest("/crm/v1/changePassword", "POST", {
        userName: user?.username,
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });

      if (response.status === "SUCCESS") {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast({
          title: "Error",
          description: response.statusMessage || "Failed to change password",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.statusMessage || error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const userInitials = user?.name
    ? user.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "AZ";

  const tabs = [
    { id: "profile", label: "Profile Details" },
    // { id: "permissions", label: "Access & Permissions" },
    { id: "menus", label: "Assigned Menus" },
    { id: "security", label: "Security & Password" },
  ];

  // Helper to render form-like read-only fields
  const InfoField = ({ label, value, icon: Icon, fullWidth = false }: { label: string, value: string | undefined | null, icon?: any, fullWidth?: boolean }) => (
    <div className={cn("space-y-1.5", fullWidth ? "col-span-full" : "")}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 shadow-sm">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <span className="truncate">{value || "N/A"}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#0f1115] p-4 md:p-8 font-sans print:hidden">
        <div className="w-full space-y-6">

          {/* HEADER SECTION */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-none shadow-sm bg-white dark:bg-[#282c3c] overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">

                  {/* Profile Image */}
                  <div className="relative group shrink-0 mx-auto md:mx-0">
                    <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl overflow-hidden shadow-lg ring-4 ring-gray-50 dark:ring-[#282c3c]">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={user?.menuDetails?.logo} className="object-cover" />
                        <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-[#e67c1a] to-[#CC6A14] text-white">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white dark:border-[#282c3c]" title="Active">
                      <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                    </div>
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 w-full space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="space-y-2 text-center md:text-left w-full">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                          {user?.name || "Viewer"}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />
                            <span>{user?.salesOrg || "No Sales Org"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{user?.country || "Location N/A"}</span>
                          </div>
                          {/* <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div> */}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
                        <Button variant="outline" size="sm" className="gap-2 dark:border-gray-700" onClick={() => window.print()}>
                          <Printer className="w-4 h-4" />
                          Print
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-gray-200 dark:border-gray-700">
                          <LogOut className="w-4 h-4" />
                          <span onClick={() => logout()}>Log Out</span>
                        </Button>

                        {/* <Button size="sm" className="gap-2 bg-[#e67c1a] hover:bg-[#CC6A14] text-white border-none">
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button> */}
                      </div>
                    </div>

                    {/* Badges / Tags */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status</span>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-md">
                          Active Account
                        </Badge>
                      </div>

                      {user?.sapBpId && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">SAP BP ID</span>
                          <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-md font-mono">
                            {user.sapBpId}
                          </Badge>
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Role</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.username}&background=random`} />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">@{user?.username}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Strip */}
              <div className="bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Last login: {new Date().toLocaleDateString()}</span>
              </div>
            </Card>
          </motion.div>

          {/* TABS NAVIGATION */}
          <div className="flex flex-col space-y-6">
            <div className="flex items-center overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-8 py-4 text-sm font-medium transition-all relative whitespace-nowrap",
                    activeTab === tab.id
                      ? "text-[#e67c1a] dark:text-[#F2A85A]"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e67c1a]"
                    />
                  )}
                </button>
              ))}

              {/* Fake Metrics in Tab Bar (Visual Only as per design) */}
              <div className="ml-auto hidden md:flex items-center gap-8 text-xs text-gray-400 pr-4">
                <div className="flex flex-col items-end">
                  <span>Access Level</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{user?.allAccess === "Y" ? "Full Admin" : "Standard"}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span>Menus</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{(user?.menuDetails?.menus?.NAV || []).length} items</span>
                </div>
              </div>
            </div>

            {/* TAB CONTENT */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >

                {/* ---------------- PROFILE DETAILS TAB ---------------- */}
                {activeTab === "profile" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Details */}
                    <Card className="lg:col-span-2 border-none shadow-sm">
                      <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Account Information</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <InfoField label="User ID" value={`@${user?.username}`} icon={User} />
                        <InfoField label="Full Name" value={user?.name} icon={User} />
                        <InfoField label="SAP Business Partner ID" value={user?.sapBpId} icon={Briefcase} />
                        <InfoField label="Parent SAP BP ID" value={user?.parentSapBpId} icon={Briefcase} />

                        <div className="md:col-span-2 lg:col-span-4 pt-4">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Contact & Location</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <InfoField label="Email Address" value={user?.email} icon={Mail} />
                            <InfoField label="Phone Number" value={user?.phone} icon={Phone} />
                            <InfoField label="Sales Organization" value={user?.salesOrg} icon={Building2} />
                            <InfoField label="Country" value={user?.country} icon={Globe} />
                          </div>
                        </div>

                        <div className="md:col-span-2 lg:col-span-4">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
                          <div className="p-4 bg-gray-50 dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 min-h-[100px]">
                            This user is a registered member of the {user?.salesOrg} organization based in {user?.country}.
                            They have {user?.allAccess === "Y" ? "full administrative" : "standard"} privileges to the system.
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Right Column - Permissions Card (Merged into Profile view as a sidebar widget) */}
                    <div className="space-y-6">
                      <Card className="border-none shadow-sm h-full">
                        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">System Access</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { label: "Checker Access", value: user?.checkerAccess },
                              { label: "All Access", value: user?.allAccess },
                              { label: "Main Plant", value: user?.isMainPlant },
                              { label: "OTC Access", value: user?.isOtc },
                              { label: "Employee", value: user?.isEmployee },
                            ].map((perm, i) => (
                              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#1a202c] border border-gray-100 dark:border-gray-700">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{perm.label}</span>
                                {perm.value === "Y"
                                  ? <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Enabled</Badge>
                                  : <Badge variant="secondary" className="text-gray-500">Disabled</Badge>
                                }
                              </div>
                            ))}
                          </div>

                          {/* <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                          <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Token Type</h4>
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-orange-500" />
                            <span className="font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs">{user?.tokenType || "Bearer"}</span>
                          </div>
                        </div> */}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* ---------------- MENUS TAB ---------------- */}
                {activeTab === "menus" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Navigation Items */}
                    <Card className="border-none shadow-sm">
                      <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Navigation Menus</CardTitle>
                        <Badge variant="outline">{(user?.menuDetails?.menus?.NAV || []).length} Items</Badge>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          {(user?.menuDetails?.menus?.NAV || []).map((menu: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1a202c] transition-colors group">
                              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                {menu.pageMenuIcon ? <i className={menu.pageMenuIcon} /> : <Briefcase size={18} />}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{menu.pageMenu}</h4>
                                <p className="text-xs text-gray-500">{menu.pageUrl || "No URL"}</p>
                              </div>
                              <div className="ml-auto">
                                <Badge variant="secondary" className="text-xs">Order: {menu.pageMenuOrder}</Badge>
                              </div>
                            </div>
                          ))}
                          {(!user?.menuDetails?.menus?.NAV || user.menuDetails.menus.NAV.length === 0) && (
                            <div className="text-center py-8 text-gray-500 italic">No navigation menus assigned</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Section Items */}
                    <Card className="border-none shadow-sm">
                      <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Section Menus</CardTitle>
                        <Badge variant="outline">{(user?.menuDetails?.menus?.SECTION || []).length} Items</Badge>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          {(user?.menuDetails?.menus?.SECTION || []).map((menu: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1a202c] transition-colors group">
                              <div className="w-10 h-10 rounded-full bg-[#e67c1a]/10 flex items-center justify-center text-[#e67c1a] group-hover:scale-110 transition-transform">
                                {menu.pageMenuIcon ? <i className={menu.pageMenuIcon} /> : <Briefcase size={18} />}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{menu.pageMenu}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-gray-300 text-gray-500">{menu.pageSectionName || "General"}</Badge>
                                  <span className="text-xs text-gray-400">{menu.pageMenuLabel}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!user?.menuDetails?.menus?.SECTION || user.menuDetails.menus.SECTION.length === 0) && (
                            <div className="text-center py-8 text-gray-500 italic">No section menus assigned</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ---------------- SECURITY TAB ---------------- */}
                {activeTab === "security" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-none shadow-sm">
                      <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Lock className="w-5 h-5 text-[#e67c1a]" />
                          Update Password
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8">
                        <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                          <div className="space-y-4">
                            {/* Old Password */}
                            <div className="space-y-2">
                              <Label htmlFor="oldPassword">Current Password</Label>
                              <div className="relative">
                                <Input
                                  id="oldPassword"
                                  type={showPasswords.old ? "text" : "password"}
                                  placeholder="Enter current password"
                                  value={passwordForm.oldPassword}
                                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                  className="pr-10"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showPasswords.old ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>

                            {/* New Password */}
                            <div className="space-y-2">
                              <Label htmlFor="newPassword">New Password</Label>
                              <div className="relative">
                                <Input
                                  id="newPassword"
                                  type={showPasswords.new ? "text" : "password"}
                                  placeholder="Enter new password"
                                  value={passwordForm.newPassword}
                                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                  className="pr-10"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                              <p className="text-[10px] text-gray-500">Minimum 6 characters required.</p>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                              <Label htmlFor="confirmPassword">Confirm New Password</Label>
                              <div className="relative">
                                <Input
                                  id="confirmPassword"
                                  type={showPasswords.confirm ? "text" : "password"}
                                  placeholder="Confirm new password"
                                  value={passwordForm.confirmPassword}
                                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                  className="pr-10"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <Button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full bg-[#e67c1a] hover:bg-[#CC6A14] text-white"
                          >
                            {isChangingPassword ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Updating Password...
                              </>
                            ) : "Update Password"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card className="border-none shadow-sm overflow-hidden bg-orange-50/50 dark:bg-orange-900/10">
                        <CardHeader className="pb-3 border-b border-orange-100 dark:border-orange-800/50">
                          <CardTitle className="text-sm font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Security Tips
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="mt-0.5"><AlertCircle className="w-3.5 h-3.5 text-orange-500" /></div>
                              <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                                Use a strong password with a mix of letters, numbers, and symbols.
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <div className="mt-0.5"><AlertCircle className="w-3.5 h-3.5 text-orange-500" /></div>
                              <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                                Avoid using the same password across multiple platforms.
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <div className="mt-0.5"><AlertCircle className="w-3.5 h-3.5 text-orange-500" /></div>
                              <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                                Never share your credentials with anyone, including support staff.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* PRINT LAYOUT */}
      <div className="hidden print:block bg-white text-black p-8 font-sans space-y-8">
        {/* Print Header */}
        <div className="flex items-start justify-between border-b pb-8 border-gray-200">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-xl overflow-hidden border border-gray-200">
              {user?.menuDetails?.logo && <img src={user.menuDetails.logo} alt="Profile" className="h-full w-full object-cover" />}
              {!user?.menuDetails?.logo && <div className="h-full w-full bg-gray-100 flex items-center justify-center text-2xl font-bold">{userInitials}</div>}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-500 mt-1">@{user?.username}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-1"><Building2 size={14} /> {user?.salesOrg}</span>
                <span className="flex items-center gap-1"><MapPin size={14} /> {user?.country}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p>Status: Active</p>
          </div>
        </div>

        {/* Print Section: Personal Details */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 border-gray-100">Personal Details</h2>
          <div className="grid grid-cols-3 gap-6">
            <div><span className="text-xs font-bold text-gray-500 uppercase block mb-1">Full Name</span><span className="text-sm border p-2 block rounded">{user?.name || "N/A"}</span></div>
            <div><span className="text-xs font-bold text-gray-500 uppercase block mb-1">Username</span><span className="text-sm border p-2 block rounded">{user?.username || "N/A"}</span></div>
            <div><span className="text-xs font-bold text-gray-500 uppercase block mb-1">SAP BP ID</span><span className="text-sm border p-2 block rounded">{user?.sapBpId || "N/A"}</span></div>
            <div><span className="text-xs font-bold text-gray-500 uppercase block mb-1">Parent SAP BP ID</span><span className="text-sm border p-2 block rounded">{user?.parentSapBpId || "N/A"}</span></div>
            <div><span className="text-xs font-bold text-gray-500 uppercase block mb-1">Sales Org</span><span className="text-sm border p-2 block rounded">{user?.salesOrg || "N/A"}</span></div>
            <div><span className="text-xs font-bold text-gray-500 uppercase block mb-1">Country</span><span className="text-sm border p-2 block rounded">{user?.country || "N/A"}</span></div>
          </div>
        </div>

        {/* Print Section: Access Levels */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 border-gray-100">System Access</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Checker Access", value: user?.checkerAccess },
              { label: "All Access", value: user?.allAccess },
              { label: "Main Plant", value: user?.isMainPlant },
              { label: "OTC Access", value: user?.isOtc },
              { label: "Employee", value: user?.isEmployee },
            ].map((perm, i) => (
              <div key={i} className="border p-2 rounded flex justify-between items-center bg-gray-50">
                <span className="text-sm font-medium">{perm.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${perm.value === "Y" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                  {perm.value === "Y" ? "YES" : "NO"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Print Section: Menus */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 border-gray-100">Assigned Menus</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Navigation</h3>
              <div className="grid grid-cols-2 gap-2">
                {(user?.menuDetails?.menus?.NAV || []).map((menu: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm border-b border-gray-100 py-1">
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                    <span>{menu.pageMenu}</span>
                    <span className="text-xs text-gray-400 ml-auto">{menu.pageUrl}</span>
                  </div>
                ))}
                {(user?.menuDetails?.menus?.NAV || []).length === 0 && <span className="text-sm italic text-gray-400">No navigation items</span>}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Sections</h3>
              <div className="grid grid-cols-2 gap-2">
                {(user?.menuDetails?.menus?.SECTION || []).map((menu: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm border-b border-gray-100 py-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span>{menu.pageMenu}</span>
                    <span className="text-xs bg-gray-100 px-1 rounded ml-2">{menu.pageSectionName}</span>
                  </div>
                ))}
                {(user?.menuDetails?.menus?.SECTION || []).length === 0 && <span className="text-sm italic text-gray-400">No section items</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
