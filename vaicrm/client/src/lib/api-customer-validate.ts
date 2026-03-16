// src/lib/api-customer-validate.ts
import { getApiConfig } from "@/lib/config";

export interface ValidateCustomerResponse {
  traceId?: string;
  spanId?: string;
  status: "SUCCESS" | "FAILURE";
  statusCode: number;
  statusMessage: string;
  data: null | {
    message?: string;
    id?: string;
    onbId?: string;
    bpid?: string | null;
  };
}

export async function validateCustomerMobile(
  mobile: string,
  user: { accessToken?: string | null } | null | undefined,
  signal?: AbortSignal
): Promise<ValidateCustomerResponse> {
  const { baseUrl } = getApiConfig();
  const url = `${baseUrl.replace(/\/$/, "")}/crm/v1/validate/customer`; // lowercase

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user?.accessToken || ""}`,
    },
    body: JSON.stringify({ mobile }),
    signal,
  });

  let json: ValidateCustomerResponse | null = null;
  try {
    json = (await res.json()) as ValidateCustomerResponse;
  } catch {}

  if (!res.ok) {
    if (res.status === 404 && json) return json;
    const msg =
      json?.statusMessage ||
      (res.statusText ? `Request failed (${res.status})` : "Request failed");
    const err = new Error(msg) as any;
    err.statusCode = res.status;
    throw err;
  }
  return json as ValidateCustomerResponse;
}