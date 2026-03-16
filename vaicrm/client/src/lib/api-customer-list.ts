// src/lib/api-customer-list.ts

import { getApiConfig } from "@/lib/config";
import { apiRequest } from "@/lib/queryClient";

// Utility to build the request body (you can add filters as needed)
export function buildCustomerListRequestBody({
  offSet = "0",
  limit = "100",
  ...filters
} = {}) {
  return {
    customerId: 0,
    userName: "",
    userType: "",
    sapBpId: "",
    firstName: "",
    offSet,
    limit,
    ...filters,
  };
}

// Main function to call the API
export async function fetchCustomerList(user: any, filters = {}) {
  const { baseUrl } = getApiConfig();
  const url = `${baseUrl.replace(/\/$/, "")}/crm/v1/get/Customer`;

  const payload = buildCustomerListRequestBody(filters);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-auth-username": user?.username || "hh",
    "Authorization": `Bearer ${user?.accessToken || ""}`,
  };

  return await apiRequest(url, "POST", payload, headers);
}