var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/agent-essentials/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_lucide_react8 = require("lucide-react");

// plugins/agent-essentials/renderer/AgentsPanel.tsx
var import_react7 = require("react");
var import_alephnet6 = require("alephnet");

// plugins/agent-essentials/renderer/views/AgentListView.tsx
var import_react = require("react");
var import_framer_motion = require("framer-motion");
var import_lucide_react = require("lucide-react");

// plugins/agent-essentials/renderer/ui/button.tsx
var React3 = __toESM(require("react"));

// plugins/agent-essentials/node_modules/@radix-ui/react-slot/dist/index.mjs
var React2 = __toESM(require("react"), 1);

// plugins/agent-essentials/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
var React = __toESM(require("react"), 1);
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}

// plugins/agent-essentials/node_modules/@radix-ui/react-slot/dist/index.mjs
var import_jsx_runtime = require("react/jsx-runtime");
var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
var use = React2[" use ".trim().toString()];
function isPromiseLike(value) {
  return typeof value === "object" && value !== null && "then" in value;
}
function isLazyComponent(element) {
  return element != null && typeof element === "object" && "$$typeof" in element && element.$$typeof === REACT_LAZY_TYPE && "_payload" in element && isPromiseLike(element._payload);
}
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = React2.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    if (isLazyComponent(children) && typeof use === "function") {
      children = use(children._payload);
    }
    const childrenArray = React2.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (React2.Children.count(newElement) > 1) return React2.Children.only(null);
          return React2.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotClone, { ...slotProps, ref: forwardedRef, children: React2.isValidElement(newElement) ? React2.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
var Slot = /* @__PURE__ */ createSlot("Slot");
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = React2.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    if (isLazyComponent(children) && typeof use === "function") {
      children = use(children._payload);
    }
    if (React2.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== React2.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return React2.cloneElement(children, props2);
    }
    return React2.Children.count(children) > 1 ? React2.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER = /* @__PURE__ */ Symbol("radix.slottable");
function isSlottable(child) {
  return React2.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}

// plugins/agent-essentials/node_modules/class-variance-authority/node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}

// plugins/agent-essentials/node_modules/class-variance-authority/dist/index.mjs
var falsyToString = (value) => typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
var cx = clsx;
var cva = (base, config) => (props) => {
  var _config_compoundVariants;
  if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
  const { variants, defaultVariants } = config;
  const getVariantClassNames = Object.keys(variants).map((variant) => {
    const variantProp = props === null || props === void 0 ? void 0 : props[variant];
    const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
    if (variantProp === null) return null;
    const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
    return variants[variant][variantKey];
  });
  const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param) => {
    let [key, value] = param;
    if (value === void 0) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
  const getCompoundVariantClassNames = config === null || config === void 0 ? void 0 : (_config_compoundVariants = config.compoundVariants) === null || _config_compoundVariants === void 0 ? void 0 : _config_compoundVariants.reduce((acc, param) => {
    let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param;
    return Object.entries(compoundVariantOptions).every((param2) => {
      let [key, value] = param2;
      return Array.isArray(value) ? value.includes({
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key]) : {
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key] === value;
    }) ? [
      ...acc,
      cvClass,
      cvClassName
    ] : acc;
  }, []);
  return cx(base, getVariantClassNames, getCompoundVariantClassNames, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
};

// plugins/agent-essentials/node_modules/clsx/dist/clsx.m.js
function r2(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) for (t = 0; t < e.length; t++) e[t] && (f = r2(e[t])) && (n && (n += " "), n += f);
  else for (t in e) e[t] && (n && (n += " "), n += t);
  return n;
}
function clsx2() {
  for (var e, t, f = 0, n = ""; f < arguments.length; ) (e = arguments[f++]) && (t = r2(e)) && (n && (n += " "), n += t);
  return n;
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/tw-join.mjs
function twJoin() {
  var index = 0;
  var argument;
  var resolvedValue;
  var string = "";
  while (index < arguments.length) {
    if (argument = arguments[index++]) {
      if (resolvedValue = toValue(argument)) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
}
function toValue(mix) {
  if (typeof mix === "string") {
    return mix;
  }
  var resolvedValue;
  var string = "";
  for (var k = 0; k < mix.length; k++) {
    if (mix[k]) {
      if (resolvedValue = toValue(mix[k])) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/class-utils.mjs
var CLASS_PART_SEPARATOR = "-";
function createClassUtils(config) {
  var classMap = createClassMap(config);
  var conflictingClassGroups = config.conflictingClassGroups, _config$conflictingCl = config.conflictingClassGroupModifiers, conflictingClassGroupModifiers = _config$conflictingCl === void 0 ? {} : _config$conflictingCl;
  function getClassGroupId(className) {
    var classParts = className.split(CLASS_PART_SEPARATOR);
    if (classParts[0] === "" && classParts.length !== 1) {
      classParts.shift();
    }
    return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className);
  }
  function getConflictingClassGroupIds(classGroupId, hasPostfixModifier) {
    var conflicts = conflictingClassGroups[classGroupId] || [];
    if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
      return [].concat(conflicts, conflictingClassGroupModifiers[classGroupId]);
    }
    return conflicts;
  }
  return {
    getClassGroupId,
    getConflictingClassGroupIds
  };
}
function getGroupRecursive(classParts, classPartObject) {
  if (classParts.length === 0) {
    return classPartObject.classGroupId;
  }
  var currentClassPart = classParts[0];
  var nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
  var classGroupFromNextClassPart = nextClassPartObject ? getGroupRecursive(classParts.slice(1), nextClassPartObject) : void 0;
  if (classGroupFromNextClassPart) {
    return classGroupFromNextClassPart;
  }
  if (classPartObject.validators.length === 0) {
    return void 0;
  }
  var classRest = classParts.join(CLASS_PART_SEPARATOR);
  return classPartObject.validators.find(function(_ref) {
    var validator = _ref.validator;
    return validator(classRest);
  })?.classGroupId;
}
var arbitraryPropertyRegex = /^\[(.+)\]$/;
function getGroupIdForArbitraryProperty(className) {
  if (arbitraryPropertyRegex.test(className)) {
    var arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1];
    var property = arbitraryPropertyClassName?.substring(0, arbitraryPropertyClassName.indexOf(":"));
    if (property) {
      return "arbitrary.." + property;
    }
  }
}
function createClassMap(config) {
  var theme = config.theme, prefix = config.prefix;
  var classMap = {
    nextPart: /* @__PURE__ */ new Map(),
    validators: []
  };
  var prefixedClassGroupEntries = getPrefixedClassGroupEntries(Object.entries(config.classGroups), prefix);
  prefixedClassGroupEntries.forEach(function(_ref2) {
    var classGroupId = _ref2[0], classGroup = _ref2[1];
    processClassesRecursively(classGroup, classMap, classGroupId, theme);
  });
  return classMap;
}
function processClassesRecursively(classGroup, classPartObject, classGroupId, theme) {
  classGroup.forEach(function(classDefinition) {
    if (typeof classDefinition === "string") {
      var classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
      classPartObjectToEdit.classGroupId = classGroupId;
      return;
    }
    if (typeof classDefinition === "function") {
      if (isThemeGetter(classDefinition)) {
        processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
        return;
      }
      classPartObject.validators.push({
        validator: classDefinition,
        classGroupId
      });
      return;
    }
    Object.entries(classDefinition).forEach(function(_ref3) {
      var key = _ref3[0], classGroup2 = _ref3[1];
      processClassesRecursively(classGroup2, getPart(classPartObject, key), classGroupId, theme);
    });
  });
}
function getPart(classPartObject, path) {
  var currentClassPartObject = classPartObject;
  path.split(CLASS_PART_SEPARATOR).forEach(function(pathPart) {
    if (!currentClassPartObject.nextPart.has(pathPart)) {
      currentClassPartObject.nextPart.set(pathPart, {
        nextPart: /* @__PURE__ */ new Map(),
        validators: []
      });
    }
    currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
  });
  return currentClassPartObject;
}
function isThemeGetter(func) {
  return func.isThemeGetter;
}
function getPrefixedClassGroupEntries(classGroupEntries, prefix) {
  if (!prefix) {
    return classGroupEntries;
  }
  return classGroupEntries.map(function(_ref4) {
    var classGroupId = _ref4[0], classGroup = _ref4[1];
    var prefixedClassGroup = classGroup.map(function(classDefinition) {
      if (typeof classDefinition === "string") {
        return prefix + classDefinition;
      }
      if (typeof classDefinition === "object") {
        return Object.fromEntries(Object.entries(classDefinition).map(function(_ref5) {
          var key = _ref5[0], value = _ref5[1];
          return [prefix + key, value];
        }));
      }
      return classDefinition;
    });
    return [classGroupId, prefixedClassGroup];
  });
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/lru-cache.mjs
function createLruCache(maxCacheSize) {
  if (maxCacheSize < 1) {
    return {
      get: function get() {
        return void 0;
      },
      set: function set() {
      }
    };
  }
  var cacheSize = 0;
  var cache = /* @__PURE__ */ new Map();
  var previousCache = /* @__PURE__ */ new Map();
  function update(key, value) {
    cache.set(key, value);
    cacheSize++;
    if (cacheSize > maxCacheSize) {
      cacheSize = 0;
      previousCache = cache;
      cache = /* @__PURE__ */ new Map();
    }
  }
  return {
    get: function get(key) {
      var value = cache.get(key);
      if (value !== void 0) {
        return value;
      }
      if ((value = previousCache.get(key)) !== void 0) {
        update(key, value);
        return value;
      }
    },
    set: function set(key, value) {
      if (cache.has(key)) {
        cache.set(key, value);
      } else {
        update(key, value);
      }
    }
  };
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/modifier-utils.mjs
var IMPORTANT_MODIFIER = "!";
function createSplitModifiers(config) {
  var separator = config.separator || ":";
  var isSeparatorSingleCharacter = separator.length === 1;
  var firstSeparatorCharacter = separator[0];
  var separatorLength = separator.length;
  return function splitModifiers(className) {
    var modifiers = [];
    var bracketDepth = 0;
    var modifierStart = 0;
    var postfixModifierPosition;
    for (var index = 0; index < className.length; index++) {
      var currentCharacter = className[index];
      if (bracketDepth === 0) {
        if (currentCharacter === firstSeparatorCharacter && (isSeparatorSingleCharacter || className.slice(index, index + separatorLength) === separator)) {
          modifiers.push(className.slice(modifierStart, index));
          modifierStart = index + separatorLength;
          continue;
        }
        if (currentCharacter === "/") {
          postfixModifierPosition = index;
          continue;
        }
      }
      if (currentCharacter === "[") {
        bracketDepth++;
      } else if (currentCharacter === "]") {
        bracketDepth--;
      }
    }
    var baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.substring(modifierStart);
    var hasImportantModifier = baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER);
    var baseClassName = hasImportantModifier ? baseClassNameWithImportantModifier.substring(1) : baseClassNameWithImportantModifier;
    var maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : void 0;
    return {
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    };
  };
}
function sortModifiers(modifiers) {
  if (modifiers.length <= 1) {
    return modifiers;
  }
  var sortedModifiers = [];
  var unsortedModifiers = [];
  modifiers.forEach(function(modifier) {
    var isArbitraryVariant = modifier[0] === "[";
    if (isArbitraryVariant) {
      sortedModifiers.push.apply(sortedModifiers, unsortedModifiers.sort().concat([modifier]));
      unsortedModifiers = [];
    } else {
      unsortedModifiers.push(modifier);
    }
  });
  sortedModifiers.push.apply(sortedModifiers, unsortedModifiers.sort());
  return sortedModifiers;
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/config-utils.mjs
function createConfigUtils(config) {
  return {
    cache: createLruCache(config.cacheSize),
    splitModifiers: createSplitModifiers(config),
    ...createClassUtils(config)
  };
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/merge-classlist.mjs
var SPLIT_CLASSES_REGEX = /\s+/;
function mergeClassList(classList, configUtils) {
  var splitModifiers = configUtils.splitModifiers, getClassGroupId = configUtils.getClassGroupId, getConflictingClassGroupIds = configUtils.getConflictingClassGroupIds;
  var classGroupsInConflict = /* @__PURE__ */ new Set();
  return classList.trim().split(SPLIT_CLASSES_REGEX).map(function(originalClassName) {
    var _splitModifiers = splitModifiers(originalClassName), modifiers = _splitModifiers.modifiers, hasImportantModifier = _splitModifiers.hasImportantModifier, baseClassName = _splitModifiers.baseClassName, maybePostfixModifierPosition = _splitModifiers.maybePostfixModifierPosition;
    var classGroupId = getClassGroupId(maybePostfixModifierPosition ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
    var hasPostfixModifier = Boolean(maybePostfixModifierPosition);
    if (!classGroupId) {
      if (!maybePostfixModifierPosition) {
        return {
          isTailwindClass: false,
          originalClassName
        };
      }
      classGroupId = getClassGroupId(baseClassName);
      if (!classGroupId) {
        return {
          isTailwindClass: false,
          originalClassName
        };
      }
      hasPostfixModifier = false;
    }
    var variantModifier = sortModifiers(modifiers).join(":");
    var modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
    return {
      isTailwindClass: true,
      modifierId,
      classGroupId,
      originalClassName,
      hasPostfixModifier
    };
  }).reverse().filter(function(parsed) {
    if (!parsed.isTailwindClass) {
      return true;
    }
    var modifierId = parsed.modifierId, classGroupId = parsed.classGroupId, hasPostfixModifier = parsed.hasPostfixModifier;
    var classId = modifierId + classGroupId;
    if (classGroupsInConflict.has(classId)) {
      return false;
    }
    classGroupsInConflict.add(classId);
    getConflictingClassGroupIds(classGroupId, hasPostfixModifier).forEach(function(group) {
      return classGroupsInConflict.add(modifierId + group);
    });
    return true;
  }).reverse().map(function(parsed) {
    return parsed.originalClassName;
  }).join(" ");
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/create-tailwind-merge.mjs
function createTailwindMerge() {
  for (var _len = arguments.length, createConfig = new Array(_len), _key = 0; _key < _len; _key++) {
    createConfig[_key] = arguments[_key];
  }
  var configUtils;
  var cacheGet;
  var cacheSet;
  var functionToCall = initTailwindMerge;
  function initTailwindMerge(classList) {
    var firstCreateConfig = createConfig[0], restCreateConfig = createConfig.slice(1);
    var config = restCreateConfig.reduce(function(previousConfig, createConfigCurrent) {
      return createConfigCurrent(previousConfig);
    }, firstCreateConfig());
    configUtils = createConfigUtils(config);
    cacheGet = configUtils.cache.get;
    cacheSet = configUtils.cache.set;
    functionToCall = tailwindMerge;
    return tailwindMerge(classList);
  }
  function tailwindMerge(classList) {
    var cachedResult = cacheGet(classList);
    if (cachedResult) {
      return cachedResult;
    }
    var result = mergeClassList(classList, configUtils);
    cacheSet(classList, result);
    return result;
  }
  return function callTailwindMerge() {
    return functionToCall(twJoin.apply(null, arguments));
  };
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/from-theme.mjs
function fromTheme(key) {
  var themeGetter = function themeGetter2(theme) {
    return theme[key] || [];
  };
  themeGetter.isThemeGetter = true;
  return themeGetter;
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/validators.mjs
var arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i;
var fractionRegex = /^\d+\/\d+$/;
var stringLengths = /* @__PURE__ */ new Set(["px", "full", "screen"]);
var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
var lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
var shadowRegex = /^-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
function isLength(value) {
  return isNumber(value) || stringLengths.has(value) || fractionRegex.test(value) || isArbitraryLength(value);
}
function isArbitraryLength(value) {
  return getIsArbitraryValue(value, "length", isLengthOnly);
}
function isArbitrarySize(value) {
  return getIsArbitraryValue(value, "size", isNever);
}
function isArbitraryPosition(value) {
  return getIsArbitraryValue(value, "position", isNever);
}
function isArbitraryUrl(value) {
  return getIsArbitraryValue(value, "url", isUrl);
}
function isArbitraryNumber(value) {
  return getIsArbitraryValue(value, "number", isNumber);
}
function isNumber(value) {
  return !Number.isNaN(Number(value));
}
function isPercent(value) {
  return value.endsWith("%") && isNumber(value.slice(0, -1));
}
function isInteger(value) {
  return isIntegerOnly(value) || getIsArbitraryValue(value, "number", isIntegerOnly);
}
function isArbitraryValue(value) {
  return arbitraryValueRegex.test(value);
}
function isAny() {
  return true;
}
function isTshirtSize(value) {
  return tshirtUnitRegex.test(value);
}
function isArbitraryShadow(value) {
  return getIsArbitraryValue(value, "", isShadow);
}
function getIsArbitraryValue(value, label, testValue) {
  var result = arbitraryValueRegex.exec(value);
  if (result) {
    if (result[1]) {
      return result[1] === label;
    }
    return testValue(result[2]);
  }
  return false;
}
function isLengthOnly(value) {
  return lengthUnitRegex.test(value);
}
function isNever() {
  return false;
}
function isUrl(value) {
  return value.startsWith("url(");
}
function isIntegerOnly(value) {
  return Number.isInteger(Number(value));
}
function isShadow(value) {
  return shadowRegex.test(value);
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/default-config.mjs
function getDefaultConfig() {
  var colors = fromTheme("colors");
  var spacing = fromTheme("spacing");
  var blur = fromTheme("blur");
  var brightness = fromTheme("brightness");
  var borderColor = fromTheme("borderColor");
  var borderRadius = fromTheme("borderRadius");
  var borderSpacing = fromTheme("borderSpacing");
  var borderWidth = fromTheme("borderWidth");
  var contrast = fromTheme("contrast");
  var grayscale = fromTheme("grayscale");
  var hueRotate = fromTheme("hueRotate");
  var invert = fromTheme("invert");
  var gap = fromTheme("gap");
  var gradientColorStops = fromTheme("gradientColorStops");
  var gradientColorStopPositions = fromTheme("gradientColorStopPositions");
  var inset = fromTheme("inset");
  var margin = fromTheme("margin");
  var opacity = fromTheme("opacity");
  var padding = fromTheme("padding");
  var saturate = fromTheme("saturate");
  var scale = fromTheme("scale");
  var sepia = fromTheme("sepia");
  var skew = fromTheme("skew");
  var space = fromTheme("space");
  var translate = fromTheme("translate");
  var getOverscroll = function getOverscroll2() {
    return ["auto", "contain", "none"];
  };
  var getOverflow = function getOverflow2() {
    return ["auto", "hidden", "clip", "visible", "scroll"];
  };
  var getSpacingWithAutoAndArbitrary = function getSpacingWithAutoAndArbitrary2() {
    return ["auto", isArbitraryValue, spacing];
  };
  var getSpacingWithArbitrary = function getSpacingWithArbitrary2() {
    return [isArbitraryValue, spacing];
  };
  var getLengthWithEmpty = function getLengthWithEmpty2() {
    return ["", isLength];
  };
  var getNumberWithAutoAndArbitrary = function getNumberWithAutoAndArbitrary2() {
    return ["auto", isNumber, isArbitraryValue];
  };
  var getPositions = function getPositions2() {
    return ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"];
  };
  var getLineStyles = function getLineStyles2() {
    return ["solid", "dashed", "dotted", "double", "none"];
  };
  var getBlendModes = function getBlendModes2() {
    return ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity", "plus-lighter"];
  };
  var getAlign = function getAlign2() {
    return ["start", "end", "center", "between", "around", "evenly", "stretch"];
  };
  var getZeroAndEmpty = function getZeroAndEmpty2() {
    return ["", "0", isArbitraryValue];
  };
  var getBreaks = function getBreaks2() {
    return ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"];
  };
  var getNumber = function getNumber2() {
    return [isNumber, isArbitraryNumber];
  };
  var getNumberAndArbitrary = function getNumberAndArbitrary2() {
    return [isNumber, isArbitraryValue];
  };
  return {
    cacheSize: 500,
    theme: {
      colors: [isAny],
      spacing: [isLength],
      blur: ["none", "", isTshirtSize, isArbitraryValue],
      brightness: getNumber(),
      borderColor: [colors],
      borderRadius: ["none", "", "full", isTshirtSize, isArbitraryValue],
      borderSpacing: getSpacingWithArbitrary(),
      borderWidth: getLengthWithEmpty(),
      contrast: getNumber(),
      grayscale: getZeroAndEmpty(),
      hueRotate: getNumberAndArbitrary(),
      invert: getZeroAndEmpty(),
      gap: getSpacingWithArbitrary(),
      gradientColorStops: [colors],
      gradientColorStopPositions: [isPercent, isArbitraryLength],
      inset: getSpacingWithAutoAndArbitrary(),
      margin: getSpacingWithAutoAndArbitrary(),
      opacity: getNumber(),
      padding: getSpacingWithArbitrary(),
      saturate: getNumber(),
      scale: getNumber(),
      sepia: getZeroAndEmpty(),
      skew: getNumberAndArbitrary(),
      space: getSpacingWithArbitrary(),
      translate: getSpacingWithArbitrary()
    },
    classGroups: {
      // Layout
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", "video", isArbitraryValue]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       */
      container: ["container"],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [isTshirtSize]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": getBreaks()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": getBreaks()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      "float": [{
        "float": ["right", "left", "none"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: [].concat(getPositions(), [isArbitraryValue])
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: getOverflow()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": getOverflow()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": getOverflow()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: getOverscroll()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": getOverscroll()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": getOverscroll()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: [inset]
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": [inset]
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": [inset]
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: [inset]
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: [inset]
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: [inset]
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: [inset]
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: [inset]
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: [inset]
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: ["auto", isInteger]
      }],
      // Flexbox and Grid
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: getSpacingWithAutoAndArbitrary()
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["wrap", "wrap-reverse", "nowrap"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: ["1", "auto", "initial", "none", isArbitraryValue]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: getZeroAndEmpty()
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: getZeroAndEmpty()
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: ["first", "last", "none", isInteger]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": [isAny]
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: ["auto", {
          span: ["full", isInteger]
        }, isArbitraryValue]
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": getNumberWithAutoAndArbitrary()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": getNumberWithAutoAndArbitrary()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": [isAny]
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: ["auto", {
          span: [isInteger]
        }, isArbitraryValue]
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": getNumberWithAutoAndArbitrary()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": getNumberWithAutoAndArbitrary()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": ["auto", "min", "max", "fr", isArbitraryValue]
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": ["auto", "min", "max", "fr", isArbitraryValue]
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: [gap]
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": [gap]
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": [gap]
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: ["normal"].concat(getAlign())
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": ["start", "end", "center", "stretch"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", "start", "end", "center", "stretch"]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal"].concat(getAlign(), ["baseline"])
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: ["start", "end", "center", "baseline", "stretch"]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", "start", "end", "center", "stretch", "baseline"]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": [].concat(getAlign(), ["baseline"])
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": ["start", "end", "center", "baseline", "stretch"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", "start", "end", "center", "stretch"]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: [padding]
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: [padding]
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: [padding]
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: [padding]
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: [padding]
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: [padding]
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: [padding]
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: [padding]
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: [padding]
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: [margin]
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: [margin]
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: [margin]
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: [margin]
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: [margin]
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: [margin]
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: [margin]
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: [margin]
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: [margin]
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/space
       */
      "space-x": [{
        "space-x": [space]
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/space
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/space
       */
      "space-y": [{
        "space-y": [space]
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/space
       */
      "space-y-reverse": ["space-y-reverse"],
      // Sizing
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: ["auto", "min", "max", "fit", isArbitraryValue, spacing]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": ["min", "max", "fit", isArbitraryValue, isLength]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": ["0", "none", "full", "min", "max", "fit", "prose", {
          screen: [isTshirtSize]
        }, isTshirtSize, isArbitraryValue]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: [isArbitraryValue, spacing, "auto", "min", "max", "fit"]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["min", "max", "fit", isArbitraryValue, isLength]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": [isArbitraryValue, spacing, "min", "max", "fit"]
      }],
      // Typography
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", isTshirtSize, isArbitraryLength]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", isArbitraryNumber]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [isAny]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractons"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: ["tighter", "tight", "normal", "wide", "wider", "widest", isArbitraryValue]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": ["none", isNumber, isArbitraryNumber]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: ["none", "tight", "snug", "normal", "relaxed", "loose", isArbitraryValue, isLength]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", isArbitraryValue]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["none", "disc", "decimal", isArbitraryValue]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: [colors]
      }],
      /**
       * Placeholder Opacity
       * @see https://tailwindcss.com/docs/placeholder-opacity
       */
      "placeholder-opacity": [{
        "placeholder-opacity": [opacity]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: [colors]
      }],
      /**
       * Text Opacity
       * @see https://tailwindcss.com/docs/text-opacity
       */
      "text-opacity": [{
        "text-opacity": [opacity]
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [].concat(getLineStyles(), ["wavy"])
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: ["auto", "from-font", isLength]
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": ["auto", isArbitraryValue, isLength]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: [colors]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: getSpacingWithArbitrary()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", isArbitraryValue]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      "break": [{
        "break": ["normal", "words", "all", "keep"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", isArbitraryValue]
      }],
      // Backgrounds
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Opacity
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/background-opacity
       */
      "bg-opacity": [{
        "bg-opacity": [opacity]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: [].concat(getPositions(), [isArbitraryPosition])
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: ["no-repeat", {
          repeat: ["", "x", "y", "round", "space"]
        }]
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: ["auto", "cover", "contain", isArbitrarySize]
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
        }, isArbitraryUrl]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: [colors]
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: [gradientColorStopPositions]
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: [gradientColorStopPositions]
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: [gradientColorStopPositions]
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: [gradientColorStops]
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: [gradientColorStops]
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: [gradientColorStops]
      }],
      // Borders
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: [borderRadius]
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": [borderRadius]
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": [borderRadius]
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": [borderRadius]
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": [borderRadius]
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": [borderRadius]
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": [borderRadius]
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": [borderRadius]
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": [borderRadius]
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": [borderRadius]
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": [borderRadius]
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": [borderRadius]
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": [borderRadius]
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": [borderRadius]
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": [borderRadius]
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: [borderWidth]
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": [borderWidth]
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": [borderWidth]
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": [borderWidth]
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": [borderWidth]
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": [borderWidth]
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": [borderWidth]
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": [borderWidth]
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": [borderWidth]
      }],
      /**
       * Border Opacity
       * @see https://tailwindcss.com/docs/border-opacity
       */
      "border-opacity": [{
        "border-opacity": [opacity]
      }],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [].concat(getLineStyles(), ["hidden"])
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/divide-width
       */
      "divide-x": [{
        "divide-x": [borderWidth]
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/divide-width
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/divide-width
       */
      "divide-y": [{
        "divide-y": [borderWidth]
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/divide-width
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Divide Opacity
       * @see https://tailwindcss.com/docs/divide-opacity
       */
      "divide-opacity": [{
        "divide-opacity": [opacity]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/divide-style
       */
      "divide-style": [{
        divide: getLineStyles()
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: [borderColor]
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": [borderColor]
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": [borderColor]
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": [borderColor]
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": [borderColor]
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": [borderColor]
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": [borderColor]
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: [borderColor]
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [""].concat(getLineStyles())
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [isArbitraryValue, isLength]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: [isLength]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: [colors]
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/ring-width
       */
      "ring-w": [{
        ring: getLengthWithEmpty()
      }],
      /**
       * Ring Width Inset
       * @see https://tailwindcss.com/docs/ring-width
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/ring-color
       */
      "ring-color": [{
        ring: [colors]
      }],
      /**
       * Ring Opacity
       * @see https://tailwindcss.com/docs/ring-opacity
       */
      "ring-opacity": [{
        "ring-opacity": [opacity]
      }],
      /**
       * Ring Offset Width
       * @see https://tailwindcss.com/docs/ring-offset-width
       */
      "ring-offset-w": [{
        "ring-offset": [isLength]
      }],
      /**
       * Ring Offset Color
       * @see https://tailwindcss.com/docs/ring-offset-color
       */
      "ring-offset-color": [{
        "ring-offset": [colors]
      }],
      // Effects
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: ["", "inner", "none", isTshirtSize, isArbitraryShadow]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow-color
       */
      "shadow-color": [{
        shadow: [isAny]
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [opacity]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": getBlendModes()
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": getBlendModes()
      }],
      // Filters
      /**
       * Filter
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: ["", "none"]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: [blur]
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [brightness]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [contrast]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": ["", "none", isTshirtSize, isArbitraryValue]
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: [grayscale]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [hueRotate]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: [invert]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [saturate]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: [sepia]
      }],
      /**
       * Backdrop Filter
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": ["", "none"]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": [blur]
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [brightness]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [contrast]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": [grayscale]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [hueRotate]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": [invert]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [opacity]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [saturate]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": [sepia]
      }],
      // Tables
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": [borderSpacing]
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": [borderSpacing]
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": [borderSpacing]
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // Transitions and Animation
      /**
       * Tranisition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["none", "all", "", "colors", "opacity", "shadow", "transform", isArbitraryValue]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: getNumberAndArbitrary()
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "in", "out", "in-out", isArbitraryValue]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: getNumberAndArbitrary()
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", "spin", "ping", "pulse", "bounce", isArbitraryValue]
      }],
      // Transforms
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: ["", "gpu", "none"]
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: [scale]
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": [scale]
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": [scale]
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: [isInteger, isArbitraryValue]
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": [translate]
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": [translate]
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": [skew]
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": [skew]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", isArbitraryValue]
      }],
      // Interactivity
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: ["auto", colors]
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: ["appearance-none"],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", isArbitraryValue]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: [colors]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["none", "auto"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "y", "x", ""]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": getSpacingWithArbitrary()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "pinch-zoom", "manipulation", {
          pan: ["x", "left", "right", "y", "up", "down"]
        }]
      }],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", isArbitraryValue]
      }],
      // SVG
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: [colors, "none"]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [isLength, isArbitraryNumber]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: [colors, "none"]
      }],
      // Accessibility
      /**
       * Screen Readers
       * @see https://tailwindcss.com/docs/screen-readers
       */
      sr: ["sr-only", "not-sr-only"]
    },
    conflictingClassGroups: {
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    }
  };
}

// plugins/agent-essentials/node_modules/tailwind-merge/dist/lib/tw-merge.mjs
var twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);

// plugins/agent-essentials/renderer/lib/utils.ts
function cn(...inputs) {
  return twMerge(clsx2(inputs));
}

// plugins/agent-essentials/renderer/ui/button.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
var Button = React3.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      Comp,
      {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        ...props
      }
    );
  }
);
Button.displayName = "Button";

// plugins/agent-essentials/renderer/views/AgentListView.tsx
var import_alephnet = require("alephnet");
var import_jsx_runtime3 = require("react/jsx-runtime");
var MotionDiv = import_framer_motion.motion.div;
var AgentListView = () => {
  const {
    agents: { agents },
    createAgent,
    setActiveAgent
  } = (0, import_alephnet.useAlephStore)();
  const [showCreate, setShowCreate] = (0, import_react.useState)(false);
  const [newName, setNewName] = (0, import_react.useState)("");
  const [newTemplate, setNewTemplate] = (0, import_react.useState)("");
  const handleCreateAgent = async () => {
    if (!newName.trim()) return;
    await createAgent(newName, newTemplate || void 0);
    setNewName("");
    setNewTemplate("");
    setShowCreate(false);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex justify-end mb-2", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Button, { size: "sm", onClick: () => setShowCreate(!showCreate), className: "h-6 text-[10px] bg-blue-600 px-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Plus, { size: 10, className: "mr-1" }),
      " New Agent"
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_framer_motion.AnimatePresence, { children: showCreate && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(MotionDiv, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, className: "overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "p-3 bg-blue-900/10 rounded-lg border border-blue-500/10 space-y-2 mb-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "Agent name", className: "w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { value: newTemplate, onChange: (e) => setNewTemplate(e.target.value), placeholder: "Template (optional)", className: "w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button, { size: "sm", onClick: handleCreateAgent, disabled: !newName.trim(), className: "h-6 text-[10px] bg-blue-600", children: "Create" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button, { size: "sm", onClick: () => setShowCreate(false), className: "h-6 text-[10px] bg-gray-700", children: "Cancel" })
      ] })
    ] }) }) }),
    agents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "text-center py-8 text-gray-500 text-xs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Bot, { size: 24, className: "mx-auto mb-2 opacity-40" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { children: "No agents created yet." })
    ] }) : agents.map((agent, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      MotionDiv,
      {
        initial: { opacity: 0, y: 5 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: i * 0.03 },
        onClick: () => setActiveAgent(agent.id),
        className: "p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-2 mb-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react.Bot, { size: 14, className: agent.status === "active" ? "text-emerald-400" : agent.status === "dismissed" ? "text-amber-400" : "text-gray-500" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-sm font-medium text-white", children: agent.name }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `text-[9px] px-1.5 py-0.5 rounded-full ml-auto capitalize ${agent.status === "active" ? "bg-emerald-500/10 text-emerald-400" : agent.status === "dismissed" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"}`, children: agent.status })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex gap-2 text-[9px] text-gray-500", children: [
            agent.templateId && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
              "template: ",
              agent.templateId
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
              agent.beliefs?.length || 0,
              " beliefs"
            ] })
          ] })
        ]
      },
      agent.id
    ))
  ] });
};

