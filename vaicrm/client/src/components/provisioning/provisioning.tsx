import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OSDTab from "@/components/provisioning/OSDTab";
import RegionOSDTab from "@/components/provisioning/RegionOSDTab";
import FingerprintTab from "@/components/provisioning/FingerprintTab";
import BlacklistTab from "@/components/provisioning/BlacklistTab";
import BMailTab from "@/components/provisioning/BMailTab";
// --- NEW IMPORTS ---
import FingerprintRegTab from "@/components/provisioning/FingerprintRegTab"; // You'll need to create this file
import BMailRegTab from "@/components/provisioning/BMailRegTab";           // You'll need to create this file
// --- END NEW IMPORTS ---

import { Mail, Eye, ListChecks, ShieldAlert, MapPin, BadgeCheck, Terminal } from "lucide-react"; // Added BadgeCheck for example
import ProvisioningCommandTab from "./ProvisioningCommandTab";

export default function Provisioning() {
  const [activeTab, setActiveTab] = useState("osd");

  const tabConfig = [
    { id: "osd", label: "OSD Messages", icon: Eye },
    { id: "region-osd", label: "Region OSD", icon: MapPin },
    { id: "fingerprint", label: "Fingerprint", icon: ListChecks },
    // --- NEW TAB 1 ---
    { id: "fingerprint-reg", label: "Fingerprint Reg", icon: BadgeCheck }, // Using BadgeCheck for registration, or ListChecks if preferred
    // --- END NEW TAB 1 ---
    // { id: "blacklist", label: "Blacklist / Kill STB", icon: ShieldAlert },
    { id: "bmail", label: "B Mail", icon: Mail },
    // --- NEW TAB 2 ---
    { id: "bmail-reg", label: "B Mail Reg", icon: Mail }, // Using Mail icon for BMail Reg
    { id: "provisioning-command", label: "Provisioning Command", icon: Terminal },
    // --- END NEW TAB 2 ---
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-azam-blue to-blue-800 text-white p-6 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold">Provisioning</h1>
        <p className="text-blue-100 text-sm mt-1">
          Manage OSD, fingerprinting, blacklist, and broadcast mail settings
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* Tabs Navigation */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
          <TabsList className="inline-flex h-auto w-full justify-start gap-2 bg-transparent p-0">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium
                             rounded-lg border border-transparent bg-white dark:bg-gray-800
                             text-gray-600 dark:text-gray-300 shadow-sm transition-all
                             data-[state=active]:border-azam-blue/30 data-[state=active]:bg-azam-orange
                             data-[state=active]:text-white data-[state=active]:shadow-md
                             hover:bg-gray-50 dark:hover:bg-gray-700 min-w-fit"
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tabs Content */}
        <div className="min-h-[400px]">
          <TabsContent value="osd" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <OSDTab />
          </TabsContent>
          <TabsContent value="region-osd" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <RegionOSDTab />
          </TabsContent>
          <TabsContent value="fingerprint" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <FingerprintTab />
          </TabsContent>
          {/* --- NEW TAB CONTENT 1 --- */}
          <TabsContent value="fingerprint-reg" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <FingerprintRegTab /> {/* This component needs to be created */}
          </TabsContent>
          {/* --- END NEW TAB CONTENT 1 --- */}
          {/* <TabsContent value="blacklist" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <BlacklistTab />
          </TabsContent> */}
          <TabsContent value="bmail" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <BMailTab />
          </TabsContent>
          {/* --- NEW TAB CONTENT 2 --- */}
          <TabsContent value="bmail-reg" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <BMailRegTab /> {/* This component needs to be created */}
          </TabsContent>
          {/* --- NEW TAB CONTENT --- */}
          <TabsContent value="provisioning-command" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <ProvisioningCommandTab />
          </TabsContent>
          {/* --- END NEW TAB CONTENT --- */}
          {/* --- END NEW TAB CONTENT 2 --- */}
        </div>
      </Tabs>
    </div>
  );
}