const { isElement } = require("react-is");
const ReactReconciler = require("react-reconciler");

/**
 * Context
 *
 * @type {Console}
 */
const context =
  typeof console.context === "function" ? console.context() : console;

/**
 * Methods
 *
 * A list of method names available on the context that support substitutions.
 *
 * @type {string[]}
 */
const methods = [
  "debug",
  "error",
  "info",
  "log",
  "warn",
  "group",
  "groupCollapsed",
  "trace",
];

/**
 * Context overrides
 *
 * @type {Partial<Console>}
 */
const overrides = {};

// find any of the methods available that we can override to render instead.
for (const name in context) {
  if (context.hasOwnProperty(name)) {
    if (methods.includes(name)) {
      overrides[name] = function () {
        const root = arguments[0];

        // only try to render when a single argument of type element is given
        if (arguments.length === 1 || isElement(root.type)) {
          return render(root, context, name);
        }

        // fallback
        return context[name].apply(context, arguments);
      };
      overrides[name].name = name;
    }
  }
}

// export the context and overrides
Object.assign(exports, context, overrides);

// INTERNALS BELOW
// ////////////////////////////////////////////////////////////////////////////

const inlineElements = [
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "br",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "i",
  "kbd",
  "mark",
  "q",
  "rb",
  "rp",
  "rt",
  "rtc",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
  "wbr",
];

/**
 * The reconciler for the console.
 *
 * @type {ReactReconciler.Reconciler}
 */
const reconciler = ReactReconciler({
  supportsPersistence: true,

  createInstance(type, props) {
    if (!inlineElements.includes(type)) {
      throw new Error(
        "Invalid element: " + type + " is not an inline element."
      );
    }

    return {
      type,
      style: Object.assign(styleForType(type), props.style),
      children: [],
    };
  },

  createTextInstance(text) {
    return text;
  },

  createContainerChildSet() {
    return [];
  },

  appendChildToContainerChildSet(childSet, child) {
    childSet.push(child);
  },

  appendInitialChild(parentInstance, child) {
    parentInstance.children.push(child);
  },

  finalizeInitialChildren(
    parentInstance,
    type,
    props,
    rootContainerInstance,
    hostContext
  ) {},

  finalizeContainerChildren(container, newChildren) {},

  replaceContainerChildren(container, newChildren) {
    const { context, method, committed } = container;
    if (committed) {
      return;
    }

    const subs = [];
    const string = recursivelyConcatenate(newChildren, "", {}, subs);

    context[method].apply(context, [string].concat(subs));
  },

  getChildHostContext(parentHostContext) {
    return parentHostContext;
  },

  resetAfterCommit(containerInfo) {
    containerInfo.committed = true;
  },

  shouldSetTextContent(type, props) {},

  getPublicInstance(instance) {},

  getRootHostContext() {},

  prepareForCommit(containerInfo) {
    if (containerInfo.committed) {
      throw new Error("Console has already committed this root.");
    }
  },
});

/**
 * Renders a given root element into the console.
 *
 * @param {ReactElement} root
 * @param {Console} [context=console]
 * @param {string} [method="log"]
 * @returns {void}
 */
function render(root, context = console, method = "log") {
  const container = reconciler.createContainer(
    {
      context,
      method,
      committed: false,
    },
    false,
    false
  );

  try {
    reconciler.updateContainer(root, container, null, null);
  } catch (e) {
    context.error(e);
  }
}

/**
 * Concatenates a child set into a loggable string whilst populating the
 * necessary substitutions.
 *
 * @param {Array} children
 * @param {string} string
 * @param {object} style
 * @param {string[]} subs
 * @returns {string}
 */
function recursivelyConcatenate(children, string, style, subs) {
  for (let i = 0, l = children.length; i < l; ++i) {
    const child = children[i];

    if (typeof child === "string") {
      subs.push(toCSSString(style));
      string += "%c" + child;
    } else {
      switch (child.type) {
        // break line = newline
        case "br":
          string += "\n";
          break;

        default:
          string = recursivelyConcatenate(
            child.children,
            string,
            Object.assign({}, style, child.style),
            subs
          );
          break;
      }
    }
  }

  return string;
}

/**
 * Return some default styles for a given element type.
 *
 * @param {string} type
 * @returns {object}
 */
function styleForType(type) {
  switch (type) {
    case "abbr":
      return {
        textDecoration: "underline dotted",
        fontStyle: "italics",
        fontWeight: "lighter",
      };

    case "b":
    case "strong":
      return {
        fontWeight: "bolder",
      };

    case "del":
    case "s":
      return {
        textDecoration: "line-through",
      };

    case "em":
    case "i":
      return {
        fontStyle: "italics",
      };

    case "ins":
    case "u":
      return {
        textDecoration: "underline",
      };

    case "mark": {
      return {
        backgroundColor: "yellow",
        color: "black",
      };
    }

    case "small":
      return {
        fontSize: "smaller",
      };

    case "sub":
      return {
        fontSize: "smaller",
        verticalAlign: "sub",
      };

    case "sup":
      return {
        fontSize: "smaller",
        verticalAlign: "super",
      };

    default:
      return {};
  }
}

/**
 * Regular expression for camelcase CSS prop names.
 *
 * @type {RegExp}
 */
const CSS_PROP_NAME_REGEXP = /([a-z])([A-Z])/;

/**
 * Convert a given style object into CSS string value.
 *
 * @param {object} style
 * @returns {string}
 */
function toCSSString(style) {
  let cssString = "";
  for (const prop in style) {
    if (style.hasOwnProperty(prop)) {
      const cssProp = prop.replace(CSS_PROP_NAME_REGEXP, "$1-$2").toLowerCase();
      cssString += cssProp + ":" + style[prop] + ";";
    }
  }

  return cssString;
}
