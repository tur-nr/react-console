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
        if (arguments.length === 1 && isElement(root)) {
          return render(root, context, name);
        }

        // fallback
        return context[name].apply(context, arguments);
      };
    }
  }
}

// export the context and overrides
Object.assign(exports, context, overrides, { render });

// INTERNALS BELOW
// ////////////////////////////////////////////////////////////////////////////

/**
 * The reconciler for the console.
 *
 * @type {ReactReconciler.Reconciler}
 */
const reconciler = ReactReconciler({
  supportsPersistence: true,

  createInstance(type, props) {
    return {
      type,
      props,
      style: Object.assign(styleForType(type, props), props.style),
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

  replaceContainerChildren(container, newChildren) {
    const { context, method, committed } = container;
    if (committed) {
      return;
    }

    const subs = [];
    const string = recursivelyConcatenate(newChildren, "", {}, subs);

    context[method].apply(context, [string].concat(subs));
  },

  resetAfterCommit(containerInfo) {
    containerInfo.committed = true;
  },

  // unknown required methods
  finalizeContainerChildren() {},
  finalizeInitialChildren() {},
  getChildHostContext() {},
  getPublicInstance() {},
  getRootHostContext() {},
  prepareForCommit() {},
  shouldSetTextContent() {},
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
  reconciler.updateContainer(root, container, null, null);
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
      const nextStyle = Object.assign({}, style, child.style);
      let children = child.children;

      switch (child.type) {
        // break line = newline
        case "br":
          children = ["\n"];
          break;

        case "img":
          children = [" "];
          break;
      }

      string = recursivelyConcatenate(children, string, nextStyle, subs);

      // append the href for anchor elements
      if (child.type === "a" && child.props.href) {
        string += " " + child.props.href;
      }
    }
  }

  return string;
}

/**
 * Return some default styles for a given element type.
 *
 * @param {string} type
 * @param {object} props
 * @returns {object}
 */
function styleForType(type, props) {
  switch (type) {
    case "a":
      return {
        color: "blue",
      };

    case "abbr":
      return {
        textDecoration: "underline dotted",
        fontStyle: "italic",
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
        fontStyle: "italic",
      };

    case "img":
      return {
        fontSize: 0,
        paddingLeft:
          typeof props.width === "string" ? props.width : props.width + "px",
        paddingTop:
          typeof props.height === "string" ? props.height : props.height + "px",
        backgroundImage: "url(" + props.src + ")",
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
const CSS_PROP_NAME_REGEXP = /([A-Z])/g;

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
      const cssProp = prop.replace(CSS_PROP_NAME_REGEXP, "-$1").toLowerCase();
      cssString += cssProp + ":" + style[prop] + ";";
    }
  }

  return cssString;
}
