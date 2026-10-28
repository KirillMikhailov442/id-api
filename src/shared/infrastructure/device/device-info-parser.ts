import type { IncomingHttpHeaders } from "node:http";
import { Injectable } from "@nestjs/common";
import { DeviceInfo } from "@shared/domain/device-info";
import DeviceDetector, { type DetectResult } from "node-device-detector";
import ClientHints from "node-device-detector/client-hints";

const MAX_USER_AGENT_LENGTH = 2048;
const MAX_FIELD_LENGTH = 128;

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
          ? this.normalize(hintedBrowser.name)
          : merged.browser;
      const deviceType = hintHeaders["sec-ch-ua-mobile"] === "?1" ? "mobile" : merged.deviceType;
      return new DeviceInfo(browser, merged.os, deviceType);
    } catch {
      try {
        return this.toDeviceInfo(this.detector.detect(userAgent));
      } catch {
        return new DeviceInfo(null, null, null);
      }
    }
  }

  private toDeviceInfo(result: DetectResult): DeviceInfo {
    return new DeviceInfo(
      this.normalize(result.client?.type === "browser" ? result.client.name : undefined),
      this.normalize(result.os?.name),
      this.normalizeDeviceType(result.device?.type)
    );
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

  private normalizeDeviceType(value: string | undefined): string | null {
    switch (value) {
      case "smartphone":
      case "phablet":
      case "feature phone":
        return "mobile";
      default:
        return this.normalize(value);
    }
  }

  private normalize(value: string | undefined): string | null {
    const normalized = value?.trim().slice(0, MAX_FIELD_LENGTH);
    return normalized === undefined || normalized.length === 0 ? null : normalized;
  }
}
