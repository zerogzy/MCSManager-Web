import * as protocol from "../service/protocol";
import { routerApp } from "../service/router";
import { daemonUpdateService } from "../service/update_service";

routerApp.on("update/start", async (ctx, data) => {
  try {
    protocol.response(ctx, await daemonUpdateService.startUpdate(data));
  } catch (error) {
    protocol.responseError(ctx, error as Error);
  }
});

routerApp.on("update/status", async (ctx) => {
  protocol.response(ctx, daemonUpdateService.getStatus());
});