// plugins/agent-essentials/renderer/views/AgentDetailView.tsx
var import_react2 = require("react");
var import_framer_motion2 = require("framer-motion");
var import_lucide_react2 = require("lucide-react");
var import_alephnet2 = require("alephnet");
var import_jsx_runtime4 = require("react/jsx-runtime");
var MotionDiv2 = import_framer_motion2.motion.div;
var AgentDetailView = ({ agentId, onBack }) => {
  const {
    agents: { agents, stepLog },
    summonAgent,
    stepAgent,
    dismissAgent,
    runAgent,
    deleteAgent
  } = (0, import_alephnet2.useAlephStore)();
  const [stepInput, setStepInput] = (0, import_react2.useState)("");
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return null;
  const recentSteps = stepLog.filter((s) => s.agentId === agentId).slice(-20);
  const handleStep = async () => {
    if (!stepInput.trim()) return;
    await stepAgent(agentId, stepInput.trim());
    setStepInput("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "h-full flex flex-col", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-2 p-3 border-b border-white/5 bg-white/5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { onClick: onBack, className: "p-1 hover:bg-white/10 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.ArrowLeft, { size: 14, className: "text-gray-400" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Bot, { size: 16, className: agent.status === "active" ? "text-emerald-400" : "text-gray-500" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-sm font-medium text-white", children: agent.name }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "text-[10px] text-gray-500 capitalize", children: [
          agent.status,
          " ",
          agent.templateId && `\u2022 ${agent.templateId}`
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex gap-2 p-3 border-b border-white/5", children: [
      agent.status === "idle" && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Button, { size: "sm", onClick: () => summonAgent(agent.id), className: "h-7 text-[10px] bg-emerald-600", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Play, { size: 10, className: "mr-1" }),
        " Summon"
      ] }),
      agent.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Button, { size: "sm", onClick: () => dismissAgent(agent.id), className: "h-7 text-[10px] bg-amber-600", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Square, { size: 10, className: "mr-1" }),
          " Dismiss"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Button, { size: "sm", onClick: () => runAgent(agent.id, 50), className: "h-7 text-[10px] bg-purple-600", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Zap, { size: 10, className: "mr-1" }),
          " Auto-Run"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { size: "sm", onClick: () => deleteAgent(agent.id), className: "h-7 text-[10px] bg-red-600/30 text-red-400 ml-auto", children: "Delete" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "p-3 border-b border-white/5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h4", { className: "text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2", children: "Goal Priors" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex gap-2 flex-wrap", children: agent.goalPriors ? Object.entries(agent.goalPriors).map(([key, val]) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full", children: [
        key,
        ": ",
        val
      ] }, key)) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-[10px] text-gray-500 italic", children: "No goal priors defined" }) })
    ] }),
    agent.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "p-3 border-b border-white/5", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "input",
        {
          value: stepInput,
          onChange: (e) => setStepInput(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && handleStep(),
          placeholder: "Send observation to agent...",
          className: "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { size: "sm", onClick: handleStep, disabled: !stepInput.trim(), className: "h-7 px-2 bg-blue-600", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react2.Zap, { size: 10 }) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex-1 overflow-y-auto p-3 space-y-1.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h4", { className: "text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1", children: "Step Log" }),
      recentSteps.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "text-center py-6 text-gray-600 text-xs", children: "No steps recorded yet." }) : recentSteps.map((step, i) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        MotionDiv2,
        {
          initial: { opacity: 0, x: -5 },
          animate: { opacity: 1, x: 0 },
          className: "p-2 bg-white/[0.03] rounded-lg border border-white/5 text-[10px] font-mono",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex justify-between mb-0.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-blue-400", children: "ACTION" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-gray-600", children: new Date(step.timestamp).toLocaleTimeString() })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-gray-300", children: step.action }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex gap-3 mt-1 text-gray-500", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
                "FE: ",
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-purple-400", children: step.freeEnergy.toFixed(3) })
              ] }),
              step.learningUpdates.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-emerald-400", children: [
                "+",
                step.learningUpdates.length,
                " learned"
              ] })
            ] })
          ]
        },
        `${step.timestamp}-${i}`
      ))
    ] })
  ] });
};

