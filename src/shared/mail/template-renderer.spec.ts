import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TemplateRenderer } from "@shared/mail/template-renderer";

describe("TemplateRenderer", () => {
  let directory: string;
  let renderer: TemplateRenderer;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "id-api-mail-"));
    writeFileSync(join(directory, "example.hbs"), '<h1>{{name}}</h1><a href="{{url}}">Open</a>');
    writeFileSync(join(directory, "example.text.hbs"), "Hello {{name}}: {{{url}}}");
    renderer = new TemplateRenderer(directory);
  });

  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it("renders HTML inside the real shared layout and returns a separate text body", () => {
    const content = renderer.render("example", { name: "Ivan", url: "https://example.com" });
    expect(content.html).toContain("<h1>Ivan</h1>");
    expect(content.html).toContain("Вы получили это письмо");
    expect(content.html).not.toContain("&lt;h1&gt;");
    expect(content.text).toBe("Hello Ivan: https://example.com");
    expect(content.text).not.toContain("<div");
  });

  it("escapes untrusted HTML and attribute values while preserving raw URLs in text", () => {
    const content = renderer.render("example", {
      name: '<script>alert("x")</script>',
      url: 'https://example.com?a=1&b="2"',
    });
    expect(content.html).toContain("&lt;script&gt;");
    expect(content.html).not.toContain("<script>");
    expect(content.html).toContain("a&#x3D;1&amp;b&#x3D;&quot;2&quot;");
    expect(content.text).toContain('https://example.com?a=1&b="2"');
  });

  it("caches compiled templates but renders fresh data each time", () => {
    renderer.render("example", { name: "First", url: "https://first.example.com" });
    writeFileSync(join(directory, "example.hbs"), "CHANGED HTML");
    writeFileSync(join(directory, "example.text.hbs"), "CHANGED TEXT");

    const content = renderer.render("example", { name: "Second", url: "https://second.example.com" });
    expect(content.html).toContain("<h1>Second</h1>");
    expect(content.html).not.toContain("First");
    expect(content.text).toBe("Hello Second: https://second.example.com");
  });

  it("keeps different template names and HTML/text caches independent", () => {
    writeFileSync(join(directory, "other.hbs"), "<p>Other {{name}}</p>");
    writeFileSync(join(directory, "other.text.hbs"), "Other text {{name}}");
    renderer.render("example", { name: "First" });

    const other = renderer.render("other", { name: "Second" });
    expect(other.html).toContain("<p>Other Second</p>");
    expect(other.text).toBe("Other text Second");
    expect(renderer.render("example", { name: "Third" }).html).toContain("<h1>Third</h1>");
  });

  it("reports missing HTML templates", () => {
    expect(() => renderer.render("missing", {})).toThrow(/ENOENT/);
  });

  it("reports a missing text template and allows retry after it is added", () => {
    writeFileSync(join(directory, "partial.hbs"), "<p>{{name}}</p>");
    expect(() => renderer.render("partial", { name: "Ivan" })).toThrow(/ENOENT/);
    writeFileSync(join(directory, "partial.text.hbs"), "{{name}}");
    expect(renderer.render("partial", { name: "Ivan" }).text).toBe("Ivan");
  });

  it("reports template syntax errors", () => {
    writeFileSync(join(directory, "broken.hbs"), "{{#if name}}unclosed");
    writeFileSync(join(directory, "broken.text.hbs"), "text");
    expect(() => renderer.render("broken", { name: "Ivan" })).toThrow();
  });
});
