const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const target = join(__dirname, "../src/modules/session/domain/enum");
const sources = [
  ["browser", "BROWSER_NAMES", "BrowserName", "parser/client/browser-short"],
  ["operating-system", "OPERATING_SYSTEM_NAMES", "OperatingSystemName", "parser/os/os_systems"],
  ["device-type", "DEVICE_TYPE_NAMES", "DeviceTypeName", "parser/const/device-type"],
];

mkdirSync(target, { recursive: true });

for (const [file, constant, name, source] of sources) {
  const values = [...new Set(Object.values(require(`node-device-detector/${source}`)))].sort();
  const keys = new Set();
  const members = values.map((value) => {
    let key = value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+(.)?/g, (_, next) => next?.toUpperCase() ?? "");
    key = key.charAt(0).toUpperCase() + key.slice(1);

    if (/^[0-9]/.test(key)) key = `Name${key}`;

    const base = key;
    let suffix = 2;

    while (keys.has(key)) key = `${base}${suffix++}`;

    keys.add(key);
    return `  ${key} = ${JSON.stringify(value)},`;
  });
  writeFileSync(
    join(target, `${file}.enum.ts`),
    `export enum ${name} {\n${members.join("\n")}\n}\n\nexport const ${constant}: ReadonlySet<string> = new Set(Object.values(${name}));\n`
  );
  console.log(`${name}: ${values.length} names`);
}
