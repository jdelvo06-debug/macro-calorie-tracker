interface BasicAuthCredentials {
  username: string;
  password: string;
}

function safeEquals(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

function parseBasicAuthHeader(header: string | null): BasicAuthCredentials | null {
  if (!header?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(header.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function isAuthorizedBasicAuthRequest(request: Request, credentials: BasicAuthCredentials): boolean {
  const parsed = parseBasicAuthHeader(request.headers.get("authorization"));
  if (!parsed) {
    return false;
  }

  return safeEquals(parsed.username, credentials.username) && safeEquals(parsed.password, credentials.password);
}

export function buildUnauthorizedResponse(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Macro", charset="UTF-8"',
    },
  });
}
