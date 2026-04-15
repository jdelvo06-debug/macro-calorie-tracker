import { describe, expect, it } from "vitest";

import { buildUnauthorizedResponse, isAuthorizedBasicAuthRequest } from "./basic-auth";

describe("basic auth", () => {
  it("accepts matching credentials", () => {
    const auth = Buffer.from("demo:secret").toString("base64");
    const request = new Request("http://localhost/", {
      headers: { authorization: `Basic ${auth}` },
    });

    expect(
      isAuthorizedBasicAuthRequest(request, {
        username: "demo",
        password: "secret",
      }),
    ).toBe(true);
  });

  it("rejects missing or incorrect credentials", () => {
    const bad = Buffer.from("demo:nope").toString("base64");
    const request = new Request("http://localhost/", {
      headers: { authorization: `Basic ${bad}` },
    });

    expect(
      isAuthorizedBasicAuthRequest(request, {
        username: "demo",
        password: "secret",
      }),
    ).toBe(false);
  });

  it("builds a proper 401 challenge response", () => {
    const response = buildUnauthorizedResponse();

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Basic");
  });
});
