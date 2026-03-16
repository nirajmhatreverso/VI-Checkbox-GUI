import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuMaster } from "./menu-master";
import { RoleMasterCombined } from "./role-master-combined";

export default function MenuRoleManagement() {
    const [activeTab, setActiveTab] = useState("menu-master");

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
            <div className="max-w-[1800px] mx-auto">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-azam-blue to-blue-700 bg-clip-text text-transparent mb-1">
                        Menu & Role Management
                    </h1>
                    <p className="text-slate-600 text-sm">
                        Manage app menus, roles, and permissions
                    </p>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full max-w-xl grid-cols-2 mb-6 h-14 bg-white shadow-lg rounded-xl border border-slate-200">
                        <TabsTrigger
                            value="menu-master"
                            className="text-base font-semibold data-[state=active]:bg-azam-orange data-[state=active]:text-white rounded-lg transition-all duration-300"
                        >
                            <i className="pi pi-sitemap mr-2" />
                            Menu Master
                        </TabsTrigger>
                        <TabsTrigger
                            value="role-master"
                            className="text-base font-semibold data-[state=active]:bg-azam-orange data-[state=active]:text-white rounded-lg transition-all duration-300"
                        >
                            <i className="pi pi-users mr-2" />
                            Role Master
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="menu-master" className="mt-0">
                        <MenuMaster />
                    </TabsContent>

                    <TabsContent value="role-master" className="mt-0">
                        <RoleMasterCombined />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
