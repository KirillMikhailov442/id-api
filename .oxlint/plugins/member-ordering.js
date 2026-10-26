const GROUP_ORDER = [
  "staticField",
  "instanceField",
  "constructor",
  "accessor",
  "publicMethod",
  "protectedMethod",
  "privateMethod",
];

const GROUP_LABELS = {
  staticField: "static field",
  instanceField: "instance field",
  constructor: "constructor",
  accessor: "getter/setter",
  publicMethod: "public method",
  protectedMethod: "protected method",
  privateMethod: "private method",
};

function methodGroup(member) {
  if (member.key && member.key.type === "PrivateIdentifier") {
    return "privateMethod";
  }

  switch (member.accessibility) {
    case "private":
      return "privateMethod";
    case "protected":
      return "protectedMethod";
    default:
      return "publicMethod";
  }
}

function memberGroup(member) {
  switch (member.type) {
    case "StaticBlock":
      return "staticField";
    case "PropertyDefinition":
      return member.static ? "staticField" : "instanceField";
    case "MethodDefinition":
      if (member.kind === "constructor") {
        return "constructor";
      }
      if (member.kind === "get" || member.kind === "set") {
        return "accessor";
      }
      return methodGroup(member);
    default:
      return null;
  }
}

function memberName(member) {
  if (member.key === undefined || member.key === null) {
    return "class member";
  }
  if (member.key.type === "PrivateIdentifier") {
    return `#${member.key.name}`;
  }
  return member.key.name ?? member.key.value ?? "class member";
}

const memberOrdering = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce class member order: static fields, instance fields, constructor, getters/setters, public methods, protected methods, private methods",
    },
    schema: [],
  },

  create(context) {
    return {
      ClassBody(node) {
        let maxRank = -1;

        for (const member of node.body) {
          const group = memberGroup(member);
          if (group === null) {
            continue;
          }

          const rank = GROUP_ORDER.indexOf(group);
          if (rank < maxRank) {
            const topGroup = GROUP_ORDER[maxRank];
            context.report({
              node: member,
              message: `"${memberName(member)}" should be declared before ${GROUP_LABELS[topGroup]} members.`,
            });
          } else if (rank > maxRank) {
            maxRank = rank;
          }
        }
      },
    };
  },
};

const plugin = {
  meta: {
    name: "custom",
  },
  rules: {
    "member-ordering": memberOrdering,
  },
};

export default plugin;