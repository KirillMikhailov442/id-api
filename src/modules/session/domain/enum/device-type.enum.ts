export enum DeviceTypeName {
  Camera = "camera",
  CarBrowser = "car browser",
  Console = "console",
  Desktop = "desktop",
  FeaturePhone = "feature phone",
  Peripheral = "peripheral",
  Phablet = "phablet",
  PortableMediaPlayer = "portable media player",
  SmartDisplay = "smart display",
  SmartSpeaker = "smart speaker",
  Smartphone = "smartphone",
  Tablet = "tablet",
  Tv = "tv",
  Wearable = "wearable",
}

export const DEVICE_TYPE_NAMES: ReadonlySet<string> = new Set(Object.values(DeviceTypeName));
