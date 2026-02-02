import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import migrator from "models/migrator.js";
import authorization from "models/authorization.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);

router.get(controller.canRequest("read:migration"), getHandler);
router.post(controller.canRequest("create:migration"), postHandler);

export default router.handler(controller.errorHandler);

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const pendingMigrations = await migrator.listPendingMigration();

  const filteredOutput = authorization.filterOutput(
    userTryingToGet,
    "read:migration",
    pendingMigrations,
  );
  return response.status(200).json(filteredOutput);
}

async function postHandler(request, response) {
  const userTryingToPost = request.context.user;
  const migratedMigrations = await migrator.runPendingMigrations();

  const filteredOutput = authorization.filterOutput(
    userTryingToPost,
    "create:migration",
    migratedMigrations,
  );
  if (migratedMigrations.length > 0) {
    return response.status(201).json(filteredOutput);
  } else {
    return response.status(200).json(filteredOutput);
  }
}