// plugins/agent-essentials/renderer/views/TeamListView.tsx
var import_react3 = require("react");
var import_framer_motion3 = require("framer-motion");
var import_lucide_react3 = require("lucide-react");
var import_alephnet3 = require("alephnet");
var import_jsx_runtime5 = require("react/jsx-runtime");
var TeamListView = () => {
  const {
    agents: { agents, teams },
    createTeam,
    setActiveTeam
  } = (0, import_alephnet3.useAlephStore)();
  const [showCreateTeam, setShowCreateTeam] = (0, import_react3.useState)(false);
  const [teamName, setTeamName] = (0, import_react3.useState)("");
  const [selectedAgentIds, setSelectedAgentIds] = (0, import_react3.useState)([]);
  const handleCreateTeam = async () => {
    if (!teamName.trim() || selectedAgentIds.length === 0) return;
    await createTeam(teamName, selectedAgentIds);
    setTeamName("");
    setSelectedAgentIds([]);
    setShowCreateTeam(false);
  };
  const toggleAgentSelection = (id) => {
    setSelectedAgentIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "flex justify-end mb-2", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(Button, { size: "sm", onClick: () => setShowCreateTeam(!showCreateTeam), className: "h-6 text-[10px] bg-purple-600 px-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.Plus, { size: 10, className: "mr-1" }),
      " New Team"
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_framer_motion3.AnimatePresence, { children: showCreateTeam && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_framer_motion3.motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, className: "overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "p-3 bg-purple-900/10 rounded-lg border border-purple-500/10 space-y-2 mb-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { value: teamName, onChange: (e) => setTeamName(e.target.value), placeholder: "Team name", className: "w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h5", { className: "text-[10px] text-gray-500", children: "Select agents:" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "space-y-1", children: agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { className: "flex items-center gap-2 p-1 rounded hover:bg-white/5 cursor-pointer text-xs text-gray-300", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { type: "checkbox", checked: selectedAgentIds.includes(a.id), onChange: () => toggleAgentSelection(a.id), className: "accent-purple-500" }),
        a.name
      ] }, a.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { size: "sm", onClick: handleCreateTeam, disabled: !teamName.trim() || selectedAgentIds.length === 0, className: "h-6 text-[10px] bg-purple-600", children: "Create" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { size: "sm", onClick: () => setShowCreateTeam(false), className: "h-6 text-[10px] bg-gray-700", children: "Cancel" })
      ] })
    ] }) }) }),
    teams.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "text-center py-8 text-gray-500 text-xs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.Users, { size: 24, className: "mx-auto mb-2 opacity-40" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: "No teams created yet." })
    ] }) : teams.map((team, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      import_framer_motion3.motion.div,
      {
        initial: { opacity: 0, y: 5 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: i * 0.03 },
        onClick: () => setActiveTeam(team.id),
        className: "p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 cursor-pointer transition-colors",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center gap-2 mb-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.Users, { size: 14, className: "text-purple-400" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "text-sm font-medium text-white", children: team.name })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "text-[10px] text-gray-500", children: [
            team.agentIds.length,
            " agents"
          ] })
        ]
      },
      team.id
    ))
  ] });
};

