import type { IncomingHttpHeaders } from "node:http";
import DeviceDetector from "node-device-detector";
import ClientHints from "node-device-detector/client-hints";

import { DeviceInfoParser } from "@modules/session/infrastructure/device/device-info-parser";

describe("DeviceInfoParser", () => {
  const desktop =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const iphone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const parser = new DeviceInfoParser();

  afterEach(() => jest.restoreAllMocks());

  it.each([
    { ua: desktop, expected: { browser: "Chrome", os: "Windows", deviceType: "desktop" } },
    { ua: iphone, expected: { browser: "Mobile Safari", os: "iOS", deviceType: "smartphone" } },
  ])("recognizes a real $expected.browser user agent", ({ ua, expected }) => {
    expect(parser.parse({ "user-agent": ua })).toEqual(expected);
  });

  it.each([{}, { "user-agent": "" }, { "user-agent": "unrecognized client" }])(
    "handles absent or unknown user agents %p",
    (headers) => {
      expect(parser.parse(headers)).toEqual({ browser: null, os: null, deviceType: null });
    }
  );

  it("uses explicit browser hints instead of the generic Chromium user agent", () => {
    const headers = {
      "user-agent": desktop,
      "sec-ch-ua": '"Chromium";v="120", "Microsoft Edge";v="120", "Not_A Brand";v="99"',
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-mobile": "?0",
    };
    const original = { ...headers };
    expect(parser.parse(headers)).toEqual({ browser: "Microsoft Edge", os: "Windows", deviceType: "desktop" });
    expect(headers).toEqual(original);
  });

  it("prioritizes a specific browser over Google Chrome and Chromium brands", () => {
    expect(
      parser.parse({
        "user-agent": desktop,
        "sec-ch-ua": '"Google Chrome";v="120", "Microsoft Edge";v="120", "Chromium";v="120"',
      }).browser
    ).toBe("Microsoft Edge");
  });

  it("keeps the detected browser for a generic Chromium hint", () => {
    expect(parser.parse({ "user-agent": desktop, "sec-ch-ua": '"Chromium";v="120"' }).browser).toBe("Chrome");
  });

  it("treats mobile client hints as a smartphone even with a desktop user agent", () => {
    expect(parser.parse({ "user-agent": desktop, "sec-ch-ua-mobile": "?1" }).deviceType).toBe("smartphone");
  });

  it("keeps an already detected mobile device type", () => {
    expect(parser.parse({ "user-agent": iphone, "sec-ch-ua-mobile": "?1" }).deviceType).toBe("smartphone");
  });

  it("caps user agent length and filters oversized, non-string and unrelated hints", () => {
    const detect = jest.spyOn(DeviceDetector.prototype, "detect");
    const hints = jest.spyOn(ClientHints.prototype, "parse");
    const headers: IncomingHttpHeaders = {
      "user-agent": desktop + " ".repeat(3000),
      "sec-ch-ua": '"Google Chrome";v="120"',
      "sec-ch-ua-platform": "x".repeat(2049),
      "sec-ch-ua-model": ["unexpected-array"],
      "x-other": "ignored",
    };
    parser.parse(headers);
    expect(detect.mock.calls[0][0]).toHaveLength(2048);
    expect(hints).toHaveBeenCalledWith({ "sec-ch-ua": '"Google Chrome";v="120"' }, {});
  });

  it("falls back to user agent detection when client hint parsing throws", () => {
    jest.spyOn(ClientHints.prototype, "parse").mockImplementation(() => {
      throw new Error("Invalid hints");
    });
    expect(parser.parse({ "user-agent": desktop })).toEqual({
      browser: "Chrome",
      os: "Windows",
      deviceType: "desktop",
    });
  });

  it("retries without hints when combined detection fails", () => {
    const detect = jest.spyOn(DeviceDetector.prototype, "detect").mockImplementationOnce(() => {
      throw new Error("Hint detection failed");
    });
    expect(parser.parse({ "user-agent": desktop })).toEqual({
      browser: "Chrome",
      os: "Windows",
      deviceType: "desktop",
    });
    expect(detect).toHaveBeenCalledTimes(2);
    expect(detect.mock.calls[1]).toEqual([desktop]);
  });

  it("returns unknown device information when both detection paths fail", () => {
    jest.spyOn(DeviceDetector.prototype, "detect").mockImplementation(() => {
      throw new Error("Detector failed");
    });
    expect(parser.parse({ "user-agent": desktop })).toEqual({ browser: null, os: null, deviceType: null });
  });

  it("rejects unsupported detector values and non-browser clients", () => {
    const detected = new DeviceDetector().detect(desktop);
    detected.client = { ...detected.client, type: "library", name: "unsupported" };
    detected.os = { ...detected.os, name: "unsupported" };
    detected.device = { ...detected.device, type: "unsupported" };
    jest.spyOn(DeviceDetector.prototype, "detect").mockReturnValue(detected);
    jest
      .spyOn(DeviceDetector.prototype, "parseClient")
      .mockReturnValue({ ...detected.client, type: "browser", name: "unsupported" });
    expect(parser.parse({ "user-agent": desktop })).toEqual({ browser: null, os: null, deviceType: null });
  });
});
