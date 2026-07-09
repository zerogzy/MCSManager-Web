import { execFile } from "child_process";
import * as fs from "fs-extra";
import path from "path";

export type ProgramPart = "web" | "daemon";
const ALL_PARTS: ProgramPart[] = ["web", "daemon"];

export async function extractPackage(packagePath: string, extractDir: string) {
  await fs.remove(extractDir);
  await fs.ensureDir(extractDir);
  if (process.platform === "win32") return extractZip(packagePath, extractDir);
  return extractTarGz(packagePath, extractDir);
}

export async function validatePackage(sourceRoot: string, parts: ProgramPart[] = ALL_PARTS) {
  if (parts.includes("web") && !(await fs.pathExists(path.join(sourceRoot, "web", "app.js")))) {
    throw new Error("更新包缺少 web/app.js");
  }
  if (
    parts.includes("daemon") &&
    !(await fs.pathExists(path.join(sourceRoot, "daemon", "app.js")))
  ) {
    throw new Error("更新包缺少 daemon/app.js");
  }
}

export async function backupCurrent(
  rootDir: string,
  currentVersion: string,
  parts: ProgramPart[] = ALL_PARTS
) {
  const backupPath = path.join(rootDir, ".update", "backups", `${Date.now()}-${currentVersion}`);
  await fs.ensureDir(backupPath);
  for (const part of parts) {
    const source = path.join(rootDir, part);
    if (await fs.pathExists(source)) await copyProgramDir(source, path.join(backupPath, part));
  }
  return backupPath;
}

export async function replaceProgram(
  rootDir: string,
  sourceRoot: string,
  backupPath: string,
  parts: ProgramPart[] = ALL_PARTS
) {
  try {
    for (const part of parts) {
      await fs.remove(path.join(rootDir, part));
      await copyProgramDir(path.join(sourceRoot, part), path.join(rootDir, part));
      await restoreRuntimeData(backupPath, rootDir, part);
    }
  } catch (error) {
    for (const part of parts) {
      await fs.remove(path.join(rootDir, part)).catch(() => {});
      await fs.copy(path.join(backupPath, part), path.join(rootDir, part)).catch(() => {});
    }
    throw error;
  }
}

async function restoreRuntimeData(backupPath: string, rootDir: string, name: ProgramPart) {
  const dataDir = path.join(backupPath, name, "data");
  if (await fs.pathExists(dataDir)) await fs.copy(dataDir, path.join(rootDir, name, "data"));
}

async function copyProgramDir(source: string, target: string) {
  const stat = await fs.lstat(source);
  if (stat.isSymbolicLink()) return;
  if (!stat.isDirectory()) return fs.copyFile(source, target);

  await fs.ensureDir(target);
  const entries = await fs.readdir(source);
  for (const entry of entries) {
    await copyProgramDir(path.join(source, entry), path.join(target, entry));
  }
}

async function extractTarGz(packagePath: string, extractDir: string) {
  const entries = await execFileText("tar", ["-tzf", packagePath]);
  for (const entry of entries.split("\n").filter(Boolean)) {
    if (path.isAbsolute(entry) || entry.includes("..") || !entry.startsWith("mcsmanager/")) {
      throw new Error(`更新包包含非法路径：${entry}`);
    }
  }
  await execFileText("tar", ["-xzf", packagePath, "-C", extractDir]);
}

async function extractZip(packagePath: string, extractDir: string) {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$zip = ${JSON.stringify(packagePath)}`,
    `$dest = ${JSON.stringify(extractDir)}`,
    "Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force"
  ].join("; ");
  await execFileText("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]);
  await validateExtractedPaths(extractDir);
}

async function validateExtractedPaths(extractDir: string) {
  const root = path.resolve(extractDir);
  const entries = await listEntries(root);
  for (const entry of entries) {
    const fullPath = path.resolve(root, String(entry));
    if (!fullPath.startsWith(root + path.sep)) throw new Error(`更新包包含非法路径：${entry}`);
  }
}

async function listEntries(dir: string, base = ""): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await fs.readdir(dir)) {
    const rel = path.join(base, entry);
    result.push(rel);
    const fullPath = path.join(dir, entry);
    if ((await fs.lstat(fullPath)).isDirectory()) result.push(...(await listEntries(fullPath, rel)));
  }
  return result;
}

function execFileText(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    execFile(command, args, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve(stdout);
    });
  });
}
