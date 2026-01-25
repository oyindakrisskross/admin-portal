// src/types/accounts.ts

export interface PermissionBitSet {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
};

export interface PermissionBitMap {
  [permissionId: number]: PermissionBitSet;
};

export interface PermissionCategory {
  id?: number;
  portal?: number;
  portal_name?: string;
  category_id?: number;
  name?: string;
  category_permissions?: Permission[];
};

export interface Permission {
  id?: number;
  portal?: number;
  portal_name?: string;
  permission_id?: number;
  category?: number;
  category_name?: string;
  name?: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

export interface Role {
  id?: number;
  role_id?: number;
  portal?: number;
  portal_name?: string;
  name?: string;
  description?: string; 
  permissions?: RolePermission[];
  permissions_payload?: PermissionBitMap[];
};

export interface RolePermission {
  id?: number;
  portal?: number;
  portal_name?: string;
  role?: number;
  role_name?: string;
  permission?: number;
  permission_name?: string;
  access: string;
}

export interface UserLocation {
  id?: number;
  user?: number;
  location?: number;
  location_name?: number;
  is_primary?: boolean;
}

export interface UserProfile {
  id?: number;
  email: string;
  username?: string;
  image_url?: string | null;
  portal?: number;
  portal_name?: string;
  role?: number;
  role_name?: string;
  contact?: number;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active:  boolean;
  is_staff: boolean;
  status?: string;
  allowed_locations?: UserLocation[];

  // UserWriteSerializer
  first_name?: string;
  last_name?: string;
  phone?: string;
  password?: string | null;
}

export interface UserWithPortals {
  email: string;
  full_name?: string;
  primary: UserProfile;
  profiles: UserProfile[];
}
