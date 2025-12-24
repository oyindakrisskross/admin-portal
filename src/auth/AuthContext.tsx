import React, { createContext, useContext, useEffect, useState } from "react";
import api, { setAccessToken, setRefreshToken } from "../api/client"; 

type PermissionBitset = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
};

type Me = {
  id: number;
  email: string;
  username: string;
  portal: number | null;
  role: { id: number; name: string } | null;
  permissions: Record<string, PermissionBitset>;
  allowed_location_ids: number[];
};

type AuthContextValue = {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string, portal_id: number) => Promise<void>;
  logout: () => void;
  can: (perm: string, action?: keyof PermissionBitset) => boolean;
};

const AuthContext = createContext<AuthContextValue>({} as any);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeMe = (payload: any): Me => {
    const user = payload.user;
    const permissions = payload.permissions || {};
    const allowed_location_ids = payload.allowed_location_ids ?? [];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      portal: user.portal,
      role: user.role
        ? { id: user.role, name: user.role_name }
        : null,
      permissions,
      allowed_location_ids,
    };
  };


  const fetchMe = async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setMe(normalizeMe(data));
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email: string, password: string, portal_id: number) => {
    const { data } = await api.post("/api/auth/login", { email, password, portal_id,});
    setAccessToken((data as any).access);
    setRefreshToken((data as any).refresh);
    setMe(normalizeMe(data));
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setMe(null);
  };

  const can = (perm: string, action: keyof PermissionBitset = "view") => {
    if (!me) return false;
    const p = me.permissions?.[perm];
    return !!p && !!p[action];
  };

  return (
    <AuthContext.Provider value={{ me, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
};
