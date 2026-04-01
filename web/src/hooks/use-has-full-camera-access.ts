import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import useSWR from "swr";
import { SecureVuConfig } from "@/types/securevuConfig";

/**
 * Returns true if the current user has access to all cameras.
 * This is used to determine birdseye access — users who can see
 * all cameras should also be able to see the birdseye view.
 */
export function useHasFullCameraAccess() {
  const allowedCameras = useAllowedCameras();
  const { data: config } = useSWR<SecureVuConfig>("config", {
    revalidateOnFocus: false,
  });

  if (!config?.cameras) return false;

  const enabledCameraNames = Object.entries(config.cameras)
    .filter(([, cam]) => cam.enabled_in_config)
    .map(([name]) => name);

  return (
    enabledCameraNames.length > 0 &&
    enabledCameraNames.every((name) => allowedCameras.includes(name))
  );
}