// plugins/agent-essentials/renderer/views/TeamDetailView.tsx
var import_react4 = require("react");
var import_lucide_react4 = require("lucide-react");
var import_alephnet4 = require("alephnet");
var import_jsx_runtime6 = require("react/jsx-runtime");
var TeamDetailView = ({ teamId, onBack }) => {
  const {
    agents: { agents, teams, stepLog },
    summonTeam,
    stepTeam,
    dismissTeam
  } = (0, import_alephnet4.useAlephStore)();
  const [teamStepInput, setTeamStepInput] = (0, import_react4.useState)("");
  const team = teams.find((t) => t.id === teamId);
  if (!team) return null;
  const handleTeamStep = async () => {
    if (!teamStepInput.trim()) return;
    await stepTeam(teamId, teamStepInput.trim());
    setTeamStepInput("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "h-full flex flex-col", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2 p-3 border-b border-white/5 bg-white/5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { onClick: onBack, className: "p-1 hover:bg-white/10 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react4.ArrowLeft, { size: 14, className: "text-gray-400" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react4.Users, { size: 16, className: "text-purple-400" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-sm font-medium text-white", children: team.name }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "text-[10px] text-gray-500", children: [
          team.agentIds.length,
          " agents"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex gap-2 p-3 border-b border-white/5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(Button, { size: "sm", onClick: () => summonTeam(team.id), className: "h-7 text-[10px] bg-emerald-600", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react4.Play, { size: 10, className: "mr-1" }),
        " Summon All"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(Button, { size: "sm", onClick: () => dismissTeam(team.id), className: "h-7 text-[10px] bg-amber-600", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react4.Square, { size: 10, className: "mr-1" }),
        " Dismiss All"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "p-3 border-b border-white/5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h4", { className: "text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2", children: "Members" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "space-y-1", children: team.agentIds.map((id) => {
        const a = agents.find((ag) => ag.id === id);
        return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2 p-1.5 rounded bg-white/5 text-xs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react4.Bot, { size: 12, className: a?.status === "active" ? "text-emerald-400" : "text-gray-500" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-gray-300", children: a?.name ?? id }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-[9px] text-gray-500 capitalize ml-auto", children: a?.status ?? "unknown" })
        ] }, id);
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "p-3 border-b border-white/5", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "input",
        {
          value: teamStepInput,
          onChange: (e) => setTeamStepInput(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && handleTeamStep(),
          placeholder: "Send collective observation...",
          className: "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Button, { size: "sm", onClick: handleTeamStep, disabled: !teamStepInput.trim(), className: "h-7 px-2 bg-purple-600", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react4.Zap, { size: 10 }) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "flex-1 overflow-y-auto p-3 space-y-1.5", children: stepLog.filter((s) => team.agentIds.includes(s.agentId)).slice(-20).map((step, i) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "p-2 bg-white/[0.03] rounded-lg border border-white/5 text-[10px] font-mono", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex justify-between mb-0.5", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-purple-400", children: agents.find((a) => a.id === step.agentId)?.name ?? step.agentId }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-gray-600", children: new Date(step.timestamp).toLocaleTimeString() })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-gray-300", children: step.action })
    ] }, `${step.timestamp}-${i}`)) })
  ] });
};

