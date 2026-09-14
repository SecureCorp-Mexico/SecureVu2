import { ReactNode } from "react";
import {
  SettingsGroupCard,
  SplitCardRow,
} from "@/components/card/SettingsGroupCard";
import type { SecureVuConfig } from "@/types/securevuConfig";
import { useTranslation } from "react-i18next";

type SecureVuPlusCurrentModelSummaryProps = {
  plusModel: SecureVuConfig["model"]["plus"];
  action?: ReactNode;
};

export default function SecureVuPlusCurrentModelSummary({
  plusModel,
  action,
}: SecureVuPlusCurrentModelSummaryProps) {
  const { t } = useTranslation("views/settings");

  const title = action ? (
    <div className="flex w-full items-center justify-between gap-3">
      <span>{t("securevuPlus.cardTitles.currentModel")}</span>
      {action}
    </div>
  ) : (
    t("securevuPlus.cardTitles.currentModel")
  );

  return (
    <SettingsGroupCard title={title}>
      {!plusModel && (
        <p className="text-muted-foreground">
          {t("securevuPlus.modelInfo.noModelLoaded")}
        </p>
      )}
      {plusModel && (
        <div className="space-y-6">
          <SplitCardRow
            label={t("securevuPlus.modelInfo.baseModel")}
            content={
              <p>
                {plusModel.baseModel} (
                {plusModel.isBaseModel
                  ? t("securevuPlus.modelInfo.plusModelType.baseModel")
                  : t("securevuPlus.modelInfo.plusModelType.userModel")}
                )
              </p>
            }
          />
          <SplitCardRow
            label={t("securevuPlus.modelInfo.trainDate")}
            content={<p>{new Date(plusModel.trainDate).toLocaleString()}</p>}
          />
          <SplitCardRow
            label={t("securevuPlus.modelInfo.modelType")}
            content={
              <p>
                {plusModel.name} ({plusModel.width + "x" + plusModel.height})
              </p>
            }
          />
          <SplitCardRow
            label={t("securevuPlus.modelInfo.supportedDetectors")}
            content={<p>{plusModel.supportedDetectors.join(", ")}</p>}
          />
        </div>
      )}
    </SettingsGroupCard>
  );
}
