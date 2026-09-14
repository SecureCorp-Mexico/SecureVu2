import useSWR from "swr";
import { useTranslation } from "react-i18next";

import { useCameraSectionDeltas } from "@/hooks/use-config-override";
import type { SecureVuConfig } from "@/types/securevuConfig";
import { OverrideDeltaPopover } from "./OverrideDeltaPopover";

type Props = {
  sectionPath: string;
  cameraName: string;
  className?: string;
};

export function GlobalOverridesBadge({
  sectionPath,
  cameraName,
  className,
}: Props) {
  const { data: config } = useSWR<SecureVuConfig>("config");
  const { t } = useTranslation(["views/settings"]);
  const deltas = useCameraSectionDeltas(config, cameraName, sectionPath);

  return (
    <OverrideDeltaPopover
      sectionPath={sectionPath}
      deltas={deltas}
      badgeLabel={t("button.overriddenGlobal", {
        ns: "views/settings",
        defaultValue: "Overridden (Global)",
      })}
      ariaLabel={t("button.overriddenGlobalTooltip", {
        ns: "views/settings",
      })}
      heading={t("button.overriddenGlobalHeading", {
        ns: "views/settings",
        count: deltas.length,
      })}
      noDeltasMessage={t("button.overriddenGlobalNoDeltas", {
        ns: "views/settings",
      })}
      className={className}
    />
  );
}
