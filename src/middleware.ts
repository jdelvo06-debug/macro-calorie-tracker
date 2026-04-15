import { defineMiddleware } from "astro/middleware";

import { buildUnauthorizedResponse, isAuthorizedBasicAuthRequest } from "./lib/basic-auth";

const username = import.meta.env.APP_BASIC_AUTH_USERNAME?.trim();
const password = import.meta.env.APP_BASIC_AUTH_PASSWORD?.trim();
const allowPublicDemo = import.meta.env.ALLOW_PUBLIC_DEMO === "true";

export const onRequest = defineMiddleware(async ({ request }, next) => {
  if (!username || !password) {
    if (import.meta.env.PROD && !allowPublicDemo) {
      return new Response("Authentication is not configured for this deployment.", {
        status: 503,
      });
    }

    return next();
  }

  if (!isAuthorizedBasicAuthRequest(request, { username, password })) {
    return buildUnauthorizedResponse();
  }

  return next();
});
