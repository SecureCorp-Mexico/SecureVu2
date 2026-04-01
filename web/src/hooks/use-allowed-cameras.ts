import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";
import useSWR from "swr";
import { SecureVuConfig } from "@/types/securevuConfig";

export function useAllowedCameras() {
  const { auth } = useContext(AuthContext);
  const { data: config } = useSWR<SecureVuConfig>("config", {
    revalidateOnFocus: false,
  });

  if (
    auth.user?.role === "viewer" ||
    auth.user?.role === "admin" ||
    !auth.isAuthenticated // anonymous port 5000
  ) {
    // return all cameras
    return config?.cameras ? Object.keys(config.cameras) : [];
  }

  return auth.allowedCameras || [];
}
