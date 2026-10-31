export default {
  meta: {
    type: "layout",
    fixable: "whitespace",
    schema: [],
    messages: { newline: "Place each field decorator on its own line directly above the field." },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    const checkField = (node) => {
      for (const decorator of node.decorators ?? []) {
        const nextToken = sourceCode.getTokenAfter(decorator);

        if (nextToken === null || nextToken.loc.start.line === decorator.loc.end.line + 1) {
          continue;
        }

        const range = [decorator.range[1], nextToken.range[0]];
        const gap = sourceCode.text.slice(...range);

        context.report({
          node: decorator,
          messageId: "newline",
          fix: /^\s*$/u.test(gap)
            ? (fixer) => fixer.replaceTextRange(range, `\n${" ".repeat(node.loc.start.column)}`)
            : null,
        });
      }
    };

    return {
      PropertyDefinition: checkField,
      TSAbstractPropertyDefinition: checkField,
      AccessorProperty: checkField,
    };
  },
};
