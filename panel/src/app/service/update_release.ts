import axios from "axios";
import { systemConfig } from "../setting";
import { getReleaseApiUrl, getUpdateAssetName, UpdateTargetType } from "./update_helpers";
import type { UpdateCheckResult } from "./update_types";

type ReleaseAsset = {
  name: string;
  size?: number;
  browser_download_url?: string;
};

type ReleaseInfo = {
  tag_name?: string;
  name?: string;
  html_url?: string;
  published_at?: string;
  body?: string;
  assets?: ReleaseAsset[];
};

export async function fetchUpdateRelease(
  targetType: UpdateTargetType,
  currentVersion: string,
  platform: NodeJS.Platform = process.platform
): Promise<UpdateCheckResult> {
  const releaseApiUrl = resolveProxyUrl(getReleaseApiUrl(targetType));
  validateUrl(releaseApiUrl, "Release API 地址");
  const { data } = await axios.get<ReleaseInfo>(releaseApiUrl, {
    timeout: 30000,
    headers: { "User-Agent": "MCSManager-Update" }
  });
  const latestVersion = normalizeVersion(data.tag_name || data.name || "");
  if (!latestVersion) throw new Error("Release 信息中缺少版本号");
  const assetName = getUpdateAssetName(targetType, platform);
  const asset = data.assets?.find((item) => item.name === assetName);
  if (!asset?.browser_download_url) throw new Error(`未找到适用于当前系统的更新包：${assetName}`);
  validateUrl(asset.browser_download_url, "更新包下载地址");
  const normalizedCurrent = normalizeVersion(currentVersion);
  return {
    targetType,
    currentVersion: normalizedCurrent,
    latestVersion,
    hasUpdate: normalizedCurrent !== latestVersion,
    releaseName: data.name || data.tag_name || latestVersion,
    releaseUrl: data.html_url || releaseApiUrl,
    publishedAt: data.published_at || "",
    body: data.body || "",
    assetName: asset.name,
    assetSize: Number(asset.size || 0),
    downloadUrl: resolveProxyUrl(asset.browser_download_url)
  };
}

function resolveProxyUrl(downloadUrl: string) {
  const proxyUrl = systemConfig?.updateDownloadProxyUrl?.trim();
  if (!proxyUrl) return downloadUrl;
  const url = new URL(downloadUrl);
  const urlNoProtocol = `${url.protocol.replace(":", "")}/${url.host}${url.pathname}${url.search}`;
  if (proxyUrl.includes("{urlEncoded}")) return proxyUrl.split("{urlEncoded}").join(encodeURIComponent(downloadUrl));
  if (proxyUrl.includes("{urlNoProtocol}")) return proxyUrl.split("{urlNoProtocol}").join(urlNoProtocol);
  if (proxyUrl.includes("{url}")) return proxyUrl.split("{url}").join(downloadUrl);
  return `${proxyUrl.endsWith("/") ? proxyUrl : `${proxyUrl}/`}${downloadUrl}`;
}

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, "");
}

function validateUrl(url: string, name: string) {
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error(`${name} 必须使用 http(s) 协议`);
  }
}
