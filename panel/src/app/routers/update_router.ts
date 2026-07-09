import Router from "@koa/router";
import { ROLE } from "../entity/user";
import permission from "../middleware/permission";
import { operationLogger } from "../service/operation_logger";
import { panelUpdateService } from "../service/update_service";

const router = new Router({ prefix: "/update" });

router.get("/targets", permission({ level: ROLE.ADMIN }), async (ctx) => {
  ctx.body = await panelUpdateService.getTargets();
});

router.post("/check", permission({ level: ROLE.ADMIN }), async (ctx) => {
  const result = await panelUpdateService.checkUpdate(ctx.request.body || {});
  operationLogger.log("system_config_change", {
    operator_ip: ctx.ip,
    operator_name: ctx.session?.["userName"]
  });
  ctx.body = result;
});

router.post("/start", permission({ level: ROLE.ADMIN }), async (ctx) => {
  const result = await panelUpdateService.startUpdate(ctx.request.body || {});
  operationLogger.log("system_config_change", {
    operator_ip: ctx.ip,
    operator_name: ctx.session?.["userName"]
  });
  ctx.body = result;
});

router.get("/status", permission({ level: ROLE.ADMIN }), async (ctx) => {
  ctx.body = await panelUpdateService.getStatus({
    targetType: String(ctx.query.targetType || "") as any,
    daemonId: String(ctx.query.daemonId || "")
  });
});

export default router;
