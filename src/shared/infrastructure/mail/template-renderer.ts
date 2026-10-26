import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LAYOUT_TEMPLATE, TEMPLATE_EXTENSION } from "@shared/infrastructure/mail/mail.constants";
import type { EmailContent } from "@shared/infrastructure/mail/mail.types";
import Handlebars, { type TemplateDelegate } from "handlebars";

const SHARED_TEMPLATES_DIR = join(__dirname, "templates");

function readTemplate(dir: string, name: string): string {
  return readFileSync(join(dir, `${name}${TEMPLATE_EXTENSION}`), "utf8");
}

export class TemplateRenderer {
  private readonly layout: TemplateDelegate;
  private readonly htmlTemplates = new Map<string, TemplateDelegate>();
  private readonly textTemplates = new Map<string, TemplateDelegate>();
  private readonly templatesDir: string;

  constructor(templatesDir: string) {
    this.templatesDir = templatesDir;
    this.layout = Handlebars.compile(readTemplate(SHARED_TEMPLATES_DIR, LAYOUT_TEMPLATE));
  }

  render(templateName: string, data: unknown): EmailContent {
    const html = this.layout({ content: this.getTemplate(templateName, "html")(data) });
    const text = this.getTemplate(templateName, "text")(data);
    return { html, text };
  }

  private getTemplate(templateName: string, kind: "html" | "text"): TemplateDelegate {
    const templates = kind === "html" ? this.htmlTemplates : this.textTemplates;
    const fileSuffix = kind === "html" ? "" : ".text";
    const cacheKey = `${templateName}${fileSuffix}`;
    const existing = templates.get(cacheKey);

    if (existing !== undefined) {
      return existing;
    }

    const template = Handlebars.compile(readTemplate(this.templatesDir, cacheKey));
    templates.set(cacheKey, template);
    return template;
  }
}
