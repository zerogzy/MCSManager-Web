import assert from "assert";
import fs from "fs";
import path from "path";

const serviceSource = fs.readFileSync(path.join(__dirname, "docker_process_service.ts"), "utf-8");
const instanceSource = fs.readFileSync(path.join(__dirname, "system_instance.ts"), "utf-8");

assert(serviceSource.includes("detach()"), "DockerProcessAdapter should expose detach()");
assert(serviceSource.includes('"\\x10\\x11"'), "detach() should send Docker default detach keys");
assert(instanceSource.includes("instance.process?.detach?.()"), "softExit should detach Docker instances");
