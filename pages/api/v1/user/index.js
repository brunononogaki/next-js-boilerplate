import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import user from "models/user.js";
import session from "models/session.js";
import authorization from "models/authorization.js";

const router = createRouter();
router.use(controller.injectAnonymousOrUser); // middleware
router.get(controller.canRequest("read:session"), getHandler);

export default router.handler(controller.errorHandler);

async function getHandler(request, response) {
  const sessionToken = request.cookies.session_id;

  const userTryingToGet = request.context.user;
  const sessionObject = await session.findOneValidByToken(sessionToken);
  const renewSessionObject = await session.renew(sessionObject.id);
  controller.setSessionCookie(renewSessionObject.token, response);

  const userFound = await user.findOneById(sessionObject.user_id);

  const filteredOutput = authorization.filterOutput(
    userTryingToGet,
    "read:user:self",
    userFound,
  );

  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );
  return response.status(200).json(filteredOutput);
}
