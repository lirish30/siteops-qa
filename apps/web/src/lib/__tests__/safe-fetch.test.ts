import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lookupMock = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

import { assertPublicUrl, safeFetch, SsrfError } from "../safe-fetch";

const publicDns = (address = "93.184.216.34") =>
  lookupMock.mockResolvedValue([{ address, family: 4 }]);

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("assertPublicUrl", () => {
  it("rejects localhost and private IP literals without DNS", async () => {
    await expect(assertPublicUrl("http://localhost")).rejects.toThrow(SsrfError);
    await expect(assertPublicUrl("http://127.0.0.1")).rejects.toThrow(SsrfError);
    await expect(assertPublicUrl("http://192.168.1.1/admin")).rejects.toThrow(
      SsrfError
    );
    await expect(assertPublicUrl("http://[::1]")).rejects.toThrow(SsrfError);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("rejects hosts that resolve to private ranges", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    await expect(assertPublicUrl("https://evil.example.com")).rejects.toThrow(
      SsrfError
    );
  });

  it("rejects hosts where any resolved address is private", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "169.254.169.254", family: 4 },
    ]);
    await expect(assertPublicUrl("https://mixed.example.com")).rejects.toThrow(
      SsrfError
    );
  });

  it("rejects non-http schemes and odd ports", async () => {
    await expect(assertPublicUrl("ftp://example.com")).rejects.toThrow(SsrfError);
    await expect(assertPublicUrl("https://example.com:8443")).rejects.toThrow(
      SsrfError
    );
  });

  it("rejects unresolvable hosts", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(assertPublicUrl("https://nope.example.com")).rejects.toThrow(
      SsrfError
    );
  });

  it("allows public hosts", async () => {
    publicDns();
    await expect(assertPublicUrl("https://example.com")).resolves.toBeInstanceOf(
      URL
    );
  });
});

describe("safeFetch", () => {
  it("fetches a public URL with the bot user-agent and manual redirects", async () => {
    publicDns();
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));

    const res = await safeFetch("https://example.com");
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://example.com/");
    expect(init.redirect).toBe("manual");
    expect(init.headers["user-agent"]).toContain("SiteOpsQA-Bot");
  });

  it("follows redirects, re-validating each hop", async () => {
    publicDns();
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: "https://www.example.com/" },
        })
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await safeFetch("https://example.com");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Both the original host and the redirect target were resolved.
    expect(lookupMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a redirect that targets a private address", async () => {
    publicDns();
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      })
    );
    await expect(safeFetch("https://example.com")).rejects.toThrow(SsrfError);
  });

  it("rejects redirect chains longer than 3", async () => {
    publicDns();
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/next" },
      })
    );
    await expect(safeFetch("https://example.com")).rejects.toThrow(
      "Too many redirects"
    );
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 redirects
  });
});