// plugins/agent-essentials/renderer/views/LogView.tsx
var import_lucide_react5 = require("lucide-react");
var import_alephnet5 = require("alephnet");
var import_jsx_runtime7 = require("react/jsx-runtime");
var LogView = () => {
  const {
    agents: { agents, stepLog }
  } = (0, import_alephnet5.useAlephStore)();
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_jsx_runtime7.Fragment, { children: stepLog.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "text-center py-8 text-gray-500 text-xs", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react5.Activity, { size: 24, className: "mx-auto mb-2 opacity-40" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { children: "No agent steps recorded." })
  ] }) : stepLog.slice(-50).reverse().map((step, i) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "p-2 bg-white/[0.03] rounded-lg border border-white/5 text-[10px] font-mono", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "flex justify-between mb-0.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "text-blue-400", children: agents.find((a) => a.id === step.agentId)?.name ?? step.agentId }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "text-gray-600", children: new Date(step.timestamp).toLocaleTimeString() })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "text-gray-300", children: step.action }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "text-purple-400", children: [
      "FE: ",
      step.freeEnergy.toFixed(3)
    ] })
  ] }, `${step.timestamp}-${i}`)) });
};

// plugins/agent-essentials/renderer/components/FileExplorer.tsx
var import_react5 = require("react");
var import_lucide_react6 = require("lucide-react");

