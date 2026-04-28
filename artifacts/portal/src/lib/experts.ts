export interface ExpertProfile {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  departmentId?: number | null;
  departmentName?: string | null;
  scientificDegree?: string | null;
  position?: string | null;
  expertOrganization?: string | null;
  expertBio?: string | null;
  expertSpecialties?: string[];
  expertIsActive?: boolean;
  createdAt?: string;
}

export const EXPERTS_QUERY_KEY = ["experts", "assignable"] as const;

export async function fetchExperts(): Promise<ExpertProfile[]> {
  const token = localStorage.getItem("portal_token");
  const response = await fetch(`/api/users/experts?_=${Date.now()}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Failed to load experts");
  }
  return response.json();
}

export async function updateExpertProfile(id: number, data: Partial<ExpertProfile>) {
  const token = localStorage.getItem("portal_token");
  const response = await fetch(`/api/users/${id}/expert-profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Failed to update expert profile");
  }
  return response.json();
}
