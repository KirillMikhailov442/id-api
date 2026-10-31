import type { IncomingHttpHeaders } from "node:http";
import { Injectable } from "@nestjs/common";
import DeviceDetector, { type DetectResult } from "node-device-detector";
import ClientHints from "node-device-detector/client-hints";

import type { DeviceInfo } from "@modules/session/application/device-info.type";
import { DeviceTypeName } from "@modules/session/domain/enum/device-type.enum";
import { Browser } from "@modules/session/domain/value-object/browser.value-object";
import { DeviceType } from "@modules/session/domain/value-object/device-type.value-object";
import { OperatingSystem } from "@modules/session/domain/value-object/operating-system.value-object";

const MAX_USER_AGENT_LENGTH = 2048;

interface ClientHintBrand {
  brand: string;
  version: string;
}

@Injectable()
export class DeviceInfoParser {
  private readonly detector = new DeviceDetector({ maxUserAgentSize: MAX_USER_AGENT_LENGTH });
  private readonly clientHints = new ClientHints();

  parse(headers: IncomingHttpHeaders): DeviceInfo {
    const userAgent = (headers["user-agent"] ?? "").slice(0, MAX_USER_AGENT_LENGTH);
    const hintHeaders: Record<string, string> = {};

    for (const [name, value] of Object.entries(headers)) {
      if (name.startsWith("sec-ch-ua") && typeof value === "string" && value.length <= MAX_USER_AGENT_LENGTH) {
        hintHeaders[name] = value;
      }
    }

    try {
      const hints = this.clientHints.parse(hintHeaders, {});
      const brands = hints.client.brands as unknown as ClientHintBrand[];

      brands.sort((left, right) => this.brandPriority(left.brand) - this.brandPriority(right.brand));

      const merged = this.toDeviceInfo(this.detector.detect(userAgent, hints));
      const hintedBrowser = this.detector.parseClient("", hints);
      const browser =
        hintedBrowser.type === "browser" && hintedBrowser.name !== "Chromium"
          ? Browser.isValid(hintedBrowser.name)
            ? hintedBrowser.name
            : merged.browser
          : merged.browser;

      const mobileTypes: ReadonlySet<string> = new Set([
        DeviceTypeName.Smartphone,
        DeviceTypeName.Phablet,
        DeviceTypeName.FeaturePhone,
      ]);
      const deviceType =
        hintHeaders["sec-ch-ua-mobile"] === "?1" && !mobileTypes.has(merged.deviceType ?? "")
          ? DeviceTypeName.Smartphone
          : merged.deviceType;

      return { browser, os: merged.os, deviceType };
    } catch {
      try {
        return this.toDeviceInfo(this.detector.detect(userAgent));
      } catch {
        return { browser: null, os: null, deviceType: null };
      }
    }
  }

  private toDeviceInfo(result: DetectResult): DeviceInfo {
    const browser = result.client?.type === "browser" ? result.client.name : "";
    const os = result.os?.name ?? "";
    const deviceType = result.device?.type ?? "";

    return {
      browser: Browser.isValid(browser) ? browser : null,
      os: OperatingSystem.isValid(os) ? os : null,
      deviceType: DeviceType.isValid(deviceType) ? deviceType : null,
    };
  }

  private brandPriority(brand: string): number {
    switch (brand) {
      case "Chromium":
      case "Android WebView":
        return 0;
      case "Google Chrome":
        return 1;
      default:
        return 2;
    }
  }
}