// plugins/agent-essentials/renderer/ipc.ts
var ipc = null;
var setIpc = (i) => {
  ipc = i;
};
var getIpc = () => {
  if (!ipc) {
    console.warn("IPC not initialized");
  }
  return ipc;
};

// plugins/agent-essentials/renderer/components/FileExplorer.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
var FileExplorer = () => {
  const [currentPath, setCurrentPath] = (0, import_react5.useState)("~/alephnet/sandbox");
  const [files, setFiles] = (0, import_react5.useState)([]);
  const [selectedFile, setSelectedFile] = (0, import_react5.useState)(null);
  const [fileContent, setFileContent] = (0, import_react5.useState)("");
  const [loading, setLoading] = (0, import_react5.useState)(false);
  const [error, setError] = (0, import_react5.useState)(null);
  const [showHidden, setShowHidden] = (0, import_react5.useState)(false);
  const filteredFiles = showHidden ? files : files.filter((f) => !f.startsWith("."));
  const ipc2 = getIpc();
  const loadFiles = async (path) => {
    if (!ipc2) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ipc2.invoke("fs:list", { path });
      setFiles(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const loadFileContent = async (path) => {
    if (!ipc2) return;
    setLoading(true);
    setError(null);
    try {
      const content = await ipc2.invoke("fs:read", { path });
      setFileContent(content);
      setSelectedFile(path);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  (0, import_react5.useEffect)(() => {
    loadFiles(currentPath);
  }, [currentPath]);
  const handleNavigate = (path) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };
  const handleFileClick = (filename) => {
    const newPath = `${currentPath}/${filename}`;
    loadFiles(newPath).catch(() => {
      loadFileContent(newPath);
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex flex-col h-full bg-gray-900 text-white p-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex items-center justify-between mb-4 bg-gray-800 p-2 rounded-lg", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex items-center space-x-2 text-sm text-gray-400 overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react6.Home, { size: 16, className: "flex-shrink-0" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "truncate", children: currentPath })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex items-center space-x-2 flex-shrink-0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            onClick: () => setShowHidden(!showHidden),
            className: `p-1 rounded transition-colors ${showHidden ? "bg-blue-600 text-white" : "hover:bg-white/10 text-gray-400"}`,
            title: showHidden ? "Hide hidden files" : "Show hidden files",
            children: showHidden ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react6.Eye, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react6.EyeOff, { size: 16 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { onClick: () => loadFiles(currentPath), className: "p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react6.RefreshCw, { size: 16 }) })
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "bg-red-500/20 text-red-400 p-2 rounded mb-2 text-sm", children: error }),
    selectedFile ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex-1 flex flex-col min-h-0", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex items-center mb-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { onClick: () => setSelectedFile(null), className: "mr-2 p-1 hover:bg-white/10 rounded", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react6.ArrowLeft, { size: 16 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "font-medium", children: selectedFile.split("/").pop() })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "textarea",
        {
          className: "flex-1 bg-black/50 p-2 rounded font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500",
          value: fileContent,
          readOnly: true
        }
      )
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "flex-1 overflow-y-auto min-h-0 space-y-1", children: [
      currentPath !== "~/alephnet/sandbox" && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "div",
        {
          className: "flex items-center p-2 hover:bg-white/5 rounded cursor-pointer",
          onClick: () => {
            const parts = currentPath.split("/");
            parts.pop();
            setCurrentPath(parts.join("/"));
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react6.Folder, { size: 16, className: "text-yellow-500 mr-2" }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: ".." })
          ]
        }
      ),
      filteredFiles.map((file, idx) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "div",
        {
          className: "flex items-center p-2 hover:bg-white/5 rounded cursor-pointer group",
          onClick: () => handleNavigate(`${currentPath}/${file}`),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react6.FileText, { size: 16, className: "text-blue-400 mr-2" }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "flex-1", children: file })
          ]
        },
        idx
      )),
      filteredFiles.length === 0 && !loading && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "text-center text-gray-500 py-4", children: "No files found" })
    ] })
  ] });
};

