export type UpdateTargetType = "daemon";

const UPDATE_ASSET_NAMES: Partial<Record<NodeJS.Platform, string>> = {
  linux: "mcsmanager_linux_daemon_only_release.tar.gz",
  win32: "mcsmanager_windows_daemon_only_release.zip"
};

const INSTANCE_STATUS_STOP = 0;

export type UpdateInstanceSnapshot = {
  instanceUuid: string;
  status: number;
  config?: {
    nickname?: string;
    processType?: string;
  };
};

export function getUpdateAssetName(
  _targetType: UpdateTargetType = "daemon",
  platform: NodeJS.Platform = process.platform
) {
  const assetName = UPDATE_ASSET_NAMES[platform];
  if (!assetName) throw new Error("自动更新仅支持 Linux 和 Windows 环境");
  return assetName;
}

export function findBlockingUpdateInstances(instances: UpdateInstanceSnapshot[]) {
  return instances
    .filter((instance) => {
      return instance.status !== INSTANCE_STATUS_STOP && instance.config?.processType !== "docker";
    })
    .map((instance) => ({
      instanceUuid: instance.instanceUuid,
      nickname: instance.config?.nickname || instance.instanceUuid,
      processType: instance.config?.processType || "general",
      status: instance.status
    }));
}
