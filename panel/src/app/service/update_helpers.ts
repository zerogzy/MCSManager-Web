export type UpdateTargetType = "web" | "daemon";

const UPDATE_ASSET_NAMES: Record<UpdateTargetType, Partial<Record<NodeJS.Platform, string>>> = {
  web: {
    linux: "mcsmanager_linux_web_only_release.tar.gz",
    win32: "mcsmanager_windows_web_only_release.zip"
  },
  daemon: {
    linux: "mcsmanager_linux_daemon_only_release.tar.gz",
    win32: "mcsmanager_windows_daemon_only_release.zip"
  }
};

const UPDATE_RELEASE_APIS: Record<UpdateTargetType, string> = {
  web: "https://api.github.com/repos/zerogzy/MCSManager-Web/releases/latest",
  daemon: "https://api.github.com/repos/zerogzy/MCSManager-Daemon/releases/latest"
};

const UPDATE_RESTART_COMMANDS: Partial<Record<NodeJS.Platform, string>> = {
  linux: "systemctl restart mcsm-web mcsm-daemon",
  win32:
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "Restart-Service mcsm-web,mcsm-daemon"'
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
  targetType: UpdateTargetType = "web",
  platform: NodeJS.Platform = process.platform
) {
  const assetName = UPDATE_ASSET_NAMES[targetType]?.[platform];
  if (!assetName) throw new Error("自动更新仅支持 Linux 和 Windows 环境");
  return assetName;
}

export function getReleaseApiUrl(targetType: UpdateTargetType = "web") {
  return UPDATE_RELEASE_APIS[targetType];
}

export function getUpdateRestartCommand(platform: NodeJS.Platform = process.platform) {
  const command = UPDATE_RESTART_COMMANDS[platform];
  if (!command) throw new Error("自动更新仅支持 Linux 和 Windows 环境");
  return command;
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