// plugins/agent-essentials/renderer/components/SystemMonitor.tsx
var import_react6 = require("react");
var import_lucide_react7 = require("lucide-react");
var import_jsx_runtime9 = require("react/jsx-runtime");
var SystemMonitor = () => {
  const [stats, setStats] = (0, import_react6.useState)(null);
  const [loading, setLoading] = (0, import_react6.useState)(false);
  const [error, setError] = (0, import_react6.useState)(null);
  const ipc2 = getIpc();
  const fetchStats = async () => {
    if (!ipc2) return;
    try {
      const data = await ipc2.invoke("sys:info", {});
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  };
  (0, import_react6.useEffect)(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5e3);
    return () => clearInterval(interval);
  }, []);
  if (!stats) {
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "p-4 text-gray-500", children: "Loading system stats..." });
  }
  const { cpu, memory, os, network } = stats;
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex flex-col h-full bg-gray-900 text-white p-4 space-y-4 overflow-y-auto", children: [
    error && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "bg-red-500/20 text-red-400 p-2 rounded text-sm", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex items-center mb-2 text-blue-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_lucide_react7.Cpu, { size: 20, className: "mr-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { className: "font-semibold", children: "CPU" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "space-y-1 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Model:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "text-right", children: [
              cpu.manufacturer,
              " ",
              cpu.brand
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Cores:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { children: [
              cpu.physicalCores,
              " Physical / ",
              cpu.cores,
              " Logical"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Speed:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { children: [
              cpu.speed,
              " GHz"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "mt-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "text-xs text-gray-400 mb-1", children: "Load" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "w-full bg-gray-700 h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              "div",
              {
                className: "bg-blue-500 h-full transition-all duration-500",
                style: { width: `${cpu.load}%` }
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "text-right text-xs mt-1", children: [
              cpu.load.toFixed(1),
              "%"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex items-center mb-2 text-purple-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_lucide_react7.Activity, { size: 20, className: "mr-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { className: "font-semibold", children: "Memory" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "space-y-1 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Total:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { children: [
              (memory.total / 1024 / 1024 / 1024).toFixed(1),
              " GB"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Used:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { children: [
              (memory.used / 1024 / 1024 / 1024).toFixed(1),
              " GB"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Free:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { children: [
              (memory.free / 1024 / 1024 / 1024).toFixed(1),
              " GB"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "mt-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "text-xs text-gray-400 mb-1", children: "Usage" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "w-full bg-gray-700 h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              "div",
              {
                className: "bg-purple-500 h-full transition-all duration-500",
                style: { width: `${memory.used / memory.total * 100}%` }
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "text-right text-xs mt-1", children: [
              (memory.used / memory.total * 100).toFixed(1),
              "%"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex items-center mb-2 text-green-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_lucide_react7.HardDrive, { size: 20, className: "mr-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { className: "font-semibold", children: "System" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "space-y-1 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Platform:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "capitalize", children: os.platform })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Distro:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: os.distro })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Release:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: os.release })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-400", children: "Hostname:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: os.hostname })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "bg-white/5 p-4 rounded-lg", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex items-center mb-2 text-yellow-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(import_lucide_react7.Wifi, { size: 20, className: "mr-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { className: "font-semibold", children: "Network" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "space-y-2 text-sm max-h-40 overflow-y-auto", children: network.map((iface, idx) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "border-b border-white/5 pb-2 last:border-0", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "font-medium text-gray-300", children: iface.iface }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-500", children: "IPv4:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: iface.ip4 })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "text-gray-500", children: "MAC:" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: iface.mac })
          ] })
        ] }, idx)) })
      ] })
    ] })
  ] });
};

