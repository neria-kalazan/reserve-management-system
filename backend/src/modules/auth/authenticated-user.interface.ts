export interface AuthenticatedBusinessUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  companyId: string;
  isActive: boolean;
}