// plugins/agent-essentials/renderer/AgentsPanel.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
var AgentsPanel = () => {
  const {
    agents: { activeAgentId, activeTeamId },
    loadAgents,
    loadTeams,
    setActiveAgent,
    setActiveTeam
  } = (0, import_alephnet6.useAlephStore)();
  const [tab, setTab] = (0, import_react7.useState)("agents");
  (0, import_react7.useEffect)(() => {
    loadAgents();
    loadTeams();
  }, []);
  if (activeAgentId) {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(AgentDetailView, { agentId: activeAgentId, onBack: () => setActiveAgent(null) });
  }
  if (activeTeamId) {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(TeamDetailView, { teamId: activeTeamId, onBack: () => setActiveTeam(null) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "h-full flex flex-col", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "flex border-b border-white/5 bg-white/5 overflow-x-auto", children: ["agents", "teams", "log", "files", "system"].map((t) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
      "button",
      {
        onClick: () => setTab(t),
        className: `flex-1 py-2.5 px-3 text-xs font-medium capitalize transition-colors relative whitespace-nowrap ${tab === t ? "text-blue-400" : "text-gray-500 hover:text-gray-300"}`,
        children: [
          t,
          " ",
          tab === t && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" })
        ]
      },
      t
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex-1 overflow-y-auto p-3 space-y-2", children: [
      tab === "agents" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(AgentListView, {}),
      tab === "teams" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(TeamListView, {}),
      tab === "log" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(LogView, {}),
      tab === "files" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(FileExplorer, {}),
      tab === "system" && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(SystemMonitor, {})
    ] })
  ] });
};

// plugins/agent-essentials/renderer/index.tsx
var import_jsx_runtime11 = require("react/jsx-runtime");
var activate = (context) => {
  console.log("[Agent Essentials] Renderer activated");
  const { React: React11, useAppStore, ui } = context;
  setIpc(context.ipc);
  const AgentEssentialsButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === "agents";
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("agents"),
        title: "Agent Essentials",
        children: "AE"
      }
    );
  };
  const cleanups = [];
  if (context.ui.registerStageView) {
    cleanups.push(context.ui.registerStageView({
      id: "agent-essentials-panel",
      name: "Agent Essentials",
      icon: import_lucide_react8.Bot,
      component: AgentsPanel
    }));
    cleanups.push(context.ui.registerNavigation({
      id: "agent-essentials-nav",
      label: "Agents",
      icon: import_lucide_react8.Bot,
      view: {
        id: "agent-essentials-panel",
        name: "Agent Essentials",
        icon: import_lucide_react8.Bot,
        component: AgentsPanel
      },
      order: 20
    }));
  } else {
    console.warn("[Agent Essentials] New UI API not available");
  }
  if (ui?.registerCommand) {
    cleanups.push(ui.registerCommand({
      id: "agent-essentials:open-agents",
      label: "Open Agents Panel",
      icon: import_lucide_react8.Bot,
      category: "Agent Essentials",
      action: () => {
        const store = useAppStore.getState();
        store.setActiveSidebarView("agents");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "agent-essentials:list-agents",
      label: "List Active Agents",
      icon: import_lucide_react8.List,
      category: "Agent Essentials",
      action: () => {
        const store = useAppStore.getState();
        store.setActiveSidebarView("agents");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "agent-essentials:create-agent",
      label: "Create New Agent",
      icon: import_lucide_react8.Plus,
      category: "Agent Essentials",
      action: () => {
        const store = useAppStore.getState();
        store.setActiveSidebarView("agents");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "agent-essentials:manage-teams",
      label: "Manage Agent Teams",
      icon: import_lucide_react8.Users,
      category: "Agent Essentials",
      action: () => {
        const store = useAppStore.getState();
        store.setActiveSidebarView("agents");
      }
    }));
  }
  context._cleanups = cleanups;
};
var deactivate = (context) => {
  console.log("[Agent Essentials] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
