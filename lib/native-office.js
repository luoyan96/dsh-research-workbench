// @copylee/dsh-office 1.2.0, Copyright (c) 2026 Copy, MIT. Integrated by Research Workbench; see NOTICE.md.

// src/workbench/native-office-activity.js
var key = /* @__PURE__ */ Symbol.for("research-workbench.native-office.activity.v1");
var activity = () => globalThis[key] ??= { pending: 0 };
async function trackOfficeCall(invoke) {
  const state2 = activity();
  state2.pending++;
  try {
    return await invoke();
  } finally {
    state2.pending--;
  }
}

// node_modules/@deepseek-ai/cosmokit/lib/index.js
function isNullable(value) {
  return value === null || value === void 0;
}
function isPlainObject(data) {
  return data && typeof data === "object" && !Array.isArray(data);
}
function filterKeys(object, filter) {
  return Object.fromEntries(Object.entries(object).filter(([key2, value]) => filter(key2, value)));
}
function mapValues(object, transform) {
  return Object.fromEntries(Object.entries(object).map(([key2, value]) => [key2, transform(value, key2)]));
}
function pick(source, keys, forced) {
  if (!keys) return { ...source };
  const result = {};
  for (const key2 of keys) if (forced || source[key2] !== void 0) result[key2] = source[key2];
  return result;
}
function defineProperty(object, key2, value) {
  return Object.defineProperty(object, key2, {
    writable: true,
    value,
    enumerable: false
  });
}
var write = /* @__PURE__ */ Symbol.for("cosmokit.volatile.write");
function snapshot(value, ancestors = /* @__PURE__ */ new Set()) {
  if (typeof value === "function") throw new TypeError("volatile config cannot contain functions");
  if (value === null || typeof value !== "object") return value;
  if (ancestors.has(value)) throw new TypeError("volatile config cannot contain cycles");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return Object.freeze(value.map((item) => snapshot(item, ancestors)));
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError("volatile config objects must be plain objects or arrays");
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key2, item]) => [key2, snapshot(item, ancestors)])));
  } finally {
    ancestors.delete(value);
  }
}
function createVolatile(value) {
  let current = snapshot(value);
  return Object.freeze({
    get: () => current,
    [write]: (value2) => {
      current = value2;
    }
  });
}
function isVolatile(value) {
  return typeof value === "object" && value !== null && write in value;
}
function is(type, value) {
  if (arguments.length === 1) return (value2) => is(type, value2);
  return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
  return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
  return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
var Binary;
(function(Binary2) {
  Binary2.is = isArrayBufferLike;
  Binary2.isSource = isArrayBufferSource;
  function fromSource(source) {
    if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    else return source;
  }
  Binary2.fromSource = fromSource;
  function toBase64(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
    let binary = "";
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  Binary2.toBase64 = toBase64;
  function fromBase64(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
    return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  }
  Binary2.fromBase64 = fromBase64;
  function toHex2(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
    return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Binary2.toHex = toHex2;
  function fromHex(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
    const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
    return Uint8Array.from(buffer).buffer;
  }
  Binary2.fromHex = fromHex;
})(Binary || (Binary = {}));
var base64ToArrayBuffer = Binary.fromBase64;
var arrayBufferToBase64 = Binary.toBase64;
var hexToArrayBuffer = Binary.fromHex;
var arrayBufferToHex = Binary.toHex;
function clone(source, refs = /* @__PURE__ */ new Map()) {
  if (!source || typeof source !== "object") return source;
  if (is("Date", source)) return new Date(source.valueOf());
  if (is("RegExp", source)) return new RegExp(source.source, source.flags);
  if (isArrayBufferLike(source)) return source.slice(0);
  if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const cached = refs.get(source);
  if (cached) return cached;
  if (Array.isArray(source)) {
    const result2 = [];
    refs.set(source, result2);
    source.forEach((value, index) => {
      result2[index] = Reflect.apply(clone, null, [value, refs]);
    });
    return result2;
  }
  const result = Object.create(Object.getPrototypeOf(source));
  refs.set(source, result);
  for (const key2 of Reflect.ownKeys(source)) {
    const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key2) };
    if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
    Reflect.defineProperty(result, key2, descriptor);
  }
  return result;
}
function deepEqual(a, b, strict) {
  const ancestors = /* @__PURE__ */ new Set();
  function compare(a2, b2) {
    if (a2 === b2) return true;
    if (isVolatile(a2) || isVolatile(b2)) return isVolatile(a2) && isVolatile(b2);
    if (!strict && isNullable(a2) && isNullable(b2)) return true;
    if (typeof a2 !== typeof b2 || typeof a2 !== "object" || !a2 || !b2) return false;
    if (ancestors.has(a2)) return false;
    function check(test, then) {
      return test(a2) ? test(b2) ? then(a2, b2) : false : test(b2) ? false : void 0;
    }
    ancestors.add(a2);
    try {
      return check(Array.isArray, (a3, b3) => {
        if (a3.length !== b3.length) return false;
        for (let index = 0; index < a3.length; index++) if (!compare(a3[index], b3[index])) return false;
        return true;
      }) ?? check(is("Date"), (a3, b3) => a3.valueOf() === b3.valueOf()) ?? check(is("URL"), (a3, b3) => a3.href === b3.href) ?? check(is("RegExp"), (a3, b3) => a3.source === b3.source && a3.flags === b3.flags) ?? check(isArrayBufferLike, (a3, b3) => {
        if (a3.byteLength !== b3.byteLength) return false;
        const viewA = new Uint8Array(a3);
        const viewB = new Uint8Array(b3);
        for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
        return true;
      }) ?? ((!strict || [a2, b2].every((value) => Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) && Object.keys({
        ...a2,
        ...b2
      }).every((key2) => compare(a2[key2], b2[key2])));
    } finally {
      ancestors.delete(a2);
    }
  }
  return compare(a, b);
}
function tokenize(source, delimiters2, delimiter) {
  const output2 = [];
  let state2 = 0;
  for (let i = 0; i < source.length; i++) {
    const code = source.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      if (state2 === 1) {
        const next = source.charCodeAt(i + 1);
        if (next >= 97 && next <= 122) output2.push(delimiter);
        output2.push(code + 32);
      } else {
        if (state2 !== 0) output2.push(delimiter);
        output2.push(code + 32);
      }
      state2 = 1;
    } else if (code >= 97 && code <= 122) {
      output2.push(code);
      state2 = 2;
    } else if (delimiters2.includes(code)) {
      if (state2 !== 0) output2.push(delimiter);
      state2 = 0;
    } else output2.push(code);
  }
  return String.fromCharCode(...output2);
}
function paramCase(source) {
  return tokenize(source, [45, 95], 45);
}
var hyphenate = paramCase;
var Time;
(function(Time2) {
  Time2.millisecond = 1;
  Time2.second = 1e3;
  Time2.minute = Time2.second * 60;
  Time2.hour = Time2.minute * 60;
  Time2.day = Time2.hour * 24;
  Time2.week = Time2.day * 7;
  let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
  function setTimezoneOffset(offset2) {
    timezoneOffset = offset2;
  }
  Time2.setTimezoneOffset = setTimezoneOffset;
  function getTimezoneOffset() {
    return timezoneOffset;
  }
  Time2.getTimezoneOffset = getTimezoneOffset;
  function getDateNumber(date2 = /* @__PURE__ */ new Date(), offset2) {
    if (typeof date2 === "number") date2 = new Date(date2);
    if (offset2 === void 0) offset2 = timezoneOffset;
    return Math.floor((date2.valueOf() / Time2.minute - offset2) / 1440);
  }
  Time2.getDateNumber = getDateNumber;
  function fromDateNumber(value, offset2) {
    const date2 = new Date(value * Time2.day);
    if (offset2 === void 0) offset2 = timezoneOffset;
    return new Date(+date2 + offset2 * Time2.minute);
  }
  Time2.fromDateNumber = fromDateNumber;
  const numeric = /\d+(?:\.\d+)?/.source;
  const timeRegExp = new RegExp(`^${[
    "w(?:eek(?:s)?)?",
    "d(?:ay(?:s)?)?",
    "h(?:our(?:s)?)?",
    "m(?:in(?:ute)?(?:s)?)?",
    "s(?:ec(?:ond)?(?:s)?)?"
  ].map((unit) => `(${numeric}${unit})?`).join("")}$`);
  function parseTime(source) {
    const capture = timeRegExp.exec(source);
    if (!capture) return 0;
    return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
  }
  Time2.parseTime = parseTime;
  function parseDate(date2) {
    const parsed = parseTime(date2);
    if (parsed) date2 = Date.now() + parsed;
    else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date2}`;
    else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date2}`;
    return date2 ? new Date(date2) : /* @__PURE__ */ new Date();
  }
  Time2.parseDate = parseDate;
  function format(ms) {
    const abs = Math.abs(ms);
    if (abs >= Time2.day - Time2.hour / 2) return Math.round(ms / Time2.day) + "d";
    else if (abs >= Time2.hour - Time2.minute / 2) return Math.round(ms / Time2.hour) + "h";
    else if (abs >= Time2.minute - Time2.second / 2) return Math.round(ms / Time2.minute) + "m";
    else if (abs >= Time2.second) return Math.round(ms / Time2.second) + "s";
    return ms + "ms";
  }
  Time2.format = format;
  function toDigits(source, length = 2) {
    return source.toString().padStart(length, "0");
  }
  Time2.toDigits = toDigits;
  function template(template2, time = /* @__PURE__ */ new Date()) {
    return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
  }
  Time2.template = template;
})(Time || (Time = {}));

// node_modules/@deepseek-ai/schemastery/lib/index.mjs
var kSchema = /* @__PURE__ */ Symbol.for("schemastery");
var kValidationError = /* @__PURE__ */ Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
  options;
  name = "ValidationError";
  constructor(message, options) {
    let prefix = "$";
    for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
    else if (typeof segment === "number") prefix += "[" + segment + "]";
    else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
    if (prefix.startsWith(".")) prefix = prefix.slice(1);
    super((prefix === "$" ? "" : `${prefix} `) + message);
    this.options = options;
  }
  static is(error) {
    return !!error?.[kValidationError];
  }
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
var Schema = function(options) {
  const schema = function(data, options2 = {}) {
    return Schema.resolve(data, schema, options2)[0];
  };
  if (options.refs) {
    const refs = mapValues(options.refs, (options2) => new Schema(options2));
    const getRef = (uid) => refs[uid];
    for (const key2 in refs) {
      const options2 = refs[key2];
      options2.sKey = getRef(options2.sKey);
      options2.inner = getRef(options2.inner);
      options2.list = options2.list && options2.list.map(getRef);
      options2.dict = options2.dict && mapValues(options2.dict, getRef);
    }
    return refs[options.uid];
  }
  Object.assign(schema, options);
  if (typeof schema.callback === "string") try {
    schema.callback = new Function("return " + schema.callback)();
  } catch {
  }
  Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
  Object.setPrototypeOf(schema, Schema.prototype);
  schema.meta ||= {};
  schema.toString = schema.toString.bind(schema);
  return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
  return {
    version: 1,
    vendor: "schemastery",
    validate: (value) => {
      try {
        return { value: Schema.resolve(value, this, {})[0] };
      } catch (error) {
        if (ValidationError.is(error)) return { issues: [{
          message: error.message,
          path: error.options.path
        }] };
        throw error;
      }
    }
  };
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
  if (globalThis.__schemastery_refs__) {
    globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
    return this.uid;
  }
  globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
  globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
  const result = {
    uid: this.uid,
    refs: globalThis.__schemastery_refs__
  };
  globalThis.__schemastery_refs__ = void 0;
  return result;
};
Schema.prototype.set = function set(key2, value) {
  this.dict[key2] = value;
  return this;
};
Schema.prototype.push = function push(value) {
  this.list.push(value);
  return this;
};
function mergeDesc(original, messages) {
  const result = typeof original === "string" ? { "": original } : { ...original };
  for (const locale in messages) {
    const value = messages[locale];
    if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
    else if (typeof value === "string") result[locale] = value;
  }
  return result;
}
function getInner(value) {
  return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
  return filterKeys(data ?? {}, (key2) => !key2.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
  const schema = Schema(this);
  const desc = mergeDesc(schema.meta.description, messages);
  if (Object.keys(desc).length) schema.meta.description = desc;
  if (schema.dict) schema.dict = mapValues(schema.dict, (inner2, key2) => {
    return inner2.i18n(mapValues(messages, (data) => getInner(data)?.[key2] ?? data?.[key2]));
  });
  if (schema.list) schema.list = schema.list.map((inner2, index) => {
    return inner2.i18n(mapValues(messages, (data = {}) => {
      if (Array.isArray(getInner(data))) return getInner(data)[index];
      if (Array.isArray(data)) return data[index];
      return extractKeys(data);
    }));
  });
  if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
    if (getInner(data)) return getInner(data);
    return extractKeys(data);
  }));
  if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
  return schema;
};
Schema.prototype.extra = function extra(key2, value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key2]: value
  };
  return schema;
};
for (const key2 of [
  "required",
  "disabled",
  "collapse",
  "hidden",
  "loose"
]) Object.assign(Schema.prototype, { [key2](value = true) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key2]: value
  };
  return schema;
} });
Schema.prototype.deprecated = function deprecated() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "deprecated",
    type: "danger"
  });
  return schema;
};
Schema.prototype.experimental = function experimental() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "experimental",
    type: "warning"
  });
  return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
  const schema = Schema(this);
  const pattern2 = pick(regexp, ["source", "flags"]);
  schema.meta = {
    ...schema.meta,
    pattern: pattern2
  };
  return schema;
};
Schema.prototype.simplify = function simplify(value) {
  if (isVolatile(value)) value = value.get();
  if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
  if (isNullable(value)) return value;
  if (this.type === "object" || this.type === "dict") {
    const result = {};
    for (const key2 in value) {
      const item = (this.type === "object" ? this.dict[key2] : this.inner)?.simplify(value[key2]);
      if (this.type === "dict" || !isNullable(item)) result[key2] = item;
    }
    if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
    return result;
  } else if (this.type === "array" || this.type === "tuple") {
    const result = [];
    value.forEach((value2, index) => {
      const schema = this.type === "array" ? this.inner : this.list[index];
      const item = schema ? schema.simplify(value2) : value2;
      result.push(item);
    });
    return result;
  } else if (this.type === "intersect") {
    const result = {};
    for (const item of this.list) Object.assign(result, item.simplify(value));
    return result;
  } else if (this.type === "union") for (const schema of this.list) try {
    Schema.resolve(value, schema, {});
    return schema.simplify(value);
  } catch {
  }
  return value;
};
Schema.prototype.toString = function toString(inline) {
  return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra2) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    role,
    extra: extra2
  };
  return schema;
};
for (const key2 of [
  "default",
  "link",
  "comment",
  "description",
  "max",
  "min",
  "step"
]) Object.assign(Schema.prototype, { [key2](value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key2]: value
  };
  return schema;
} });
Schema.prototype.volatile = function volatile() {
  if (this.meta.volatile) throw new TypeError("volatile schema is already wrapped");
  return this.extra("volatile", true);
};
var resolvers = {};
var checkedVolatile = /* @__PURE__ */ Symbol("checked-volatile-schema");
function validateVolatileSchema(schema, path = [], blocked = false, seen = /* @__PURE__ */ new Map()) {
  const states = seen.get(schema) ?? /* @__PURE__ */ new Set();
  if (states.has(blocked)) return;
  states.add(blocked);
  seen.set(schema, states);
  if (schema.meta?.volatile && blocked) throw new ValidationError("volatile fields require a fixed object path without an enclosing volatile field", { path });
  const nested = blocked || !!schema.meta?.volatile;
  if (schema.dict) for (const [key2, child] of Object.entries(schema.dict)) validateVolatileSchema(child, [...path, key2], nested, seen);
  if (schema.sKey) validateVolatileSchema(schema.sKey, [...path, "<key>"], true, seen);
  if (schema.inner && (schema.type !== "lazy" || schema.inner[kSchema])) validateVolatileSchema(schema.inner, [...path, "*"], true, seen);
  if (schema.list) for (let index = 0; index < schema.list.length; index++) validateVolatileSchema(schema.list[index], [...path, String(index)], true, seen);
}
Schema.extend = function extend(type, resolve2) {
  resolvers[type] = resolve2;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
  if (!schema) return [data];
  if (!options[checkedVolatile]) {
    validateVolatileSchema(schema, options.path);
    options = {
      ...options,
      [checkedVolatile]: true
    };
  }
  if (schema.meta?.volatile) {
    const inner2 = Schema(schema);
    inner2.meta = {
      ...schema.meta,
      volatile: false
    };
    const [value, adapted] = Schema.resolve(data, inner2, options, strict);
    try {
      return [createVolatile(value), adapted];
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : String(error), options);
    }
  }
  if (options.ignore?.(data, schema)) return [data];
  if (isNullable(data) && schema.type !== "lazy") {
    if (schema.meta.required) throw new ValidationError(`missing required value`, options);
    let current = schema;
    let fallback = schema.meta.default;
    while (current?.type === "intersect" && isNullable(fallback)) {
      current = current.list[0];
      fallback = current?.meta.default;
    }
    if (isNullable(fallback)) return [data];
    data = clone(fallback);
  }
  const callback = resolvers[schema.type];
  if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
  try {
    return callback(data, schema, options, strict);
  } catch (error) {
    if (!schema.meta.loose) throw error;
    return [schema.meta.default];
  }
};
Schema.from = function from(source) {
  if (isNullable(source)) return Schema.any();
  else if ([
    "string",
    "number",
    "boolean"
  ].includes(typeof source)) return Schema.const(source).required();
  else if (source[kSchema]) return source;
  else if (typeof source === "function") switch (source) {
    case String:
      return Schema.string().required();
    case Number:
      return Schema.number().required();
    case Boolean:
      return Schema.boolean().required();
    case Function:
      return Schema.function().required();
    default:
      return Schema.is(source).required();
  }
  else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
  const toJSON2 = () => {
    if (!schema.inner[kSchema]) {
      schema.inner = schema.builder();
      schema.inner.meta = {
        ...schema.meta,
        ...schema.inner.meta
      };
    }
    return schema.inner.toJSON();
  };
  const schema = new Schema({
    type: "lazy",
    builder,
    inner: { toJSON: toJSON2 }
  });
  return schema;
};
Schema.natural = function natural() {
  return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
  return Schema.number().step(0.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
  return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
    const date2 = new Date(value);
    if (isNaN(+date2)) throw new ValidationError(`invalid date "${value}"`, options);
    return date2;
  }, true)]);
};
Schema.regExp = function regExp(flag = "") {
  return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
    try {
      return new RegExp(value, flag);
    } catch (e) {
      throw new ValidationError(e.message, options);
    }
  }, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
  return Schema.union([
    Schema.is(ArrayBuffer),
    Schema.is(SharedArrayBuffer),
    Schema.transform(Schema.any(), (value, options) => {
      if (Binary.isSource(value)) return Binary.fromSource(value);
      throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
    }, true),
    ...encoding ? [Schema.transform(Schema.string(), (value, options) => {
      try {
        return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
      } catch (e) {
        throw new ValidationError(e.message, options);
      }
    }, true)] : []
  ]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
  if (!schema.inner[kSchema]) {
    schema.inner = schema.builder();
    schema.inner.meta = {
      ...schema.meta,
      ...schema.inner.meta
    };
    validateVolatileSchema(schema.inner, options.path, true);
  }
  return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
  return [data];
});
Schema.extend("never", (data, _, options) => {
  throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
  if (deepEqual(data, value)) return [value];
  throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
  const { max = Infinity, min = -Infinity } = meta;
  if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
  if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
  if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
  if (meta.pattern) {
    const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
    if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
  }
  checkWithinRange(data.length, meta, "string length", options);
  return [data];
});
function decimalShift(data, digits) {
  const str = data.toString();
  if (str.includes("e")) return data * Math.pow(10, digits);
  const index = str.indexOf(".");
  if (index === -1) return data * Math.pow(10, digits);
  const frac = str.slice(index + 1);
  const integer = str.slice(0, index);
  if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
  return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
  step = Math.abs(step);
  if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
  const index = step.toString().indexOf(".");
  const digits = step.toString().slice(index + 1).length;
  return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
  if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
  checkWithinRange(data, meta, "number", options);
  const { step } = meta;
  if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
  return [data];
});
Schema.extend("boolean", (data, _, options) => {
  if (typeof data === "boolean") return [data];
  throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
  let value = 0, keys = [];
  if (typeof data === "number") {
    value = data;
    for (const key2 in bits) if (data & bits[key2]) keys.push(key2);
  } else if (Array.isArray(data)) {
    keys = data;
    for (const key2 of keys) {
      if (typeof key2 !== "string") throw new ValidationError(`expected string but got ${key2}`, options);
      if (key2 in bits) value |= bits[key2];
    }
  } else throw new ValidationError(`expected number or array but got ${data}`, options);
  if (value === meta.default) return [value];
  return [value, keys];
});
Schema.extend("function", (data, _, options) => {
  if (typeof data === "function") return [data];
  throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
  if (typeof constructor === "function") {
    if (data instanceof constructor) return [data];
    throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
  } else {
    if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
    let prototype = Object.getPrototypeOf(data);
    while (prototype) {
      if (prototype.constructor?.name === constructor) return [data];
      prototype = Object.getPrototypeOf(prototype);
    }
    throw new ValidationError(`expected ${constructor} but got ${data}`, options);
  }
});
function property(data, key2, schema, options) {
  try {
    const [value, adapted] = Schema.resolve(data[key2], schema, {
      ...options,
      path: [...options.path || [], key2]
    });
    if (adapted !== void 0) data[key2] = adapted;
    return value;
  } catch (e) {
    if (!options?.autofix) throw e;
    delete data[key2];
    return schema.meta.volatile ? createVolatile(schema.meta.default) : schema.meta.default;
  }
}
Schema.extend("array", (data, { inner: inner2, meta }, options) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  checkWithinRange(data.length, meta, "array length", options, !isNullable(inner2.meta.default));
  return [data.map((_, index) => property(data, index, inner2, options))];
});
Schema.extend("dict", (data, { inner: inner2, sKey }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key2 in data) {
    let rKey;
    try {
      rKey = Schema.resolve(key2, sKey, options)[0];
    } catch (error) {
      if (strict) continue;
      throw error;
    }
    result[rKey] = property(data, key2, inner2, options);
    data[rKey] = data[key2];
    if (key2 !== rKey) delete data[key2];
  }
  return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  const result = list.map((inner2, index) => property(data, index, inner2, options));
  if (strict) return [result];
  result.push(...data.slice(list.length));
  return [result];
});
function merge(result, data) {
  for (const key2 in data) {
    if (key2 in result) continue;
    result[key2] = data[key2];
  }
}
Schema.extend("object", (data, { dict }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key2 in dict) {
    const value = property(data, key2, dict[key2], options);
    if (!isNullable(value) || key2 in data) result[key2] = value;
  }
  if (!strict) merge(result, data);
  return [result];
});
Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
  const messages = [];
  for (const inner2 of list) try {
    return Schema.resolve(data, inner2, options, strict);
  } catch (error) {
    messages.push(error);
  }
  throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
  if (!list.length) return [data];
  let result;
  for (const inner2 of list) {
    const value = Schema.resolve(data, inner2, options, true)[0];
    if (isNullable(value)) continue;
    if (isNullable(result)) result = value;
    else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
    else if (typeof value === "object") merge(result ??= {}, value);
    else if (result !== value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
  }
  if (!strict && isPlainObject(data)) merge(result, data);
  return [result];
});
Schema.extend("transform", (data, { inner: inner2, callback, preserve }, options) => {
  const [result, adapted = data] = Schema.resolve(data, inner2, options, true);
  if (preserve) return [callback(result)];
  else return [callback(result), callback(adapted)];
});
var formatters = {};
function defineMethod(name2, keys, format) {
  formatters[name2] = format;
  Object.assign(Schema, { [name2](...args) {
    const schema = new Schema({ type: name2 });
    keys.forEach((key2, index) => {
      switch (key2) {
        case "sKey":
          schema.sKey = args[index] ?? Schema.string();
          break;
        case "inner":
          schema.inner = Schema.from(args[index]);
          break;
        case "list":
          schema.list = args[index].map(Schema.from);
          break;
        case "dict":
          schema.dict = mapValues(args[index], Schema.from);
          break;
        case "bits":
          schema.bits = {};
          for (const key3 in args[index]) {
            if (typeof args[index][key3] !== "number") continue;
            schema.bits[key3] = args[index][key3];
          }
          break;
        case "callback": {
          const callback = schema.callback = args[index];
          callback["toJSON"] ||= () => callback.toString();
          break;
        }
        case "constructor": {
          const constructor = schema.constructor = args[index];
          if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
          break;
        }
        default:
          schema[key2] = args[index];
      }
    });
    if (name2 === "object" || name2 === "dict") schema.meta.default = {};
    else if (name2 === "array" || name2 === "tuple") schema.meta.default = [];
    else if (name2 === "bitset") schema.meta.default = 0;
    return schema;
  } });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
  if (typeof constructor === "function") return constructor.name;
  else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner: inner2 }) => `${inner2.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner: inner2, sKey }) => `{ [key: ${sKey.toString()}]: ${inner2.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner2) => inner2.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
  if (Object.keys(dict).length === 0) return "{}";
  return `{ ${Object.entries(dict).map(([key2, inner2]) => {
    return `${key2}${inner2.meta.required ? "" : "?"}: ${inner2.toString()}`;
  }).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
  const result = list.map(({ toString: format }) => format()).join(" | ");
  return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
  return `${list.map((inner2) => inner2.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
  "inner",
  "callback",
  "preserve"
], ({ inner: inner2 }, isInner) => inner2.toString(isInner));

// vendor/copylee-office/src/helper-client.ts
import { spawn, execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
var REFERENCES = [
  "System.dll",
  "System.Core.dll",
  "Microsoft.CSharp.dll",
  "System.Drawing.dll",
  "System.Windows.Forms.dll",
  "System.Web.Extensions.dll"
];
function helperAssetPath(name2) {
  const candidates = [`../helper/${name2}`, `../../helper/${name2}`].map((rel2) => fileURLToPath(new URL(rel2, import.meta.url)));
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}
function helperSourcePath() {
  return helperAssetPath("OfficeHelper.cs");
}
function frameworkDir() {
  const windir = process.env.SystemRoot ?? process.env.windir ?? "C:\\Windows";
  for (const arch of ["Framework64", "Framework"]) {
    const dir = join(windir, "Microsoft.NET", arch, "v4.0.30319");
    if (existsSync(join(dir, "csc.exe"))) return dir;
  }
  throw new Error('The .NET Framework 4 C# compiler (csc.exe) was not found. It ships with Windows 10/11; enable ".NET Framework 4.8" in Windows Features.');
}
function cacheRoot() {
  return join(process.env.LOCALAPPDATA ?? tmpdir(), "research-workbench-office");
}
var building;
async function ensureHelperExe(source = helperSourcePath()) {
  building ??= (async () => {
    const code = await readFile(source);
    const hash = createHash("sha256").update(code).digest("hex").slice(0, 12);
    const debug = process.env.DSH_OFFICE_DEBUG === "1";
    const dir = join(cacheRoot(), `helper-${hash}${debug ? "-debug" : ""}`);
    const exe = join(dir, "office-helper.exe");
    if (existsSync(exe)) return exe;
    await mkdir(dir, { recursive: true });
    const fw = frameworkDir();
    const temp = join(dir, `build-${process.pid}-${Date.now()}.exe`);
    const args = [
      "-nologo",
      ...debug ? ["-debug:pdbonly"] : ["-optimize+"],
      "-target:exe",
      `-out:${temp}`,
      ...REFERENCES.map((ref) => `-r:${ref}`),
      source
    ];
    await new Promise((resolve2, reject) => {
      execFile(join(fw, "csc.exe"), args, { windowsHide: true, timeout: 12e4 }, (error, stdout) => {
        if (error) reject(new Error(`Compiling the office helper failed: ${String(stdout).trim() || error.message}`));
        else resolve2();
      });
    });
    try {
      await rename(temp, exe);
    } catch (error) {
      await rm(temp, { force: true });
      if (!existsSync(exe)) throw error;
    }
    return exe;
  })();
  try {
    return await building;
  } catch (error) {
    building = void 0;
    throw error;
  }
}
var HelperClient = class {
  constructor(log = () => {
  }) {
    this.log = log;
  }
  log;
  child;
  starting;
  pending = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  nextId = 0;
  disposed = false;
  onEvent(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  async call(cmd, args = {}, timeoutMs = 2e4) {
    if (this.disposed) throw new Error("office helper is shut down");
    const child = await this.ensure();
    const id = ++this.nextId;
    return new Promise((resolve2, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`office helper timed out on "${cmd}"`));
        this.kill();
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve2, reject, timer });
      child.stdin.write(`${JSON.stringify({ ...args, id, cmd })}
`);
    });
  }
  dispose() {
    this.disposed = true;
    this.kill();
  }
  kill() {
    const child = this.child;
    this.child = void 0;
    this.starting = void 0;
    if (child && child.exitCode === null) {
      try {
        child.stdin.end();
      } catch {
      }
      setTimeout(() => {
        if (child.exitCode === null) child.kill();
      }, 800).unref();
    }
  }
  ensure() {
    if (this.child && this.child.exitCode === null) return Promise.resolve(this.child);
    this.starting ??= this.start().catch((error) => {
      this.starting = void 0;
      throw error;
    });
    return this.starting;
  }
  async start() {
    const exe = await ensureHelperExe();
    const child = spawn(exe, [], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let buffer = "";
    let ready;
    const readyPromise = new Promise((resolve2, reject) => {
      ready = resolve2;
      child.once("error", reject);
      setTimeout(() => reject(new Error("office helper did not start")), 15e3).unref();
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (line) this.handle(line, () => ready?.());
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => this.log(`helper stderr: ${chunk.trim()}`));
    child.on("exit", (code) => {
      if (this.child === child) this.child = void 0;
      this.starting = void 0;
      for (const [id, entry] of this.pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error(`office helper exited (code ${String(code)})`));
        this.pending.delete(id);
      }
    });
    await readyPromise;
    this.child = child;
    return child;
  }
  handle(line, onReady) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.log(`helper sent a non-JSON line: ${line.slice(0, 200)}`);
      return;
    }
    if (typeof message.event === "string") {
      if (message.event === "ready") {
        onReady();
        return;
      }
      for (const listener of this.listeners) {
        try {
          listener({ event: message.event, ...message.reason === void 0 ? {} : { reason: message.reason } });
        } catch {
        }
      }
      return;
    }
    if (typeof message.id !== "number") return;
    const entry = this.pending.get(message.id);
    if (!entry) return;
    this.pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.ok) entry.resolve(message.result ?? null);
    else entry.reject(Object.assign(new Error(message.error ?? "helper error"), { code: message.code ?? "ERROR" }));
  }
};

// vendor/copylee-office/src/prompt.ts
var FILE_SKILLS = { "office-docx": "word", "office-pptx": "ppt" };
var APPS = { word: "Microsoft Word", ppt: "Microsoft PowerPoint" };
function redirectText(skill, app) {
  return [
    `Skill ${skill} on this computer: ${APPS[app]} (or WPS Office) is installed, so this work is done inside the app itself with the research_office_ tools, not by building the file with a script.`,
    "Call research_office_open with the absolute path (a path that does not exist yet creates the document; the app is started for you if it is not running), then research_office_read, research_office_edit, research_office_render, research_office_save. The user watches the document take shape in the window and can edit alongside; formulas, captions and layout are done by the app itself.",
    `Only if the task truly cannot be done that way (converting many files in bulk, a file the app cannot open, no document to show), call skill "${skill}" again and it will load.`
  ].join("\n");
}
function promptText() {
  return [
    "# Office documents (Word, Excel, PowerPoint)",
    "The research_office_ tools work inside the real Office apps on this computer (Microsoft Office, or WPS Office where that is what the user has \u2014 the tools and operations are the same): the document is open in its window, every change you make appears there at once, and the user can read and edit alongside you.",
    "- For any Word or PowerPoint work, creating a new document included, start with research_office_open (it starts the app if it is not running, and a path that does not exist yet creates the file), then research_office_read and research_office_edit. Do not load the office-docx / office-pptx skills and do not write the file with a script: an open file cannot be overwritten, and the user would not see the work.",
    "- Spreadsheets are the exception. Data analysis, and reading or producing .xlsx / .csv files, is done with code (the office-xlsx skill, pandas and the like), not in the Excel window. Use the research_office_ tools on a workbook only when the user asks for the work to be done in Excel or WPS Spreadsheets. If a workbook is open there and cannot be written, write the result to a copy; that also keeps the original data intact.",
    "- Put all the changes you can into one research_office_edit call; it runs them in order. What it can do in an app (the operations and their fields) is listed with the result of your first research_office_open or research_office_read there, and by research_office_help; it covers formulas, tables, pictures, SmartArt diagrams, shapes, styles and page layout, so look there before reaching for anything else.",
    '- The user may edit while you work. Read again before editing a part you have not just read, and pass "expect" on Word paragraphs.',
    "- Use these tools, not python-docx / python-pptx or other file libraries, whenever the document is to be worked on in the user's Office app or is already open there; and check the result with research_office_render, not by converting the file with another renderer, which lays it out differently from Word.",
    "- Finish with a polish pass, it is part of the job: research_office_render with overview: true for the whole document at a glance, then the pages that need a closer look; look at the pictures the way a careful reader would, fix what is off with research_office_edit, and render again until it is right. Look for: content outside the frame or section it belongs to; fonts, sizes and line spacing that differ from the surrounding text or from what the template asks for; formulas left as plain text; tables that are too wide, uneven or uncentred; captions not next to their table or figure; leftover template hints and sample text; runs of blank paragraphs and half-empty pages (in Word, fill_gaps closes the ones before figures and tables); pictures that are too small for their lettering to be read, or that leave most of a slide empty. Then research_office_save. Nothing is saved until you call research_office_save; do not close the user's documents.",
    "- In Word, formulas are LaTeX between dollar signs ($...$ inline, $$...$$ on its own line); they become native equations. Citations are \\cite{n} plus insert_references.",
    "- Set the look through styles before writing a long document (style_format for Normal and the headings, page_setup); all of that is done with research_office_edit, not with mouse and keyboard in Word's dialogs.",
    "- When filling in a template, keep its structure: put each part where its heading is, replace or delete the sample text and hints, and match the formatting the template asks for.",
    "- If a call reports the app is busy, the user is typing or has a dialog open: wait a moment and retry.",
    "- If you also have mouse / keyboard computer tools, use them on an Office window only for what research_office_edit cannot do, such as a setting that exists only in a dialog."
  ].join("\n");
}

// vendor/copylee-office/src/settings.ts
var ENTRY_ID = "research-native-office";
var DEFAULTS = {
  suite: "auto",
  silent: false,
  follow: true,
  typing: true,
  card: true,
  finalCheck: true,
  preferLive: true,
  showOnOpen: true,
  renderWidth: 1100
};
function resolveConfig(raw) {
  const out = {};
  if (raw !== null && typeof raw === "object") {
    for (const [key2, value] of Object.entries(raw)) {
      out[key2] = value !== null && typeof value === "object" && typeof value.get === "function" ? value.get() : value;
    }
  }
  const width = out.renderWidth;
  return {
    suite: out.suite === "office" || out.suite === "wps" ? out.suite : DEFAULTS.suite,
    silent: typeof out.silent === "boolean" ? out.silent : DEFAULTS.silent,
    follow: typeof out.follow === "boolean" ? out.follow : DEFAULTS.follow,
    typing: typeof out.typing === "boolean" ? out.typing : DEFAULTS.typing,
    card: typeof out.card === "boolean" ? out.card : DEFAULTS.card,
    finalCheck: typeof out.finalCheck === "boolean" ? out.finalCheck : DEFAULTS.finalCheck,
    preferLive: typeof out.preferLive === "boolean" ? out.preferLive : DEFAULTS.preferLive,
    showOnOpen: typeof out.showOnOpen === "boolean" ? out.showOnOpen : DEFAULTS.showOnOpen,
    renderWidth: typeof width === "number" && Number.isFinite(width) ? Math.min(2e3, Math.max(600, Math.round(width))) : DEFAULTS.renderWidth
  };
}

// vendor/copylee-office/src/tools.ts
import { access, copyFile, mkdir as mkdir2, readFile as readFile2, rm as rm2 } from "node:fs/promises";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join2, win32 } from "node:path";

// node_modules/@deepseek-ai/cordis/lib/index.js
var DisposableList = class {
  sn = 0;
  map = /* @__PURE__ */ new Map();
  weak = /* @__PURE__ */ new WeakMap();
  get length() {
    return this.map.size;
  }
  push(value) {
    const sn = ++this.sn;
    this.map.set(sn, value);
    this.weak.set(value, sn);
    return () => this.map.delete(sn);
  }
  delete(value) {
    const sn = this.weak.get(value);
    if (!sn) return false;
    return this.map.delete(sn);
  }
  clear() {
    const values = [...this.map.values()];
    this.map.clear();
    return values.reverse();
  }
  [Symbol.iterator]() {
    return this.map.values();
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this];
  }
};
var symbols = {
  shadow: /* @__PURE__ */ Symbol.for("cordis.shadow"),
  receiver: /* @__PURE__ */ Symbol.for("cordis.receiver"),
  original: /* @__PURE__ */ Symbol.for("cordis.original"),
  metadata: /* @__PURE__ */ Symbol.for("cordis.metadata"),
  initHooks: /* @__PURE__ */ Symbol.for("cordis.initHooks"),
  checkProto: /* @__PURE__ */ Symbol.for("cordis.checkProto"),
  effect: /* @__PURE__ */ Symbol.for("cordis.effect"),
  filter: /* @__PURE__ */ Symbol.for("cordis.filter"),
  isolate: /* @__PURE__ */ Symbol.for("cordis.isolate"),
  intercept: /* @__PURE__ */ Symbol.for("cordis.intercept"),
  init: /* @__PURE__ */ Symbol.for("cordis.init"),
  check: /* @__PURE__ */ Symbol.for("cordis.check"),
  config: /* @__PURE__ */ Symbol.for("cordis.config"),
  invoke: /* @__PURE__ */ Symbol.for("cordis.invoke"),
  extend: /* @__PURE__ */ Symbol.for("cordis.extend"),
  tracker: /* @__PURE__ */ Symbol.for("cordis.tracker"),
  resolveConfig: /* @__PURE__ */ Symbol.for("cordis.resolveConfig")
};
var GeneratorFunction = function* () {
}.constructor;
var AsyncGeneratorFunction = async function* () {
}.constructor;
function isConstructor(func) {
  if (!func.prototype) return false;
  if (func instanceof GeneratorFunction) return false;
  if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
  return true;
}
function joinPrototype(proto1, proto2) {
  if (proto1 === Object.prototype) return proto2;
  const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
  for (const key2 of Reflect.ownKeys(proto1)) Object.defineProperty(result, key2, Object.getOwnPropertyDescriptor(proto1, key2));
  return result;
}
function isObject(value) {
  return value && (typeof value === "object" || typeof value === "function");
}
function getPropertyDescriptor(target, prop) {
  let proto = target;
  while (proto) {
    const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
    if (desc) return desc;
    proto = Object.getPrototypeOf(proto);
  }
}
function getTraceable(ctx, value) {
  if (!isObject(value)) return value;
  if (Object.hasOwn(value, symbols.shadow)) return Object.getPrototypeOf(value);
  const tracker = value[symbols.tracker];
  if (!tracker) return value;
  return createTraceable(ctx, value, tracker);
}
function withProps(target, props) {
  if (!props) return target;
  return new Proxy(target, {
    get: (target2, prop, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
      return Reflect.get(target2, prop, receiver);
    },
    set: (target2, prop, value, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
      return Reflect.set(target2, prop, value, receiver);
    }
  });
}
function withProp(target, prop, value) {
  return withProps(target, Object.defineProperty(/* @__PURE__ */ Object.create(null), prop, {
    value,
    writable: false
  }));
}
function createShadow(ctx, target, property2, receiver) {
  if (!property2) return receiver;
  const origin = Reflect.getOwnPropertyDescriptor(target, property2)?.value;
  if (!origin) return receiver;
  return withProp(receiver, property2, ctx.extend({ [symbols.shadow]: origin }));
}
function createShadowMethod(ctx, value, outer, shadow) {
  return new Proxy(value, { apply: (target, thisArg, args) => {
    if (thisArg === outer) thisArg = shadow;
    return getTraceable(ctx, Reflect.apply(target, thisArg, args));
  } });
}
function createTraceable(ctx, value, tracker) {
  if (ctx[symbols.shadow] && !tracker.noShadow) ctx = Object.getPrototypeOf(ctx);
  const proxy = new Proxy(value, {
    get: (target, prop, receiver) => {
      if (prop === symbols.original) return target;
      if (prop === tracker.property) return ctx;
      if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
      if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
      let shadow, innerValue;
      const desc = getPropertyDescriptor(target, prop);
      if (desc && "value" in desc) innerValue = desc.value;
      else {
        shadow = createShadow(ctx, target, tracker.property, receiver);
        innerValue = Reflect.get(target, prop, shadow);
      }
      const innerTracker = innerValue?.[symbols.tracker];
      if (innerTracker) return createTraceable(ctx, innerValue, innerTracker);
      else if (!tracker.noShadow && typeof innerValue === "function") {
        shadow ??= createShadow(ctx, target, tracker.property, receiver);
        return createShadowMethod(ctx, innerValue, receiver, shadow);
      } else return innerValue;
    },
    set: (target, prop, value2, receiver) => {
      if (prop === symbols.original) return false;
      if (prop === tracker.property) return false;
      if (typeof prop === "symbol") return Reflect.set(target, prop, value2, receiver);
      if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.set(ctx, `${tracker.associate}.${prop}`, value2, withProp(ctx, symbols.receiver, receiver));
      const shadow = createShadow(ctx, target, tracker.property, receiver);
      return Reflect.set(target, prop, value2, shadow);
    },
    apply: (target, thisArg, args) => {
      return applyTraceable(proxy, target, thisArg, args);
    }
  });
  return proxy;
}
function applyTraceable(proxy, value, thisArg, args) {
  if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
  return value[symbols.invoke].apply(proxy, args);
}
function createCallable(name2, proto, tracker) {
  const self = function(...args) {
    return applyTraceable(createTraceable(self["ctx"], self, tracker), self, this, args);
  };
  defineProperty(self, "name", name2);
  return Object.setPrototypeOf(self, proto);
}
function handleError(info, reason, getOuterStack) {
  const innerLines = info.error.stack.split("\n");
  if (typeof reason?.stack !== "string") {
    const outerError = new Error(reason);
    const lines2 = outerError.stack.split("\n");
    lines2.splice(1, Infinity, ...getOuterStack());
    outerError.stack = lines2.join("\n");
    throw outerError;
  }
  const lines = reason.stack.split("\n");
  let index = lines.indexOf(innerLines[2]);
  if (index === -1) throw reason;
  index -= info.offset;
  while (index > 0) {
    if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
    index -= 1;
  }
  lines.splice(index, Infinity, ...getOuterStack());
  reason.stack = lines.join("\n");
  throw reason;
}
function composeError(callback, getOuterStack = buildOuterStack()) {
  const info = {
    offset: 1,
    error: /* @__PURE__ */ new Error()
  };
  try {
    const result = callback(info);
    if (isObject(result) && "then" in result) return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
    else return result;
  } catch (reason) {
    handleError(info, reason, getOuterStack);
  }
}
function buildOuterStack(offset2 = 0) {
  const outerError = /* @__PURE__ */ new Error();
  return () => outerError.stack.split("\n").slice(3 + offset2);
}
function isBailed(value) {
  return value !== null && value !== false && value !== void 0;
}
var EventsService = class {
  ctx;
  _hooks = {};
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.on("internal/listener", function(name2, listener, options) {
      if (name2 === "internal/update" && !options.global) return (this.fiber._hooks["internal/update"] ??= new DisposableList())[options.prepend ? "unshift" : "push"](listener);
    });
    this.on("internal/update", function(config, noSave, next) {
      const cbs = [...this._hooks["internal/update"] || []];
      const _next = () => {
        return (cbs.shift() ?? next).call(this, config, noSave, _next);
      };
      return _next();
    }, {
      global: true,
      prepend: true
    });
  }
  /**
  * Resolve listeners for one dispatch and apply context filtering.
  *
  * @param type — the dispatch mode, reported on `internal/dispatch`.
  * @param args — the raw dispatch arguments; consumed up to the event name.
  * @returns the matching listener callbacks, bound to the dispatch `this`.
  */
  dispatch(type, args) {
    const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
    const name2 = args.shift();
    if (!name2.startsWith("internal/")) this.emit("internal/dispatch", type, name2, args, thisArg);
    const filter = thisArg?.[Context.filter];
    return (this._hooks[name2] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback.bind(thisArg));
  }
  /**
  * Run listeners concurrently and wait for all of them.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns a promise resolving once every listener has settled.
  */
  async parallel(...args) {
    const errors = (await Promise.allSettled(this.dispatch("emit", args).map(async (cb) => cb(...args)))).filter((result) => result.status === "rejected");
    if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
  }
  /**
  * Run listeners synchronously without waiting for returned promises.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  */
  emit(...args) {
    this.dispatch("emit", args).map((cb) => cb(...args));
  }
  /**
  * Run listeners in order, awaiting each, until one returns a bail value.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns the first bail value (see {@link isBailed}), if any.
  */
  async serial(...args) {
    for (const cb of this.dispatch("serial", args)) {
      const result = await cb(...args);
      if (isBailed(result)) return result;
    }
  }
  /**
  * Run listeners synchronously until one returns a bail value.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns the first bail value (see {@link isBailed}), if any.
  */
  bail(...args) {
    for (const cb of this.dispatch("bail", args)) {
      const result = cb(...args);
      if (isBailed(result)) return result;
    }
  }
  /**
  * Compose listeners around the final `next` callback.
  *
  * The last dispatch argument is treated as the innermost `next`. Listeners
  * run outermost-first; a listener that does not call `next()` vetoes the
  * rest of the chain, including the built-in behavior.
  *
  * @param args — optional `this`, the event name, listener arguments, then `next`.
  * @returns the outermost listener's return value.
  */
  waterfall(...args) {
    const cbs = this.dispatch("waterfall", args);
    const inner2 = args.pop();
    const next = () => {
      return (cbs.shift() ?? inner2)(...args);
    };
    args.push(next);
    return next();
  }
  /**
  * Store a listener record as an effect on the current fiber.
  *
  * @param label — effect label shown in fiber diagnostics.
  * @param hooks — the listener list for one event.
  * @param callback — the listener to store.
  * @param options — placement and filtering options.
  * @returns a disposer that unregisters the listener.
  */
  register(label, hooks, callback, options) {
    const method = options.prepend ? "unshift" : "push";
    return this.ctx.fiber.effect(() => {
      hooks[method]({
        ctx: this.ctx,
        callback,
        ...options
      });
      return () => this.unregister(hooks, callback);
    }, label);
  }
  /**
  * Remove a stored listener record.
  *
  * @param hooks — the listener list for one event.
  * @param callback — the listener to remove.
  * @returns `true` if the listener was found and removed.
  */
  unregister(hooks, callback) {
    const index = hooks.findIndex((hook) => hook.callback === callback);
    if (index >= 0) {
      hooks.splice(index, 1);
      return true;
    }
  }
  /**
  * Register an event listener owned by the current fiber.
  *
  * The listener is removed automatically when the fiber unloads. Throws
  * `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
  *
  * @param name — the event name to listen for.
  * @param listener — called with the dispatch arguments.
  * @param options — listener options; a boolean is shorthand for `prepend`.
  * @returns a disposer removing the listener; `true` if it was still registered.
  */
  on(name2, listener, options) {
    if (typeof options !== "object") options = { prepend: options };
    this.ctx.fiber.assertActive();
    listener = this.ctx.reflect.bind(listener);
    const result = this.bail(this.ctx, "internal/listener", name2, listener, options);
    if (result) return result;
    const hooks = this._hooks[name2] ||= [];
    const label = `ctx.on(${typeof name2 === "string" ? JSON.stringify(name2) : name2.toString()})`;
    return this.register(label, hooks, listener, options);
  }
  /**
  * Register an event listener that disposes itself after the first call.
  *
  * @param name — the event name to listen for.
  * @param listener — called at most once with the dispatch arguments.
  * @param options — listener options; a boolean is shorthand for `prepend`.
  * @returns a disposer removing the listener; `true` if it was still registered.
  */
  once(name2, listener, options) {
    const dispose = this.on(name2, function(...args) {
      dispose();
      return listener.apply(this, args);
    }, options);
    return dispose;
  }
};
var defaultFormatters = {
  s: (value) => String(value),
  d: (value) => Math.trunc(Number(value)),
  i: (value) => Math.trunc(Number(value)),
  f: (value) => Number(value),
  o: (value) => JSON.stringify(value),
  O: (value) => JSON.stringify(value),
  c: () => "",
  C: (value, exporter, message) => {
    return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
  }
};
function isAggregateError(error) {
  return error instanceof Error && Array.isArray(error["errors"]);
}
var Logger = class {
  service;
  static color(exporter, code, value, decoration = "") {
    if (!exporter.colors) return "" + value;
    return `\x1B[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\x1B[0m`;
  }
  static code(name2, level) {
    let hash = 0;
    for (let i = 0; i < name2.length; i++) {
      hash = (hash << 3) - hash + name2.charCodeAt(i) + 13;
      hash |= 0;
    }
    const colors = !level ? [] : level >= 2 ? c256 : c16;
    return colors[Math.abs(hash) % colors.length];
  }
  static format(exporter, message) {
    const args = message.args.slice();
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message;
      args.unshift("%s");
    } else if (typeof args[0] !== "string") args.unshift("%o");
    let format = args.shift();
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === "%%") return "%";
      const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
      if (typeof formatter === "function") return formatter(args.shift(), exporter, message);
      return match;
    });
    const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
    for (let arg2 of args) {
      if (typeof arg2 === "object" && arg2) arg2 = oFormatter(arg2, exporter, message);
      format += " " + arg2;
    }
    const { maxLength = 10240 } = exporter;
    return format.split(/\r?\n/g).map((line) => {
      return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
    }).join("\n");
  }
  constructor(options, service) {
    this.service = service;
    Object.assign(this, options);
    this.error = this._method("error", 0);
    this.info = this._method("info", 1);
    this.warn = this._method("warn", 2);
    this.debug = this._method("debug", 3);
  }
  _method(type, level) {
    return (...args) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) this[type](args[0].cause);
        else if (isAggregateError(args[0])) {
          args[0].errors.forEach((error) => this[type](error));
          return;
        }
      }
      const sn = ++this.service._snMessage;
      const ts = Date.now();
      for (const exporter of this.service.exporters.values()) {
        if ((exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 1) < level) continue;
        const message = {
          sn,
          ts,
          type,
          level,
          name: this.name,
          ...this.meta,
          args
        };
        exporter.export(message);
      }
    };
  }
};
var c16 = [
  6,
  2,
  3,
  4,
  5,
  1
];
var c256 = [
  20,
  21,
  26,
  27,
  32,
  33,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  56,
  57,
  62,
  63,
  68,
  69,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  92,
  93,
  98,
  99,
  112,
  113,
  129,
  134,
  135,
  148,
  149,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  178,
  179,
  184,
  185,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  214,
  215,
  220,
  221
];
var LoggerService = class LoggerService2 {
  bufferSize = 1e3;
  buffer = [];
  ctx;
  _snMessage = 0;
  _snExporter = 0;
  exporters = /* @__PURE__ */ new Map();
  constructor(ctx) {
    const tracker = {
      property: "ctx",
      noShadow: true
    };
    const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    Object.assign(self, this);
    self.ctx = ctx;
    defineProperty(self, symbols.tracker, tracker);
    self.exporter({
      colors: 3,
      export: (message) => {
        self.buffer.push(message);
        if (self.buffer.length > self.bufferSize) self.buffer = self.buffer.slice(-self.bufferSize);
      }
    });
    return self;
  }
  /**
  * Register an exporter and dispose it with the current fiber.
  *
  * @param exporter — the sink that receives structured log messages.
  * @returns a disposer that removes the exporter.
  */
  exporter(exporter) {
    return this.ctx.effect(() => {
      const id = ++this._snExporter;
      this.exporters.set(id, exporter);
      return () => this.exporters.delete(id);
    }, "ctx.logger.exporter()");
  }
  _resolveConfig() {
    let intercept = this.ctx[symbols.intercept];
    const configs = [];
    while ("logger" in intercept) {
      if (Object.hasOwn(intercept, "logger")) configs.unshift(intercept["logger"]);
      intercept = Object.getPrototypeOf(intercept);
    }
    return Object.assign({}, ...configs);
  }
  [symbols.invoke](name2) {
    const config = this._resolveConfig();
    const fiber = (this.ctx[symbols.shadow] ?? this.ctx).fiber;
    name2 ??= config.name;
    name2 ??= hyphenate(fiber.name);
    return new Logger({
      name: name2,
      level: config.level,
      meta: { fiber: new WeakRef(fiber) }
    }, this);
  }
  static {
    for (const type of [
      "error",
      "info",
      "warn",
      "debug"
    ]) LoggerService2.prototype[type] = function(...args) {
      return this()[type](...args);
    };
  }
};
function enhanceError(error) {
  const lines = error.stack.split("\n");
  lines.splice(0, 2, `Error: ${error.message}`);
  error.stack = lines.join("\n");
  return error;
}
var RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
  return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
var ReflectService = class {
  ctx;
  /** Proxy traps implementing service resolution for every context object. */
  static handler = {
    get: (target, prop, ctx) => {
      if (isSpecialProperty(prop)) return Reflect.get(target, prop, ctx);
      if (Reflect.has(target, prop)) return getTraceable(ctx, Reflect.get(target, prop, ctx));
      const error = /* @__PURE__ */ new Error(`cannot get property "${prop}" without inject`);
      try {
        const def = target.reflect.props[prop];
        if (def?.type === "accessor") return def.get.call(ctx, ctx[symbols.receiver], error);
        if (!ctx.fiber.runtime) return ctx.reflect.get(prop, false);
        return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
          const key2 = target[symbols.isolate][prop];
          let fiber = (ctx[symbols.shadow] ?? ctx).fiber;
          while (true) {
            const impl = fiber.store?.[prop];
            if (impl) return getTraceable(ctx, impl.value);
            if (prop in fiber.inject) {
              error.message = `cannot get required service "${prop}" in inactive context`;
              throw error;
            }
            if (!fiber.runtime) throw error;
            if (fiber.parent[symbols.isolate][prop] !== key2) throw error;
            fiber = fiber.parent.fiber;
          }
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    },
    set: (target, prop, value, ctx) => {
      if (isSpecialProperty(prop)) return Reflect.set(target, prop, value, ctx);
      const error = /* @__PURE__ */ new Error(`cannot set property "${prop}" without provide`);
      const def = target.reflect.props[prop];
      if (!def) {
        if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
        throw enhanceError(error);
      }
      try {
        if (def.type === "accessor") {
          if (!def.set) return false;
          return def.set.call(ctx, value, ctx[symbols.receiver], error);
        }
        return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
          return ctx.reflect.set(prop, value, error);
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    },
    has: (target, prop) => {
      if (isSpecialProperty(prop)) return Reflect.has(target, prop);
      if (Reflect.has(target, prop)) return true;
      return !!target.reflect.props[prop];
    }
  };
  /** Service implementations, keyed by isolation label. */
  store = /* @__PURE__ */ Object.create(null);
  /** Declared context properties (services and accessors), by name. */
  props = /* @__PURE__ */ Object.create(null);
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.mixin("reflect", [
      "get",
      "set",
      "provide",
      "accessor",
      "mixin"
    ]);
    this.mixin("fiber", ["runtime", "effect"]);
    this.mixin("registry", ["inject", "plugin"]);
    this.mixin("events", [
      "on",
      "once",
      "parallel",
      "emit",
      "serial",
      "bail",
      "waterfall"
    ]);
  }
  /**
  * Read a service from the store without the inject requirement.
  *
  * @param name — the service name.
  * @param strict — when `true`, only return implementations whose providing
  * fiber is currently active.
  * @returns the service value, or `undefined` when not (yet) provided.
  */
  get(name2, strict = true) {
    return getTraceable(this.ctx, this._getImpl(name2, strict)?.value);
  }
  _getImpl(name2, strict = true) {
    const key2 = this.ctx[symbols.isolate][name2];
    const impl = key2 && this.store[key2];
    if (!impl) return;
    if (strict && impl.fiber.state !== 2) return;
    return impl;
  }
  /**
  * Overwrite a provided service's value.
  *
  * @param name — the service name.
  * @param value — the new service value.
  * @param error — carrier for the caller stack in diagnostics.
  * @returns `true` on success.
  * @throws when `name` was never provided, or was provided by another fiber.
  */
  set(name2, value, error) {
    const key2 = this.ctx[symbols.isolate][name2];
    const impl = this.store[key2];
    if (!impl) throw new Error(`cannot set property "${name2}" without provide`);
    if (impl.fiber !== this.ctx.fiber) throw new Error(`cannot set property "${name2}" in multiple fibers`);
    impl.value = value;
    return true;
  }
  /**
  * Register a service implementation owned by the current fiber.
  *
  * See the `ctx.provide()` overload above for the full contract.
  *
  * @param name — the service name.
  * @param value — the service value.
  * @param check — optional availability predicate for dependents.
  * @returns a disposer that unregisters the service.
  */
  provide(name2, value, check) {
    return this.ctx.fiber.effect(() => {
      if (!this.props[name2]) this.props[name2] ??= { type: "service" };
      else if (this.props[name2].type !== "service") throw new Error(`property "${name2}" is already declared as ${this.props[name2].type}`);
      this.props[name2] = { type: "service" };
      this.ctx.root[symbols.isolate][name2] ??= Symbol(name2);
      const key2 = this.ctx[symbols.isolate][name2];
      const impl = {
        name: name2,
        value,
        fiber: this.ctx.fiber,
        check
      };
      if (this.store[key2]) throw new Error(`service "${name2}" has been registered at <${this.store[key2].fiber.name}>`);
      this.store[key2] = impl;
      this.ctx.fiber.store[name2] = impl;
      if (this.ctx.fiber.state === 2) this.notify([name2]);
      return async () => {
        delete this.store[key2];
        const fibers = this.notify([name2]);
        await Promise.allSettled(fibers.map((fiber) => fiber.await()));
        delete this.ctx.fiber.store[name2];
      };
    }, `ctx.provide(${JSON.stringify(name2)})`);
  }
  /**
  * Re-evaluate every fiber that requires one of the given services.
  *
  * @param names — the service names that changed.
  * @param filter — restricts notification to matching isolation scopes.
  * @returns the fibers whose dependency state was refreshed.
  */
  notify(names, filter = (ctx, name2) => ctx[symbols.isolate][name2] === this.ctx[symbols.isolate][name2]) {
    const fibers = [];
    for (const runtime of this.ctx.registry.values()) for (const fiber of runtime.fibers) {
      let hasUpdate = false;
      for (const name2 of names) {
        if (!(name2 in fiber.inject)) continue;
        if (!filter(fiber.ctx, name2)) continue;
        hasUpdate = true;
        fiber._checkImpl(name2);
      }
      if (!hasUpdate) continue;
      fiber._refresh();
      fibers.push(fiber);
    }
    for (const name2 of names) {
      const self = Object.create(this.ctx);
      self[symbols.filter] = (target) => filter(target, name2);
      this.ctx.events.emit(self, "internal/service", name2, this._getImpl(name2, false)?.value);
    }
    return fibers;
  }
  /**
  * Define a computed context property backed by get/set hooks.
  *
  * @param name — the context property name.
  * @param options — the `get` hook and optional `set` hook.
  * @returns a disposer that removes the accessor.
  */
  accessor(name2, options) {
    return this.ctx.fiber.effect(() => {
      if (name2 in this.props) throw new Error(`property "${name2}" is already declared as ${this.props[name2].type}`);
      this.props[name2] = {
        type: "accessor",
        ...options
      };
      return () => delete this.props[name2];
    }, `ctx.accessor(${JSON.stringify(name2)})`);
  }
  /**
  * Expose selected members of a service directly on `ctx`.
  *
  * See the `ctx.mixin()` overload above for the full contract.
  *
  * @param source — a context property name or a source object.
  * @param mixins — keys to forward, or a source-key → ctx-key map.
  * @returns a disposer that removes all created accessors.
  */
  mixin(source, mixins) {
    const self = this;
    return this.ctx.fiber.effect(function* () {
      const entries = Array.isArray(mixins) ? mixins.map((key2) => [key2, key2]) : Object.entries(mixins);
      const getTarget = (ctx, error) => {
        return ctx[source];
      };
      for (const [key2, value] of entries) yield self.accessor(value, {
        get(receiver, error) {
          const service = getTarget(this, error);
          if (isNullable(service)) return service;
          const mixin = receiver ? withProps(receiver, service) : service;
          const value2 = Reflect.get(service, key2, mixin);
          if (typeof value2 !== "function") return value2;
          return value2.bind(mixin ?? service);
        },
        set(value2, receiver, error) {
          const service = getTarget(this, error);
          const mixin = receiver ? withProps(receiver, service) : service;
          return Reflect.set(service, key2, value2, mixin);
        }
      });
    }, `ctx.mixin(${JSON.stringify(source)})`);
  }
  /**
  * Attach this context's tracing wrapper to a value.
  *
  * @param value — the value to wrap.
  * @returns the traceable wrapper (or the value itself when not applicable).
  */
  trace(value) {
    return getTraceable(this.ctx, value);
  }
  /**
  * Wrap a callback so calls trace `this` and arguments to this context.
  *
  * @param callback — the function to wrap.
  * @returns a proxy delegating to `callback` with traced values.
  */
  bind(callback) {
    return new Proxy(callback, {
      apply: (target, thisArg, args) => {
        return Reflect.apply(target, this.trace(thisArg), args.map((arg2) => this.trace(arg2)));
      },
      construct: (target, args, newTarget) => {
        return Reflect.construct(target, args.map((arg2) => this.trace(arg2)), newTarget);
      }
    });
  }
};
var kValidationError2 = /* @__PURE__ */ Symbol.for("ValidationError");
var ValidationError2 = class extends TypeError {
  name = "ValidationError";
  /**
  * Build the aggregated message from schema issues.
  *
  * @param issues — the standard-schema issues, one message line each.
  */
  constructor(issues) {
    super(`invalid config:
` + issues.map((issue) => {
      if (issue.path) return `  - ${issue.message} (at ${issue.path.join(".")})`;
      else return `  - ${issue.message}`;
    }).join("\n"));
  }
};
Object.defineProperty(ValidationError2.prototype, kValidationError2, { value: true });
function resolveConfig2(runtime, config) {
  if (!runtime.Config) return config;
  const result = runtime.Config["~standard"].validate(config);
  if ("then" in result) throw new TypeError("Async config validation is not supported");
  if (result.issues) throw new ValidationError2(result.issues);
  else return result.value;
}
var effectInertia = /* @__PURE__ */ new WeakMap();
function runDisposable(dispose) {
  const result = dispose();
  return effectInertia.get(dispose)?.() ?? result;
}
function emitPluginDisposed(context, fiber) {
  const args = ["internal/plugin", fiber];
  let callbacks;
  try {
    callbacks = context.events.dispatch("emit", args);
  } catch (error) {
    context.logger.error(error);
    return;
  }
  for (const callback of callbacks) try {
    const returned = callback(...args);
    Promise.resolve(returned).catch((error) => context.logger.error(error));
  } catch (error) {
    context.logger.error(error);
  }
}
var CordisError = class CordisError2 extends Error {
  code;
  /**
  * @param code — the stable error code; also the default message.
  * @param message — optional human-readable override.
  */
  constructor(code, message) {
    super(message ?? CordisError2.Code[code]);
    this.code = code;
  }
};
(function(CordisError3) {
  CordisError3.Code = { INACTIVE_EFFECT: "cannot create effect on inactive context" };
})(CordisError || (CordisError = {}));
var INACTIVE = "__INACTIVE__";
var Fiber = class {
  parent;
  inject;
  runtime;
  /** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
  uid;
  /** The context this fiber's plugin runs in (extends the parent context). */
  ctx;
  /** The validated plugin config (updated by `update()`). */
  config;
  /** The raw plugin config, re-resolved before each activation. */
  _config;
  /** Current lifecycle state; transitions emit `internal/status`. */
  state = 0;
  /** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
  dispose;
  /** Snapshot of required service implementations while loaded; `undefined` otherwise. */
  store;
  /** The in-flight load/unload transition, if one is currently running. */
  inertia;
  _hooks = /* @__PURE__ */ Object.create(null);
  _disposables = new DisposableList();
  context;
  _error;
  _runner;
  _store = /* @__PURE__ */ Object.create(null);
  /**
  * Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
  * rather than constructing them directly.
  *
  * @param parent — the context the plugin was loaded from.
  * @param config — raw config, validated against the runtime's schema.
  * @param inject — resolved dependency map (service name → intercept config).
  * @param runtime — the shared plugin runtime, or `null` for the root fiber.
  * @param getOuterStack — captures the caller stack for effect diagnostics.
  */
  constructor(parent, config, inject2, runtime, getOuterStack) {
    this.parent = parent;
    this.inject = inject2;
    this.runtime = runtime;
    this._config = config;
    const collect = (dispose) => {
      this._disposables.push(dispose);
    };
    if (runtime) {
      this.uid = parent.registry.counter;
      this.ctx = this.context = parent.extend({ fiber: this });
      const injectEntries = Object.entries(this.inject);
      if (injectEntries.length) {
        this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
        for (const [name2, config2] of injectEntries) {
          if (isNullable(config2)) continue;
          this.ctx[Context.intercept][name2] = config2;
        }
      }
      this._runner = {
        epoch: INACTIVE,
        getOuterStack,
        execute: function() {
          if (isConstructor(runtime.callback)) {
            const instance = new runtime.callback(this.ctx, this.config);
            for (const hook of instance?.[symbols.initHooks] ?? []) hook();
            return instance?.[symbols.init]?.();
          } else return runtime.callback(this.ctx, this.config);
        },
        collect
      };
      this.dispose = parent.fiber.effect(() => {
        const remove = runtime.fibers.push(this);
        return async () => {
          this.uid = null;
          emitPluginDisposed(this.context, this);
          if (this.ctx.registry.has(runtime.callback)) {
            remove();
            if (!runtime.fibers.length) this.ctx.registry.delete(runtime.callback);
          }
          this._setEpoch(INACTIVE);
          if (!this.inertia) this._updateState(() => {
            this.inertia = this._unload();
            return 5;
          });
          while (this.inertia) await this.inertia;
        };
      }, "ctx.plugin()");
      try {
        this.context.emit("internal/plugin", this);
      } catch (error) {
        Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
        throw error;
      }
      if (this.uid !== null && parent.fiber.state !== 5) {
        for (const name2 of Object.keys(this.inject)) this._checkImpl(name2);
        this._refresh();
      }
    } else {
      this.uid = 0;
      this.ctx = this.context = parent;
      this.state = 2;
      this.store = /* @__PURE__ */ Object.create(null);
      this._runner = {
        epoch: "",
        getOuterStack,
        execute: () => {
        },
        collect
      };
      this.dispose = () => this.restart();
    }
  }
  /** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
  get name() {
    let fiber = this;
    do {
      if (fiber.runtime?.name) return fiber.runtime.name;
      fiber = fiber.parent.fiber;
    } while (fiber !== fiber.parent.fiber);
    return "root";
  }
  /**
  * Throw if the fiber has already been disposed.
  *
  * @returns nothing when the fiber is still active.
  * @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
  */
  assertActive() {
    if (this.uid !== null) return;
    throw new CordisError("INACTIVE_EFFECT");
  }
  _execute(runner) {
    const oldEpoch = runner.epoch;
    return composeError((info) => {
      const safeCollect = (dispose) => {
        if (typeof dispose === "function") runner.collect(dispose);
        else if (!isNullable(dispose)) throw new TypeError("Invalid effect");
      };
      const effect = runner.execute.call(this);
      if (typeof effect === "function") return runner.collect(effect);
      else if (isNullable(effect)) {
      } else if (!isObject(effect)) throw new TypeError("Invalid effect");
      else if ("then" in effect) return effect.then(safeCollect);
      else if (Symbol.iterator in effect) {
        info.error = /* @__PURE__ */ new Error();
        const iter = effect[Symbol.iterator]();
        while (true) {
          const result = iter.next();
          safeCollect(result.value);
          if (result.done) return;
        }
      } else if (Symbol.asyncIterator in effect) {
        const iter = effect[Symbol.asyncIterator]();
        return (async () => {
          await Promise.resolve();
          info.error = /* @__PURE__ */ new Error();
          while (true) {
            if (runner.epoch !== oldEpoch) return;
            const result = await iter.next();
            safeCollect(result.value);
            if (result.done) return;
          }
        })();
      } else throw new TypeError("Invalid effect");
    }, runner.getOuterStack);
  }
  effect(execute, label = "anonymous") {
    this.assertActive();
    if (this.state === 5) throw new CordisError("INACTIVE_EFFECT");
    const disposables = [];
    let disposing = false;
    let disposalTask;
    const dispose = () => {
      if (disposing) return disposalTask;
      disposing = true;
      let task2;
      for (const disposable of disposables.splice(0).reverse()) if (task2) task2 = task2.then(() => runDisposable(disposable));
      else {
        const result = runDisposable(disposable);
        if (isObject(result) && "then" in result) task2 = result;
      }
      return disposalTask = task2;
    };
    const meta = {
      label,
      children: []
    };
    const runner = {
      execute,
      epoch: true,
      collect: (dispose2) => {
        disposables.push(dispose2);
        this._disposables.delete(dispose2);
        if (dispose2[symbols.effect]) meta.children.push(dispose2[symbols.effect]);
      },
      getOuterStack: buildOuterStack()
    };
    let task;
    let executing = true;
    let resolveSetup;
    let rejectSetup;
    let setupBarrier;
    let setupFailed = false;
    let inFlight;
    let removeWrapper = () => false;
    const waitForSetup = () => {
      setupBarrier ??= new Promise((resolve2, reject) => {
        resolveSetup = resolve2;
        rejectSetup = reject;
      });
      return setupBarrier;
    };
    const disposeAfter = (setup) => {
      return Promise.resolve(setup).then(() => dispose(), async (reason) => {
        await dispose();
        throw reason;
      });
    };
    const finalizeDisposal = (callback) => {
      let result;
      try {
        result = callback();
      } catch (error) {
        removeWrapper();
        throw error;
      }
      if (isObject(result) && "then" in result) {
        const pending = Promise.resolve(result).finally(() => {
          removeWrapper();
          if (inFlight === pending) inFlight = void 0;
        });
        return inFlight = pending;
      }
      removeWrapper();
      return result;
    };
    const wrapper = defineProperty(() => {
      if (!runner.epoch) return setupFailed ? inFlight : void 0;
      runner.epoch = false;
      return finalizeDisposal(() => {
        if (executing) return disposeAfter(waitForSetup());
        return task ? disposeAfter(task) : dispose();
      });
    }, symbols.effect, meta);
    effectInertia.set(wrapper, () => inFlight);
    removeWrapper = this._disposables.push(wrapper);
    try {
      task = this._execute(runner);
    } catch (reason) {
      executing = false;
      setupFailed = true;
      runner.epoch = false;
      let cleanup;
      try {
        cleanup = finalizeDisposal(dispose);
      } finally {
        rejectSetup?.(reason);
      }
      if (isObject(cleanup) && "then" in cleanup) cleanup.catch((error) => this.ctx.logger.error(error));
      throw reason;
    }
    executing = false;
    if (setupBarrier) Promise.resolve(task).then(resolveSetup, rejectSetup);
    task?.catch(() => {
      if (!runner.epoch) return dispose();
      return finalizeDisposal(dispose);
    }).catch((error) => this.ctx.logger.error(error));
    const disposeAsync = () => {
      if (!runner.epoch) return;
      runner.epoch = false;
      return finalizeDisposal(dispose);
    };
    wrapper.then = async (onFulfilled, onRejected) => {
      return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
    };
    return wrapper;
  }
  /**
  * Return metadata for currently registered effects.
  *
  * @returns one {@link EffectMeta} tree per labeled live effect.
  */
  getEffects() {
    return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
  }
  _getState() {
    if (this.uid === null) return 4;
    if (this._error) return 3;
    if (this._runner.epoch !== INACTIVE) return 2;
    return 0;
  }
  _updateState(callback) {
    const oldState = this.state;
    this.state = callback() ?? this._getState();
    if (oldState === this.state) return;
    this.context.emit("internal/status", this, oldState);
    if (oldState !== 2 && this.state !== 2) return;
    for (const key2 of Reflect.ownKeys(this.ctx.reflect.store)) {
      const impl = this.ctx.reflect.store[key2];
      if (impl.fiber !== this) continue;
      this.ctx.reflect.notify([impl.name]);
    }
  }
  _checkImpl(name2) {
    const impl = this.ctx.reflect._getImpl(name2, true);
    if (!impl) return delete this._store[name2];
    try {
      if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) return delete this._store[name2];
    } catch (error) {
      impl.fiber.ctx.logger.error(error);
      return delete this._store[name2];
    }
    this._store[name2] = impl;
  }
  _refresh() {
    let epoch = false;
    epoch = "";
    for (const name2 of Object.keys(this.inject)) {
      const impl = this._store[name2];
      if (!impl) {
        epoch = INACTIVE;
        break;
      }
      epoch += ":" + impl.fiber.uid;
    }
    this._setEpoch(epoch);
  }
  _setEpoch(epoch) {
    const oldEpoch = this._runner.epoch;
    if (epoch === oldEpoch) return;
    this._runner.epoch = epoch;
    if (this.inertia) return;
    this._updateState(() => {
      if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
        this.inertia = this._reload();
        return 1;
      } else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  _resolveConfig(config) {
    config = this.context.waterfall(this, "internal/config", config, () => config);
    return this.runtime ? resolveConfig2(this.runtime, config) : config;
  }
  async _reload() {
    this.store = { ...this._store };
    const oldEpoch = this._runner.epoch;
    try {
      await Promise.resolve();
      if (this._runner.epoch === oldEpoch) {
        this.config = this._resolveConfig(this._config);
        await this._execute(this._runner);
        this._error = void 0;
      }
    } catch (reason) {
      this.ctx.logger.error(reason);
      this._error = reason;
      this._runner.epoch = INACTIVE;
    }
    this._updateState(() => {
      if (this._runner.epoch === oldEpoch) this.inertia = void 0;
      else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  async _unload() {
    await Promise.all(this._disposables.clear().map(async (dispose) => {
      try {
        await composeError(async (info) => {
          await Promise.resolve();
          info.error = /* @__PURE__ */ new Error();
          await runDisposable(dispose);
        }, this._runner.getOuterStack);
      } catch (reason) {
        this.ctx.logger.error(reason);
      }
    }));
    this.store = void 0;
    this._updateState(() => {
      if (this._runner.epoch === INACTIVE) this.inertia = void 0;
      else {
        this.inertia = this._reload();
        return 1;
      }
    });
  }
  /**
  * Wait for current lifecycle work and rethrow startup errors.
  *
  * @returns this fiber, once it has settled into a stable state.
  * @throws the config-validation or plugin-startup error, if any.
  */
  async await() {
    while (this.inertia) await this.inertia;
    if (this._error) throw this._error;
    return this;
  }
  /**
  * Dispose and immediately reload this plugin with its current config.
  *
  * @returns a promise resolving once the reload settled.
  * @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
  */
  async restart() {
    this.assertActive();
    this._setEpoch(INACTIVE);
    this._refresh();
    await this.await();
  }
  /**
  * Validate and apply new config, then restart the plugin.
  *
  * Runs the `internal/update` waterfall first, so update hooks (and HMR)
  * can veto or replace the restart.
  *
  * @param config — the new raw config; validated before anything restarts.
  * @param noSave — hint for persistence hooks not to write the change back.
  * @returns nothing; the restart runs behind the `internal/update` waterfall.
  * @throws {ValidationError} when the new config fails validation.
  */
  update(config, noSave = false) {
    this.assertActive();
    this._config = config;
    if (this.state !== 2) {
      this._error = void 0;
      this._setEpoch(INACTIVE);
      this._refresh();
      return;
    }
    config = this._resolveConfig(config);
    this.context.waterfall(this, "internal/update", config, noSave, () => {
      this.config = config;
      this._error = void 0;
      return this.restart();
    });
  }
};
function isApplicable(object) {
  return object && typeof object === "object" && typeof object.apply === "function";
}
function Inject(name2, config) {
  return function(value, decorator) {
    if (decorator.kind === "class") {
      if (!Object.hasOwn(value, "inject")) {
        defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
        defineProperty(value.inject, symbols.checkProto, true);
      }
      value.inject[name2] = config;
    } else if (decorator.kind === "method") {
      const inject2 = (value[symbols.metadata] ??= {}).inject ??= /* @__PURE__ */ Object.create(null);
      inject2[name2] = config;
      decorator.addInitializer(function() {
        const property2 = this[symbols.tracker]?.property;
        (this[symbols.initHooks] ??= []).push(() => {
          this.ctx.inject(inject2, (ctx) => {
            return value.call(property2 ? withProps(this, { [property2]: ctx }) : this);
          });
        });
      });
    } else throw new Error("@Inject() can only be used on class or class methods");
  };
}
(function(Inject2) {
  function resolve2(inject2, result = /* @__PURE__ */ Object.create(null)) {
    if (!inject2) return result;
    if (Array.isArray(inject2)) for (const name2 of inject2) result[name2] = null;
    else if (Reflect.has(inject2, symbols.checkProto)) {
      Object.assign(result, resolve2(Object.getPrototypeOf(inject2)));
      for (const name2 of Object.keys(inject2)) result[name2] = inject2[name2] ?? null;
    } else for (const name2 of Object.keys(inject2)) result[name2] = inject2[name2] ?? null;
    return result;
  }
  Inject2.resolve = resolve2;
})(Inject || (Inject = {}));
var RegistryService = class {
  ctx;
  _counter = 0;
  _internal = /* @__PURE__ */ new Map();
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
  }
  /** Allocate the next fiber uid (increments on every read). */
  get counter() {
    return ++this._counter;
  }
  /** Number of registered plugin runtimes. */
  get size() {
    return this._internal.size;
  }
  /**
  * Resolve a supported plugin shape to its executable callback.
  *
  * @param plugin — a function, class, or `{ apply }` object plugin.
  * @returns the callback identifying the plugin, or `undefined` if invalid.
  */
  resolve(plugin) {
    try {
      if (typeof plugin === "function") return plugin;
      if (isApplicable(plugin)) return plugin.apply;
    } catch {
    }
  }
  /**
  * Look up the runtime record for a plugin.
  *
  * @param plugin — any supported plugin shape.
  * @returns the runtime, or `undefined` when the plugin is not registered.
  */
  get(plugin) {
    const key2 = this.resolve(plugin);
    return key2 && this._internal.get(key2);
  }
  /**
  * Check whether a plugin has a registered runtime.
  *
  * @param plugin — any supported plugin shape.
  * @returns `true` when at least one fiber of the plugin exists.
  */
  has(plugin) {
    const key2 = this.resolve(plugin);
    return !!key2 && this._internal.has(key2);
  }
  /**
  * Dispose every running fiber for a plugin and remove its runtime record.
  *
  * @param plugin — any supported plugin shape.
  * @returns the removed runtime, or `undefined` when none was registered.
  */
  delete(plugin) {
    const key2 = this.resolve(plugin);
    const runtime = key2 && this._internal.get(key2);
    if (!runtime) return;
    this._internal.delete(key2);
    for (const fiber of runtime.fibers) fiber.dispose();
    return runtime;
  }
  /** Iterate the registered plugin callbacks. */
  keys() {
    return this._internal.keys();
  }
  /** Iterate the registered plugin runtimes. */
  values() {
    return this._internal.values();
  }
  /** Iterate `[callback, runtime]` pairs. */
  entries() {
    return this._internal.entries();
  }
  /**
  * Visit every registered runtime.
  *
  * @param callback — receives each runtime and its identifying callback.
  */
  forEach(callback) {
    return this._internal.forEach(callback);
  }
  /**
  * Start a callback once the requested dependencies are available.
  *
  * @param inject — required services, as an array or a name → config map.
  * @param callback — plugin body called with `(ctx, config)`.
  * @returns the fiber; awaiting it settles once loading finished.
  */
  inject(inject2, callback) {
    return this.plugin({
      inject: inject2,
      apply: callback,
      name: callback.name
    });
  }
  /**
  * Start a plugin in the current context and return its fiber.
  *
  * Creates (or reuses) the plugin's runtime record, then starts a new fiber
  * under the current context. Throws if `plugin` is not a supported shape or
  * if the current fiber is already disposed.
  *
  * @param plugin — a function, class, or `{ apply }` object plugin.
  * @param config — the plugin config, validated against its `Config` schema.
  * @param getOuterStack — captures the caller stack for effect diagnostics.
  * @returns the fiber; awaiting it settles once loading finished.
  */
  plugin(plugin, config, getOuterStack = buildOuterStack()) {
    const callback = this.resolve(plugin);
    if (!callback) throw new Error('invalid plugin, expect function or object with an "apply" method, received ' + typeof plugin);
    this.ctx.fiber.assertActive();
    let runtime = this._internal.get(callback);
    if (!runtime) {
      let name2 = plugin.name;
      if (name2 === "apply") name2 = void 0;
      runtime = {
        name: name2,
        callback,
        fibers: new DisposableList(),
        Config: plugin.Config
      };
      this._internal.set(callback, runtime);
    }
    const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
    const wrapped = Object.create(fiber);
    wrapped.then = (onFulfilled, onRejected) => {
      return fiber.await().then(onFulfilled, onRejected);
    };
    return wrapped;
  }
};
var Context = class Context2 {
  /** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
  static effect = symbols.effect;
  /** Symbol key for a context's listener filter, consulted on every event dispatch. */
  static filter = symbols.filter;
  /** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
  static isolate = symbols.isolate;
  /** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
  static intercept = symbols.intercept;
  /**
  * Returns true for Cordis context proxies and context prototypes.
  *
  * Works across realms and across multiple copies of cordis, because the
  * brand is keyed by a global symbol rather than by `instanceof`.
  *
  * @param value — the value to test.
  * @returns `true` if `value` is a Cordis context, narrowing its type.
  */
  static is(value) {
    return !!value?.[Context2.is];
  }
  static {
    Context2.is[Symbol.toPrimitive] = () => /* @__PURE__ */ Symbol.for("cordis.is");
    Context2.prototype[Context2.is] = true;
  }
  /** Create the root context and install the built-in services. */
  constructor() {
    this[symbols.isolate] = /* @__PURE__ */ Object.create(null);
    this[symbols.intercept] = /* @__PURE__ */ Object.create(null);
    const self = new Proxy(this, ReflectService.handler);
    this.root = self;
    this.baseUrl = void 0;
    this.fiber = new Fiber(self, {}, /* @__PURE__ */ Object.create(null), null, () => []);
    this.reflect = new ReflectService(self);
    this.registry = new RegistryService(self);
    this.events = new EventsService(self);
    this.logger = new LoggerService(self);
    this.fiber._disposables.clear();
    return self;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return `Context <${this.fiber.name}>`;
  }
  /**
  * Create a child context with extra metadata on top of the current scope.
  *
  * The child prototypally inherits every property of this context; own
  * properties of `meta` shadow the inherited ones. The parent is not mutated.
  *
  * @param meta — own properties (including symbol keys) to define on the child.
  * @returns a child context inheriting from this one.
  */
  extend(meta = {}) {
    const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
    const self = Object.create(getTraceable(this, this));
    for (const prop of Reflect.ownKeys(meta)) Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
    if (!shadow) return self;
    return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
  }
  /**
  * Create a child context with an independent service scope for `name`.
  *
  * Below the returned context, reads and writes of the service `name`
  * resolve against the new label instead of the parent's, so a different
  * implementation can be provided without affecting the parent scope.
  * Passing the same `label` to two `isolate()` calls joins their scopes.
  *
  * @param name — the service name to isolate.
  * @param label — scope label to join; defaults to a fresh unique symbol.
  * @returns a child context whose `name` service resolves in the new scope.
  */
  isolate(name2, label) {
    const shadow = Object.create(this[symbols.isolate]);
    shadow[name2] = label ?? Symbol(name2);
    return this.extend({ [symbols.isolate]: shadow });
  }
  intercept(name2, config) {
    const intercept = Object.create(this[symbols.intercept]);
    intercept[name2] = config;
    return this.extend({ [symbols.intercept]: intercept });
  }
};
var Service = class Service2 {
  ctx;
  /** Symbol key of an instance method run after construction (class plugins). */
  static init = symbols.init;
  /** Symbol key of the availability predicate passed to `ctx.provide()`. */
  static check = symbols.check;
  /** Symbol key of the phantom intercept-config type parameter. */
  static config = symbols.config;
  /** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
  static invoke = symbols.invoke;
  /** Symbol key of the helper deriving an extended service instance. */
  static extend = symbols.extend;
  /** Symbol key of the tracker metadata used for context tracing. */
  static tracker = symbols.tracker;
  /** Symbol key of the intercept-config resolution helper below. */
  static resolveConfig = symbols.resolveConfig;
  /** The service name this instance is registered under. */
  name;
  /**
  * Register this instance as `name` in the current context.
  *
  * Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
  * service is unregistered automatically when the owning fiber unloads.
  * Services with a `[Service.invoke]` body return a callable instance.
  *
  * @param ctx — the context to register in (stored as `this.ctx`).
  * @param name — the service name; defaults to the static `provide` field.
  */
  constructor(ctx, name2) {
    this.ctx = ctx;
    name2 ??= this.constructor["provide"];
    let self = this;
    const tracker = {
      associate: name2,
      property: "ctx"
    };
    if (self[symbols.invoke]) self = createCallable(name2, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    self.ctx = ctx;
    self.name = name2;
    defineProperty(self, symbols.tracker, tracker);
    self.ctx.reflect.provide(name2, self, this[symbols.check]);
    return self;
  }
  [symbols.filter](ctx) {
    return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
  }
  [symbols.extend](props) {
    let self;
    if (this[Service2.invoke]) self = createCallable(this.name, this, this[symbols.tracker]);
    else self = Object.create(this);
    return Object.assign(self, props);
  }
  /**
  * Merge intercept config from ancestors with optional base and head values.
  *
  * Entries added closer to the root apply first; `base` is prepended and
  * `head` appended. Uses `Config.merge` when the service declares one,
  * otherwise a shallow `Object.assign`.
  *
  * @param base — lowest-precedence config merged before all intercepts.
  * @param head — highest-precedence config merged after all intercepts.
  * @returns the merged config.
  */
  [symbols.resolveConfig](base, head) {
    let intercept = this.ctx[Context.intercept];
    const configs = [];
    while (this.name in intercept) {
      if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name]);
      intercept = Object.getPrototypeOf(intercept);
    }
    if (base) configs.unshift(base);
    if (head) configs.push(head);
    if (this["Config"]?.merge) return this["Config"].merge(...configs);
    else return Object.assign({}, ...configs);
  }
  static [Symbol.hasInstance](instance) {
    if (!instance) return false;
    let constructor = instance.constructor;
    while (constructor) {
      constructor = constructor.prototype?.constructor;
      if (constructor === this) return true;
      constructor &&= Object.getPrototypeOf(constructor);
    }
    return false;
  }
};

// node_modules/@deepseek-ai/dsh-scope/lib/index.js
var NamedEntries = class {
  duplicateError;
  data = /* @__PURE__ */ new Map();
  constructor(duplicateError) {
    this.duplicateError = duplicateError;
  }
  /**
  * Insert one unique name.
  * @param name - name unique within this table.
  * @param value - borrowed value to retain.
  * @returns an idempotent undo that removes only this insertion.
  */
  insert(name2, value) {
    const data = this.data;
    if (data.has(name2)) throw this.duplicateError(name2);
    data.set(name2, value);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      data.delete(name2);
      if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
    };
  }
  /**
  * Read one named value.
  * @param name - name to resolve.
  * @returns the retained value, or `undefined` when absent.
  */
  get(name2) {
    return this.data.get(name2);
  }
  /**
  * Test one name for membership.
  * @param name - name to test.
  * @returns whether the table contains that name.
  */
  has(name2) {
    return this.data.has(name2);
  }
  /**
  * Iterate live names in insertion order.
  * @returns the native live key iterator.
  */
  keys() {
    return this.data.keys();
  }
  /**
  * Iterate live entries in insertion order.
  * @returns the native live entry iterator.
  */
  entries() {
    return this.data.entries();
  }
  /**
  * Iterate live values in insertion order.
  * @returns the native live value iterator.
  */
  values() {
    return this.data.values();
  }
  /**
  * Test whether this table has no entries.
  * @returns whether the table is empty.
  */
  isEmpty() {
    return this.data.size === 0;
  }
};
var AnonymousEntries = class {
  data = /* @__PURE__ */ new Map();
  /**
  * Append one independently owned value.
  * @param value - borrowed value to retain.
  * @returns an idempotent undo for this exact append.
  */
  append(value) {
    const data = this.data;
    const key2 = /* @__PURE__ */ Symbol();
    data.set(key2, value);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      data.delete(key2);
      if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
    };
  }
  /**
  * Iterate live values in insertion order.
  * @returns the native live value iterator.
  */
  values() {
    return this.data.values();
  }
  /**
  * Test whether this table has no entries.
  * @returns whether the table is empty.
  */
  isEmpty() {
    return this.data.size === 0;
  }
};
var ScopedLayers = class {
  createLayer;
  onChange;
  /** The eagerly constructed context-global layer. */
  global;
  scoped = /* @__PURE__ */ new Map();
  constructor(createLayer, onChange) {
    this.createLayer = createLayer;
    this.onChange = onChange;
    this.global = createLayer(void 0);
  }
  /**
  * Read an existing exact-scope overlay. Deliberately chain-blind: callers
  * addressing one scope's OWN contributions (its restrictions, its guards)
  * must not silently pick up an ancestor's — use {@link chainLayers} where
  * inheritance is the point.
  * @param scope - exact scope key; `undefined` denotes no overlay.
  * @returns the existing scoped layer, or `undefined` without creating one.
  */
  peek(scope) {
    if (scope === void 0) return void 0;
    return this.scoped.get(scope);
  }
  /**
  * Existing overlays along the scope's parent chain ({@link scopeChainOf}),
  * farthest ancestor first and the exact scope last, so a caller layering
  * them in order gives the nearest scope the final word.
  * @param scope - viewing scope, or `undefined` for no overlays.
  * @returns the existing layers, nearest last; absent overlays are skipped.
  */
  chainLayers(scope) {
    const layers = [];
    for (const key2 of scopeChainOf(scope).reverse()) {
      const layer = this.scoped.get(key2);
      if (layer !== void 0) layers.push(layer);
    }
    return layers;
  }
  /**
  * Materialize global named entries followed by scope-chain shadows,
  * farthest ancestor first, so the nearest scope's entry wins a name.
  * @param scope - viewing scope, or `undefined` for the global view.
  * @param pick - select the named table from a layer.
  * @returns an insertion-ordered effective map.
  */
  merge(scope, pick2) {
    const merged = new Map(pick2(this.global).entries());
    for (const layer of this.chainLayers(scope)) for (const [name2, value] of pick2(layer).entries()) merged.set(name2, value);
    return merged;
  }
  /**
  * Attach one synchronous layer mutation to its registration context.
  * @param ctx - context that determines both scope visibility and effect ownership.
  * @param action - atomic mutation returning its synchronous undo.
  * @param options - Cordis effect label and optional change notification.
  * @returns the exact disposer returned by `ctx.effect()`.
  */
  effect(ctx, action, options) {
    const scope = scopeOf(ctx);
    const notify = options.notify ?? true;
    return ctx.effect(function* () {
      let layer;
      let created = false;
      if (scope === void 0) layer = this.global;
      else {
        const existing = this.scoped.get(scope);
        if (existing === void 0) {
          layer = this.createLayer(scope);
          this.scoped.set(scope, layer);
          created = true;
        } else layer = existing;
      }
      let undo;
      try {
        undo = action(layer);
      } catch (error) {
        if (scope !== void 0 && created && layer.isEmpty()) this.scoped.delete(scope);
        throw error;
      }
      yield () => {
        undo();
        if (scope !== void 0 && layer.isEmpty()) this.scoped.delete(scope);
        if (notify) this.onChange();
      };
      if (notify) this.onChange();
    }.bind(this), options.label);
  }
};
var kScope = /* @__PURE__ */ Symbol("dsh.scope");
var carrierKeys = /* @__PURE__ */ new WeakMap();
var scopeParents = /* @__PURE__ */ new WeakMap();
function scopeChainOf(key2) {
  const chain = [];
  for (let cursor = key2; cursor !== void 0; cursor = scopeParents.get(cursor)) chain.push(cursor);
  return chain;
}
function scopeOf(ctx) {
  return ctx[kScope];
}
function scopeTarget(base, key2) {
  const baseFilter = base[Context.filter];
  const carrier = { [Context.filter](ctx) {
    if (baseFilter !== void 0 && !baseFilter.call(base, ctx)) return false;
    const tag = scopeOf(ctx);
    if (tag === void 0) return true;
    for (let cursor = key2; cursor !== void 0; cursor = scopeParents.get(cursor)) if (cursor === tag) return true;
    return false;
  } };
  carrierKeys.set(carrier, key2);
  return carrier;
}

// node_modules/@deepseek-ai/dsh-llm/lib/index.js
import { createRequire } from "node:module";

// node_modules/@deepseek-ai/dsh-typert-protocol/lib/index.js
var RemoteError = class extends Error {
  code;
  details;
  /** Structural marker: cross-realm/bundle identification never uses instanceof. */
  isDSHRemoteError = true;
  /**
  * @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
  * @param message - human diagnostic carried across the wire.
  * @param details - structured payload typed by the code.
  * @param options - standard Error options (`cause` survives in-process only).
  */
  constructor(code, message, details, options) {
    super(message, options);
    this.code = code;
    this.details = details;
    this.name = "RemoteError";
  }
};
var TYPERT_REMOTE_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
function isTypertRemoteSegment(value) {
  return value !== "." && value !== ".." && TYPERT_REMOTE_SEGMENT_PATTERN.test(value);
}
var REMOTE_METHOD_DESCRIPTOR = "@deepseek-ai/dsh-typert-protocol/remote-methods";
function bindTypertRemote(service, serviceKey, options = {}) {
  validateName("service key", serviceKey);
  const namespace = options.namespace ?? serviceKey;
  validateName("namespace", namespace);
  const ctx = Reflect.get(service, "ctx");
  if (ctx instanceof Context) provideInvocationAccessor(ctx);
  return Object.freeze({
    service,
    serviceKey,
    namespace
  });
}
var TypertRemoteService = class extends Service {
  /** Visible binding consumed by the Gateway's source-mode discovery. */
  typertRemote;
  /**
  * Register the Service and bind the same key to Typert Gateway.
  * @param ctx - owning Cordis Context.
  * @param serviceKey - exact Cordis service key and default wire namespace.
  * @param options - optional distinct wire namespace.
  */
  constructor(ctx, serviceKey, options = {}) {
    super(ctx, serviceKey);
    this.typertRemote = bindTypertRemote(this, this.name, options);
  }
};
function provideInvocationAccessor(ctx) {
  if (Object.hasOwn(ctx.root.reflect.props, "invocation")) return;
  ctx.root.accessor("invocation", { get: () => void 0 });
}
function Remote(methodExportOrOptions, context) {
  if (typeof methodExportOrOptions === "string") {
    validateName("Remote export name", methodExportOrOptions);
    return remoteDecorator({ kind: "direct" }, void 0, methodExportOrOptions);
  }
  if (typeof methodExportOrOptions === "object") {
    if (remoteOptionMode(methodExportOrOptions) !== "stream" || Reflect.ownKeys(methodExportOrOptions).length !== 1) throw new TypeError('typert-protocol: Remote options must contain exactly mode: "stream"');
    return remoteDecorator({ kind: "direct" }, "stream");
  }
  if (context === void 0) throw new TypeError("typert-protocol: Remote decorator context is missing");
  addMarkerInitializer(context, { kind: "direct" });
}
function remoteOptionMode(options) {
  return Reflect.get(options, "mode");
}
function remoteDecorator(invocation, mode, exportName) {
  return function(_method, context) {
    addMarkerInitializer(context, invocation, mode, exportName);
  };
}
function readRemoteMethodDescriptor(prototype) {
  const property2 = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR);
  if (property2 === void 0) return void 0;
  const descriptor = property2.value;
  if (descriptor === null || typeof descriptor !== "object") throw new TypeError("typert-protocol: Remote method descriptor must be an object");
  const version3 = Reflect.get(descriptor, "version");
  if (version3 !== 1) throw new TypeError(`typert-protocol: unsupported Remote method descriptor version ${String(version3)}`);
  const methods = Reflect.get(descriptor, "methods");
  if (!Array.isArray(methods)) throw new TypeError("typert-protocol: Remote method descriptor methods must be an array");
  return descriptor;
}
function addMarkerInitializer(context, invocation, mode, exportName) {
  if (context.private || context.static || typeof context.name !== "string") throw new TypeError("typert-protocol: Remote decorators require a public instance method with a string name");
  const method = context.name;
  context.addInitializer(function() {
    const prototype = Object.getPrototypeOf(this);
    if (prototype === null) throw new TypeError(`typert-protocol: cannot mark Remote method "${method}" on an object without a prototype`);
    mark(prototype, method, invocation, mode, exportName);
  });
}
function mark(prototype, method, invocation, mode, exportName) {
  const descriptor = readRemoteMethodDescriptor(prototype);
  const marker = Object.freeze({
    method,
    ...exportName === void 0 || exportName === method ? {} : { exportName },
    ...mode === void 0 ? {} : { mode },
    invocation: Object.freeze(invocation)
  });
  const current = descriptor?.methods.find((candidate) => candidate.method === method);
  if (current !== void 0) {
    if (current.exportName === marker.exportName && current.mode === marker.mode && sameInvocation(current.invocation, invocation)) return;
    throw new Error(`typert-protocol: Remote method "${method}" has conflicting invocation markers`);
  }
  Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
    configurable: true,
    value: Object.freeze({
      version: 1,
      methods: Object.freeze([...descriptor?.methods ?? [], marker])
    })
  });
}
function sameInvocation(left, right) {
  if (left.kind === "direct") return right.kind === "direct";
  if (right.kind === "direct") return false;
  return left.context === right.context;
}
function validateName(subject, value) {
  if (!isTypertRemoteSegment(value)) throw new TypeError(`typert-protocol: ${subject} must contain only RPC endpoint segment characters`);
}

// node_modules/@deepseek-ai/dsh-util-values/lib/index.js
function assertNever(value, context) {
  const rendered = JSON.stringify(value) ?? String(value);
  throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
}
function hasIntrinsicConstructor(prototype, name2) {
  const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
  if (typeof constructor !== "function") return false;
  try {
    return constructor.name === name2 && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === Function.prototype.toString.call(name2 === "Array" ? Array : Object);
  } catch {
    return false;
  }
}
function isIntrinsicObjectPrototype(value) {
  return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor(value, "Object");
}
function hasPlainArrayPrototype(value) {
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
  const objectPrototype = Object.getPrototypeOf(prototype);
  return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype(objectPrototype);
}
function hasPlainObjectPrototype(value) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype(prototype);
}
function enumerableStringKeys(value) {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key2) => typeof key2 !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key2))) return void 0;
  return keys;
}
function walkJsonValue(value, detach) {
  const ancestors = /* @__PURE__ */ new Set();
  let root;
  const assign = (destination, item) => {
    if (destination === void 0) return;
    if (destination.kind === "root") root = item;
    else if (destination.kind === "array") destination.target[destination.index] = item;
    else Object.defineProperty(destination.target, destination.key, {
      value: item,
      enumerable: true,
      configurable: true,
      writable: true
    });
  };
  const tasks = [{
    kind: "visit",
    value,
    ...detach ? { destination: { kind: "root" } } : {}
  }];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (task.kind === "leave") {
      ancestors.delete(task.source);
      continue;
    }
    if (task.kind === "array-item") {
      if (!Object.prototype.hasOwnProperty.call(task.source, task.index)) return void 0;
      tasks.push({
        kind: "visit",
        value: task.source[task.index],
        ...task.target === void 0 ? {} : { destination: {
          kind: "array",
          target: task.target,
          index: task.index
        } }
      });
      continue;
    }
    if (task.kind === "object-property") {
      tasks.push({
        kind: "visit",
        value: task.source[task.key],
        ...task.target === void 0 ? {} : { destination: {
          kind: "object",
          target: task.target,
          key: task.key
        } }
      });
      continue;
    }
    const current = task.value;
    if (current === null) {
      assign(task.destination, null);
      continue;
    }
    if (typeof current === "boolean" || typeof current === "string") {
      assign(task.destination, current);
      continue;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current) || Object.is(current, -0)) return void 0;
      assign(task.destination, current);
      continue;
    }
    if (typeof current !== "object") return void 0;
    if (ancestors.has(current)) return void 0;
    if (Array.isArray(current)) {
      if (!hasPlainArrayPrototype(current)) return void 0;
      const length = current.length;
      if (Reflect.ownKeys(current).length !== length + 1) return void 0;
      const target2 = detach ? [] : void 0;
      if (target2 !== void 0) assign(task.destination, target2);
      ancestors.add(current);
      tasks.push({
        kind: "leave",
        source: current
      });
      for (let index = length - 1; index >= 0; index--) tasks.push({
        kind: "array-item",
        source: current,
        index,
        ...target2 === void 0 ? {} : { target: target2 }
      });
      continue;
    }
    if (!hasPlainObjectPrototype(current)) return void 0;
    const keys = enumerableStringKeys(current);
    if (keys === void 0) return void 0;
    const target = detach ? {} : void 0;
    if (target !== void 0) assign(task.destination, target);
    ancestors.add(current);
    tasks.push({
      kind: "leave",
      source: current
    });
    for (let index = keys.length - 1; index >= 0; index--) {
      const key2 = keys[index];
      if (key2 === void 0) return void 0;
      tasks.push({
        kind: "object-property",
        source: current,
        key: key2,
        ...target === void 0 ? {} : { target }
      });
    }
  }
  return detach ? root : true;
}
function snapshotJsonValue(value) {
  return walkJsonValue(value, true);
}
function isJsonValue(value) {
  return walkJsonValue(value, false) === true;
}
function deepFreeze(value) {
  const seen = /* @__PURE__ */ new WeakSet();
  const pending = [{
    kind: "visit",
    node: value
  }];
  while (pending.length > 0) {
    const task = pending.pop();
    if (task === void 0) continue;
    if (task.kind === "property") {
      pending.push({
        kind: "visit",
        node: task.source[task.key]
      });
      continue;
    }
    const node = task.node;
    if (node === null || typeof node !== "object") continue;
    if (node instanceof AbortSignal) continue;
    if (seen.has(node)) continue;
    seen.add(node);
    Object.freeze(node);
    const keys = Object.keys(node);
    for (let index = keys.length - 1; index >= 0; index--) {
      const key2 = keys[index];
      if (key2 === void 0) continue;
      pending.push({
        kind: "property",
        source: node,
        key: key2
      });
    }
  }
  return value;
}

// node_modules/@deepseek-ai/dsh-util-crypto/lib/index.js
function randomUUID() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (byte, index) => {
    return (index === 6 ? byte & 15 | 64 : index === 8 ? byte & 63 | 128 : byte).toString(16).padStart(2, "0");
  }).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// node_modules/@deepseek-ai/dsh-brand/lib/index.js
function brandString(value) {
  return value;
}

// node_modules/@deepseek-ai/dsh-timeout/lib/index.js
var MAX_TIMER_DELAY_MS = 2147483647;

// node_modules/@deepseek-ai/dsh-llm/lib/index.js
function freezeMessage(message) {
  return deepFreeze(structuredClone(message));
}
function createMessage(input) {
  return deepFreeze(structuredClone({
    ...input,
    id: brandString(randomUUID())
  }));
}
function createUserMessage(input) {
  return createMessage({
    ...input,
    role: "user"
  });
}
var HarnessError = class extends Error {
  /** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
  code;
  constructor(message, code, options) {
    super(message, options);
    this.code = code;
    this.name = new.target.name;
  }
};
var EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
var STRUCTURED_CONTEXT_OVERFLOW = new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
var TOO_LARGE_FOR_CONTEXT = new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
var EXCEEDS_MODEL_CONTEXT = new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
var DEFAULT_MAX_RETRIES = 5;
var DEFAULT_INITIAL_DELAY_MS = 500;
var DEFAULT_MAX_DELAY_MS = 1e4;
var DEFAULT_JITTER_RATIO = 0.1;
var DEFAULT_RETRYABLE_CODES = Object.freeze([
  EMPTY_RESPONSE_CODE,
  "RATE_LIMIT",
  "SERVER",
  "TIMEOUT",
  "TRANSPORT"
]);
var backoffSchema = Schema.object({
  initialDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
  maxDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
  jitterRatio: Schema.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
var normalPolicySchema = Schema.object({
  mode: Schema.const("normal").required(),
  maxRetries: Schema.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
  retryableCodes: Schema.array(Schema.string()).default([...DEFAULT_RETRYABLE_CODES]),
  backoff: backoffSchema
});
var alwaysPolicySchema = Schema.object({
  mode: Schema.const("always").required(),
  backoff: backoffSchema
});
var RetryPolicySchema = Schema.union([normalPolicySchema, alwaysPolicySchema]);
var NORMAL_POLICY_KEYS = /* @__PURE__ */ new Set([
  "mode",
  "maxRetries",
  "retryableCodes",
  "backoff"
]);
var ALWAYS_POLICY_KEYS = /* @__PURE__ */ new Set([
  "mode",
  "maxRetries",
  "retryableCodes",
  "backoff"
]);
var BACKOFF_KEYS = /* @__PURE__ */ new Set([
  "initialDelayMs",
  "maxDelayMs",
  "jitterRatio"
]);
function validateKeys(value, allowed, path) {
  for (const key2 of Object.keys(value)) if (!allowed.has(key2)) throw new Error(`${path}: unknown key "${key2}"`);
}
function resolveBackoff(config, path) {
  if (config !== void 0) validateKeys(config, BACKOFF_KEYS, path);
  const initialDelayMs = config?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = config?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitterRatio = config?.jitterRatio ?? DEFAULT_JITTER_RATIO;
  if (!Number.isFinite(initialDelayMs) || initialDelayMs <= 0 || initialDelayMs > MAX_TIMER_DELAY_MS) throw new Error(`${path}.initialDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
  if (!Number.isFinite(maxDelayMs) || maxDelayMs <= 0 || maxDelayMs > MAX_TIMER_DELAY_MS) throw new Error(`${path}.maxDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
  if (initialDelayMs > maxDelayMs) throw new Error(`${path}.initialDelayMs must be less than or equal to maxDelayMs`);
  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) throw new Error(`${path}.jitterRatio must be between 0 and 1`);
  return Object.freeze({
    initialDelayMs,
    maxDelayMs,
    jitterRatio
  });
}
function resolveRetryPolicy(config, path) {
  if (config === void 0) return Object.freeze({
    mode: "normal",
    maxRetries: DEFAULT_MAX_RETRIES,
    retryableCodes: DEFAULT_RETRYABLE_CODES,
    ...resolveBackoff(void 0, `${path}.backoff`)
  });
  switch (config.mode) {
    case "normal": {
      validateKeys(config, NORMAL_POLICY_KEYS, path);
      const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
      const retryableCodes = config.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES];
      if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) throw new Error(`${path}.maxRetries must be a non-negative safe integer`);
      if (retryableCodes.length === 0) throw new Error(`${path}.retryableCodes must not be empty`);
      if (retryableCodes.some((code) => typeof code !== "string" || code.length === 0)) throw new Error(`${path}.retryableCodes must contain only non-empty strings`);
      if (new Set(retryableCodes).size !== retryableCodes.length) throw new Error(`${path}.retryableCodes must not contain duplicates`);
      return Object.freeze({
        mode: "normal",
        maxRetries,
        retryableCodes: Object.freeze([...retryableCodes]),
        ...resolveBackoff(config.backoff, `${path}.backoff`)
      });
    }
    case "always":
      validateKeys(config, ALWAYS_POLICY_KEYS, path);
      return Object.freeze({
        mode: "always",
        ...resolveBackoff(config.backoff, `${path}.backoff`)
      });
    default:
      throw new Error(`${path}.mode must be "normal" or "always"`);
  }
}
function callConfigEquals(a, b) {
  if (a.provider !== b.provider || a.model !== b.model || a.reasoningEffort !== b.reasoningEffort || a.temperature !== b.temperature || a.maxTokens !== b.maxTokens) return false;
  if (a.stop === void 0 || b.stop === void 0) return a.stop === b.stop;
  return a.stop.length === b.stop.length && a.stop.every((s, i) => s === b.stop?.[i]);
}
function normalizeLlmFailure(value) {
  const error = value instanceof Error ? value : new HarnessError(thrownMessage(value), "UNKNOWN", { cause: value });
  const carried = ownFailureSnapshot(error);
  if (carried !== void 0 && carried.code === ownErrorCode(error)) return carried;
  return Object.freeze({
    message: errorMessage(error),
    code: harnessErrorCode(error)
  });
}
function thrownMessage(value) {
  try {
    const message = String(value);
    return message.length > 0 ? message : "LLM adapter failed";
  } catch (_hostileThrownValue) {
    return "LLM adapter failed";
  }
}
function ownErrorCode(error) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, "code");
    return descriptor !== void 0 && "value" in descriptor ? descriptor.value : void 0;
  } catch (_sdkPropertyTrap) {
    return;
  }
}
function ownFailureSnapshot(error) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, "failure");
    return descriptor !== void 0 && "value" in descriptor ? failureSnapshot(descriptor.value) : void 0;
  } catch (_sdkPropertyTrap) {
    return;
  }
}
function failureSnapshot(value) {
  if (typeof value !== "object" || value === null) return void 0;
  try {
    const candidate = value;
    const message = candidate.message;
    const code = candidate.code;
    const status = candidate.status;
    const providerRetryAfterMs = candidate.providerRetryAfterMs;
    const requestId = candidate.requestId;
    const offloadImages = candidate.offloadImages;
    if (typeof message !== "string" || message.length === 0 || typeof code !== "string" || code.length === 0 || status !== void 0 && (!Number.isInteger(status) || status < 100 || status > 599) || providerRetryAfterMs !== void 0 && (!Number.isFinite(providerRetryAfterMs) || providerRetryAfterMs <= 0) || requestId !== void 0 && (typeof requestId !== "string" || requestId.length === 0) || offloadImages !== void 0 && (!Number.isSafeInteger(offloadImages) || offloadImages <= 0)) return void 0;
    return Object.freeze({
      message,
      code,
      ...status === void 0 ? {} : { status },
      ...providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs },
      ...requestId === void 0 ? {} : { requestId },
      ...offloadImages === void 0 ? {} : { offloadImages }
    });
  } catch (_sdkFailureGetter) {
    return;
  }
}
function errorMessage(error) {
  try {
    const message = error.message;
    if (typeof message === "string" && message.length > 0) return message;
  } catch (_sdkMessageGetter) {
  }
  return "LLM adapter failed";
}
function harnessErrorCode(error) {
  return error instanceof HarnessError ? error.code : "UNKNOWN";
}
function quoted(value) {
  return JSON.stringify(value);
}
function textOnlyImageText(ref) {
  return `[image omitted because this model accepts text only; attachment sha256:${String(ref.attachmentId).slice(7, 15)}]`;
}
function contentHasImage(content) {
  return content.some((block) => block.type === "image");
}
function contentHasFile(content) {
  for (const block of content) if (block.type === "file") return true;
  return false;
}
function fileHandleText(ref, readonlyPath) {
  const digest = String(ref.attachmentId).slice(7, 15);
  const identity = `File ${quoted(ref.name)} (${ref.bytes} bytes, sha256:${digest})`;
  if (readonlyPath === void 0) return `[${identity} was uploaded, but the current execution environment cannot access a readable path. Report that limitation if its contents are needed; do not claim to have read it.]`;
  return `[${identity}: verbatim read-only copy saved at ${quoted(readonlyPath)}. Read that path with your file tools when its contents are needed; copy it to a writable location before modifying it. When delegating file work, include this saved path in the delegation prompt; only subagents sharing this execution environment can read it.]`;
}
function replaceFilesWithHandles(blocks, resolvePath) {
  let next;
  for (const [index, block] of blocks.entries()) {
    if (block.type === "file") {
      next ??= blocks.slice(0, index);
      next.push({
        type: "text",
        text: fileHandleText(block.attachment, resolvePath(block.attachment))
      });
      continue;
    }
    next?.push(block);
  }
  return next ?? blocks;
}
function projectFilesToText(messages, resolvePath) {
  if (!messages.some((message) => contentHasFile(message.content))) return messages;
  return messages.map((message) => {
    const content = replaceFilesWithHandles(message.content, resolvePath);
    return content === message.content ? message : {
      ...message,
      content
    };
  });
}
function replaceImagesForTextModel(blocks) {
  let next;
  for (const [index, block] of blocks.entries()) {
    if (block.type === "image") {
      next ??= blocks.slice(0, index);
      next.push({
        type: "text",
        text: textOnlyImageText(block.attachment)
      });
      continue;
    }
    next?.push(block);
  }
  return next ?? blocks;
}
function projectImagesForTextModel(messages) {
  if (!messages.some((message) => contentHasImage(message.content))) return messages;
  return messages.map((message) => {
    const content = replaceImagesForTextModel(message.content);
    return content === message.content ? message : {
      ...message,
      content
    };
  });
}
function withoutDeveloperMessages(messages) {
  const retained = messages.filter((message) => message.role !== "developer");
  return retained.length === messages.length ? messages : retained;
}
function toolDeclarations(tools, mode, history) {
  const declarations = new Map(history.tools.map((tool) => [tool.name, tool]));
  for (const update of history.updates) for (const tool of update.additions) if (!declarations.has(tool.name)) declarations.set(tool.name, {
    ...tool,
    deferLoading: true
  });
  switch (mode) {
    case "in-history":
      return declarations;
    case "addition-only": {
      const activeNames = new Set(tools?.map((tool) => tool.name));
      for (const name2 of declarations.keys()) if (!activeNames.has(name2)) declarations.delete(name2);
      return declarations;
    }
    /* v8 ignore next 2 -- closed-union exhaustiveness guard */
    default:
      return assertNever(mode);
  }
}
function projectToolUpdates(messages, tools, toolUpdate, history) {
  if (toolUpdate === void 0) {
    let immediateTools = tools;
    if (tools?.some((tool) => tool.deferLoading === true)) immediateTools = tools.map(({ deferLoading: _loading, ...tool }) => tool);
    return {
      messages: withoutDeveloperMessages(messages),
      tools: immediateTools
    };
  }
  if (history === void 0) return {
    messages: withoutDeveloperMessages(messages),
    tools
  };
  const messageIds = new Set(messages.flatMap((message) => message.role === "developer" ? [message.id] : []));
  if (history.updates.some((update) => !messageIds.has(update.messageId))) return {
    messages: withoutDeveloperMessages(messages),
    tools
  };
  const declarations = toolDeclarations(tools, toolUpdate, history);
  const updateIds = new Set(history.updates.map((update) => update.messageId));
  const offered = new Set(history.tools.filter((tool) => !tool.deferLoading).map((tool) => tool.name));
  const projectedMessages = [];
  for (const message of messages) {
    if (message.role !== "developer") {
      projectedMessages.push(message);
      continue;
    }
    if (!updateIds.has(message.id)) continue;
    const content = message.content.filter((block) => {
      switch (block.type) {
        case "tool-addition":
          if (!declarations.has(block.toolName) || offered.has(block.toolName)) return false;
          offered.add(block.toolName);
          return true;
        case "tool-removal":
          if (toolUpdate !== "in-history") return false;
          return offered.delete(block.toolName);
        default:
          return true;
      }
    });
    if (content.length === 0) continue;
    if (content.length === message.content.length) projectedMessages.push(message);
    else projectedMessages.push({
      ...message,
      content
    });
  }
  return {
    messages: projectedMessages.length === messages.length && projectedMessages.every((message, index) => message === messages[index]) ? messages : projectedMessages,
    tools: [...declarations.values()]
  };
}
var { version } = createRequire(import.meta.url)("../package.json");
var __runInitializers = function(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key2 = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? {
      get: descriptor.get,
      set: descriptor.set
    } : descriptor[key2], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
    else descriptor[key2] = _;
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};
var LlmError = class extends HarnessError {
  /** Serializable facts retained beside this live Error. */
  failure;
  /**
  * @param message - non-empty human-readable failure summary.
  * @param code - non-empty stable provider-neutral machine code.
  * @param options - optional cause and validated serializable provider facts.
  */
  constructor(message, code, options) {
    if (typeof message !== "string" || message.length === 0) throw new Error("LlmError message must be a non-empty string");
    if (typeof code !== "string" || code.length === 0) throw new Error("LlmError code must be a non-empty string");
    if (options?.status !== void 0 && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) throw new Error("LlmError status must be an integer from 100 through 599");
    if (options?.providerRetryAfterMs !== void 0 && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) throw new Error("LlmError providerRetryAfterMs must be a positive finite number");
    if (options?.requestId !== void 0 && (typeof options.requestId !== "string" || options.requestId.length === 0)) throw new Error("LlmError requestId must be a non-empty string");
    super(message, code, options);
    this.name = "LlmError";
    this.failure = Object.freeze({
      message,
      code,
      ...options?.status === void 0 ? {} : { status: options.status },
      ...options?.providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
      ...options?.requestId === void 0 ? {} : { requestId: options.requestId },
      ...options?.offloadImages === void 0 ? {} : { offloadImages: options.offloadImages }
    });
  }
};
var LlmRuntime = (() => {
  let _classSuper = TypertRemoteService;
  let _instanceExtraInitializers = [];
  let _listProviders_decorators;
  let _listConfigurableProviders_decorators;
  let _remoteDiscoverModels_decorators;
  return class LlmRuntime extends _classSuper {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _listProviders_decorators = [Remote];
      _listConfigurableProviders_decorators = [Remote];
      _remoteDiscoverModels_decorators = [Remote("discoverModels")];
      __esDecorate(this, null, _listProviders_decorators, {
        kind: "method",
        name: "listProviders",
        static: false,
        private: false,
        access: {
          has: (obj) => "listProviders" in obj,
          get: (obj) => obj.listProviders
        },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _listConfigurableProviders_decorators, {
        kind: "method",
        name: "listConfigurableProviders",
        static: false,
        private: false,
        access: {
          has: (obj) => "listConfigurableProviders" in obj,
          get: (obj) => obj.listConfigurableProviders
        },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _remoteDiscoverModels_decorators, {
        kind: "method",
        name: "remoteDiscoverModels",
        static: false,
        private: false,
        access: {
          has: (obj) => "remoteDiscoverModels" in obj,
          get: (obj) => obj.remoteDiscoverModels
        },
        metadata: _metadata
      }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(this, Symbol.metadata, {
        enumerable: true,
        configurable: true,
        writable: true,
        value: _metadata
      });
    }
    adapters = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
    directory = /* @__PURE__ */ new Map();
    discoveries = /* @__PURE__ */ new Map();
    constructor(ctx) {
      super(ctx, "llm");
    }
    /** Notify topology observers without letting one broken listener veto the commit. */
    emitAdaptersUpdated() {
      let invariantFailure;
      for (const listener of this.ctx.events.dispatch("emit", ["llm/adapters-updated"])) try {
        const returned = listener();
        if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
          this.warnAdaptersListenerFailure(error);
        });
      } catch (error) {
        if (error?.code === "INVARIANT") {
          invariantFailure ??= error;
          continue;
        }
        this.warnAdaptersListenerFailure(error);
      }
      if (invariantFailure !== void 0) throw invariantFailure;
    }
    /** Contained-listener diagnostic shared by the sync and async failure paths. */
    warnAdaptersListenerFailure(error) {
      this.ctx.logger.warn("llm: an llm/adapters-updated listener failed");
      this.ctx.logger.warn(error);
    }
    /**
    * Register an adapter for the given provider routes. Throws `LlmError` with code
    * `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
    * Disposed with the fiber.
    * @param providers - every provider route this adapter should serve.
    * @param adapter - the adapter that streams calls for those providers.
    * @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
    */
    registerAdapter(providers, adapter) {
      const owned = /* @__PURE__ */ new Set();
      let released = false;
      const dispose = this.ctx.effect(function* () {
        if (providers.length === 0) throw new LlmError("an adapter must register at least one provider", "INVALID_ADAPTER");
        this.commitRoutes(owned, this.prepareRoutes(providers, adapter, owned));
        yield () => {
          released = true;
          for (const provider of owned) this.adapters.delete(provider);
          owned.clear();
          this.emitAdaptersUpdated();
        };
      }.bind(this), "llm.registerAdapter()");
      const handle = (() => void dispose());
      handle.replace = (next) => {
        if (released) throw new LlmError("a disposed adapter registration cannot replace its routes", "REGISTRATION_DISPOSED");
        this.commitRoutes(owned, this.prepareRoutes(next, adapter, owned));
      };
      return handle;
    }
    /**
    * Validate one candidate route set for `adapter`, treating routes this
    * registration already holds as available. Nothing is mutated: a rejected
    * candidate leaves the registry exactly as it was.
    */
    prepareRoutes(providers, adapter, owned) {
      const unique = /* @__PURE__ */ new Set();
      const registrations = [];
      for (const provider of providers) {
        if (provider.length === 0) throw new LlmError("adapter provider names must be non-empty", "INVALID_ADAPTER");
        if (unique.has(provider) || this.adapters.has(provider) && !owned.has(provider)) throw new LlmError(`an adapter for provider "${provider}" is already registered`, "DUPLICATE_ADAPTER");
        const info = adapter.providerInfo(provider);
        if (typeof info.id !== "string" || info.id !== provider || typeof info.name !== "string" || info.name.length === 0) throw new LlmError(`adapter metadata for provider "${provider}" must preserve its id and have a non-empty name`, "INVALID_ADAPTER");
        unique.add(provider);
        const retryPolicy = adapter.providerRetryPolicy(provider) ?? resolveRetryPolicy(void 0, `llm: provider "${provider}" retryPolicy`);
        registrations.push({
          adapter,
          provider: {
            id: info.id,
            name: info.name
          },
          retryPolicy
        });
      }
      return registrations;
    }
    /**
    * Swap this registration's routes for the prepared ones in one synchronous
    * section, so no observer can see the registry between the release and the
    * re-registration. The route set's one mutation point is also where
    * `llm/adapters-updated` is published, so a `replace` announces itself
    * exactly like a first registration.
    */
    commitRoutes(owned, registrations) {
      for (const provider of owned) this.adapters.delete(provider);
      owned.clear();
      for (const registration of registrations) {
        this.adapters.set(registration.provider.id, registration);
        owned.add(registration.provider.id);
      }
      this.emitAdaptersUpdated();
    }
    /**
    * Describe provider routes with a registered adapter.
    * @returns detached provider metadata in registration order.
    */
    listProviders() {
      return [...this.adapters.values()].map(({ provider }) => ({ ...provider }));
    }
    /**
    * Declare provider routes an adapter plugin can activate through
    * configuration. Registration is all-or-nothing: an empty list, invalid
    * entry, or a provider already declared by any registration throws
    * `LlmError` without registering the rest. Disposed with the fiber.
    * @param entries - every configurable provider this plugin owns.
    * @returns a handle that withdraws all of them, and can atomically replace them.
    */
    registerConfigurableProviders(entries) {
      let held = [];
      let disposed = false;
      const commit = (candidates) => {
        const detached = [];
        const own = new Set(held.map((entry) => entry.provider));
        for (const entry of candidates) {
          if (entry.provider.length === 0 || entry.displayName.length === 0 || entry.settingsNs.length === 0) throw new LlmError("configurable providers need a non-empty provider, displayName, and settingsNs", "INVALID_DIRECTORY");
          if (entry.settingsPath.some((segment) => segment.length === 0)) throw new LlmError(`configurable provider "${entry.provider}" has an empty settingsPath segment`, "INVALID_DIRECTORY");
          if (this.directory.has(entry.provider) && !own.has(entry.provider) || detached.some((seen) => seen.provider === entry.provider)) throw new LlmError(`configurable provider "${entry.provider}" is already declared`, "DUPLICATE_DIRECTORY");
          detached.push({
            ...entry,
            settingsPath: [...entry.settingsPath]
          });
        }
        for (const entry of held) this.directory.delete(entry.provider);
        for (const entry of detached) this.directory.set(entry.provider, entry);
        held = detached;
        this.emitAdaptersUpdated();
      };
      const dispose = this.ctx.effect(function* () {
        if (entries.length === 0) throw new LlmError("a configurable-provider registration must declare at least one provider", "INVALID_DIRECTORY");
        commit(entries);
        yield () => {
          disposed = true;
          for (const entry of held) this.directory.delete(entry.provider);
          held = [];
          this.emitAdaptersUpdated();
        };
      }.bind(this), "llm.registerConfigurableProviders()");
      const handle = (() => void dispose());
      handle.replace = (next) => {
        if (disposed) throw new LlmError("this configurable-provider registration was disposed", "REGISTRATION_DISPOSED");
        commit(next);
      };
      return handle;
    }
    /**
    * List every declared configurable provider, registered or dormant.
    * @returns detached directory entries in declaration order.
    */
    listConfigurableProviders() {
      return [...this.directory.values()].map((entry) => ({
        ...entry,
        settingsPath: [...entry.settingsPath]
      }));
    }
    /**
    * Offer to interrogate provider endpoints on behalf of the settings
    * namespace this plugin owns. The namespace is the key because that is what
    * a configuration surface already holds from the configurable-provider
    * directory, and because a provider being *added* has no route to name yet.
    * Disposed with the fiber.
    * @param settingsNs - the namespace whose profiles this discovery serves.
    * @param discover - interrogates one endpoint and must honor the supplied signal.
    * @returns the disposer that withdraws the offer.
    */
    registerModelDiscovery(settingsNs, discover) {
      const dispose = this.ctx.effect(function* () {
        if (settingsNs.length === 0) throw new LlmError("model discovery needs a non-empty settings namespace", "INVALID_DISCOVERY");
        if (this.discoveries.has(settingsNs)) throw new LlmError(`model discovery for "${settingsNs}" is already registered`, "DUPLICATE_DISCOVERY");
        this.discoveries.set(settingsNs, discover);
        yield () => {
          this.discoveries.delete(settingsNs);
        };
      }.bind(this), "llm.registerModelDiscovery()");
      return () => void dispose();
    }
    /**
    * Interrogate one provider endpoint for the models it advertises. The
    * request describes a draft, not a stored route, so nothing here reads or
    * writes settings or credentials — the caller owns both, and the reply is
    * candidate metadata a surface may offer for adoption.
    * @param settingsNs - namespace whose registered discovery serves this draft.
    * @param request - the endpoint, protocol, and one-shot credential to use.
    * @param signal - caller cancellation.
    * @returns the advertised models, deduplicated in endpoint order.
    */
    async discoverModels(settingsNs, request, signal) {
      const discover = this.discoveries.get(settingsNs);
      if (discover === void 0) throw new LlmError(`no model discovery is registered for "${settingsNs}"`, "NO_DISCOVERY");
      if ((request.provider ?? "").length === 0 && (request.baseURL ?? "").length === 0) throw new LlmError("model discovery needs a provider route or a baseURL", "INVALID_DISCOVERY");
      const discovered = signal === void 0 ? await discover(request) : await discover(request, signal);
      const seen = /* @__PURE__ */ new Set();
      const models = [];
      for (const model of discovered) {
        if (typeof model.id !== "string" || model.id.length === 0 || seen.has(model.id)) continue;
        seen.add(model.id);
        models.push({
          id: model.id,
          ...model.name === void 0 ? {} : { name: model.name },
          ...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
          ...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens },
          ...model.inputModalities === void 0 ? {} : { inputModalities: [...model.inputModalities] }
        });
      }
      return models;
    }
    /**
    * Remote adapter for one draft provider interrogation.
    * @param settingsNs - namespace whose registered discovery serves this draft.
    * @param request - endpoint, protocol, and one-shot credential to use.
    * @param signal - caller cancellation supplied by the Remote carrier.
    * @returns advertised models in endpoint order.
    * @throws RemoteError with `llm/model-discovery-rejected` when discovery refuses or fails.
    */
    async remoteDiscoverModels(settingsNs, request, signal) {
      try {
        return await this.discoverModels(settingsNs, request, signal);
      } catch (error) {
        throw new RemoteError("llm/model-discovery-rejected", error instanceof Error ? error.message : String(error), {
          settingsNs,
          ...request.baseURL === void 0 ? {} : { baseURL: request.baseURL }
        }, { cause: error });
      }
    }
    /**
    * Resolve the retry policy captured when one provider route was registered.
    * @param provider - registered provider route to inspect.
    * @returns the provider-owned policy, with normal defaults already resolved.
    */
    providerRetryPolicy(provider) {
      return this.registration(provider).retryPolicy;
    }
    /**
    * Resolve provider-side request-image pricing for one exact route, or
    * `undefined` when the provider is unregistered or declares none. Unknown
    * providers degrade to `undefined` rather than throwing because callers
    * price durable history whose route may no longer be mounted.
    * @param provider - provider route named by a request header.
    * @param model - exact model id named by the same header.
    * @returns the owning adapter's image pricing for the route, when declared.
    */
    imageRequestPricing(provider, model) {
      return this.adapters.get(provider)?.adapter.imageRequestPricing(provider, model);
    }
    /**
    * Resolve the exact text one durable file occurrence contributes to every
    * provider request in the current execution environment.
    * @param ref - durable verbatim file reference from model history.
    * @returns the same deterministic handle text used at adapter dispatch.
    */
    fileRequestText(ref) {
      return fileHandleText(ref, this.fileReadPath(ref));
    }
    /** Detach typed adapter-owned modality metadata. */
    detachedModalities(modalities) {
      return modalities === void 0 ? void 0 : [...modalities];
    }
    /**
    * Discover models advertised by one registered provider. Catalog membership
    * does not constrain core routing. Catalog-driven entry points may restrict
    * selection and submission to the advertised models.
    * @param provider - registered provider route to inspect.
    * @returns detached model metadata in adapter-preferred order.
    */
    async listModels(provider) {
      const models = await this.registration(provider).adapter.listModels(provider);
      const seen = /* @__PURE__ */ new Set();
      return models.map((model) => {
        if (typeof model.provider !== "string" || model.provider !== provider || typeof model.id !== "string" || model.id.length === 0 || typeof model.name !== "string" || model.name.length === 0 || model.description !== void 0 && typeof model.description !== "string" || seen.has(model.id)) throw new LlmError(`adapter returned invalid or duplicate model metadata for provider "${provider}"`, "INVALID_CATALOG");
        seen.add(model.id);
        const inputModalities = this.detachedModalities(model.inputModalities);
        return {
          provider: model.provider,
          id: model.id,
          name: model.name,
          ...model.description === void 0 ? {} : { description: model.description },
          ...inputModalities === void 0 ? {} : { inputModalities }
        };
      });
    }
    /**
    * Resolve and validate all metadata from the adapter that owns one exact
    * route. The result is detached from adapter-owned objects; catalog
    * membership remains advisory and does not control request routing.
    * @param provider - registered provider route to inspect.
    * @param model - exact model id passed to the adapter.
    * @param signal - optional cancellation for adapter-owned asynchronous lookup.
    * @returns exact model identity plus available context and reasoning metadata.
    */
    async resolveModelInfo(provider, model, signal) {
      return this.resolveModelInfoFor(this.registration(provider), model, signal);
    }
    async resolveModelInfoFor(registration, model, signal) {
      const resolved = await registration.adapter.resolveModel(registration.provider.id, model, signal);
      return this.normalizeModelInfo(registration, model, resolved);
    }
    /** Validate and detach one adapter-returned exact model result. */
    normalizeModelInfo(registration, model, resolved) {
      const provider = registration.provider.id;
      if (typeof resolved.provider !== "string" || resolved.provider !== provider || typeof resolved.id !== "string" || resolved.id !== model || typeof resolved.name !== "string" || resolved.name.length === 0 || resolved.description !== void 0 && typeof resolved.description !== "string") throw new LlmError(`adapter returned invalid exact model metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
      const context = resolved.context;
      if (context !== void 0 && (!Number.isInteger(context.contextWindow) || context.contextWindow <= 0)) throw new LlmError(`adapter returned invalid context metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_CONTEXT");
      const inputModalities = this.detachedModalities(resolved.inputModalities);
      const systemPromptUpdate = resolved.systemPromptUpdate;
      if (systemPromptUpdate !== void 0 && systemPromptUpdate !== "in-history") throw new LlmError(`adapter returned invalid system prompt update mode for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
      const toolUpdate = resolved.toolUpdate;
      if (toolUpdate !== void 0 && toolUpdate !== "in-history" && toolUpdate !== "addition-only") throw new LlmError(`adapter returned invalid tool update mode for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
      const defaultMaxTokens = resolved.defaultMaxTokens;
      if (defaultMaxTokens !== void 0 && (!Number.isSafeInteger(defaultMaxTokens) || defaultMaxTokens <= 0)) throw new LlmError(`adapter returned invalid default maxTokens for provider "${provider}" model "${model}"`, "INVALID_MODEL_MAX_TOKENS");
      const info = {
        provider,
        id: model,
        name: resolved.name,
        ...resolved.description === void 0 ? {} : { description: resolved.description },
        ...inputModalities === void 0 ? {} : { inputModalities },
        ...context === void 0 ? {} : { context: { contextWindow: context.contextWindow } },
        ...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens },
        ...resolved.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: resolved.systemPromptUpdate },
        ...resolved.toolUpdate === void 0 ? {} : { toolUpdate: resolved.toolUpdate }
      };
      const reasoning = resolved.reasoning;
      if (reasoning === void 0) return info;
      if (reasoning.efforts.length === 0) throw new LlmError(`adapter returned invalid reasoning metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
      const seen = /* @__PURE__ */ new Set();
      const efforts = reasoning.efforts.map((effort) => {
        if (typeof effort.id !== "string" || effort.id.length === 0 || typeof effort.name !== "string" || effort.name.length === 0 || effort.description !== void 0 && typeof effort.description !== "string" || seen.has(effort.id)) throw new LlmError(`adapter returned invalid or duplicate reasoning effort metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
        seen.add(effort.id);
        return {
          id: effort.id,
          name: effort.name,
          ...effort.description === void 0 ? {} : { description: effort.description }
        };
      });
      if (reasoning.defaultEffort !== void 0 && !seen.has(reasoning.defaultEffort)) throw new LlmError(`adapter returned an unknown default reasoning effort for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
      return {
        ...info,
        reasoning: {
          efforts,
          ...reasoning.defaultEffort === void 0 ? {} : { defaultEffort: reasoning.defaultEffort }
        }
      };
    }
    /**
    * Validate a conversation call config against its exact model capability and
    * materialize adapter-configured defaults. Unsupported explicit efforts
    * reject before provider I/O; no clamping or aliasing is performed. This
    * standalone query does not bind a later dispatch; use {@link prepareCall}
    * when logging and streaming must share one adapter registration.
    * @param config - provider/model route and optional request controls.
    * @param signal - optional cancellation for adapter-owned capability lookup.
    * @returns a detached config only when a default must be materialized.
    */
    async resolveCallConfig(config, signal) {
      return (await this.resolveCallFor(this.registration(config.provider), config, signal)).config;
    }
    async resolveCallFor(registration, config, signal) {
      const info = await this.resolveModelInfoFor(registration, config.model, signal);
      return this.resolveCallWithInfo(config, info);
    }
    /** Validate request controls against one already-bound exact model result. */
    resolveCallWithInfo(config, info) {
      const defaulted = config.maxTokens === void 0 && info.defaultMaxTokens !== void 0 ? {
        ...config,
        maxTokens: info.defaultMaxTokens
      } : config;
      const reasoning = info.reasoning;
      const requested = defaulted.reasoningEffort;
      let resolvedConfig = defaulted;
      if (reasoning === void 0) {
        if (requested !== void 0) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${requested}"`, "UNSUPPORTED_REASONING_EFFORT");
      } else {
        const effective = requested ?? reasoning.defaultEffort;
        if (effective !== void 0) {
          if (!reasoning.efforts.some((effort) => effort.id === effective)) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${effective}"`, "UNSUPPORTED_REASONING_EFFORT");
          if (requested !== effective) resolvedConfig = {
            ...defaulted,
            reasoningEffort: effective
          };
        }
      }
      return {
        config: resolvedConfig,
        ...info.context === void 0 ? {} : { context: info.context },
        modelInfo: info
      };
    }
    /**
    * Resolve one call under its current adapter registration. The returned
    * one-shot handle keeps that registration across header logging and dispatch,
    * so HMR cannot combine one adapter's capability result with another adapter.
    * @param config - provider/model route and optional request controls.
    * @param signal - optional cancellation for adapter-owned capability lookup.
    * @returns a prepared config and its registration-bound stream entry point.
    */
    async prepareCall(config, signal) {
      const registration = this.registration(config.provider);
      const adapterCall = await registration.adapter.prepareCall(config.provider, config.model, signal);
      const modelInfo = this.normalizeModelInfo(registration, config.model, adapterCall.model);
      const resolved = this.resolveCallWithInfo(config, modelInfo);
      const resolvedConfig = deepFreeze(structuredClone(resolved.config));
      const context = resolved.context === void 0 ? void 0 : deepFreeze(structuredClone(resolved.context));
      const adapterDefaults = deepFreeze({
        ...config.reasoningEffort === void 0 && resolvedConfig.reasoningEffort !== void 0 ? { reasoningEffort: true } : {},
        ...config.maxTokens === void 0 && resolvedConfig.maxTokens !== void 0 ? { maxTokens: true } : {}
      });
      let dispatched = false;
      return Object.freeze({
        config: resolvedConfig,
        retryPolicy: registration.retryPolicy,
        adapterDefaults,
        ...context === void 0 ? {} : { context },
        ...modelInfo.inputModalities === void 0 ? {} : { inputModalities: Object.freeze([...modelInfo.inputModalities]) },
        ...modelInfo.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: modelInfo.systemPromptUpdate },
        ...modelInfo.toolUpdate === void 0 ? {} : { toolUpdate: modelInfo.toolUpdate },
        stream: (options) => {
          if (dispatched) throw new LlmError("a prepared LLM call can only be dispatched once", "INVALID_PREPARED_CALL");
          if (!callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
          dispatched = true;
          return this.streamWithRegistration(options, {
            registration,
            config: resolvedConfig,
            modelInfo,
            dispatch: (options2) => adapterCall.stream(options2)
          });
        }
      });
    }
    registration(provider) {
      const registration = this.adapters.get(provider);
      if (!registration) throw new LlmError(`no adapter registered for provider "${provider}"`, "NO_ADAPTER");
      return registration;
    }
    /** Remove replay state whose historical route is owned by another adapter. */
    forAdapter(options, adapter) {
      const messages = options.messages.map((message) => {
        if (message.role !== "assistant") return message;
        const source = message.source;
        if (source.replayState === void 0) return message;
        if (this.adapters.get(source.provider)?.adapter === adapter) return message;
        return freezeMessage({
          ...message,
          source: {
            kind: "model",
            provider: source.provider,
            model: source.model
          }
        });
      });
      if (messages.every((message, index) => message === options.messages[index])) return options;
      const filtered = {
        ...options,
        messages
      };
      return Object.isFrozen(options) ? deepFreeze(filtered) : filtered;
    }
    /**
    * Resolve the current execution-world read path of one durable file
    * reference through the mounted attachment and filesystem providers.
    */
    fileReadPath(ref) {
      let hostPath;
      try {
        hostPath = this.ctx.get("attachments")?.fileHostPath(ref);
      } catch {
        return;
      }
      if (hostPath === void 0) return void 0;
      return this.ctx.get("fs")?.processPathFromHostPath(hostPath);
    }
    /**
    * Final adapter boundary. Adapter selection, dispatch, iterator construction,
    * and iteration failures become one terminal failure chunk. Middleware and
    * downstream consumer failures remain thrown plugin or consumer errors.
    */
    async *adapterStream(options, prepared) {
      let iterator;
      try {
        const registration = prepared?.registration ?? this.registration(options.provider);
        const adapter = registration.adapter;
        let modelInfo;
        let resolvedConfig;
        let dispatch;
        if (prepared === void 0) {
          const adapterCall = await adapter.prepareCall(options.provider, options.model, options.signal);
          modelInfo = this.normalizeModelInfo(registration, options.model, adapterCall.model);
          resolvedConfig = this.resolveCallWithInfo(options, modelInfo).config;
          dispatch = (options2) => adapterCall.stream(options2);
        } else {
          modelInfo = prepared.modelInfo;
          resolvedConfig = prepared.config;
          dispatch = prepared.dispatch;
        }
        if (prepared !== void 0 && !callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
        const resolvedOptions = callConfigEquals(options, resolvedConfig) ? options : Object.isFrozen(options) ? deepFreeze({
          ...options,
          ...resolvedConfig
        }) : {
          ...options,
          ...resolvedConfig
        };
        let projectedMessages = resolvedOptions.messages;
        if (projectedMessages.some((message) => contentHasFile(message.content))) projectedMessages = projectFilesToText(projectedMessages, (ref) => this.fileReadPath(ref));
        if (modelInfo.inputModalities !== void 0 && !modelInfo.inputModalities.includes("image") && projectedMessages.some((message) => contentHasImage(message.content))) projectedMessages = projectImagesForTextModel(projectedMessages);
        const projectedTools = projectToolUpdates(projectedMessages, resolvedOptions.tools, modelInfo.toolUpdate, resolvedOptions.toolHistory);
        projectedMessages = projectedTools.messages;
        let projectedOptions = resolvedOptions;
        if (projectedMessages !== resolvedOptions.messages || projectedTools.tools !== resolvedOptions.tools) {
          projectedOptions = {
            ...resolvedOptions,
            messages: projectedMessages,
            ...projectedTools.tools === void 0 ? {} : { tools: projectedTools.tools }
          };
          if (Object.isFrozen(resolvedOptions)) deepFreeze(projectedOptions);
        }
        iterator = dispatch(this.forAdapter(projectedOptions, adapter))[Symbol.asyncIterator]();
      } catch (error) {
        yield adapterFailureChunk(error, options.signal);
        return;
      }
      let completed = false;
      try {
        while (true) {
          let item;
          try {
            const next = await iterator.next();
            item = next.done ? { done: true } : {
              done: false,
              value: next.value
            };
          } catch (error) {
            completed = true;
            yield adapterFailureChunk(error, options.signal);
            return;
          }
          if (item.done) {
            completed = true;
            return;
          }
          yield item.value;
        }
      } finally {
        if (!completed) {
          const close2 = iterator.return?.bind(iterator);
          if (close2) await close2();
        }
      }
    }
    /**
    * Stream one model call as raw chunks (token-level deltas). Replay state is
    * retained only when the same adapter instance owns its historical provider
    * and the target provider. Final adapter selection remains fixed through
    * asynchronous exact-model resolution and dispatch. Adapter selection,
    * dispatch, and iteration failures become terminal `error` or `aborted`
    * finish chunks; middleware, nested-call, cleanup, and consumer failures
    * remain thrown.
    * @param options - the full request; `options.provider` selects the adapter.
    * @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
    */
    stream(options) {
      return this.streamWithRegistration(options);
    }
    streamWithRegistration(options, prepared) {
      return this.ctx.waterfall(this, "llm/stream", options, () => this.adapterStream(options, prepared));
    }
  };
})();
function adapterFailureChunk(error, signal) {
  const failure = normalizeLlmFailure(error);
  return {
    type: "finish",
    reason: signal?.aborted || failure.code === "ABORTED" ? {
      kind: "aborted",
      failure
    } : {
      kind: "error",
      failure
    }
  };
}

// node_modules/@deepseek-ai/dsh-sandbox/lib/index.js
var WIDER_MODES = {
  "read-only": ["workspace-write", "danger-full-access"],
  "workspace-write": ["danger-full-access"]
};
var ESCALATION_TARGETS = ["workspace-write", "danger-full-access"];
function validateEscalationArgs(sandboxPermissions, justification) {
  if (sandboxPermissions !== void 0 && justification === void 0) throw new Error("invalid escalation: sandbox_permissions requires a justification");
  if (justification !== void 0 && sandboxPermissions === void 0) throw new Error("invalid escalation: justification is only valid together with sandbox_permissions");
  if (justification !== void 0 && justification.trim().length === 0) throw new Error("invalid justification: expected a non-empty sentence");
}
async function approveEscalation(request, approval) {
  const { requestedMode: mode, effectiveMode, justification, subject } = request;
  if (mode === effectiveMode) return effectiveMode;
  if (!(WIDER_MODES[effectiveMode] ?? []).includes(mode)) throw new Error(`sandbox escalation to "${mode}" is not strictly wider than this call's current "${effectiveMode}" mode`);
  if (approval.approver === void 0) throw new Error(`sandbox escalation to "${mode}" requires approval, but no approval service is composed`);
  if (approval.agent === void 0) throw new Error(`sandbox escalation to "${mode}" requires approval, but the call has no agent to route it through`);
  const outcome = await approval.approver.request({
    agent: approval.agent,
    toolName: approval.toolName,
    callId: approval.callId,
    reason: `escalate sandbox to ${mode}: ${justification}`,
    displayReason: {
      en: `Allow this operation with ${mode} permissions: ${justification}`,
      zh: `\u5141\u8BB8\u672C\u6B21\u64CD\u4F5C\u4F7F\u7528 ${mode} \u6743\u9650\uFF1A${justification}`
    },
    ...approval.signal ? { signal: approval.signal } : {}
  });
  switch (outcome) {
    case "allowed-once":
      return mode;
    case "rejected":
      throw new Error(`the user rejected escalating this ${subject} to "${mode}"; it stays denied, so stop and explain instead of working around it`);
    case "cancelled":
      throw new Error(`approval for escalating to "${mode}" was cancelled`);
    case "unavailable":
      throw new Error(`sandbox escalation to "${mode}" requires approval, but no approval channel is available`);
    default:
      return assertNever(outcome, "EscalationOutcome");
  }
}

// node_modules/@deepseek-ai/dsh-tools/lib/index.js
var JsonSchemaError = class extends HarnessError {
  /** Individual schema violations in walk order. */
  violations;
  constructor(violations) {
    super(`unsupported JSON schema: ${violations.join("; ")}`, "UNSUPPORTED_SCHEMA");
    this.name = "JsonSchemaError";
    this.violations = violations;
  }
};
var CONSTRAINT_KEYWORDS = /* @__PURE__ */ new Set([
  "type",
  "oneOf",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const"
]);
var ANNOTATION_KEYWORDS = /* @__PURE__ */ new Set([
  "description",
  "title",
  "default",
  "examples"
]);
var SCHEMA_TYPES = [
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null"
];
function hasIntrinsicConstructor2(prototype, name2) {
  const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
  if (typeof constructor !== "function") return false;
  try {
    return constructor.name === name2 && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name2}() { [native code] }`;
  } catch {
    return false;
  }
}
function isIntrinsicObjectPrototype2(value) {
  return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor2(value, "Object");
}
function isPlainJsonRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype2(prototype);
  } catch {
    return false;
  }
}
function hasPlainArrayPrototype2(value) {
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(prototype) || !hasIntrinsicConstructor2(prototype, "Array")) return false;
  const objectPrototype = Object.getPrototypeOf(prototype);
  return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype2(objectPrototype);
}
function hasOnlyEnumerableStringKeys(value) {
  try {
    return Reflect.ownKeys(value).every((key2) => typeof key2 === "string" && Object.prototype.propertyIsEnumerable.call(value, key2));
  } catch {
    return false;
  }
}
function isJsonSchemaRecord(value) {
  return isPlainJsonRecord(value) && hasOnlyEnumerableStringKeys(value);
}
function isPlainJsonArray(value) {
  if (!Array.isArray(value)) return false;
  try {
    if (!hasPlainArrayPrototype2(value) || Reflect.ownKeys(value).length !== value.length + 1) return false;
    for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return false;
    return true;
  } catch {
    return false;
  }
}
function isJsonNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0);
}
function scalarMatches(type, value) {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return isJsonNumber(value);
    case "integer":
      return isJsonNumber(value) && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    /* v8 ignore next -- JsonSchemaScalarType is closed; this retains compile-time exhaustiveness. */
    default:
      return assertNever(type, "JsonSchemaType");
  }
}
var ONE_OF_SIBLING_KEYWORDS = [
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const"
];
function checkObjectSchemaTail(node, path, properties, violations) {
  const hasRequired = Object.hasOwn(node, "required");
  const required = hasRequired ? node.required : void 0;
  if (hasRequired) if (!isPlainJsonArray(required) || required.some((entry) => typeof entry !== "string")) violations.push(`${path}.required must be an array of strings`);
  else {
    const declared = isJsonSchemaRecord(properties) ? properties : {};
    for (const key2 of required) if (!Object.hasOwn(declared, key2)) violations.push(`${path}.required names "${key2}" which is not in properties`);
  }
  if (Object.hasOwn(node, "additionalProperties") && typeof node.additionalProperties !== "boolean") violations.push(`${path}.additionalProperties must be a boolean`);
}
function checkSchemaNode(root, rootPath, violations, seen) {
  const tasks = [{
    kind: "enter",
    node: root,
    path: rootPath
  }];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (task.kind === "leave") {
      seen.delete(task.node);
      continue;
    }
    if (task.kind === "one-of-tail") {
      for (const key2 of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(task.node, key2)) violations.push(`${task.path}.${key2} is not supported beside oneOf`);
      continue;
    }
    if (task.kind === "object-tail") {
      checkObjectSchemaTail(task.node, task.path, task.properties, violations);
      continue;
    }
    const { node, path } = task;
    if (!isJsonSchemaRecord(node)) {
      violations.push(`${path} must be a schema object`);
      continue;
    }
    if (seen.has(node)) {
      violations.push(`${path} is circular`);
      continue;
    }
    seen.add(node);
    tasks.push({
      kind: "leave",
      node
    });
    for (const key2 of Object.keys(node)) {
      if (CONSTRAINT_KEYWORDS.has(key2)) continue;
      if (ANNOTATION_KEYWORDS.has(key2)) {
        try {
          if (!isJsonValue(node[key2])) violations.push(`${path}.${key2} annotation must be lossless JSON data`);
        } catch {
          violations.push(`${path}.${key2} annotation must be lossless JSON data`);
        }
        continue;
      }
      violations.push(`${path}.${key2} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`);
    }
    if (Object.hasOwn(node, "description") && typeof node.description !== "string") violations.push(`${path}.description must be a string`);
    if (Object.hasOwn(node, "title") && typeof node.title !== "string") violations.push(`${path}.title must be a string`);
    const hasType = Object.hasOwn(node, "type");
    const hasOneOf = Object.hasOwn(node, "oneOf");
    if (hasType && hasOneOf) {
      violations.push(`${path} cannot declare both type and oneOf`);
      continue;
    }
    if (!hasType && !hasOneOf) {
      for (const key2 of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(node, key2)) violations.push(`${path}.${key2} requires type or oneOf`);
      continue;
    }
    if (hasOneOf) {
      const oneOf = node.oneOf;
      tasks.push({
        kind: "one-of-tail",
        node,
        path
      });
      if (!isPlainJsonArray(oneOf) || oneOf.length < 2) violations.push(`${path}.oneOf must be an array of at least two schemas`);
      else for (let index = oneOf.length - 1; index >= 0; index--) tasks.push({
        kind: "enter",
        node: oneOf[index],
        path: `${path}.oneOf[${index}]`
      });
      continue;
    }
    const type = node.type;
    if (typeof type !== "string" || !SCHEMA_TYPES.includes(type)) {
      violations.push(Array.isArray(type) ? `${path}.type must be a single type string (type arrays are not supported)` : `${path}.type must be one of ${SCHEMA_TYPES.join("/")}`);
      continue;
    }
    const schemaType = type;
    for (const [key2, types] of Object.entries({
      properties: ["object"],
      required: ["object"],
      additionalProperties: ["object"],
      items: ["array"],
      enum: [
        "string",
        "number",
        "integer",
        "boolean",
        "null"
      ],
      const: [
        "string",
        "number",
        "integer",
        "boolean",
        "null"
      ]
    })) if (Object.hasOwn(node, key2) && !types.includes(schemaType)) violations.push(`${path}.${key2} is not supported on type "${schemaType}"`);
    switch (schemaType) {
      case "object": {
        const properties = Object.hasOwn(node, "properties") ? node.properties : void 0;
        tasks.push({
          kind: "object-tail",
          node,
          path,
          properties
        });
        if (Object.hasOwn(node, "properties")) if (!isJsonSchemaRecord(properties)) violations.push(`${path}.properties must be an object of schemas`);
        else {
          const entries = Object.entries(properties);
          for (let index = entries.length - 1; index >= 0; index--) {
            const entry = entries[index];
            if (entry === void 0) continue;
            tasks.push({
              kind: "enter",
              node: entry[1],
              path: `${path}.properties.${entry[0]}`
            });
          }
        }
        break;
      }
      case "array":
        if (Object.hasOwn(node, "items")) tasks.push({
          kind: "enter",
          node: node.items,
          path: `${path}.items`
        });
        break;
      case "string":
      case "number":
      case "integer":
      case "boolean":
      case "null": {
        const hasEnum = Object.hasOwn(node, "enum");
        const allowed = hasEnum ? node.enum : void 0;
        const enumValid = isPlainJsonArray(allowed) && allowed.length > 0 && allowed.every((entry) => scalarMatches(schemaType, entry));
        if (hasEnum && !enumValid) violations.push(`${path}.enum must be a non-empty array of ${schemaType} values`);
        const hasConst = Object.hasOwn(node, "const");
        const declaredConst = hasConst ? node.const : void 0;
        const constValid = scalarMatches(schemaType, declaredConst);
        if (hasConst) {
          if (!constValid) violations.push(`${path}.const must be a ${schemaType} value`);
          else if (enumValid && !allowed.includes(declaredConst)) violations.push(`${path}.const must be one of ${path}.enum when both are declared`);
        }
        break;
      }
      /* v8 ignore next -- schemaType was narrowed from the closed SCHEMA_TYPES table above. */
      default:
        assertNever(schemaType, "JsonSchemaType");
    }
  }
}
function assertSupportedJsonSchema(schema) {
  const violations = [];
  checkSchemaNode(schema, "schema", violations, /* @__PURE__ */ new Set());
  if (violations.length > 0) throw new JsonSchemaError(violations);
}
function safelyIsJsonValue(value) {
  try {
    return isJsonValue(value);
  } catch {
    return false;
  }
}
function diagnosticPath(path) {
  return path === "" ? "arguments" : path;
}
function propertyPath(path, key2) {
  return path === "" ? key2 : `${path}.${key2}`;
}
function losslessValueViolation(path) {
  return [`"${diagnosticPath(path)}" must be a lossless JSON value`];
}
function appendViolations(target, source) {
  for (const violation of source) target.push(violation);
}
function valueFrame(node, value, path) {
  return {
    node,
    value,
    path,
    catches: false,
    phase: "start",
    children: [],
    childIndex: 0,
    violations: [],
    tailViolations: [],
    matches: 0
  };
}
function checkScalarValue(node, value, path) {
  const allowed = Object.hasOwn(node, "enum") ? node.enum : void 0;
  if (allowed !== void 0 && !allowed.includes(value)) return [`"${diagnosticPath(path)}" must be one of ${JSON.stringify(allowed)}`];
  if (Object.hasOwn(node, "const") && value !== node.const) return [`"${diagnosticPath(path)}" must be ${JSON.stringify(node.const)}`];
  return [];
}
function checkValue(schema, value, path) {
  const frames = [valueFrame(schema, value, path)];
  let rootResult;
  const receive = (result) => {
    const parent = frames.at(-1);
    if (parent === void 0) {
      rootResult = result;
      return;
    }
    if (parent.kind === "oneOf") {
      if (result.length === 0) parent.matches++;
    } else appendViolations(parent.violations, result);
  };
  const finish = (result) => {
    frames.pop();
    receive(result);
  };
  while (frames.length > 0) {
    const frame = frames.at(-1);
    if (frame === void 0) break;
    try {
      if (frame.phase === "children") {
        if (frame.childIndex < frame.children.length) {
          const child = frame.children[frame.childIndex];
          if (child === void 0) throw new Error("missing schema-value child frame");
          frame.childIndex++;
          frames.push(valueFrame(child.node, child.value, child.path));
          continue;
        }
        if (frame.kind === "oneOf") {
          finish(frame.matches === 1 ? [] : [`"${diagnosticPath(frame.path)}" must match exactly one oneOf branch (matched ${frame.matches})`]);
          continue;
        }
        appendViolations(frame.violations, frame.tailViolations);
        if (frame.violations.length > 0) finish(frame.violations);
        else if (frame.kind === "object") finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a lossless JSON object`]);
        else finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a dense lossless JSON array`]);
        continue;
      }
      const nodeType = Object.hasOwn(frame.node, "type") ? frame.node.type : void 0;
      frame.catches = !(nodeType !== void 0 && !SCHEMA_TYPES.includes(nodeType));
      const oneOf = Object.hasOwn(frame.node, "oneOf") ? frame.node.oneOf : void 0;
      if (oneOf !== void 0) {
        frame.kind = "oneOf";
        frame.children = Array.from(oneOf, (branch) => ({
          node: branch,
          value: frame.value,
          path: frame.path
        }));
        frame.childIndex = 0;
        frame.matches = 0;
        frame.phase = "children";
        continue;
      }
      if (nodeType === void 0) {
        finish(safelyIsJsonValue(frame.value) ? [] : losslessValueViolation(frame.path));
        continue;
      }
      switch (nodeType) {
        case "object": {
          if (!isPlainJsonRecord(frame.value)) {
            finish([`"${diagnosticPath(frame.path)}" must be an object`]);
            break;
          }
          const properties = Object.hasOwn(frame.node, "properties") ? frame.node.properties ?? {} : {};
          const violations = [];
          const required = Object.hasOwn(frame.node, "required") ? frame.node.required ?? [] : [];
          for (const key2 of required) if (!Object.hasOwn(frame.value, key2) || frame.value[key2] === void 0) violations.push(`missing required property "${propertyPath(frame.path, key2)}"`);
          const children = [];
          for (const [key2, child] of Object.entries(properties)) {
            if (!Object.hasOwn(frame.value, key2) || frame.value[key2] === void 0) continue;
            children.push({
              node: child,
              value: frame.value[key2],
              path: propertyPath(frame.path, key2)
            });
          }
          const tailViolations = [];
          if (Object.hasOwn(frame.node, "additionalProperties") && frame.node.additionalProperties === false) {
            for (const key2 of Object.keys(frame.value)) if (!Object.hasOwn(properties, key2)) tailViolations.push(`"${propertyPath(frame.path, key2)}" is not a declared property (additionalProperties: false)`);
          }
          frame.kind = "object";
          frame.children = children;
          frame.childIndex = 0;
          frame.violations = violations;
          frame.tailViolations = tailViolations;
          frame.phase = "children";
          break;
        }
        case "array": {
          if (!Array.isArray(frame.value)) {
            finish([`"${diagnosticPath(frame.path)}" must be an array`]);
            break;
          }
          const items = Object.hasOwn(frame.node, "items") ? frame.node.items : void 0;
          const children = items === void 0 ? [] : frame.value.flatMap((entry, index) => [{
            node: items,
            value: entry,
            path: `${frame.path}[${index}]`
          }]);
          frame.kind = "array";
          frame.children = children;
          frame.childIndex = 0;
          frame.violations = [];
          frame.phase = "children";
          break;
        }
        case "string":
          finish(typeof frame.value === "string" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a string`]);
          break;
        case "number":
          finish(typeof frame.value !== "number" ? [`"${diagnosticPath(frame.path)}" must be a number`] : !isJsonNumber(frame.value) ? [`"${diagnosticPath(frame.path)}" must be a finite JSON number`] : checkScalarValue(frame.node, frame.value, frame.path));
          break;
        case "integer":
          finish(!isJsonNumber(frame.value) || !Number.isInteger(frame.value) ? [`"${diagnosticPath(frame.path)}" must be an integer`] : checkScalarValue(frame.node, frame.value, frame.path));
          break;
        case "boolean":
          finish(typeof frame.value === "boolean" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a boolean`]);
          break;
        case "null":
          finish(frame.value === null ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be null`]);
          break;
        default:
          finish(assertNever(nodeType, "JsonSchemaType"));
      }
    } catch (error) {
      let failed = frames.pop();
      while (failed !== void 0 && !failed.catches) failed = frames.pop();
      if (failed === void 0) throw error;
      receive(losslessValueViolation(failed.path));
    }
  }
  return rootResult ?? losslessValueViolation(path);
}
function validateJsonSchemaValue(schema, value, path = "value") {
  return checkValue(schema, value, path);
}
var ANNOTATION_KEYS = [
  "description",
  "title",
  "default",
  "examples"
];
function authorError(message) {
  throw new JsonSchemaError([message]);
}
function copyAnnotations(source, target) {
  if (Object.hasOwn(source, "description")) target.description = source.description;
  if (Object.hasOwn(source, "title")) target.title = source.title;
  if (Object.hasOwn(source, "default")) target.default = source.default;
  if (Object.hasOwn(source, "examples")) target.examples = source.examples;
}
function assertAuthorKeys(source, path, allowed) {
  for (const key2 of Object.keys(source)) if (!allowed.includes(key2)) authorError(`${path}.${key2} is not supported by the value schema DSL`);
}
function assignCompiledNode(destination, node) {
  switch (destination.kind) {
    case "root":
      destination.holder.value = node;
      break;
    case "property":
      Object.defineProperty(destination.target, destination.key, {
        value: node,
        enumerable: true,
        configurable: true,
        writable: true
      });
      break;
    case "item":
      destination.target.items = node;
      break;
    case "one-of":
      destination.target[destination.index] = node;
      break;
  }
}
function assignCompiledPropertyMap(destination, compiled) {
  if (destination.kind === "root") destination.holder.value = compiled;
  else destination.target.properties = compiled.properties;
}
function runSchemaCompiler(initial) {
  const seen = /* @__PURE__ */ new Set();
  const tasks = [initial];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (task.kind === "leave") {
      seen.delete(task.input);
      continue;
    }
    if (task.kind === "property-map-tail") {
      if (task.required.length > 0) {
        task.compiled.required = task.required;
        if (task.destination.kind === "object") task.destination.target.required = task.required;
      }
      continue;
    }
    if (task.kind === "property") {
      if (!isJsonSchemaRecord(task.property)) authorError(`${task.path} must be a value schema object`);
      if (Object.hasOwn(task.property, "required") && task.property.required !== true) authorError(`${task.path}.required must be true when present`);
      if (Object.hasOwn(task.property, "required") && task.property.required === true) task.required.push(task.key);
      tasks.push({
        kind: "value",
        input: task.property,
        path: task.path,
        allowRequired: true,
        destination: {
          kind: "property",
          target: task.properties,
          key: task.key
        }
      });
      continue;
    }
    if (task.kind === "property-map") {
      if (!isJsonSchemaRecord(task.input)) authorError(`${task.path} must be an object of value schemas`);
      if (seen.has(task.input)) authorError(`${task.path} is circular`);
      seen.add(task.input);
      const compiled = { properties: {} };
      const required = [];
      assignCompiledPropertyMap(task.destination, compiled);
      tasks.push({
        kind: "leave",
        input: task.input
      });
      tasks.push({
        kind: "property-map-tail",
        compiled,
        required,
        destination: task.destination
      });
      const entries = Object.entries(task.input);
      for (let index = entries.length - 1; index >= 0; index--) {
        const entry = entries[index];
        if (entry === void 0) continue;
        tasks.push({
          kind: "property",
          property: entry[1],
          path: `${task.path}.${entry[0]}`,
          key: entry[0],
          properties: compiled.properties,
          required
        });
      }
      continue;
    }
    const { input, path } = task;
    if (!isJsonSchemaRecord(input)) authorError(`${path} must be a value schema object`);
    if (seen.has(input)) authorError(`${path} is circular`);
    seen.add(input);
    const authorKeys = [...ANNOTATION_KEYS, ...task.allowRequired ? ["required"] : []];
    const node = {};
    assignCompiledNode(task.destination, node);
    tasks.push({
      kind: "leave",
      input
    });
    if (Object.hasOwn(input, "oneOf")) {
      assertAuthorKeys(input, path, [
        ...authorKeys,
        "oneOf",
        "type"
      ]);
      if (Object.hasOwn(input, "type")) authorError(`${path} cannot declare both type and oneOf`);
      if (!isPlainJsonArray(input.oneOf)) authorError(`${path}.oneOf must be an array of at least two value schemas`);
      const branches = [];
      node.oneOf = branches;
      copyAnnotations(input, node);
      for (let index = input.oneOf.length - 1; index >= 0; index--) tasks.push({
        kind: "value",
        input: input.oneOf[index],
        path: `${path}.oneOf[${index}]`,
        allowRequired: false,
        destination: {
          kind: "one-of",
          target: branches,
          index
        }
      });
      continue;
    }
    const inputType = Object.hasOwn(input, "type") ? input.type : void 0;
    switch (inputType) {
      case "json":
        assertAuthorKeys(input, path, [...authorKeys, "type"]);
        copyAnnotations(input, node);
        break;
      case "object":
        assertAuthorKeys(input, path, [
          ...authorKeys,
          "type",
          "properties",
          "additionalProperties"
        ]);
        if (!Object.hasOwn(input, "additionalProperties") || typeof input.additionalProperties !== "boolean") authorError(`${path}.additionalProperties must be explicitly true or false`);
        node.type = "object";
        copyAnnotations(input, node);
        node.additionalProperties = input.additionalProperties;
        if (Object.hasOwn(input, "properties")) tasks.push({
          kind: "property-map",
          input: input.properties,
          path: `${path}.properties`,
          destination: {
            kind: "object",
            target: node
          }
        });
        break;
      case "array":
        assertAuthorKeys(input, path, [
          ...authorKeys,
          "type",
          "items"
        ]);
        node.type = "array";
        copyAnnotations(input, node);
        if (Object.hasOwn(input, "items")) tasks.push({
          kind: "value",
          input: input.items,
          path: `${path}.items`,
          allowRequired: false,
          destination: {
            kind: "item",
            target: node
          }
        });
        break;
      case "string":
      case "number":
      case "integer":
      case "boolean":
      case "null":
        assertAuthorKeys(input, path, [
          ...authorKeys,
          "type",
          "enum",
          "const"
        ]);
        node.type = inputType;
        copyAnnotations(input, node);
        if (Object.hasOwn(input, "enum")) {
          if (!isPlainJsonArray(input.enum)) authorError(`${path}.enum must be a non-empty array of scalar values`);
          node.enum = Array.from(input.enum, (entry) => entry);
        }
        if (Object.hasOwn(input, "const")) node.const = input.const;
        break;
      default:
        authorError(`${path}.type must be string/number/integer/boolean/null/array/object/json, or use oneOf`);
    }
  }
}
function compilePropertyMap(input, path) {
  const holder = {};
  runSchemaCompiler({
    kind: "property-map",
    input,
    path,
    destination: {
      kind: "root",
      holder
    }
  });
  return holder.value ?? authorError(`${path} did not compile`);
}
function compileValueSchema(input, path) {
  const holder = {};
  runSchemaCompiler({
    kind: "value",
    input,
    path,
    allowRequired: false,
    destination: {
      kind: "root",
      holder
    }
  });
  return holder.value ?? authorError(`${path} did not compile`);
}
function valueSchemaSpecToJsonSchema(spec) {
  const schema = compileValueSchema(spec, "schema");
  assertSupportedJsonSchema(schema);
  return schema;
}
function parameterSchemaSpecToJsonSchema(spec) {
  const compiled = compilePropertyMap(spec, "parameters");
  const schema = {
    type: "object",
    properties: compiled.properties,
    ...compiled.required === void 0 ? {} : { required: compiled.required }
  };
  assertSupportedJsonSchema(schema);
  return schema;
}
var ToolArgsError = class extends HarnessError {
  /** Individual violations in schema-walk order. */
  violations;
  constructor(violations) {
    super(`invalid arguments: ${violations.join("; ")}`, "INVALID_ARGS");
    this.name = "ToolArgsError";
    this.violations = violations;
  }
};
function defineTool(options) {
  const userExecute = options.execute;
  const userFinalizeContent = options.finalizeContent;
  const userProjectContent = options.projectContent;
  const userRender = options.output.render;
  const userPresentationMeta = options.output.presentationMeta;
  const userPresentCall = options.presentCall;
  const userPresentResult = options.presentResult;
  const userIsConcurrencySafe = options.isConcurrencySafe;
  if (options.timeoutMs !== void 0 && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new Error(`defineTool(${options.name}): timeoutMs must be a positive finite number`);
  const parameters = parameterSchemaSpecToJsonSchema(options.parameters);
  const outputSchema = valueSchemaSpecToJsonSchema(options.output.schema);
  const validate = (args) => validateJsonSchemaValue(parameters, args, "");
  const tool = {
    name: options.name,
    description: options.description,
    parameters,
    output: {
      schema: outputSchema,
      render(args, value) {
        return userRender(args, value);
      },
      ...userPresentationMeta !== void 0 ? { presentationMeta(args, value) {
        return userPresentationMeta(args, value);
      } } : {}
    },
    ...options.deferLoading === true ? { deferLoading: options.deferLoading } : {},
    ...options.timeoutMs !== void 0 ? { timeoutMs: options.timeoutMs } : {},
    async execute(args, exec) {
      const violations = validate(args);
      if (violations.length > 0) throw new ToolArgsError(violations);
      return userExecute(args, exec);
    }
  };
  if (userProjectContent) tool.projectContent = (exec, result) => userProjectContent(exec, result);
  if (userFinalizeContent) tool.finalizeContent = (exec, result) => userFinalizeContent(exec, result);
  if (userPresentCall) tool.presentCall = (args) => {
    if (validate(args).length > 0) return void 0;
    return userPresentCall(args);
  };
  if (userPresentResult) tool.presentResult = (args, result) => {
    if (validate(args).length > 0) return void 0;
    return userPresentResult(args, result);
  };
  if (userIsConcurrencySafe) tool.isConcurrencySafe = (args) => {
    if (validate(args).length > 0) return false;
    return userIsConcurrencySafe(args);
  };
  return tool;
}
var RUN_CODE_NAME = "run_code";
var TYPESCRIPT_FLAVOR = {
  description: "Execute a TypeScript program against the available tools. Takes two required arguments: `code`, the BODY of an async function (erasable syntax only; top-level `await` and `return` work), and `description`, a short summary of what the program does. Call tools as `await tools.name(args)` per the declarations in the system prompt. Only what you print or return is program output \u2014 curate it. Image-bearing subtool results are attached after the run.",
  codeDescription: "The program: the body of an async TypeScript function."
};
var RUN_CODE_FLAVORS = {
  typescript: TYPESCRIPT_FLAVOR,
  python: {
    description: "Execute a Python program against the available tools. Takes two required arguments: `code`, the BODY of an async function (top-level `await` and `return` work), and `description`, a short summary of what the program does. Call tools as `await tools.name(args)` per the declarations in the system prompt. Use `print(...)` and/or `return <value>` for program output \u2014 curate it. Image-bearing subtool results are attached after the run.",
    codeDescription: "The program: the body of an async Python function."
  }
};
var RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION = 'Clear, concise description of what this program does in active voice, 5-10 words (shown in the UI). Examples: "Count TODO markers across packages"; "Read failing test and its fixture"; "Rename config key in every cordis.yml".';
var RUN_CODE_CONTROLS = {
  timeoutMs: {
    type: "number",
    description: "Positive elapsed-time budget in milliseconds, capped by the deployment maximum."
  },
  sandbox_permissions: {
    type: "string",
    enum: [...ESCALATION_TARGETS],
    description: "Wider sandbox mode for this complete program execution; requires justification and approval."
  },
  justification: {
    type: "string",
    description: "Reason this complete program needs wider access, shown to the user for approval. Use the language of the user\u2019s current request."
  }
};
function controlParameters(runtime) {
  if (runtime === void 0) return RUN_CODE_CONTROLS;
  return {
    ...runtime.timeout === void 0 ? {} : { timeoutMs: {
      ...RUN_CODE_CONTROLS.timeoutMs,
      description: `Positive elapsed-time budget in milliseconds, including nested tool and approval waits. Default ${runtime.timeout.defaultMs}; capped at ${runtime.timeout.maxMs}. Zero does not disable the deadline.`
    } },
    ...runtime.sandboxMode === void 0 ? {} : {
      sandbox_permissions: RUN_CODE_CONTROLS.sandbox_permissions,
      justification: RUN_CODE_CONTROLS.justification
    }
  };
}
function escalationGuidance(runtime) {
  return runtime?.sandboxMode === void 0 ? "" : " A sandbox escalation approves this complete program for one execution only. Nested tools retain their own policies and approvals. Request wider access only after evidence of a denial. Earlier effects may already have completed: inspect them before explicitly retrying. Programs are never replayed automatically.";
}
function resolveFlavor(peekRuntime) {
  const runtime = peekRuntime();
  if (runtime === void 0) return TYPESCRIPT_FLAVOR;
  const flavor = RUN_CODE_FLAVORS[runtime.language];
  if (!Object.hasOwn(RUN_CODE_FLAVORS, runtime.language) || flavor === void 0) {
    const known = Object.keys(RUN_CODE_FLAVORS).map((name2) => JSON.stringify(name2)).join(", ");
    throw new Error(`dsh-tools: no run_code schema flavor registered for runtime language ${JSON.stringify(runtime.language)} (known: ${known})`);
  }
  return flavor;
}
var CodeRunFailedError = class extends HarnessError {
  constructor(message) {
    super(message, "CODE_RUN_FAILED");
    this.name = "CodeRunFailedError";
  }
};
function jsonNormalizeArgs(value) {
  let snapshot2;
  try {
    snapshot2 = snapshotJsonValue(value);
  } catch (error) {
    throw new Error(`tool arguments must be lossless JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (snapshot2 === void 0) throw new Error("tool arguments must be lossless JSON (call the tool with an arguments object, e.g. `{}`)");
  const logged = snapshotJsonValue(snapshot2);
  if (logged === void 0) throw new Error("tool arguments could not be detached for durable logging");
  return {
    dispatched: snapshot2,
    logged
  };
}
var JSON_INDENT = "  ";
var MAX_JSON_INDENT_CHARS = 10;
function renderJsonValue(value) {
  const chunks = [];
  const tasks = [{
    kind: "value",
    value,
    depth: 0,
    compact: false
  }];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (task.kind === "text") {
      chunks.push(task.text);
      continue;
    }
    const current = task.value;
    if (current === null || typeof current === "boolean" || typeof current === "number") {
      chunks.push(String(current));
      continue;
    }
    if (typeof current === "string") {
      chunks.push(JSON.stringify(current));
      continue;
    }
    const compact = task.compact || (task.depth + 1) * 2 > MAX_JSON_INDENT_CHARS;
    const childDepth = task.depth + 1;
    if (Array.isArray(current)) {
      chunks.push("[");
      if (current.length === 0) {
        chunks.push("]");
        continue;
      }
      tasks.push({
        kind: "text",
        text: compact ? "]" : `
${JSON_INDENT.repeat(task.depth)}]`
      });
      for (let index = current.length - 1; index >= 0; index--) {
        const item = current[index];
        if (item === void 0) throw new Error("cannot render a sparse JSON array");
        tasks.push({
          kind: "value",
          value: item,
          depth: childDepth,
          compact
        });
        tasks.push({
          kind: "text",
          text: compact ? index === 0 ? "" : "," : `${index === 0 ? "\n" : ",\n"}${JSON_INDENT.repeat(childDepth)}`
        });
      }
      continue;
    }
    const keys = Object.keys(current);
    chunks.push("{");
    if (keys.length === 0) {
      chunks.push("}");
      continue;
    }
    tasks.push({
      kind: "text",
      text: compact ? "}" : `
${JSON_INDENT.repeat(task.depth)}}`
    });
    for (let index = keys.length - 1; index >= 0; index--) {
      const key2 = keys[index];
      if (key2 === void 0) throw new Error("cannot render a missing JSON object key");
      const item = current[key2];
      if (item === void 0) throw new Error("cannot render an undefined JSON object property");
      tasks.push({
        kind: "value",
        value: item,
        depth: childDepth,
        compact
      });
      tasks.push({
        kind: "text",
        text: compact ? `${index === 0 ? "" : ","}${JSON.stringify(key2)}:` : `${index === 0 ? "\n" : ",\n"}${JSON_INDENT.repeat(childDepth)}${JSON.stringify(key2)}: `
      });
    }
  }
  return chunks.join("");
}
function renderValue(value) {
  return typeof value === "string" ? value : renderJsonValue(value);
}
function createRunCodeTool(registry, options) {
  const { requireRuntime, peekRuntime, maxParallel, shapeDispatchLog } = options;
  const definition = defineTool({
    name: RUN_CODE_NAME,
    description: TYPESCRIPT_FLAVOR.description,
    parameters: {
      code: {
        type: "string",
        required: true,
        description: TYPESCRIPT_FLAVOR.codeDescription
      },
      description: {
        type: "string",
        required: true,
        description: RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION
      },
      ...RUN_CODE_CONTROLS
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          logs: {
            type: "array",
            required: true,
            items: { type: "string" }
          },
          result: { type: "json" },
          sandbox: {
            type: "object",
            additionalProperties: false,
            properties: {
              mode: {
                type: "string",
                required: true,
                enum: [
                  "read-only",
                  "workspace-write",
                  "danger-full-access"
                ]
              },
              denied: {
                type: "boolean",
                required: true
              },
              enforcement: {
                type: "string",
                enum: ["full", "partial"]
              }
            }
          }
        }
      },
      render: (_args, value) => {
        const rendered = value.result === void 0 ? "" : renderValue(value.result);
        const parts = [value.logs.join("\n"), rendered].filter((part) => part.length > 0);
        if (value.sandbox?.enforcement === "partial") parts.push("File sandbox enforcement is partial on this host.");
        if (value.sandbox?.denied) parts.push(`The ${value.sandbox.mode} file sandbox denied an operation.${escalationGuidance(peekRuntime())}`);
        return [{
          type: "text",
          text: parts.length > 0 ? parts.join("\n") : "(run_code completed with no output)"
        }];
      }
    },
    async execute(args, exec) {
      if (args.description.trim().length === 0) throw new Error("invalid description: expected a non-empty string");
      const runtime = requireRuntime();
      validateEscalationArgs(args.sandbox_permissions, args.justification);
      if (args.timeoutMs !== void 0 && runtime.timeout === void 0) throw new Error("timeoutMs is not available for this PTC runtime");
      if (args.timeoutMs !== void 0 && (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0)) throw new Error("invalid timeoutMs: expected a positive finite number");
      const standingPolicy = runtime.sandboxMode === void 0 ? void 0 : options.resolveSandboxPolicy(exec);
      let policy = standingPolicy;
      if (args.sandbox_permissions !== void 0 && args.justification !== void 0) {
        if (standingPolicy === void 0) throw new Error("sandbox_permissions is not available for this PTC runtime");
        const approvedMode = await approveEscalation({
          requestedMode: args.sandbox_permissions,
          justification: args.justification,
          effectiveMode: standingPolicy.mode,
          subject: "program"
        }, {
          approver: options.peekApprover(),
          agent: exec.agent,
          callId: exec.callId,
          toolName: RUN_CODE_NAME,
          signal: exec.signal
        });
        policy = {
          ...standingPolicy,
          mode: approvedMode
        };
      }
      exec.signal.throwIfAborted();
      const runController = new AbortController();
      const onOuterAbort = () => {
        runController.abort(exec.signal.reason);
      };
      exec.signal.addEventListener("abort", onOuterAbort, { once: true });
      let dispatches = 0;
      const pendingQueue = [];
      const inFlight = /* @__PURE__ */ new Set();
      const logWork = /* @__PURE__ */ new Set();
      const commitQueue = [];
      let exclusiveActive = false;
      let driving = false;
      let driverRun = Promise.resolve();
      let wake;
      const wakeup = () => {
        const release = wake;
        wake = void 0;
        release?.();
      };
      const drive = () => {
        if (driving) return driverRun;
        driving = true;
        driverRun = (async () => {
          try {
            for (; ; ) {
              const signal = new Promise((resolve2) => {
                wake = resolve2;
              });
              const commitHead = commitQueue[0];
              if (commitHead !== void 0 && commitHead.settled) {
                commitQueue.shift();
                await commitHead.commit();
                if (commitHead.mode === "exclusive") exclusiveActive = false;
                continue;
              }
              const head = pendingQueue[0];
              if (head !== void 0) {
                if (runController.signal.aborted) {
                  pendingQueue.shift();
                  head.abandon();
                  continue;
                }
                const mode = head.classify();
                if (!exclusiveActive && (mode === "exclusive" ? inFlight.size === 0 : inFlight.size < maxParallel)) {
                  if (mode === "exclusive") exclusiveActive = true;
                  head.mode = mode;
                  pendingQueue.shift();
                  commitQueue.push(head);
                  await head.start();
                  const flight = head.flight.finally(() => {
                    inFlight.delete(flight);
                    wakeup();
                  });
                  inFlight.add(flight);
                  continue;
                }
              }
              if (pendingQueue.length === 0 && commitQueue.length === 0 && inFlight.size === 0) return;
              await signal;
            }
          } finally {
            driving = false;
            wake = void 0;
          }
        })();
        return driverRun;
      };
      const drainDispatches = async () => {
        await drive();
        while (logWork.size > 0) await Promise.allSettled([...logWork]);
      };
      const runOver = () => runController.signal.aborted;
      const binding = (schema) => async (rawArgs) => {
        const { name: name2 } = schema;
        if (runOver()) throw new Error(`run_code run is over (${String(runController.signal.reason)}); ${name2} not dispatched`);
        const normalized = jsonNormalizeArgs(rawArgs);
        const n = ++dispatches;
        const subCallId = brandString(`${String(exec.callId)}:ptc:${n}`);
        const input = {
          callId: subCallId,
          rootCallId: exec.rootCallId,
          name: name2,
          schema,
          arguments: normalized.dispatched,
          ...exec.agent ? { agent: exec.agent } : {},
          parent: exec.token,
          signal: runController.signal
        };
        const scheduler = registry[TOOL_RUNTIME_SCHEDULER];
        const outcome = await new Promise((resolve2, reject) => {
          let parked;
          const settle = (result) => {
            resolve2(result.isError ? {
              isError: true,
              message: result.error.message
            } : {
              isError: false,
              value: result.value
            });
            const agent = exec.agent;
            if (agent === void 0) return;
            const task = (async () => {
              const logged = await shapeDispatchLog({
                exec,
                agent,
                subCallId,
                name: name2,
                isError: result.isError,
                content: result.content
              });
              agent.session.append("tool/ptc-dispatch", {
                rootCallId: exec.rootCallId,
                parentCallId: exec.callId,
                subCallId,
                name: name2,
                arguments: normalized.logged,
                isError: result.isError,
                ...result.error?.info === void 0 ? {} : { error: result.error.info },
                content: logged
              });
            })().finally(() => {
              logWork.delete(task);
            });
            logWork.add(task);
          };
          pendingQueue.push({
            flight: Promise.resolve(),
            settled: false,
            classify: () => registry.executionMode(input).kind,
            abandon: () => {
              reject(/* @__PURE__ */ new Error(`run_code run is over (${String(runController.signal.reason)}); ${name2} tool call abandoned`));
            },
            async start() {
              exec.agent?.session.append("tool/ptc-dispatch-start", {
                rootCallId: exec.rootCallId,
                parentCallId: exec.callId,
                subCallId,
                name: name2,
                arguments: normalized.logged
              });
              const prepared = await scheduler.prepare(input);
              if (prepared.kind === "dispatch") {
                this.flight = scheduler.dispatch(prepared.exec).then((dispatchOutcome) => {
                  parked = {
                    kind: dispatchOutcome.kind,
                    exec: prepared.exec,
                    result: dispatchOutcome.result
                  };
                  this.settled = true;
                });
                return;
              }
              parked = {
                kind: prepared.kind,
                exec: prepared.exec,
                result: prepared.result
              };
              this.settled = true;
            },
            async commit() {
              if (parked === void 0) return;
              const result = parked.kind === "post-result" ? await scheduler.finalize(parked.exec, parked.result) : scheduler.finish(parked.exec, parked.result);
              if (!result.isError && result.content.some((block) => block.type === "image")) exec.deferContext(createUserMessage({
                content: result.content,
                source: { kind: "ptc-mode" }
              }));
              for (const context of result.additionalContexts ?? []) exec.deferContext(context);
              if (result.concludesTurn) exec.concludeTurn();
              settle(result);
              while (logWork.size > maxParallel) await Promise.race(logWork);
            }
          });
          wakeup();
          drive();
        });
        if (runOver()) throw new Error(`run_code run is over (${String(runController.signal.reason)}); ${name2} result discarded`);
        if (outcome.isError) throw new Error(outcome.message);
        return outcome.value;
      };
      const functions2 = /* @__PURE__ */ Object.create(null);
      for (const schema of registry.schemas(exec.agent)) {
        if (schema.name === "run_code") continue;
        Object.defineProperty(functions2, schema.name, {
          enumerable: true,
          value: binding(deepFreeze(schema))
        });
      }
      try {
        let result;
        try {
          result = await runtime.run(runtime.resolve({
            program: args.code,
            bindings: [{
              global: "tools",
              functions: functions2,
              errorClass: {
                name: "ToolCallError",
                memberNameProperty: "toolName"
              }
            }],
            signal: runController.signal,
            ...exec.agent?.session.header.cwd !== void 0 ? { cwd: exec.agent.session.header.cwd } : {},
            ...policy !== void 0 ? { sandboxPolicy: policy } : {},
            ...args.timeoutMs !== void 0 ? { timeoutMs: args.timeoutMs } : {}
          }));
        } finally {
          runController.abort("run_code settled");
          await drainDispatches();
        }
        if (result.error) {
          const logsText = result.logs.length > 0 ? `
Captured output:
${result.logs.join("\n")}` : "";
          const sandboxText = result.sandbox === void 0 ? "" : `
File sandbox: ${result.sandbox.mode}${result.sandbox.enforcement === void 0 ? "" : `; enforcement: ${result.sandbox.enforcement}`}${result.sandbox.denied ? "; operation denied" : ""}.`;
          throw new CodeRunFailedError(`code run failed (${result.error.kind}): ${result.error.message}${logsText}${sandboxText}${result.sandbox?.denied ? escalationGuidance(runtime) : ""}`);
        }
        return {
          logs: result.logs,
          ...result.sandbox === void 0 ? {} : { sandbox: result.sandbox },
          ...result.value !== void 0 ? { result: result.value } : {}
        };
      } finally {
        exec.signal.removeEventListener("abort", onOuterAbort);
      }
    },
    presentCall: (args) => ({
      card: "generic",
      title: args.description,
      kind: "execute",
      rawInput: args.code
    })
  });
  Object.defineProperty(definition, "description", {
    enumerable: true,
    get: () => {
      const runtime = peekRuntime();
      const instructions = runtime?.executionInstructions;
      return resolveFlavor(peekRuntime).description + (instructions ? ` ${instructions}` : "") + (runtime === void 0 ? "" : " The working directory is the Session's current directory.") + escalationGuidance(runtime);
    }
  });
  Object.defineProperty(definition, "parameters", {
    enumerable: true,
    get: () => parameterSchemaSpecToJsonSchema({
      code: {
        type: "string",
        required: true,
        description: resolveFlavor(peekRuntime).codeDescription
      },
      description: {
        type: "string",
        required: true,
        description: RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION
      },
      ...controlParameters(peekRuntime())
    })
  });
  return definition;
}
var IDENTIFIER$1 = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function renderKey(name2) {
  return IDENTIFIER$1.test(name2) ? name2 : JSON.stringify(name2);
}
function pad$1(indent) {
  return "  ".repeat(indent);
}
function docLines$1(description, indent) {
  if (typeof description !== "string" || description.length === 0) return [];
  const collapsed = description.replace(/\s+/g, " ").trim();
  return [`${pad$1(indent)}/** ${collapsed.replaceAll("*/", String.raw`*\/`)} */`];
}
function renderScalar(value) {
  return JSON.stringify(value);
}
function renderConstrainedScalar$1(node, type) {
  const broad = type === "integer" ? "number" : type;
  if (Object.hasOwn(node, "const")) return renderScalar(node.const);
  if (Object.hasOwn(node, "enum")) return node.enum.map(renderScalar).join(" | ");
  return broad;
}
function typeDocumentFrom(parts) {
  return {
    parts,
    containsUnionOrIntersection: parts.some((part) => typeof part === "string" ? part.includes("|") || part.includes("&") : part.containsUnionOrIntersection)
  };
}
function typeDocument(...parts) {
  return typeDocumentFrom(parts);
}
function flattenTypeDocument(document2) {
  const chunks = [];
  const tasks = [document2];
  for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
    if (typeof task === "string") {
      chunks.push(task);
      continue;
    }
    for (let index = task.parts.length - 1; index >= 0; index--) {
      const part = task.parts[index];
      if (part !== void 0) tasks.push(part);
    }
  }
  return chunks.join("");
}
function schemaRenderFrame(node, indent) {
  return {
    node,
    indent,
    phase: "start",
    children: [],
    childIndex: 0,
    childDocuments: [],
    entries: []
  };
}
function renderSupportedSchema(schema, indent) {
  const frames = [schemaRenderFrame(schema, indent)];
  let rootDocument;
  const finish = (document2) => {
    frames.pop();
    const parent = frames.at(-1);
    if (parent === void 0) rootDocument = document2;
    else parent.childDocuments.push(document2);
  };
  while (frames.length > 0) {
    const frame = frames.at(-1);
    if (frame === void 0) break;
    if (frame.phase === "children") {
      if (frame.childIndex < frame.children.length) {
        const child = frame.children[frame.childIndex];
        if (child === void 0) throw new Error("missing schema render child");
        frame.childIndex++;
        frames.push(schemaRenderFrame(child.node, child.indent));
        continue;
      }
      if (frame.kind === "oneOf") {
        const parts2 = [];
        for (let index = 0; index < frame.childDocuments.length; index++) {
          if (index > 0) parts2.push(" | ");
          const child = frame.childDocuments[index];
          if (child !== void 0) parts2.push(child);
        }
        finish(typeDocumentFrom(parts2));
        continue;
      }
      if (frame.kind === "array") {
        const child = frame.childDocuments[0];
        if (child === void 0) throw new Error("missing array item type");
        finish(child.containsUnionOrIntersection ? typeDocument("(", child, ")[]") : typeDocument(child, "[]"));
        continue;
      }
      const required = new Set(frame.node.required);
      const parts = ["{"];
      for (let index = 0; index < frame.entries.length; index++) {
        const entry = frame.entries[index];
        const child = frame.childDocuments[index];
        if (entry === void 0 || child === void 0) throw new Error("missing object property type");
        const [name2, prop] = entry;
        for (const line of docLines$1(prop.description, frame.indent + 1)) parts.push("\n", line);
        parts.push("\n", `${pad$1(frame.indent + 1)}${renderKey(name2)}${required.has(name2) ? "" : "?"}: `, child, ";");
      }
      parts.push("\n", `${pad$1(frame.indent)}}`);
      const declared = typeDocumentFrom(parts);
      finish(frame.node.additionalProperties === false ? declared : typeDocument(declared, " & Record<string, JsonValue>"));
      continue;
    }
    const node = frame.node;
    if (node.oneOf !== void 0) {
      frame.kind = "oneOf";
      frame.children = Array.from(node.oneOf, (child) => ({
        node: child,
        indent: frame.indent
      }));
      frame.childIndex = 0;
      frame.childDocuments = [];
      frame.phase = "children";
      continue;
    }
    if (node.type === void 0) {
      finish(typeDocument("JsonValue"));
      continue;
    }
    switch (node.type) {
      case "string":
      case "number":
      case "integer":
      case "boolean":
      case "null":
        finish(typeDocument(renderConstrainedScalar$1(node, node.type)));
        break;
      case "array":
        if (node.items === void 0) finish(typeDocument("JsonValue[]"));
        else {
          frame.kind = "array";
          frame.children = [{
            node: node.items,
            indent: frame.indent
          }];
          frame.childIndex = 0;
          frame.childDocuments = [];
          frame.phase = "children";
        }
        break;
      case "object": {
        const open2 = node.additionalProperties !== false;
        const entries = Object.entries(node.properties ?? {});
        if (entries.length === 0) finish(typeDocument(open2 ? "Record<string, JsonValue>" : "Record<string, never>"));
        else {
          frame.kind = "object";
          frame.entries = entries;
          frame.children = entries.map(([, child]) => ({
            node: child,
            indent: frame.indent + 1
          }));
          frame.childIndex = 0;
          frame.childDocuments = [];
          frame.phase = "children";
        }
        break;
      }
      /* v8 ignore next -- assertSupportedJsonSchema narrowed this closed type union. */
      default:
        finish(typeDocument("unknown"));
    }
  }
  return rootDocument ?? typeDocument("unknown");
}
function jsonSchemaToTs(schema, indent = 0) {
  try {
    assertSupportedJsonSchema(schema);
    return flattenTypeDocument(renderSupportedSchema(schema, indent));
  } catch {
    return "unknown";
  }
}
var SDK_INSTRUCTIONS$1 = `## Writing code for run_code

\`run_code\` takes two required arguments: \`code\` \u2014 the body of an async TypeScript function (erasable syntax only \u2014 no \`enum\` or namespaces; type annotations are advisory, the code runs type-stripped) \u2014 and \`description\`, a short summary of what the program does. The declarations below are SDK bindings for this program. A declaration does not make its name a directly callable tool; only names supplied as separate tool schemas may be called directly.`;
var SDK_PROGRAM_INSTRUCTIONS = `Inside the program:

- Call tools as \`await tools.name(args)\` \u2014 quoted access for exotic names: \`tools["my-tool"](args)\`. Every call resolves to the tool's typed canonical JSON value. Tool arguments must be lossless JSON.
- A FAILED tool call rejects with \`ToolCallError\`, whose \`toolName\` identifies the failed tool and whose \`message\` is human-readable \u2014 \`try/catch\` it to handle and continue.
- Independent read-only calls MAY overlap under \`Promise.all\` (safe calls run concurrently; mutating calls run alone, in submission order). Sequence dependent work with \`await\`.
- Emit results with \`return\` and/or \`console.log(...)\`. Only what you print or return is program output. A successful tool result containing an image is attached after the run so you can inspect it on the next step; every other intermediate result stays out of the conversation, so extract just what you need.

Program-only SDK bindings:`;
function acceptsExampleString(schema, value) {
  return schema?.type === "string" && (schema.const === void 0 || schema.const === value) && (schema.enum === void 0 || schema.enum.includes(value));
}
function renderBashExample(schemas) {
  const bash = schemas.find((schema) => schema.name === "bash");
  if (bash === void 0) return "";
  const parameters = bash.parameters;
  if (parameters.type !== "object") return "";
  const required = parameters.required ?? [];
  if (required.some((name2) => name2 !== "command" && name2 !== "description")) return "";
  if (!acceptsExampleString(parameters.properties?.command, "pwd")) return "";
  const needsDescription = required.includes("description");
  if (needsDescription && !acceptsExampleString(parameters.properties?.description, "Show current directory")) return "";
  return ` When no separate \`bash\` schema is supplied, invoke a declared \`bash\` binding inside \`run_code\`:

\`run_code({ code: "return await tools.bash({ command: 'pwd'${needsDescription ? ", description: 'Show current directory'" : ""} })", description: "Show current directory" })\``;
}
function renderToolsSdk(schemas) {
  const sorted = [...schemas].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const argsMembers = [];
  const outputMembers = [];
  for (const schema of sorted) {
    argsMembers.push(...docLines$1(schema.description, 1));
    argsMembers.push(`${pad$1(1)}${renderKey(schema.name)}: ${jsonSchemaToTs(schema.parameters, 1)};`);
    outputMembers.push(`${pad$1(1)}${renderKey(schema.name)}: ${jsonSchemaToTs(schema.output, 1)};`);
  }
  const declaration = [
    `interface ToolArgsMap {${argsMembers.length > 0 ? `
${argsMembers.join("\n")}
` : ""}}`,
    `interface ToolOutputMap {${outputMembers.length > 0 ? `
${outputMembers.join("\n")}
` : ""}}`,
    "type ToolName = keyof ToolOutputMap",
    [
      "declare class ToolCallError extends Error {",
      '  readonly name: "ToolCallError";',
      "  readonly toolName: ToolName;",
      "}"
    ].join("\n"),
    [
      "declare const tools: {",
      "  [K in ToolName]: (args: ToolArgsMap[K]) => Promise<ToolOutputMap[K]>;",
      "}"
    ].join("\n")
  ].join("\n\n");
  return `${SDK_INSTRUCTIONS$1}${renderBashExample(sorted)}

${SDK_PROGRAM_INSTRUCTIONS}

\`\`\`ts
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

${declaration}
\`\`\``;
}
var IDENTIFIER = /^[\p{XID_Start}_]\p{XID_Continue}*$/u;
function isBareIdentifier(name2) {
  return IDENTIFIER.test(name2) && name2.normalize("NFKC") === name2;
}
var RESERVED = /* @__PURE__ */ new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
  "__debug__"
]);
var TYPING_ORDER = [
  "Any",
  "Literal",
  "NotRequired",
  "Protocol",
  "TypedDict"
];
function pad(indent) {
  return "    ".repeat(indent);
}
var UNPRINTABLE = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f]/g;
var LONE_SURROGATE = /[\ud800-\udfff]/gu;
function describe(schema) {
  const description = schema.description;
  if (typeof description !== "string") return void 0;
  const collapsed = description.replace(/\s+/g, " ").replace(UNPRINTABLE, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`).replace(LONE_SURROGATE, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`).trim();
  return collapsed.length === 0 ? void 0 : collapsed;
}
function docLines(description, indent) {
  const collapsed = describe({ description });
  if (collapsed === void 0) return [];
  const escaped = collapsed.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return [`${pad(indent)}"""${escaped}"""`];
}
function camelCase(raw) {
  const joined = raw.split(/[^\p{XID_Continue}]+|_+/u).filter((part) => part.length > 0).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join("").normalize("NFKC");
  return (/^\p{XID_Start}/u.test(joined) ? joined : `Tool${joined}`).normalize("NFKC");
}
var MAX_CLASS_NAME_BASE = 120;
var MAX_LIST_NESTING = 180;
function capClassNameBase(base) {
  if (base.length <= MAX_CLASS_NAME_BASE) return base;
  const capped = base.slice(0, MAX_CLASS_NAME_BASE);
  return /[\uD800-\uDBFF]$/.test(capped) ? capped.slice(0, -1) : capped;
}
function allocateClassName(base, state2) {
  const capped = capClassNameBase(base);
  let name2 = capped;
  if (state2.usedClassNames.has(name2)) {
    let n = state2.nextClassCounter.get(capped) ?? 2;
    while (state2.usedClassNames.has(`${capped}${n}`)) n++;
    name2 = `${capped}${n}`;
    state2.nextClassCounter.set(capped, n + 1);
  }
  state2.usedClassNames.add(name2);
  return name2;
}
function childClassName(base, segment) {
  return capClassNameBase(`${base}${segment}`.normalize("NFKC"));
}
function pyScalar(value) {
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) return BigInt(value).toString();
  return String(value);
}
function renderConstrainedScalar(node, broad, state2) {
  if (node.const !== void 0) {
    state2.typing.add("Literal");
    return `Literal[${pyScalar(node.const)}]`;
  }
  if (node.enum !== void 0) {
    state2.typing.add("Literal");
    return `Literal[${node.enum.map(pyScalar).join(", ")}]`;
  }
  return broad;
}
function renderType(schema, className, state2) {
  const newFrame = (schema2, className2, listDepth) => ({
    schema: schema2,
    className: className2,
    phase: "start",
    listDepth,
    children: [],
    childIndex: 0,
    childTypes: [],
    entries: []
  });
  try {
    assertSupportedJsonSchema(schema);
    const frames = [newFrame(schema, className, 0)];
    let result;
    const finish = (type) => {
      frames.pop();
      const parent = frames.at(-1);
      if (parent === void 0) result = type;
      else parent.childTypes.push(type);
    };
    while (frames.length > 0) {
      const frame = frames.at(-1);
      if (frame === void 0) break;
      if (frame.phase === "children") {
        if (frame.childIndex < frame.children.length) {
          const child = frame.children[frame.childIndex];
          if (child === void 0) throw new Error("missing python render child");
          frame.childIndex++;
          frames.push(newFrame(child.schema, child.className, child.listDepth));
          continue;
        }
        if (frame.kind === "oneOf") {
          let union = "";
          for (const [index, childType] of frame.childTypes.entries()) union = index === 0 ? childType : `${union} | ${childType}`;
          finish(union);
          continue;
        }
        if (frame.kind === "array") {
          finish(`list[${frame.childTypes[0] ?? "Any"}]`);
          continue;
        }
        const node2 = frame.node;
        const name2 = frame.allocated;
        if (node2 === void 0 || name2 === void 0) throw new Error("missing typeddict frame state");
        const required = new Set(node2.required);
        const lines = [`class ${name2}(TypedDict):`];
        for (let index = 0; index < frame.entries.length; index++) {
          const entry = frame.entries[index];
          const fieldType = frame.childTypes[index];
          if (entry === void 0 || fieldType === void 0) throw new Error("missing typeddict field type");
          const [field, fieldSchema] = entry;
          const description = describe(fieldSchema);
          if (description !== void 0) lines.push(`${pad(1)}# ${description}`);
          if (required.has(field)) lines.push(`${pad(1)}${field}: ${fieldType}`);
          else {
            state2.typing.add("NotRequired");
            lines.push(`${pad(1)}${field}: NotRequired[${fieldType}]`);
          }
        }
        if (node2.additionalProperties !== false) lines.push(`${pad(1)}# Additional keys beyond those declared are allowed.`);
        if (lines.length === 1) lines.push(`${pad(1)}pass`);
        state2.classes.push(lines.join("\n"));
        finish(name2);
        continue;
      }
      frame.phase = "children";
      const node = frame.schema;
      if (node.oneOf !== void 0) {
        frame.kind = "oneOf";
        frame.children = node.oneOf.map((branch, index) => ({
          schema: branch,
          className: childClassName(frame.className, `${index + 1}`),
          listDepth: frame.listDepth
        }));
        continue;
      }
      if (node.type === void 0) {
        state2.typing.add("Any");
        finish("Any");
        continue;
      }
      switch (node.type) {
        case "string":
          finish(renderConstrainedScalar(node, "str", state2));
          break;
        case "number":
          finish(renderConstrainedScalar(node, "float", state2));
          break;
        case "integer":
          finish(renderConstrainedScalar(node, "int", state2));
          break;
        case "boolean":
          finish(renderConstrainedScalar(node, "bool", state2));
          break;
        case "null":
          finish("None");
          break;
        case "array":
          if (node.items === void 0) {
            state2.typing.add("Any");
            finish("list[Any]");
            break;
          }
          if (frame.listDepth >= MAX_LIST_NESTING) {
            state2.typing.add("Any");
            finish("Any");
            break;
          }
          frame.kind = "array";
          frame.children = [{
            schema: node.items,
            className: frame.className,
            listDepth: frame.listDepth + 1
          }];
          break;
        case "object": {
          const entries = Object.entries(node.properties ?? {});
          if (className === "" || !entries.every(([name2]) => isBareIdentifier(name2) && !RESERVED.has(name2) && !(name2.startsWith("__") && !name2.endsWith("__")))) {
            state2.typing.add("Any");
            finish("dict[str, Any]");
            break;
          }
          if (entries.length === 0 && node.additionalProperties !== false) {
            state2.typing.add("Any");
            finish("dict[str, Any]");
            break;
          }
          frame.kind = "typeddict";
          frame.node = node;
          frame.allocated = allocateClassName(frame.className, state2);
          state2.typing.add("TypedDict");
          frame.entries = entries;
          frame.children = entries.map(([field, child]) => ({
            schema: child,
            className: childClassName(frame.allocated ?? "", camelCase(field)),
            listDepth: 1
          }));
          break;
        }
        /* v8 ignore next 4 -- assertSupportedJsonSchema narrowed this closed type union. */
        default:
          state2.typing.add("Any");
          finish("Any");
      }
    }
    return result ?? "Any";
  } catch {
    state2.typing.add("Any");
    return "Any";
  }
}
var SDK_INSTRUCTIONS = `## Writing code for run_code

\`run_code\` takes two required arguments: \`code\` \u2014 the body of an async Python function (top-level \`await\` and \`return\` both work) \u2014 and \`description\`, a short summary of what the program does. At run time exactly two of the names declared below are bound: \`tools\` and \`ToolCallError\`. Everything else is a STATIC STUB describing argument and return types \u2014 in particular the \`TypedDict\` classes do NOT exist at run time, so build arguments as plain \`dict\`/\`list\` JSON values: \`await tools.name({"field": 1})\`, never \`FooArgs(field=1)\`, which raises \`NameError\`. Inside the program:

- Call tools as \`await tools.name(args)\` \u2014 subscript access for exotic, reserved, or underscore-leading names: \`await tools["my-tool"](args)\`. Every call resolves to the tool's typed canonical JSON value (each method's return type below). Tool arguments must be lossless JSON.
- A FAILED tool call raises \`ToolCallError\`, whose \`toolName\` identifies the failed tool and whose message is human-readable \u2014 wrap in \`try/except\` to handle and continue.
- Independent read-only calls MAY overlap under \`asyncio.gather\` (safe calls run concurrently; mutating calls run alone, in submission order). Sequence dependent work with \`await\`.
- Emit the run's answer with \`print(...)\` and/or a top-level \`return <value>\`; the returned value must be lossless JSON. Only what you print and return is program output. A successful tool result containing an image is attached after the run so you can inspect it on the next step; every other intermediate result stays out of the conversation, so extract just what you need.

The available tools:`;
function renderToolsSdkPy(schemas) {
  const sorted = [...schemas].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const state2 = {
    classes: [],
    usedClassNames: /* @__PURE__ */ new Set(),
    nextClassCounter: /* @__PURE__ */ new Map(),
    typing: /* @__PURE__ */ new Set(["Protocol"])
  };
  const members = [];
  let statements = 0;
  for (const schema of sorted) {
    const argType = renderType(schema.parameters, `${camelCase(schema.name)}Args`, state2);
    const outputType = renderType(schema.output, `${camelCase(schema.name)}Output`, state2);
    if (isBareIdentifier(schema.name) && !RESERVED.has(schema.name) && !schema.name.startsWith("_")) {
      const doc = docLines(schema.description, 2);
      members.push(doc.length > 0 ? `${pad(1)}async def ${schema.name}(self, args: ${argType}) -> ${outputType}:` : `${pad(1)}async def ${schema.name}(self, args: ${argType}) -> ${outputType}: ...`);
      members.push(...doc);
      statements += 1;
    } else {
      members.push(`${pad(1)}# tools[${JSON.stringify(schema.name)}](args: ${argType}) -> ${outputType}`);
      const description = describe(schema);
      if (description !== void 0) members.push(`${pad(1)}#   ${description}`);
    }
  }
  const body = (statements > 0 ? members : [`${pad(1)}pass`, ...members]).join("\n");
  const imports = TYPING_ORDER.filter((symbol) => state2.typing.has(symbol));
  const classBlock = state2.classes.length > 0 ? `${state2.classes.join("\n\n")}

` : "";
  return `${SDK_INSTRUCTIONS}

\`\`\`python
${`from typing import ${imports.join(", ")}

class ToolCallError(Exception):
    toolName: str

${classBlock}class Tools(Protocol):
${body}

tools: Tools`}
\`\`\``;
}
var PTC_ONLY_INSTRUCTION = `\`${RUN_CODE_NAME}\` is the only tool you can call directly \u2014 a tool call naming any other tool fails. Reach every tool the SDK declares below from inside the program.`;
var SDK_RENDERERS = {
  typescript: renderToolsSdk,
  python: renderToolsSdkPy
};
var TOOL_RUNTIME_SCHEDULER = /* @__PURE__ */ Symbol("@deepseek-ai/dsh-tools.scheduler");
var TOOL_ABORTED = "ABORTED";
var TOOL_ABORTED_BEFORE_DISPATCH = "ABORTED_BEFORE_DISPATCH";
var ToolNotFoundError = class extends HarnessError {
  /**
  * @param toolName - the name the caller asked for.
  * @param reachableFrom - how the model reaches this tool instead, when the
  *   name IS visible and only the presentation denies calling it directly.
  *   Omitted for a name that is registered nowhere.
  */
  constructor(toolName, reachableFrom) {
    super(reachableFrom === void 0 ? `unknown tool "${toolName}"` : `unknown tool "${toolName}": ${reachableFrom}`, "UNKNOWN_TOOL");
    this.name = "ToolNotFoundError";
  }
};
var ToolOutputError = class extends HarnessError {
  /** Schema/value violations in validation order. */
  violations;
  constructor(toolName, violations) {
    super(`tool "${toolName}" returned invalid output: ${violations.join("; ")}`, "INVALID_TOOL_OUTPUT");
    this.name = "ToolOutputError";
    this.violations = violations;
  }
};
function projectionError(toolName, projector, error) {
  return new ToolOutputError(toolName, [`output.${projector} failed: ${errorMessage2(error)}`]);
}
function snapshotProjection(toolName, projector, candidate) {
  try {
    const detached = snapshotJsonValue(candidate);
    if (detached === void 0) throw new ToolOutputError(toolName, [`output.${projector} returned non-lossless JSON`]);
    return detached;
  } catch (error) {
    if (error instanceof ToolOutputError) throw error;
    throw projectionError(toolName, projector, error);
  }
}
function snapshotToolValue(toolName, candidate) {
  try {
    const detached = snapshotJsonValue(candidate);
    if (detached === void 0) throw new ToolOutputError(toolName, ["value is not lossless JSON"]);
    return detached;
  } catch (error) {
    if (error instanceof ToolOutputError) throw error;
    throw new ToolOutputError(toolName, [`value snapshot failed: ${errorMessage2(error)}`]);
  }
}
function errorMessage2(error) {
  try {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
    return String(error);
  } catch {
    return "<unprintable thrown value>";
  }
}
function failureMessageFromContent(content) {
  const text2 = content.map((block) => block.type === "text" ? block.text : `[${block.type} content]`).join("\n");
  return text2.length > 0 ? text2 : "tool result blocked by post-execute policy";
}
function materializePresentation(candidate) {
  const detached = snapshotJsonValue(candidate);
  if (detached === void 0) throw new TypeError("tool result must be losslessly JSON-serializable");
  return deepFreeze(detached);
}
function errorInfo(error) {
  try {
    return error instanceof HarnessError ? {
      name: error.name,
      code: error.code
    } : void 0;
  } catch {
    return;
  }
}
var ToolLayer = class {
  tools;
  restrictions = new AnonymousEntries();
  guards = new AnonymousEntries();
  /**
  * Presentation this scope's agent declared for itself, shadowing the
  * deployment default. One cell rather than an entry table: two answers to
  * "which form does the model see" is a contradiction, not a merge.
  */
  mode;
  constructor(scope) {
    this.tools = new NamedEntries((name2) => /* @__PURE__ */ new Error(scope === void 0 ? `tool "${name2}" is already registered (for a per-agent variant, register through that agent's \`agent.ctx\` instead)` : `tool "${name2}" is already registered in this scope`));
  }
  /** Whether every contribution table in this aggregate layer is empty. */
  isEmpty() {
    return this.tools.isEmpty() && this.restrictions.isEmpty() && this.guards.isEmpty() && this.mode === void 0;
  }
  /** Whether every compiled restriction in this layer admits a global tool name. */
  admits(name2) {
    for (const filter of this.restrictions.values()) if (filter.allow !== void 0 && !filter.allow.has(name2) || filter.deny !== void 0 && filter.deny.has(name2)) return false;
    return true;
  }
  /** First monotonic denial from this layer's live guard registrations. */
  guardReason(exec) {
    for (const guard of this.guards.values()) {
      const reason = guard(exec);
      if (reason !== void 0) return reason;
    }
  }
};
function resolveMaxParallelSubCalls(value) {
  const maxParallelSubCalls = value ?? 10;
  if (!Number.isInteger(maxParallelSubCalls) || maxParallelSubCalls < 1) throw new Error("maxParallelSubCalls must be a positive integer");
  return maxParallelSubCalls;
}
var ToolRuntime = class extends Service {
  static inject = ["systemPrompt"];
  static Config = Schema.object({
    mode: Schema.union([
      "native",
      "ptc",
      "both"
    ]).default("native"),
    maxParallelSubCalls: Schema.natural().min(1).default(10)
  });
  /** Internal staged view consumed by `dsh-agent-loop`'s parallel scheduler. */
  [TOOL_RUNTIME_SCHEDULER] = {
    prepare: (exec) => this.prepareScheduledExecution(exec),
    dispatch: (exec) => this.dispatchScheduledExecution(exec),
    finalize: (exec, result) => this.finalizeScheduledExecution(exec, result),
    finish: (exec, result) => this.finishScheduledExecution(exec, result)
  };
  /** Context deferred by a running tool body, keyed by its scheduler-owned execution. */
  deferredContexts = /* @__PURE__ */ new WeakMap();
  /** Executions whose tool body declared the current turn complete. */
  concludingExecutions = /* @__PURE__ */ new WeakSet();
  /** Original caller cancellation, kept outside the wrapper-mutable execution object. */
  cancellationStates = /* @__PURE__ */ new WeakMap();
  /** Definition-owned final content transform snapshotted before policy begins. */
  contentFinalizers = /* @__PURE__ */ new WeakMap();
  /** Execution-prepared content installed before post-execute policy. */
  contentProjectors = /* @__PURE__ */ new WeakMap();
  layers = new ScopedLayers((scope) => new ToolLayer(scope), () => {
    this.ctx.emit("tools/change");
  });
  /** Presentation for scopes that declare none; {@link presentAs} shadows it per scope. */
  defaultMode;
  maxParallelSubCalls;
  /**
  * Reserved presentation transport, kept outside the filterable registration
  * layers. Built on first need rather than at construction: which agents run
  * a PTC mode is no longer known when the service is constructed, and the
  * transport is stateless beyond its closures over `this`.
  */
  ptcTransport;
  constructor(ctx, config = {}) {
    super(ctx, "tools");
    this.defaultMode = config.mode ?? "native";
    this.maxParallelSubCalls = resolveMaxParallelSubCalls(config.maxParallelSubCalls);
    ctx.systemPrompt.tools((context) => this.wireSchemas(context.scope));
    if (this.defaultMode !== "native") {
      ctx.systemPrompt.section(this.collapseSection());
      ctx.systemPrompt.section(this.sdkSection());
    }
  }
  /**
  * The prompt statement of the `ptc` executor collapse, registered wherever
  * {@link sdkSection} is and rendering empty outside an effective `ptc`.
  *
  * Every tool contributes its own guidance section naming its tool, none of
  * them qualify how that tool is reached, and they all render before the SDK.
  * Without this the model reads a catalog of tools it is told to use and no
  * statement that only `run_code` may be called, so it emits a native call,
  * receives `UNKNOWN_TOOL` for a tool the prompt just declared, and concludes
  * the deployment is inconsistent. Its order places the rule before that
  * guidance rather than after it.
  *
  * `both` renders empty: native calls do execute there, so the rule is false.
  * @returns the section registration.
  */
  collapseSection() {
    return {
      name: "tools:ptc-only",
      order: this.ctx.systemPrompt.getSectionOrder("PTC_ONLY"),
      text: (context) => this.modeFor(context.scope) === "ptc" ? PTC_ONLY_INSTRUCTION : ""
    };
  }
  /**
  * The generated-SDK prompt section, registered globally by a PTC mode
  * deployment and per scope by {@link presentAs}.
  *
  * The body regenerates from the CALLING scope, and renders empty for an
  * agent presenting natively — an agent that opted out under a PTC mode
  * deployment still sees the global registration, and an empty section is
  * dropped from the rendered prompt.
  * @returns the section registration.
  */
  sdkSection() {
    return {
      name: "tools:sdk",
      order: this.ctx.systemPrompt.getSectionOrder("TOOLS_SDK"),
      interpolate: false,
      text: (context) => {
        const mode = this.modeFor(context.scope);
        if (mode === "native") return "";
        const runtime = this.requirePtcRuntime(mode);
        const render3 = SDK_RENDERERS[runtime.language];
        if (render3 === void 0) throw new Error(`dsh-tools: no SDK renderer for ${runtime.language}`);
        return render3(this.sdkSchemas(context.scope));
      }
    };
  }
  /**
  * The presentation one scope's agent sees: its own declaration, else the
  * deployment default.
  * @param scope - the calling agent, or undefined for the global view.
  * @returns the resolved presentation mode.
  */
  modeFor(scope) {
    const layers = this.layers.chainLayers(scope);
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const mode = layers[index]?.mode;
      if (mode !== void 0) return mode;
    }
    return this.defaultMode;
  }
  /**
  * The reserved `run_code` transport, built on first need.
  *
  * It never enters the global layer: per-agent restrictions must not remove
  * it, and a scoped registration must not shadow it. The visibility resolver
  * appends it after resolving the filterable global/scoped capability layers,
  * and only for scopes whose mode actually presents it.
  * @returns the shared transport definition.
  */
  requirePtcTransport() {
    this.ptcTransport ??= createRunCodeTool(this, {
      requireRuntime: () => this.requirePtcRuntime(this.defaultMode),
      peekApprover: () => this.ctx.get("approval"),
      resolveSandboxPolicy: (exec) => {
        const policy = this.ctx.get("sandboxPolicy");
        if (policy === void 0) throw new Error("dsh-tools: confined PTC runtime requires sandboxPolicy");
        return policy.resolve(exec.agent === void 0 ? {} : { session: exec.agent.session });
      },
      peekRuntime: () => this.ctx.get("ptcRuntime"),
      maxParallel: this.maxParallelSubCalls,
      shapeDispatchLog: (dispatch) => this.shapeDispatchLog(dispatch)
    });
    return this.ptcTransport;
  }
  /**
  * Present the calling scope's tools in `mode` instead of the deployment
  * default. Nearest scope on the chain wins, so a preset's standing
  * declaration covers every agent joined under it.
  *
  * Scoped only, and one declaration per scope: this is how an agent preset
  * composes PTC mode agents beside native ones in the same process, and a
  * process-global override would be the `mode` config field instead.
  * @param mode - the presentation the covered agents' models see.
  * @returns the exact disposer that restores the deployment default.
  */
  presentAs(mode) {
    const ctx = this.ctx;
    if (scopeOf(ctx) === void 0) throw new Error("tools.presentAs() requires a scoped context (agent.ctx): a context-global presentation is the `mode` config field on the tools row");
    return ctx.effect(function* () {
      yield this.layers.effect(ctx, (layer) => {
        if (layer.mode !== void 0) throw new Error(`tools.presentAs("${mode}") conflicts with "${layer.mode}" already declared for this scope; one composition selects one presentation`);
        layer.mode = mode;
        return () => {
          layer.mode = void 0;
        };
      }, { label: "tools.presentAs()" });
      if (mode !== "native") {
        yield ctx.systemPrompt.section(this.collapseSection());
        yield ctx.systemPrompt.section(this.sdkSection());
      }
    }.bind(this), "tools.presentAs()");
  }
  /**
  * Build one scope's wire schemas and names for prompt-order validation.
  * Restrictions do not make known tools invalid, but a mode collapse does.
  */
  wireSchemas(scope) {
    const view = this.view(scope);
    const mode = this.modeFor(scope);
    if (mode === "native") return {
      schemas: [...view.visible.values()].map((definition) => this.schemaOf(definition, false)),
      knownNames: [...view.knownNames]
    };
    this.requirePtcRuntime(mode);
    const schemas = [...view.visible.values()].map((definition) => this.schemaOf(definition, false));
    if (mode === "ptc") return {
      schemas: schemas.filter((schema) => schema.name === RUN_CODE_NAME),
      knownNames: [RUN_CODE_NAME]
    };
    return {
      schemas,
      knownNames: [...view.knownNames, RUN_CODE_NAME]
    };
  }
  /**
  * Resolve the PTC runtime or throw the actionable misconfiguration error.
  * Read at use time (assembly / run_code execution), NOT via static
  * `inject`: an inject entry would hold `ctx.tools` — and every tool plugin
  * behind it — hostage to a PTC runtime existing even under `mode:
  * 'native'`.
  *
  * Assembly and `run_code` execution read separately, so the language is not
  * bound to a request. Harmless while one published backend exists — both
  * reads return the same flavor — but a reload that swapped in a second
  * language between them would hand a program written against one SDK to the
  * other. Binding it is deferred until a second backend ships (the first
  * point it is testable).
  */
  requirePtcRuntime(mode) {
    const runtime = this.ctx.get("ptcRuntime");
    if (!runtime) throw new Error(`dsh-tools: mode "${mode}" requires a PTC runtime \u2014 load a ctx.ptcRuntime implementation (e.g. @deepseek-ai/dsh-ptc-runtime-node) or set tools mode to "native"`);
    if (!Object.hasOwn(SDK_RENDERERS, runtime.language)) {
      const known = Object.keys(SDK_RENDERERS).map((name2) => JSON.stringify(name2)).join(", ");
      throw new Error(`dsh-tools: no SDK renderer registered for runtime language ${JSON.stringify(runtime.language)} (known: ${known})`);
    }
    return runtime;
  }
  /**
  * Register globally or in the calling agent scope. Scoped tools shadow
  * globals; duplicates within one layer and the reserved `run_code` name fail.
  * @param definition - tool schema, execution, and optional finalization/presentation callbacks.
  * @returns the exact disposer that unregisters the tool.
  */
  register(definition) {
    const name2 = definition.name;
    const output2 = definition.output;
    if (output2 === void 0 || typeof output2 !== "object" || typeof output2.render !== "function" || output2.presentationMeta !== void 0 && typeof output2.presentationMeta !== "function") throw new TypeError(`tool "${name2}" must declare output { schema, render, presentationMeta? }`);
    assertSupportedJsonSchema(output2.schema);
    const timeoutMs = definition.timeoutMs;
    if (timeoutMs !== void 0 && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) throw new TypeError(`tool "${name2}" timeoutMs must be a positive finite number`);
    if (name2 === "run_code") throw new Error(`tool name "${RUN_CODE_NAME}" is reserved for the PTC mode presentation transport and cannot be registered or shadowed`);
    return this.layers.effect(this.ctx, (layer) => layer.tools.insert(name2, definition), { label: "tools.register()" });
  }
  /**
  * Restrict global tools for the calling agent scope. Empty filters, unknown
  * names, scope-local names, and reserved transport names fail. Restrictions
  * intersect; scoped registrations remain visible.
  * @param filter - global-tool mask: `allow` (keep only) and/or `deny` (remove).
  * @returns the exact disposer that lifts this restriction.
  */
  restrict(filter) {
    const scope = scopeOf(this.ctx);
    if (scope === void 0) throw new Error("tools.restrict() requires a scoped context (agent.ctx): a context-global restriction would mask every agent \u2014 deny the tool for the intended agent instead");
    const allow = filter.allow;
    const deny = filter.deny;
    if (allow === void 0 && deny === void 0) throw new Error("tools.restrict({}) is a no-op: pass `allow` and/or `deny` (an empty filter is almost always a materialized-empty-config bug)");
    const compiled = {
      ...allow !== void 0 ? { allow: new Set(allow) } : {},
      ...deny !== void 0 ? { deny: new Set(deny) } : {}
    };
    if ([...allow ?? [], ...deny ?? []].includes("run_code")) throw new Error(`tools.restrict() cannot name reserved PTC mode presentation transport "${RUN_CODE_NAME}"; restrict end-capability tools instead`);
    const known = this.view(scope).restrictableNames;
    const unknown = [...allow ?? [], ...deny ?? []].filter((name2) => !known.has(name2));
    if (unknown.length > 0) throw new Error(`tools.restrict() names unknown global tool${unknown.length > 1 ? "s" : ""} ${unknown.map((n) => `"${n}"`).join(", ")}; known global tools: ${[...known].sort().join(", ") || "(none)"}`);
    return this.layers.effect(this.ctx, (layer) => layer.restrictions.append(compiled), { label: "tools.restrict()" });
  }
  /**
  * Register a monotonic guard after the extensible `tools/pre-execute`
  * waterfall. A plain-context guard applies globally; one registered through
  * `agent.ctx` applies only to that agent. Any matching guard may deny by
  * returning a reason, while no guard can force-allow a call another guard
  * denied. The exact effect disposer is returned for ordered ownership and
  * HMR cleanup.
  * @param guard - synchronous check; a returned string denies the execution.
  * @returns the exact disposer that unregisters the guard.
  */
  guard(guard) {
    return this.layers.effect(this.ctx, (layer) => layer.guards.append(guard), {
      label: "tools.guard()",
      notify: false
    });
  }
  /** First monotonic denial from the global then the scope chain's guard layers, farthest first. */
  guardReason(exec) {
    const globalReason = this.layers.global.guardReason(exec);
    if (globalReason !== void 0) return globalReason;
    if (exec.agent === void 0) return void 0;
    for (const layer of this.layers.chainLayers(exec.agent)) {
      const reason = layer.guardReason(exec);
      if (reason !== void 0) return reason;
    }
  }
  /**
  * Resolve every registry fact one scope needs in one layer traversal. The
  * visible map applies restrictions to the INHERITED surface, then the
  * scope's own registrations and the reserved presentation transport; the
  * other sets retain the pre-restriction facts needed by restriction and
  * prompt-order validation.
  *
  * A restriction filters what a scope inherits — the global layer and every
  * ancestor layer on its chain — and never what its OWN layer registers.
  * That exemption is what a per-child capability filter has to keep intact:
  * the delegation runtime registers a child's structured-output tool into the
  * child's own layer, and a filter naming the capabilities the child may use
  * must not strip the machinery it answers through.
  *
  * Reading the exempt set as "the global layer" instead of "not mine" held
  * only while every model-facing tool sat in the host composition. Once
  * presets moved them onto the agent plane they became an ANCESTOR
  * contribution, so a child's filter silently stopped constraining anything
  * it was given.
  * @param scope - the viewing scope (the agent), or undefined for the global view.
  * @returns the complete derived view for that scope.
  */
  view(scope) {
    const layers = this.layers.chainLayers(scope);
    const own = this.layers.peek(scope);
    const inherited = new Map(this.layers.global.tools.entries());
    for (const layer of layers) {
      if (layer === own) continue;
      for (const [name2, definition] of layer.tools.entries()) inherited.set(name2, definition);
    }
    const visible = /* @__PURE__ */ new Map();
    const knownNames = /* @__PURE__ */ new Set();
    const restrictableNames = /* @__PURE__ */ new Set();
    for (const [name2, definition] of inherited) {
      knownNames.add(name2);
      restrictableNames.add(name2);
      if (layers.every((layer) => layer.admits(name2))) visible.set(name2, definition);
    }
    if (own !== void 0) for (const [name2, definition] of own.tools.entries()) {
      knownNames.add(name2);
      visible.set(name2, definition);
    }
    if (this.modeFor(scope) !== "native") visible.set(RUN_CODE_NAME, this.requirePtcTransport());
    return {
      visible,
      knownNames,
      restrictableNames
    };
  }
  /**
  * Look up a tool as one scope sees it (scoped
  * shadows global; a restricted-away global reads as absent). Presenters pass
  * the calling agent so the rendered card matches the definition that
  * actually executed.
  * @param name - the tool name as registered.
  * @param scope - the viewing scope (the agent); omitted = the global view.
  * @returns the definition the scope resolves, or undefined when none is visible.
  */
  get(name2, scope) {
    return this.view(scope).visible.get(name2);
  }
  /**
  * Resolve the definition that MAY EXECUTE for a call, applying the mode
  * collapse at the operation boundary that owns it. The registry view
  * (`get`) is presentation-agnostic; here a MODEL-DIRECT call under `ptc`
  * may only name the reserved `run_code` transport, while a nested
  * sub-dispatch (a `parent` token set — the `run_code` SDK calling a tool
  * it bound) may call any visible tool. Denial surfaces as `UNKNOWN_TOOL`
  * through the executor, matching an absent definition.
  * @param name - the tool name as registered.
  * @param scope - the viewing scope (the agent); omitted = the global view.
  * @param nested - whether the call is a transport sub-dispatch, not a model-direct call.
  * @returns the definition that may run, or undefined when the call must be rejected.
  */
  resolveExecution(name2, scope, nested) {
    const tool = this.get(name2, scope);
    if (tool === void 0) return void 0;
    if (this.collapses(name2, scope, nested)) return void 0;
    return tool;
  }
  /**
  * Project visible definitions onto the allowlisted model-facing schema fields,
  * excluding execution and presentation callbacks.
  * @param scope - the viewing scope (the agent); omitted = the global view.
  * @returns one deep-cloned schema per visible tool.
  */
  schemas(scope) {
    return [...this.view(scope).visible.values()].map((definition) => this.schemaOf(definition, true));
  }
  /** Project visible callable tools onto the generated PTC mode SDK contract. */
  sdkSchemas(scope) {
    return [...this.view(scope).visible.values()].filter((definition) => definition.name !== RUN_CODE_NAME).map((definition) => {
      const output2 = snapshotJsonValue(definition.output.schema);
      if (output2 === void 0) throw new Error(`tool "${definition.name}" output schema must be lossless JSON before SDK projection`);
      return {
        ...this.schemaOf(definition, true),
        output: output2
      };
    });
  }
  /** Project one definition onto the model-facing schema fields. */
  schemaOf(definition, detachParameters) {
    const { name: name2, description, parameters, deferLoading } = definition;
    const detached = detachParameters ? snapshotJsonValue(parameters) : parameters;
    if (detached === void 0) throw new Error(`tool "${name2}" parameters must be lossless JSON before schema projection`);
    return {
      name: name2,
      description,
      parameters: detached,
      ...deferLoading === true ? { deferLoading } : {}
    };
  }
  /**
  * Classify a pending call through the caller's visible tool definition. Only
  * an exact `true` is parallel; unknown, hidden, undeclared, invalid, or
  * throwing classifiers are exclusive.
  * @param exec - call name, parsed arguments, and optional agent scope.
  * @returns the fail-closed scheduling mode.
  */
  executionMode(exec) {
    const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
    if (!tool?.isConcurrencySafe) return { kind: "exclusive" };
    try {
      return tool.isConcurrencySafe(exec.arguments) === true ? { kind: "parallel" } : { kind: "exclusive" };
    } catch {
      return { kind: "exclusive" };
    }
  }
  /**
  * Run the `tools/ptc-dispatch-log` waterfall over one settled sub-dispatch
  * and return the content the bridge should log on `tool/ptc-dispatch`.
  * Contained: when a listener throws, the method logs the original settled
  * content; that failure must not fail the dispatch or omit the settle event. Private:
  * the ONE consumer is the `run_code` bridge this registry constructs, which
  * receives it as a capability parameter (the `requireRuntime` idiom) — the
  * waterfall, not this invoker, is the public extension point.
  */
  async shapeDispatchLog(dispatch) {
    try {
      return await this.ctx.waterfall(scopeTarget(this, dispatch.agent), "tools/ptc-dispatch-log", dispatch, () => Promise.resolve(dispatch.content));
    } catch (error) {
      this.ctx.logger.warn(`tools: ptc-dispatch-log listener failed for ${dispatch.name}: ${errorMessage2(error)}; logging the original settled content`);
      return dispatch.content;
    }
  }
  /**
  * Whether the `ptc` mode collapse denies a model-direct call: only the
  * reserved `run_code` transport may be named. Nested sub-dispatches (a
  * `parent` token set) bypass the collapse. One home for the
  * security-relevant predicate, shared by {@link resolveExecution} and
  * {@link createExecution} so the two can never drift apart.
  *
  * Resolved through {@link modeFor}, NOT `defaultMode`: an agent given `ptc`
  * by an agent preset under a native deployment is the composition
  * `dsh-agent-tool-presentation` exists for, and reading the deployment default would
  * leave exactly that agent uncollapsed — announcing one surface while
  * executing another, which is the bypass this collapse closes.
  * @param name - the tool name as registered.
  * @param scope - the viewing scope whose effective presentation mode applies.
  * @param nested - whether the call is a transport sub-dispatch, not a model-direct call.
  */
  collapses(name2, scope, nested) {
    return !nested && this.modeFor(scope) === "ptc" && name2 !== "run_code";
  }
  /**
  * Execute through pre-policy, guards, around-dispatch, post-policy,
  * definition-owned content finalization, and final notification. Tool and
  * listener failures resolve as materialized error results; an invisible tool
  * reports `UNKNOWN_TOOL`. The returned outcome is the same lossless, frozen
  * snapshot final observers receive. Cancellation
  * arriving after entry and before final result materialization skips a
  * not-yet-started body with `ABORTED_BEFORE_DISPATCH` or replaces a
  * successful started outcome with `ABORTED`; already-started work is still
  * drained and may retain a tool-owned structured error.
  * @param exec - the typed same-process call input. The registry assigns its
  *   correlation token before policy begins.
  * @returns the materialized final result.
  */
  async execute(exec) {
    return this.prepareExecution(exec, (prepared) => this.completeScheduledExecution(prepared));
  }
  async completeScheduledExecution(prepared) {
    switch (prepared.kind) {
      case "dispatch": {
        const dispatched = await this.dispatchScheduledExecution(prepared.exec);
        return dispatched.kind === "post-result" ? await this.finalizeScheduledExecution(prepared.exec, dispatched.result) : this.finishScheduledExecution(prepared.exec, dispatched.result);
      }
      case "post-result":
        return await this.finalizeScheduledExecution(prepared.exec, prepared.result);
      case "final-result":
        return this.finishScheduledExecution(prepared.exec, prepared.result);
      /* v8 ignore next -- closed-union exhaustiveness guard */
      default:
        return assertNever(prepared, "scheduled tool preparation");
    }
  }
  createExecution(exec) {
    const deferredContexts = [];
    const token = createExecutionToken();
    const callId = exec.callId;
    const rootCallId = exec.rootCallId ?? callId;
    const name2 = exec.name;
    const agent = exec.agent;
    const parent = exec.parent;
    const signal = exec.signal;
    const visible = this.get(name2, agent);
    const collapsed = visible !== void 0 && this.collapses(name2, agent, parent !== void 0);
    const concludingExecutions = this.concludingExecutions;
    const base = {
      token,
      callId,
      rootCallId,
      name: name2,
      signal,
      ...agent !== void 0 ? { agent } : {},
      ...parent !== void 0 ? { parent } : {},
      ...exec.schema !== void 0 ? { schema: exec.schema } : {},
      deferContext(context) {
        deferredContexts.push(context);
      },
      concludeTurn() {
        concludingExecutions.add(this);
      }
    };
    const capturedFinalizer = visible?.finalizeContent?.bind(visible);
    const capturedProjector = visible?.projectContent?.bind(visible);
    const finalizerFor = () => collapsed && !signal.aborted ? void 0 : capturedFinalizer;
    try {
      const detached = snapshotJsonValue(exec.arguments);
      if (detached === void 0) throw new TypeError("tool execution arguments must be losslessly JSON-serializable");
      const execution = {
        ...base,
        arguments: deepFreeze(detached)
      };
      this.deferredContexts.set(execution, deferredContexts);
      this.contentFinalizers.set(execution, finalizerFor());
      if (!collapsed) this.contentProjectors.set(execution, capturedProjector);
      this.cancellationStates.set(execution, {
        callerSignal: signal,
        bodyInvoked: false
      });
      if (collapsed) {
        if (signal.aborted) return {
          kind: "final-result",
          exec: execution,
          result: toolAbortedBeforeDispatchResult()
        };
        return {
          kind: "final-result",
          exec: execution,
          result: toolErrorResult(new ToolNotFoundError(name2, `only \`${RUN_CODE_NAME}\` is callable directly \u2014 call \`${name2}\` from inside a \`${RUN_CODE_NAME}\` program instead`))
        };
      }
      return {
        kind: "ready",
        exec: execution
      };
    } catch (error) {
      const execution = {
        ...base,
        arguments: void 0
      };
      this.contentFinalizers.set(execution, finalizerFor());
      return {
        kind: "final-result",
        exec: execution,
        result: toolErrorResult(error)
      };
    }
  }
  /**
  * Run the ordered pre-execute and monotonic guard stages for the scheduler.
  * @param input - the caller-supplied execution input.
  * @returns the prepared execution plus the next scheduler stage.
  * @internal
  */
  async prepareScheduledExecution(input) {
    return this.prepareExecution(input, (prepared) => prepared);
  }
  async prepareExecution(input, next) {
    const created = this.createExecution(input);
    if (created.kind !== "ready") return next(created);
    const exec = created.exec;
    if (this.callerCancelled(exec)) return next({
      kind: "final-result",
      exec,
      result: toolAbortedBeforeDispatchResult()
    });
    try {
      const carrier = scopeTarget(this, exec.agent);
      const gate = await this.ctx.waterfall(carrier, "tools/pre-execute", exec, () => Promise.resolve({ kind: "allow" }));
      const askResolution = gate.kind === "ask" ? await this.serviceAsk(exec, gate) : {
        decision: gate,
        approvalCancelled: false
      };
      const { decision } = askResolution;
      if (this.callerCancelled(exec) && askResolution.approvalCancelled) return await next({
        kind: "post-result",
        exec,
        result: toolAbortedBeforeDispatchResult()
      });
      if (decision.kind === "cancel") return await next({
        kind: "post-result",
        exec,
        result: toolAbortedBeforeDispatchResult()
      });
      const denialReason = decision.kind === "allow" ? this.guardReason(exec) : decision.reason;
      const denialInfo = decision.kind === "deny" ? decision.info : void 0;
      if (denialReason !== void 0) return await next({
        kind: "post-result",
        exec,
        result: this.materializeFinalResult({
          content: [{
            type: "text",
            text: `Error: ${denialReason}`
          }],
          isError: true,
          error: {
            message: denialReason,
            ...denialInfo === void 0 ? {} : { info: denialInfo }
          }
        })
      });
      if (this.callerCancelled(exec)) return await next({
        kind: "post-result",
        exec,
        result: toolAbortedBeforeDispatchResult()
      });
      return await next({
        kind: "dispatch",
        exec
      });
    } catch (error) {
      return next({
        kind: "final-result",
        exec,
        result: toolErrorResult(error)
      });
    }
  }
  /** Whether the original caller signal is currently aborted. */
  callerCancelled(exec) {
    const state2 = this.cancellationStates.get(exec);
    if (state2 === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
    return state2.callerSignal.aborted;
  }
  /** Canonical cancellation outcome selected by whether the tool body started. */
  cancellationResult(exec, prior) {
    const state2 = this.cancellationStates.get(exec);
    if (state2 === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
    return state2.bodyInvoked ? toolAbortedResult(prior) : toolAbortedBeforeDispatchResult(prior);
  }
  /**
  * Dispatch the registered body with the original caller signal fused back
  * into any around-wrapper replacement. Cancellation never abandons the body:
  * a started promise reaches quiescence before its outcome becomes `ABORTED`.
  */
  async dispatchToolBody(exec) {
    const state2 = this.cancellationStates.get(exec);
    if (state2 === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
    const wrapperSignal = exec.signal;
    const fused = fuseToolSignals(state2.callerSignal, wrapperSignal);
    const signal = fused.signal;
    if (isAborted(signal)) {
      fused.dispose();
      return toolAbortedBeforeDispatchResult();
    }
    exec.signal = signal;
    try {
      const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
      if (!tool) throw new ToolNotFoundError(exec.name);
      state2.bodyInvoked = true;
      const returned = await tool.execute(exec.arguments, exec);
      const result = this.createSuccessResult(exec, tool, returned);
      return isAborted(signal) ? toolAbortedResult(result) : result;
    } catch (error) {
      return toolErrorResult(error);
    } finally {
      fused.dispose();
      exec.signal = wrapperSignal;
    }
  }
  /**
  * Run around-dispatch and the tool body. Tool and unknown-tool failures still
  * receive post-execute; pipeline failures are already final.
  * @param exec - the prepared execution.
  * @returns whether the result still needs post-execute.
  * @internal
  */
  async dispatchScheduledExecution(exec) {
    try {
      const mutableExec = exec;
      const carrier = scopeTarget(this, exec.agent);
      const result = await this.ctx.waterfall(carrier, "tools/execute", mutableExec, () => this.dispatchToolBody(mutableExec));
      const normalized = this.normalizeDispatchResult(exec, result);
      const deferredContexts = this.deferredContexts.get(exec);
      if (deferredContexts === void 0) throw new Error("tool registry scheduler invariant violated: unprepared execution");
      const resultWithDeferredContexts = deferredContexts.length === 0 ? normalized : this.markCanonical(exec, {
        ...normalized,
        additionalContexts: [...deferredContexts, ...normalized.additionalContexts ?? []]
      });
      return {
        kind: "post-result",
        result: this.callerCancelled(exec) && !resultWithDeferredContexts.isError ? this.cancellationResult(exec, resultWithDeferredContexts) : resultWithDeferredContexts
      };
    } catch (error) {
      return {
        kind: "final-result",
        result: toolErrorResult(error)
      };
    }
  }
  /**
  * Run ordered post-execute, then apply definition-owned content finalization,
  * materialize, and notify the final outcome.
  * @param exec - the prepared execution.
  * @param result - dispatch/pre result that still needs post-execute.
  * @returns the materialized final result.
  * @internal
  */
  async finalizeScheduledExecution(exec, result) {
    try {
      const project = this.contentProjectors.get(exec);
      this.contentProjectors.delete(exec);
      const content = project?.(exec, result);
      const projected = content === void 0 ? result : this.markCanonical(exec, this.materializeFinalResult({
        ...result,
        content
      }));
      const postResult = await this.postExecute(exec, projected);
      return this.finishScheduledExecution(exec, this.callerCancelled(exec) && !postResult.isError ? this.cancellationResult(exec, postResult) : postResult);
    } catch (error) {
      return this.finishScheduledExecution(exec, toolErrorResult(error));
    }
  }
  /**
  * Materialize the candidate, apply definition-owned content finalization,
  * then materialize and notify the authoritative result.
  * @param exec - the prepared execution.
  * @param result - final result.
  * @returns the materialized final result.
  * @internal
  */
  finishScheduledExecution(exec, result) {
    let materializedResult;
    try {
      materializedResult = this.materializeFinalResult(result);
    } catch (error) {
      materializedResult = this.materializeFinalResult(toolErrorResult(error));
    }
    let finalResult;
    try {
      finalResult = this.materializeFinalResult(this.applyFinalContent(exec, materializedResult));
    } catch (error) {
      finalResult = this.materializeFinalResult(toolErrorResult(error));
    }
    this.notifyResult(exec, finalResult);
    return finalResult;
  }
  /** Apply the snapshotted tool-owned content transform without exposing other result fields. */
  applyFinalContent(exec, result) {
    const finalizeContent = this.contentFinalizers.get(exec);
    if (finalizeContent === void 0) return result;
    const content = finalizeContent(exec, result);
    return content === void 0 ? result : {
      ...result,
      content
    };
  }
  /** Notify observers without exposing a mutation or error channel into the outcome. */
  notifyResult(exec, result) {
    Object.freeze(exec);
    const { name: toolName, callId } = exec;
    const reportFailure = (error) => {
      this.ctx.logger.warn(`tool "${toolName}" (${callId}): tools/result observer failed: ${errorMessage2(error)}`);
    };
    const callbacks = this.ctx.events.dispatch("emit", [
      scopeTarget(this, exec.agent),
      "tools/result",
      exec,
      result
    ]);
    for (const callback of callbacks) try {
      const returned = callback(exec, result);
      Promise.resolve(returned).catch(reportFailure);
    } catch (error) {
      reportFailure(error);
    }
  }
  /**
  * Resolve an `ask` decision to allow/deny through the approval seam. The
  * seam is consumed opportunistically with `ctx.get('approval')` — a
  * deployment that composes no ApprovalService keeps the historical degrade
  * to deny, and an unmount mid-session degrades the same way on the next ask.
  * An agent-less execution also degrades: without an agent there is no
  * session to audit to and no UI to route to. Otherwise the outcome maps
  * one-to-one — `allowed-once` proceeds; the three non-grants deny with
  * distinct reasons so the model can tell a human "no" from an absent
  * approval channel.
  */
  async serviceAsk(exec, ask) {
    const approval = this.ctx.get("approval");
    if (approval === void 0) return {
      decision: {
        kind: "deny",
        reason: ask.reason ?? `tool "${exec.name}" requires approval (not yet supported)`
      },
      approvalCancelled: false
    };
    if (exec.agent === void 0) return {
      decision: {
        kind: "deny",
        reason: `tool "${exec.name}" requires approval, but the call has no agent to route it through`
      },
      approvalCancelled: false
    };
    const outcome = await approval.request({
      agent: exec.agent,
      toolName: exec.name,
      callId: exec.callId,
      ...ask.reason !== void 0 ? { reason: ask.reason } : {},
      ...ask.displayReason !== void 0 ? { displayReason: ask.displayReason } : {},
      signal: exec.signal
    });
    switch (outcome) {
      case "allowed-once":
        return {
          decision: { kind: "allow" },
          approvalCancelled: false
        };
      case "rejected":
        return {
          decision: {
            kind: "deny",
            reason: `the user rejected tool "${exec.name}"`
          },
          approvalCancelled: false
        };
      case "cancelled":
        return {
          decision: {
            kind: "deny",
            reason: `approval for tool "${exec.name}" was cancelled`
          },
          approvalCancelled: true
        };
      case "unavailable":
        return {
          decision: {
            kind: "deny",
            reason: `tool "${exec.name}" requires approval, but no approval channel is available`
          },
          approvalCancelled: false
        };
      default:
        return assertNever(outcome, "ApprovalOutcome");
    }
  }
  /**
  * Run the `tools/post-execute` waterfall over a dispatched `result` and apply
  * its {@link PostToolDecision}: `accept` keeps the call successful (replacing
  * `content` when given), `block` turns it into an `isError` whose content is
  * the corrective `feedback`. Either decision may attach `additionalContexts`,
  * which are ferried on the returned result for the loop's active-batch FIFO.
  * Context deferred by the tool body survives an accepted result but is
  * discarded when the outer call is blocked; a block exposes only context the
  * blocking decision explicitly supplied.
  * Runs inside `execute`'s outer try/catch (a throwing listener → isError).
  */
  async postExecute(exec, result) {
    const decision = await this.ctx.waterfall(scopeTarget(this, exec.agent), "tools/post-execute", exec, result, () => Promise.resolve({ kind: "accept" }));
    const decisionContexts = decision.additionalContexts ?? [];
    if (decision.kind === "block") {
      const message = failureMessageFromContent(decision.feedback);
      return this.markCanonical(exec, {
        content: decision.feedback,
        isError: true,
        error: { message },
        ...decisionContexts.length > 0 ? { additionalContexts: decisionContexts } : {}
      });
    }
    if (Object.hasOwn(decision, "content") && Object.hasOwn(decision, "value")) throw new TypeError("tools/post-execute accept decision cannot replace both value and content");
    const additionalContexts = [...result.additionalContexts ?? [], ...decisionContexts];
    if (Object.hasOwn(decision, "value")) {
      if (result.isError) throw new TypeError("tools/post-execute cannot replace the value of a failed result");
      const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
      if (tool === void 0) throw new ToolNotFoundError(exec.name);
      const replaced = this.createSuccessResult(exec, tool, decision.value);
      return this.markCanonical(exec, {
        ...replaced,
        ...additionalContexts.length > 0 ? { additionalContexts } : {}
      });
    }
    return this.markCanonical(exec, {
      ...result,
      ...decision.content !== void 0 ? { content: decision.content } : {},
      ...additionalContexts.length > 0 ? { additionalContexts } : {}
    });
  }
  /** Registry-normalized results and the exact dispatch that validated each value. */
  canonicalResults = /* @__PURE__ */ new WeakMap();
  /** Mark one registry-normalized result as canonical only for its owning dispatch. */
  markCanonical(exec, result) {
    this.canonicalResults.set(result, exec.token);
    return result;
  }
  /** Snapshot, validate, render, and optionally project one successful body value. */
  createSuccessResult(exec, tool, candidate) {
    const detached = snapshotToolValue(tool.name, candidate);
    const violations = validateJsonSchemaValue(tool.output.schema, detached, "value");
    if (violations.length > 0) throw new ToolOutputError(tool.name, violations);
    const value = deepFreeze(detached);
    let rendered;
    try {
      rendered = tool.output.render(exec.arguments, value);
    } catch (error) {
      throw projectionError(tool.name, "render", error);
    }
    const content = snapshotProjection(tool.name, "render", rendered);
    let meta;
    if (exec.parent === void 0 && tool.output.presentationMeta !== void 0) {
      let projected;
      try {
        projected = tool.output.presentationMeta(exec.arguments, value);
      } catch (error) {
        throw projectionError(tool.name, "presentationMeta", error);
      }
      meta = snapshotProjection(tool.name, "presentationMeta", projected);
    }
    const concludesTurn = this.concludingExecutions.has(exec);
    return this.markCanonical(exec, this.materializeFinalResult({
      isError: false,
      value,
      content,
      ...meta !== void 0 ? { meta } : {},
      ...concludesTurn ? { concludesTurn: true } : {}
    }));
  }
  /** Normalize an around-dispatch wrapper's authored result through the owning output contract. */
  normalizeDispatchResult(exec, result) {
    if (this.canonicalResults.get(result) === exec.token) return result;
    if (result.isError) return this.markCanonical(exec, {
      isError: true,
      error: result.error,
      content: result.content,
      ...result.meta !== void 0 ? { meta: result.meta } : {},
      ...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
    });
    const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
    if (tool === void 0) throw new ToolNotFoundError(exec.name);
    const normalized = this.createSuccessResult(exec, tool, result.value);
    return this.markCanonical(exec, {
      ...normalized,
      ...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
    });
  }
  /** Materialize the authoritative commit outcome once, immediately before `tools/result`. */
  materializeFinalResult(result) {
    const presentation = {
      content: result.content,
      ...result.meta !== void 0 ? { meta: result.meta } : {},
      ...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
    };
    if (result.isError) return materializePresentation({
      isError: true,
      error: result.error,
      ...presentation
    });
    return deepFreeze({
      ...materializePresentation({
        isError: false,
        ...presentation,
        ...result.concludesTurn === true ? { concludesTurn: true } : {}
      }),
      value: result.value
    });
  }
};
function createExecutionToken() {
  return /* @__PURE__ */ Symbol("dsh.tool.execution");
}
function toolErrorResult(error) {
  const info = errorInfo(error);
  const message = errorMessage2(error);
  return {
    content: [{
      type: "text",
      text: `Error: ${message}`
    }],
    isError: true,
    error: {
      message,
      ...info ? { info } : {}
    }
  };
}
function isAborted(signal) {
  return signal.aborted;
}
function fuseToolSignals(caller, wrapper) {
  if (caller === wrapper) return {
    signal: caller,
    dispose() {
    }
  };
  const controller = new AbortController();
  let listening = false;
  const dispose = () => {
    if (!listening) return;
    listening = false;
    caller.removeEventListener("abort", abortFromCaller);
    wrapper.removeEventListener("abort", abortFromWrapper);
  };
  const abortFrom = (source) => {
    const reason = source.reason;
    controller.abort(reason);
    dispose();
  };
  const abortFromCaller = () => {
    abortFrom(caller);
  };
  const abortFromWrapper = () => {
    abortFrom(wrapper);
  };
  if (wrapper.aborted) abortFromWrapper();
  else if (caller.aborted) abortFromCaller();
  else {
    listening = true;
    caller.addEventListener("abort", abortFromCaller, { once: true });
    wrapper.addEventListener("abort", abortFromWrapper, { once: true });
  }
  return {
    signal: controller.signal,
    dispose
  };
}
function toolAbortedResult(prior) {
  const additionalContexts = prior?.additionalContexts ?? [];
  return {
    content: [{
      type: "text",
      text: "Error: tool call aborted"
    }],
    isError: true,
    error: {
      message: "tool call aborted",
      info: {
        name: "AbortError",
        code: TOOL_ABORTED
      }
    },
    ...additionalContexts.length > 0 ? { additionalContexts } : {}
  };
}
function toolAbortedBeforeDispatchResult(prior) {
  const additionalContexts = prior?.additionalContexts ?? [];
  return {
    content: [{
      type: "text",
      text: "Error: tool call aborted before dispatch"
    }],
    isError: true,
    error: {
      message: "tool call aborted before dispatch",
      info: {
        name: "AbortError",
        code: TOOL_ABORTED_BEFORE_DISPATCH
      }
    },
    ...additionalContexts.length > 0 ? { additionalContexts } : {}
  };
}

// vendor/copylee-office/src/format.ts
var APP_NAMES = { word: "Word", excel: "Excel", ppt: "PowerPoint" };
var WPS_NAMES = { word: "WPS Writer", excel: "WPS Spreadsheets", ppt: "WPS Presentation" };
var appName = (on) => (on.suite === "wps" ? WPS_NAMES : APP_NAMES)[on.app];
var state = (doc) => [doc.saved ? "saved" : "unsaved changes", doc.readOnly ? "read-only" : "", doc.active ? "active" : "", doc.background ? "in the background, no window" : ""].filter(Boolean).join(", ");
function formatStatus(apps) {
  const lines = [];
  for (const app of apps) {
    const name2 = appName(app);
    if (!app.installed) {
      lines.push(`${name2}: not installed`);
      continue;
    }
    if (!app.running && app.documents.length === 0) {
      lines.push(`${name2}: installed, not running (research_office_open starts it)`);
      continue;
    }
    if (app.error) {
      lines.push(`${name2}: ${app.error}`);
      continue;
    }
    if (app.documents.length === 0) {
      lines.push(`${name2}: running, nothing open`);
      continue;
    }
    lines.push(`${name2}:`);
    for (const doc of app.documents) lines.push(`  ${doc.path ?? `${doc.name} (never saved)`} \u2014 ${state(doc)}`);
  }
  return lines.join("\n");
}
function formatOpened(doc) {
  const how = doc.how === "created" ? "Created" : doc.how === "opened" ? "Opened" : "Already open, attached to";
  return `${how} ${doc.path ?? doc.name} in ${appName(doc)} (${state(doc)}).${doc.suite === "wps" ? ` This is WPS Office: the same tools and operations apply${doc.app === "ppt" ? "," : ""}${doc.app === "ppt" ? " except that a formula ($...$) on a slide is a picture laid over blanks kept for it in the text, not an equation the user can edit: after you move, resize or rewrite a text shape that has formulas, write its text again (set_text) so they are placed anew, and look at the slide (research_office_render)" : ""}.` : ""}${doc.readOnly ? " It is read-only: edits cannot be saved to this file." : ""}`;
}
var BODY_STYLES = /* @__PURE__ */ new Set(["normal", "\u6B63\u6587", "body text"]);
function formatWord(read) {
  const notes = read.footnotes?.length ? ["Footnotes (i is the collection index, not the displayed number; edits need expect from the note text):", ...read.footnotes.map((note) => `footnote ${note.i} [display ${note.label ?? `unavailable, number style ${note.numberStyle}`}; para ${note.para}, offset ${note.offset}, page ${note.page}, section ${note.section}] ${note.text}`)] : [];
  if (read.cells) {
    return [`Table ${read.table} (${read.cells.length} rows):`, ...read.cells.map((row, index) => `${index + 1}: ${row.map((cell2) => cell2 ?? "(merged)").join(" | ")}`), ...notes].join("\n");
  }
  const head = `${read.paragraphs} paragraphs, ${read.tables} table(s)${read.pages === void 0 ? "" : `, ${read.pages} page(s)`}.`;
  const lines = (read.items ?? []).map((item) => {
    if (item.size !== void 0) {
      const name2 = item.table === void 0 ? "table inside a cell" : `table ${item.table}`;
      return `${item.i}\u2013${item.to} [${name2}, ${item.size}]${item.open ? " holds the text below; write inside it by paragraph number:" : ""}`;
    }
    const tag = item.level !== void 0 ? `H${item.level}` : item.style !== void 0 && !BODY_STYLES.has(item.style.toLowerCase()) ? item.style : "";
    return `${item.inTable ? "  " : ""}${item.i}${tag ? ` [${tag}]` : ""} ${item.text ? item.text : "(empty)"}`;
  });
  return [head, ...lines, ...read.more ? [read.more] : [], ...notes].join("\n");
}
var cell = (value) => value === null || value === void 0 ? "" : String(value);
function formatExcel(read) {
  const sheets = read.sheets.map((sheet) => `${sheet.name} (${sheet.used}${sheet.charts ? `, ${sheet.charts} chart(s)` : ""})`).join(", ");
  const first = Number(/\d+/.exec(read.range)?.[0] ?? 1);
  const rows = read.values.map((row, index) => `${first + index}: ${row.map(cell).join(" | ")}`);
  const formulas = read.formulas?.length ? [`Formulas: ${read.formulas.map((item) => `${item.cell} ${item.formula}`).join("; ")}`] : [];
  const objects = read.objects?.length ? [`On this sheet: ${read.objects.join("; ")}.`] : [];
  const profile = read.profile?.length ? ["What the columns hold (the whole block, not only the rows shown):", ...read.profile.map((line) => `  ${line}`)] : [];
  return [`Sheets: ${sheets}.`, `${read.sheet}!${read.range} (values; one line per row):`, ...rows, ...formulas, ...read.clipped ? [read.clipped] : [], ...objects, ...profile].join("\n");
}
function formatPpt(read) {
  const lines = [`${read.slides} slide(s), ${read.width}\xD7${read.height} pt.`];
  for (const slide of read.items) {
    lines.push(`Slide ${slide.slide}${slide.layout ? ` (${slide.layout})` : ""}`);
    if (slide.shapes.length === 0) lines.push("  (empty)");
    for (const shape of slide.shapes) {
      lines.push(`  "${shape.name}"${shape.id === void 0 ? "" : ` #${shape.id}`} ${shape.type} [${shape.box.join(", ")}]${shape.text === void 0 ? "" : `: ${shape.text.replace(/\n/g, " / ")}`}`);
    }
    if (slide.plain) lines.push(`  (+ ${slide.plain} shape(s) without text: decoration; full: true lists them)`);
  }
  return lines.join("\n");
}
var PRECHECKED = /* @__PURE__ */ new Set(["BAD_ARGS", "ANCHOR_MISSING", "ANCHOR_MISMATCH", "NOT_FOUND", "STYLE_MISSING", "BUSY"]);
function formatEdit(result) {
  const done = result.done.map((line, index2) => `${index2 + 1}. ${line}`);
  if (!result.failed) return [`All ${result.total} operation(s) applied (not saved yet):`, ...done, "Before you finish, look at the pages you changed with research_office_render and fix what is off."].join("\n");
  const { index, op: op2, error } = result.failed;
  return [
    `Stopped at operation ${index + 1} (${op2}): ${error}`,
    done.length ? `Applied before it:
${done.join("\n")}` : "Nothing before it was applied.",
    PRECHECKED.has(result.failed.code) ? "" : "The failed operation itself may have changed part of the document: read it before you retry.",
    result.total - index - 1 > 0 ? `The ${result.total - index - 1} operation(s) after it did not run.` : ""
  ].filter(Boolean).join("\n");
}

// node_modules/temml/dist/temml.mjs
var ParseError = class _ParseError {
  constructor(message, token) {
    let error = " " + message;
    let start;
    const loc = token && token.loc;
    if (loc && loc.start <= loc.end) {
      const input = loc.lexer.input;
      start = loc.start;
      const end = loc.end;
      if (start === input.length) {
        error += " at end of input: ";
      } else {
        error += " at position " + (start + 1) + ": \n";
      }
      const underlined = input.slice(start, end).replace(/[^]/g, "$&\u0332");
      let left;
      if (start > 15) {
        left = "\u2026" + input.slice(start - 15, start);
      } else {
        left = input.slice(0, start);
      }
      let right;
      if (end + 15 < input.length) {
        right = input.slice(end, end + 15) + "\u2026";
      } else {
        right = input.slice(end);
      }
      error += left + underlined + right;
    }
    const self = new Error(error);
    self.name = "ParseError";
    self.__proto__ = _ParseError.prototype;
    self.position = start;
    return self;
  }
};
ParseError.prototype.__proto__ = Error.prototype;
var deflt = function(options, key2, defaultIfUndefined) {
  if (!Object.prototype.hasOwnProperty.call(options, key2)) {
    return defaultIfUndefined;
  }
  const setting = options[key2];
  return setting === void 0 ? defaultIfUndefined : setting;
};
var uppercase = /([A-Z])/g;
var hyphenate2 = function(str) {
  return str.replace(uppercase, "-$1").toLowerCase();
};
var ESCAPE_LOOKUP = {
  "&": "&amp;",
  ">": "&gt;",
  "<": "&lt;",
  '"': "&quot;",
  "'": "&#x27;"
};
var ESCAPE_REGEX = /[&><"']/g;
function escape(text2) {
  return String(text2).replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}
var getBaseElem = function(group) {
  if (group.type === "ordgroup") {
    if (group.body.length === 1) {
      return getBaseElem(group.body[0]);
    } else {
      return group;
    }
  } else if (group.type === "color") {
    if (group.body.length === 1) {
      return getBaseElem(group.body[0]);
    } else {
      return group;
    }
  } else if (group.type === "font") {
    return getBaseElem(group.body);
  } else {
    return group;
  }
};
var isCharacterBox = function(group) {
  const baseElem = getBaseElem(group);
  return baseElem.type === "mathord" || baseElem.type === "textord" || baseElem.type === "atom";
};
var assert = function(value) {
  if (!value) {
    throw new Error("Expected non-null, but got " + String(value));
  }
  return value;
};
var protocolFromUrl = function(url) {
  const protocol = /^[\x00-\x20]*([^\\/#?]*?)(:|&#0*58|&#x0*3a|&colon)/i.exec(url);
  if (!protocol) {
    return "_relative";
  }
  if (protocol[2] !== ":") {
    return null;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(protocol[1])) {
    return null;
  }
  return protocol[1].toLowerCase();
};
var round = function(n) {
  return +n.toFixed(4);
};
var smalls = "aceg\u0131\u0237mnopqrsuvwxyz\u03B1\u03B3\u03B5\u03B7\u03B9\u03BA\u03BC\u03BD\u03BF\u03C0\u03C1\u03C2\u03C3\u03C4\u03C5\u03C7\u03C9\u03D5\u{1D41A}\u{1D41C}\u{1D41E}\u{1D420}\u{1D426}\u{1D427}\u{1D428}\u{1D429}\u{1D42A}\u{1D42B}\u{1D42C}\u{1D42E}\u{1D42F}\u{1D430}\u{1D431}\u{1D432}\u{1D433}";
var FORBIDDEN_MACRO_KEYS = ["__proto__", "prototype", "constructor"];
var sanitizeMacros = (macros2) => {
  if (macros2 == null || typeof macros2 !== "object") {
    return /* @__PURE__ */ Object.create(null);
  }
  for (const key2 of FORBIDDEN_MACRO_KEYS) {
    if (Object.prototype.hasOwnProperty.call(macros2, key2)) {
      delete macros2[key2];
    }
  }
  return Object.setPrototypeOf(macros2, null);
};
var Settings = class {
  constructor(options) {
    options = options || {};
    this.displayMode = deflt(options, "displayMode", false);
    this.annotate = deflt(options, "annotate", false);
    this.leqno = deflt(options, "leqno", false);
    this.throwOnError = deflt(options, "throwOnError", false);
    this.errorColor = deflt(options, "errorColor", "#b22222");
    this.macros = sanitizeMacros(
      Object.prototype.hasOwnProperty.call(options, "macros") ? options.macros : void 0
    );
    this.wrap = deflt(options, "wrap", "none");
    this.xml = deflt(options, "xml", false);
    this.colorIsTextColor = deflt(options, "colorIsTextColor", false);
    this.strict = deflt(options, "strict", false);
    this.trust = deflt(options, "trust", false);
    const maxSize = Object.prototype.hasOwnProperty.call(options, "maxSize") ? options.maxSize : void 0;
    this.maxSize = maxSize === void 0 ? [Infinity, Infinity] : Array.isArray(maxSize) ? maxSize : [Infinity, Infinity];
    this.maxExpand = Math.max(0, deflt(options, "maxExpand", 1e3));
    this.wrapDelimiterPairs = true;
  }
  /**
   * Check whether to test potentially dangerous input, and return
   * `true` (trusted) or `false` (untrusted).  The sole argument `context`
   * should be an object with `command` field specifying the relevant LaTeX
   * command (as a string starting with `\`), and any other arguments, etc.
   * If `context` has a `url` field, a `protocol` field will automatically
   * get added by this function (changing the specified object).
   */
  isTrusted(context) {
    if (context.url && !context.protocol) {
      const protocol = protocolFromUrl(context.url);
      if (protocol == null) {
        return false;
      }
      context.protocol = protocol;
    }
    const trust = typeof this.trust === "function" ? this.trust(context) : this.trust;
    return Boolean(trust);
  }
};
var _functions = {};
var _mathmlGroupBuilders = {};
function defineFunction({
  type,
  names,
  props,
  handler,
  mathmlBuilder: mathmlBuilder2
}) {
  const data = {
    type,
    numArgs: props.numArgs,
    argTypes: props.argTypes,
    allowedInArgument: !!props.allowedInArgument,
    allowedInText: !!props.allowedInText,
    allowedInMath: props.allowedInMath === void 0 ? true : props.allowedInMath,
    numOptionalArgs: props.numOptionalArgs || 0,
    infix: !!props.infix,
    primitive: !!props.primitive,
    handler
  };
  for (let i = 0; i < names.length; ++i) {
    _functions[names[i]] = data;
  }
  if (type) {
    if (mathmlBuilder2) {
      _mathmlGroupBuilders[type] = mathmlBuilder2;
    }
  }
}
function defineFunctionBuilders({ type, mathmlBuilder: mathmlBuilder2 }) {
  defineFunction({
    type,
    names: [],
    props: { numArgs: 0 },
    handler() {
      throw new Error("Should never be called.");
    },
    mathmlBuilder: mathmlBuilder2
  });
}
var normalizeArgument = function(arg2) {
  return arg2.type === "ordgroup" && arg2.body.length === 1 ? arg2.body[0] : arg2;
};
var ordargument = function(arg2) {
  return arg2.type === "ordgroup" ? arg2.body : [arg2];
};
var DocumentFragment = class {
  constructor(children) {
    this.children = children;
    this.classes = [];
    this.style = {};
  }
  hasClass(className) {
    return this.classes.includes(className);
  }
  /** Convert the fragment into a node. */
  toNode() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < this.children.length; i++) {
      frag.appendChild(this.children[i].toNode());
    }
    return frag;
  }
  /** Convert the fragment into HTML markup. */
  toMarkup() {
    let markup = "";
    for (let i = 0; i < this.children.length; i++) {
      markup += this.children[i].toMarkup();
    }
    return markup;
  }
  /**
   * Converts the math node into a string, similar to innerText. Applies to
   * MathDomNode's only.
   */
  toText() {
    const toText = (child) => child.toText();
    return this.children.map(toText).join("");
  }
};
var createClass = function(classes) {
  return classes.filter((cls) => cls).join(" ");
};
var initNode = function(classes, style) {
  this.classes = classes || [];
  this.attributes = {};
  this.style = style || {};
};
var toNode = function(tagName) {
  const node = document.createElement(tagName);
  node.className = createClass(this.classes);
  for (const style in this.style) {
    if (Object.prototype.hasOwnProperty.call(this.style, style)) {
      node.style[style] = this.style[style];
    }
  }
  for (const attr in this.attributes) {
    if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
      node.setAttribute(attr, this.attributes[attr]);
    }
  }
  for (let i = 0; i < this.children.length; i++) {
    node.appendChild(this.children[i].toNode());
  }
  return node;
};
var toMarkup = function(tagName) {
  let markup = `<${tagName}`;
  if (this.classes.length) {
    markup += ` class="${escape(createClass(this.classes))}"`;
  }
  let styles = "";
  for (const style in this.style) {
    if (Object.prototype.hasOwnProperty.call(this.style, style)) {
      styles += `${hyphenate2(style)}:${this.style[style]};`;
    }
  }
  if (styles) {
    markup += ` style="${styles}"`;
  }
  for (const attr in this.attributes) {
    if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
      markup += ` ${attr}="${escape(this.attributes[attr])}"`;
    }
  }
  markup += ">";
  for (let i = 0; i < this.children.length; i++) {
    markup += this.children[i].toMarkup();
  }
  markup += `</${tagName}>`;
  return markup;
};
var Span = class {
  constructor(classes, children, style) {
    initNode.call(this, classes, style);
    this.children = children || [];
  }
  setAttribute(attribute, value) {
    this.attributes[attribute] = value;
  }
  toNode() {
    return toNode.call(this, "span");
  }
  toMarkup() {
    return toMarkup.call(this, "span");
  }
};
var TextNode$1 = class TextNode {
  constructor(text2) {
    this.text = text2;
  }
  toNode() {
    return document.createTextNode(this.text);
  }
  toMarkup() {
    return escape(this.text);
  }
};
var AnchorNode = class {
  constructor(href, classes, children) {
    this.href = href;
    this.classes = classes;
    this.children = children || [];
  }
  toNode() {
    const node = document.createElement("a");
    node.setAttribute("href", this.href);
    if (this.classes.length > 0) {
      node.className = createClass(this.classes);
    }
    for (let i = 0; i < this.children.length; i++) {
      node.appendChild(this.children[i].toNode());
    }
    return node;
  }
  toMarkup() {
    let markup = `<a href='${escape(this.href)}'`;
    if (this.classes.length > 0) {
      markup += ` class="${escape(createClass(this.classes))}"`;
    }
    markup += ">";
    for (let i = 0; i < this.children.length; i++) {
      markup += this.children[i].toMarkup();
    }
    markup += "</a>";
    return markup;
  }
};
var Img = class {
  constructor(src, alt, style) {
    this.alt = alt;
    this.src = src;
    this.classes = ["mord"];
    this.style = style;
  }
  hasClass(className) {
    return this.classes.includes(className);
  }
  toNode() {
    const node = document.createElement("img");
    node.src = this.src;
    node.alt = this.alt;
    node.className = "mord";
    for (const style in this.style) {
      if (Object.prototype.hasOwnProperty.call(this.style, style)) {
        node.style[style] = this.style[style];
      }
    }
    return node;
  }
  toMarkup() {
    let markup = `<img src='${this.src}' alt='${this.alt}'`;
    let styles = "";
    for (const style in this.style) {
      if (Object.prototype.hasOwnProperty.call(this.style, style)) {
        styles += `${hyphenate2(style)}:${this.style[style]};`;
      }
    }
    if (styles) {
      markup += ` style="${escape(styles)}"`;
    }
    markup += ">";
    return markup;
  }
};
function newDocumentFragment(children) {
  return new DocumentFragment(children);
}
var MathNode = class {
  constructor(type, children, classes, style) {
    this.type = type;
    this.attributes = {};
    this.children = children || [];
    this.classes = classes || [];
    this.style = style || {};
    this.label = "";
  }
  /**
   * Sets an attribute on a MathML node. MathML depends on attributes to convey a
   * semantic content, so this is used heavily.
   */
  setAttribute(name2, value) {
    this.attributes[name2] = value;
  }
  /**
   * Gets an attribute on a MathML node.
   */
  getAttribute(name2) {
    return this.attributes[name2];
  }
  setLabel(value) {
    this.label = value;
  }
  /**
   * Converts the math node into a MathML-namespaced DOM element.
   */
  toNode() {
    const node = document.createElementNS("http://www.w3.org/1998/Math/MathML", this.type);
    for (const attr in this.attributes) {
      if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
        node.setAttribute(attr, this.attributes[attr]);
      }
    }
    if (this.classes.length > 0) {
      node.className = createClass(this.classes);
    }
    for (const style in this.style) {
      if (Object.prototype.hasOwnProperty.call(this.style, style)) {
        node.style[style] = this.style[style];
      }
    }
    for (let i = 0; i < this.children.length; i++) {
      node.appendChild(this.children[i].toNode());
    }
    return node;
  }
  /**
   * Converts the math node into an HTML markup string.
   */
  toMarkup() {
    let markup = "<" + this.type;
    for (const attr in this.attributes) {
      if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
        markup += " " + attr + '="';
        markup += escape(this.attributes[attr]);
        markup += '"';
      }
    }
    if (this.classes.length > 0) {
      markup += ` class="${escape(createClass(this.classes))}"`;
    }
    let styles = "";
    for (const style in this.style) {
      if (Object.prototype.hasOwnProperty.call(this.style, style)) {
        styles += `${hyphenate2(style)}:${this.style[style]};`;
      }
    }
    if (styles) {
      markup += ` style="${styles}"`;
    }
    markup += ">";
    for (let i = 0; i < this.children.length; i++) {
      markup += this.children[i].toMarkup();
    }
    markup += "</" + this.type + ">";
    return markup;
  }
  /**
   * Converts the math node into a string, similar to innerText, but escaped.
   */
  toText() {
    return this.children.map((child) => child.toText()).join("");
  }
};
var TextNode2 = class {
  constructor(text2) {
    this.text = text2;
  }
  /**
   * Converts the text node into a DOM text node.
   */
  toNode() {
    return document.createTextNode(this.text);
  }
  /**
   * Converts the text node into escaped HTML markup
   * (representing the text itself).
   */
  toMarkup() {
    return escape(this.toText());
  }
  /**
   * Converts the text node into a string
   * (representing the text itself).
   */
  toText() {
    return this.text;
  }
};
var wrapWithMstyle = (expression) => {
  let node;
  if (expression.length === 1 && expression[0].type === "mrow") {
    node = expression.pop();
    node.type = "mstyle";
  } else {
    node = new MathNode("mstyle", expression);
  }
  return node;
};
var estimatedWidth = (node) => {
  let width = 0;
  if (node.body && Array.isArray(node.body)) {
    for (const item of node.body) {
      width += estimatedWidth(item);
    }
  } else if (node.body) {
    width += estimatedWidth(node.body);
  } else if (node.type === "supsub") {
    width += estimatedWidth(node.base);
    if (node.sub) {
      width += 0.7 * estimatedWidth(node.sub);
    }
    if (node.sup) {
      width += 0.7 * estimatedWidth(node.sup);
    }
  } else if (node.type === "mathord" || node.type === "textord") {
    for (const ch of node.text.split("")) {
      const codePoint = ch.codePointAt(0);
      if (96 < codePoint && codePoint < 123 || 944 < codePoint && codePoint < 970) {
        width += 0.56;
      } else if (47 < codePoint && codePoint < 58) {
        width += 0.5;
      } else {
        width += 0.92;
      }
    }
  } else {
    width += 1;
  }
  return width;
};
var stretchyCodePoint = {
  widehat: "\u02C6",
  // Shorter than \u005e, which is appropriate for an accent.
  widecheck: "\u02C7",
  widetilde: "~",
  wideparen: "\u23DC",
  // \u23dc
  utilde: "~",
  overleftarrow: "\u2190",
  underleftarrow: "\u2190",
  xleftarrow: "\u2190",
  overrightarrow: "\u2192",
  underrightarrow: "\u2192",
  xrightarrow: "\u2192",
  underbrace: "\u23DF",
  overbrace: "\u23DE",
  overbracket: "\u23B4",
  underbracket: "\u23B5",
  overgroup: "\u23E0",
  overparen: "\u23DC",
  undergroup: "\u23E1",
  underparen: "\u23DD",
  overleftrightarrow: "\u2194",
  underleftrightarrow: "\u2194",
  xleftrightarrow: "\u2194",
  Overrightarrow: "\u21D2",
  xRightarrow: "\u21D2",
  overleftharpoon: "\u21BC",
  xleftharpoonup: "\u21BC",
  overrightharpoon: "\u21C0",
  xrightharpoonup: "\u21C0",
  xLeftarrow: "\u21D0",
  xLeftrightarrow: "\u21D4",
  xhookleftarrow: "\u21A9",
  xhookrightarrow: "\u21AA",
  xmapsto: "\u21A6",
  xrightharpoondown: "\u21C1",
  xleftharpoondown: "\u21BD",
  xtwoheadleftarrow: "\u219E",
  xtwoheadrightarrow: "\u21A0",
  xlongequal: "=",
  xrightleftarrows: "\u21C4",
  xtofrom: "\u21C4",
  xleftrightharpoons: "\u21CB",
  xrightleftharpoons: "\u21CC",
  yields: "\u2192",
  yieldsLeft: "\u2190",
  mesomerism: "\u2194",
  longrightharpoonup: "\u21C0",
  longleftharpoondown: "\u21BD",
  eqrightharpoonup: "\u21C0",
  eqleftharpoondown: "\u21BD",
  "\\cdrightarrow": "\u2192",
  "\\cdleftarrow": "\u2190",
  "\\cdlongequal": "=",
  yieldsLeftRight: "\u21C4",
  chemequilibrium: "\u21CC"
};
var mathMLnode = function(label) {
  const child = new TextNode2(stretchyCodePoint[label.slice(1)]);
  const node = new MathNode("mo", [child]);
  node.setAttribute("stretchy", "true");
  return node;
};
var wideHats = ["\\widehat", "\\widecheck"];
var accentNode = (group) => {
  const mo = mathMLnode(group.label);
  if (group.label.indexOf("tilde") > -1) {
    const width = estimatedWidth(group.base);
    if (1 < width && width < 1.6) {
      mo.classes.push("tml-tilde-2");
    } else if (1.6 <= width && width < 2.5) {
      mo.classes.push("tml-tilde-3");
    } else if (2.5 <= width) {
      mo.classes.push("tml-tilde-4");
    }
  } else if (wideHats.includes(group.label)) {
    const width = estimatedWidth(group.base);
    if (0 < width && width <= 1) {
      mo.classes.push("tml-hat-1");
    } else if (1 < width && width < 1.6) {
      mo.classes.push("tml-hat-2");
    } else if (1.6 <= width && width < 2.5) {
      mo.classes.push("tml-hat-3");
    } else if (2.5 <= width) {
      mo.classes.push("tml-hat-4");
    }
  }
  return mo;
};
var ATOMS = {
  bin: 1,
  close: 1,
  inner: 1,
  open: 1,
  punct: 1,
  rel: 1
};
var NON_ATOMS = {
  "accent-token": 1,
  mathord: 1,
  "op-token": 1,
  spacing: 1,
  textord: 1
};
var symbols2 = /* @__PURE__ */ Object.create(null);
symbols2.math = /* @__PURE__ */ Object.create(null);
symbols2.text = /* @__PURE__ */ Object.create(null);
function defineSymbol(mode, group, replace, name2, acceptUnicodeChar) {
  if (mode !== "math" && mode !== "text") {
    throw new TypeError(`Invalid mode: ${mode} called in defineSymbol`);
  }
  const entry = { group, replace };
  symbols2[mode][name2] = entry;
  if (acceptUnicodeChar && replace) {
    symbols2[mode][replace] = entry;
  }
}
var math = "math";
var text = "text";
var accent = "accent-token";
var bin = "bin";
var close = "close";
var inner = "inner";
var mathord = "mathord";
var op = "op-token";
var open = "open";
var punct = "punct";
var rel = "rel";
var spacing = "spacing";
var textord = "textord";
defineSymbol(math, rel, "\u2261", "\\equiv", true);
defineSymbol(math, rel, "\u227A", "\\prec", true);
defineSymbol(math, rel, "\u227B", "\\succ", true);
defineSymbol(math, rel, "\u223C", "\\sim", true);
defineSymbol(math, rel, "\u27C2", "\\perp", true);
defineSymbol(math, rel, "\u2AAF", "\\preceq", true);
defineSymbol(math, rel, "\u2AB0", "\\succeq", true);
defineSymbol(math, rel, "\u2243", "\\simeq", true);
defineSymbol(math, rel, "\u224C", "\\backcong", true);
defineSymbol(math, rel, "|", "\\mid", true);
defineSymbol(math, rel, "\u226A", "\\ll", true);
defineSymbol(math, rel, "\u226B", "\\gg", true);
defineSymbol(math, rel, "\u224D", "\\asymp", true);
defineSymbol(math, rel, "\u2225", "\\parallel");
defineSymbol(math, rel, "\u2323", "\\smile", true);
defineSymbol(math, rel, "\u2291", "\\sqsubseteq", true);
defineSymbol(math, rel, "\u2292", "\\sqsupseteq", true);
defineSymbol(math, rel, "\u2250", "\\doteq", true);
defineSymbol(math, rel, "\u2322", "\\frown", true);
defineSymbol(math, rel, "\u220B", "\\ni", true);
defineSymbol(math, rel, "\u220C", "\\notni", true);
defineSymbol(math, rel, "\u221D", "\\propto", true);
defineSymbol(math, rel, "\u22A2", "\\vdash", true);
defineSymbol(math, rel, "\u22A3", "\\dashv", true);
defineSymbol(math, rel, "\u220B", "\\owns");
defineSymbol(math, rel, "\u2258", "\\arceq", true);
defineSymbol(math, rel, "\u2259", "\\wedgeq", true);
defineSymbol(math, rel, "\u225A", "\\veeeq", true);
defineSymbol(math, rel, "\u225B", "\\stareq", true);
defineSymbol(math, rel, "\u225D", "\\eqdef", true);
defineSymbol(math, rel, "\u225E", "\\measeq", true);
defineSymbol(math, rel, "\u225F", "\\questeq", true);
defineSymbol(math, rel, "\u2260", "\\ne", true);
defineSymbol(math, rel, "\u2260", "\\neq");
defineSymbol(math, rel, "\u2A75", "\\eqeq", true);
defineSymbol(math, rel, "\u2A76", "\\eqeqeq", true);
defineSymbol(math, rel, "\u2237", "\\dblcolon", true);
defineSymbol(math, rel, "\u2254", "\\coloneqq", true);
defineSymbol(math, rel, "\u2255", "\\eqqcolon", true);
defineSymbol(math, rel, "\u2239", "\\eqcolon", true);
defineSymbol(math, rel, "\u2A74", "\\Coloneqq", true);
defineSymbol(math, punct, ".", "\\ldotp");
defineSymbol(math, punct, "\xB7", "\\cdotp");
defineSymbol(math, textord, "#", "\\#");
defineSymbol(text, textord, "#", "\\#");
defineSymbol(math, textord, "&", "\\&");
defineSymbol(text, textord, "&", "\\&");
defineSymbol(math, textord, "\u2135", "\\aleph", true);
defineSymbol(math, textord, "\u2200", "\\forall", true);
defineSymbol(math, textord, "\u210F", "\\hbar", true);
defineSymbol(math, textord, "\u2203", "\\exists", true);
defineSymbol(math, open, "\u2207", "\\nabla", true);
defineSymbol(math, textord, "\u266D", "\\flat", true);
defineSymbol(math, textord, "\u2113", "\\ell", true);
defineSymbol(math, textord, "\u266E", "\\natural", true);
defineSymbol(math, textord, "\u212B", "\\Angstrom", true);
defineSymbol(text, textord, "\u212B", "\\Angstrom", true);
defineSymbol(math, textord, "\u2663", "\\clubsuit", true);
defineSymbol(math, textord, "\u2667", "\\varclubsuit", true);
defineSymbol(math, textord, "\u2118", "\\wp", true);
defineSymbol(math, textord, "\u266F", "\\sharp", true);
defineSymbol(math, textord, "\u2662", "\\diamondsuit", true);
defineSymbol(math, textord, "\u2666", "\\vardiamondsuit", true);
defineSymbol(math, textord, "\u211C", "\\Re", true);
defineSymbol(math, textord, "\u2661", "\\heartsuit", true);
defineSymbol(math, textord, "\u2665", "\\varheartsuit", true);
defineSymbol(math, textord, "\u2111", "\\Im", true);
defineSymbol(math, textord, "\u2660", "\\spadesuit", true);
defineSymbol(math, textord, "\u2664", "\\varspadesuit", true);
defineSymbol(math, textord, "\u2640", "\\female", true);
defineSymbol(math, textord, "\u2642", "\\male", true);
defineSymbol(math, textord, "\xA7", "\\S", true);
defineSymbol(text, textord, "\xA7", "\\S");
defineSymbol(math, textord, "\xB6", "\\P", true);
defineSymbol(text, textord, "\xB6", "\\P");
defineSymbol(text, textord, "\u263A", "\\smiley", true);
defineSymbol(math, textord, "\u263A", "\\smiley", true);
defineSymbol(math, textord, "\u2020", "\\dag");
defineSymbol(text, textord, "\u2020", "\\dag");
defineSymbol(text, textord, "\u2020", "\\textdagger");
defineSymbol(math, textord, "\u2021", "\\ddag");
defineSymbol(text, textord, "\u2021", "\\ddag");
defineSymbol(text, textord, "\u2021", "\\textdaggerdbl");
defineSymbol(math, close, "\u23B1", "\\rmoustache", true);
defineSymbol(math, open, "\u23B0", "\\lmoustache", true);
defineSymbol(math, close, "\u27EF", "\\rgroup", true);
defineSymbol(math, open, "\u27EE", "\\lgroup", true);
defineSymbol(math, bin, "\u2213", "\\mp", true);
defineSymbol(math, bin, "\u2296", "\\ominus", true);
defineSymbol(math, bin, "\u228E", "\\uplus", true);
defineSymbol(math, bin, "\u2293", "\\sqcap", true);
defineSymbol(math, bin, "\u2217", "\\ast");
defineSymbol(math, bin, "\u2294", "\\sqcup", true);
defineSymbol(math, bin, "\u25EF", "\\bigcirc", true);
defineSymbol(math, bin, "\u2219", "\\bullet", true);
defineSymbol(math, bin, "\u2021", "\\ddagger");
defineSymbol(math, bin, "\u2240", "\\wr", true);
defineSymbol(math, bin, "\u2A3F", "\\amalg");
defineSymbol(math, bin, "&", "\\And");
defineSymbol(math, bin, "\u2AFD", "\\sslash", true);
defineSymbol(math, rel, "\u27F5", "\\longleftarrow", true);
defineSymbol(math, rel, "\u21D0", "\\Leftarrow", true);
defineSymbol(math, rel, "\u27F8", "\\Longleftarrow", true);
defineSymbol(math, rel, "\u27F6", "\\longrightarrow", true);
defineSymbol(math, rel, "\u21D2", "\\Rightarrow", true);
defineSymbol(math, rel, "\u27F9", "\\Longrightarrow", true);
defineSymbol(math, rel, "\u2194", "\\leftrightarrow", true);
defineSymbol(math, rel, "\u27F7", "\\longleftrightarrow", true);
defineSymbol(math, rel, "\u21D4", "\\Leftrightarrow", true);
defineSymbol(math, rel, "\u27FA", "\\Longleftrightarrow", true);
defineSymbol(math, rel, "\u21A4", "\\mapsfrom", true);
defineSymbol(math, rel, "\u21A6", "\\mapsto", true);
defineSymbol(math, rel, "\u27FC", "\\longmapsto", true);
defineSymbol(math, rel, "\u2197", "\\nearrow", true);
defineSymbol(math, rel, "\u21A9", "\\hookleftarrow", true);
defineSymbol(math, rel, "\u21AA", "\\hookrightarrow", true);
defineSymbol(math, rel, "\u2198", "\\searrow", true);
defineSymbol(math, rel, "\u21BC", "\\leftharpoonup", true);
defineSymbol(math, rel, "\u21C0", "\\rightharpoonup", true);
defineSymbol(math, rel, "\u2199", "\\swarrow", true);
defineSymbol(math, rel, "\u21BD", "\\leftharpoondown", true);
defineSymbol(math, rel, "\u21C1", "\\rightharpoondown", true);
defineSymbol(math, rel, "\u2196", "\\nwarrow", true);
defineSymbol(math, rel, "\u21CC", "\\rightleftharpoons", true);
defineSymbol(math, mathord, "\u21AF", "\\lightning", true);
defineSymbol(math, mathord, "\u220E", "\\QED", true);
defineSymbol(math, mathord, "\u2030", "\\permil", true);
defineSymbol(text, textord, "\u2030", "\\permil");
defineSymbol(math, mathord, "\u2609", "\\astrosun", true);
defineSymbol(math, mathord, "\u263C", "\\sun", true);
defineSymbol(math, mathord, "\u263E", "\\leftmoon", true);
defineSymbol(math, mathord, "\u263D", "\\rightmoon", true);
defineSymbol(math, mathord, "\u2295", "\\Earth");
defineSymbol(math, rel, "\u226E", "\\nless", true);
defineSymbol(math, rel, "\u2A87", "\\lneq", true);
defineSymbol(math, rel, "\u2268", "\\lneqq", true);
defineSymbol(math, rel, "\u2268\uFE00", "\\lvertneqq");
defineSymbol(math, rel, "\u22E6", "\\lnsim", true);
defineSymbol(math, rel, "\u2A89", "\\lnapprox", true);
defineSymbol(math, rel, "\u2280", "\\nprec", true);
defineSymbol(math, rel, "\u22E0", "\\npreceq", true);
defineSymbol(math, rel, "\u22E8", "\\precnsim", true);
defineSymbol(math, rel, "\u2AB9", "\\precnapprox", true);
defineSymbol(math, rel, "\u2241", "\\nsim", true);
defineSymbol(math, rel, "\u2224", "\\nmid", true);
defineSymbol(math, rel, "\u2224", "\\nshortmid");
defineSymbol(math, rel, "\u22AC", "\\nvdash", true);
defineSymbol(math, rel, "\u22AD", "\\nvDash", true);
defineSymbol(math, rel, "\u22EA", "\\ntriangleleft");
defineSymbol(math, rel, "\u22EC", "\\ntrianglelefteq", true);
defineSymbol(math, rel, "\u2284", "\\nsubset", true);
defineSymbol(math, rel, "\u2285", "\\nsupset", true);
defineSymbol(math, rel, "\u228A", "\\subsetneq", true);
defineSymbol(math, rel, "\u228A\uFE00", "\\varsubsetneq");
defineSymbol(math, rel, "\u2ACB", "\\subsetneqq", true);
defineSymbol(math, rel, "\u2ACB\uFE00", "\\varsubsetneqq");
defineSymbol(math, rel, "\u226F", "\\ngtr", true);
defineSymbol(math, rel, "\u2A88", "\\gneq", true);
defineSymbol(math, rel, "\u2269", "\\gneqq", true);
defineSymbol(math, rel, "\u2269\uFE00", "\\gvertneqq");
defineSymbol(math, rel, "\u22E7", "\\gnsim", true);
defineSymbol(math, rel, "\u2A8A", "\\gnapprox", true);
defineSymbol(math, rel, "\u2281", "\\nsucc", true);
defineSymbol(math, rel, "\u22E1", "\\nsucceq", true);
defineSymbol(math, rel, "\u22E9", "\\succnsim", true);
defineSymbol(math, rel, "\u2ABA", "\\succnapprox", true);
defineSymbol(math, rel, "\u2246", "\\ncong", true);
defineSymbol(math, rel, "\u2226", "\\nparallel", true);
defineSymbol(math, rel, "\u2226", "\\nshortparallel");
defineSymbol(math, rel, "\u22AF", "\\nVDash", true);
defineSymbol(math, rel, "\u22EB", "\\ntriangleright");
defineSymbol(math, rel, "\u22ED", "\\ntrianglerighteq", true);
defineSymbol(math, rel, "\u228B", "\\supsetneq", true);
defineSymbol(math, rel, "\u228B", "\\varsupsetneq");
defineSymbol(math, rel, "\u2ACC", "\\supsetneqq", true);
defineSymbol(math, rel, "\u2ACC\uFE00", "\\varsupsetneqq");
defineSymbol(math, rel, "\u22AE", "\\nVdash", true);
defineSymbol(math, rel, "\u2AB5", "\\precneqq", true);
defineSymbol(math, rel, "\u2AB6", "\\succneqq", true);
defineSymbol(math, bin, "\u22B4", "\\unlhd");
defineSymbol(math, bin, "\u22B5", "\\unrhd");
defineSymbol(math, rel, "\u219A", "\\nleftarrow", true);
defineSymbol(math, rel, "\u219B", "\\nrightarrow", true);
defineSymbol(math, rel, "\u21CD", "\\nLeftarrow", true);
defineSymbol(math, rel, "\u21CF", "\\nRightarrow", true);
defineSymbol(math, rel, "\u21AE", "\\nleftrightarrow", true);
defineSymbol(math, rel, "\u21CE", "\\nLeftrightarrow", true);
defineSymbol(math, rel, "\u25B3", "\\vartriangle");
defineSymbol(math, textord, "\u210F", "\\hslash");
defineSymbol(math, textord, "\u25BD", "\\triangledown");
defineSymbol(math, textord, "\u25CA", "\\lozenge");
defineSymbol(math, textord, "\u24C8", "\\circledS");
defineSymbol(math, textord, "\xAE", "\\circledR", true);
defineSymbol(text, textord, "\xAE", "\\circledR");
defineSymbol(text, textord, "\xAE", "\\textregistered");
defineSymbol(math, textord, "\u2221", "\\measuredangle", true);
defineSymbol(math, textord, "\u2204", "\\nexists");
defineSymbol(math, textord, "\u2127", "\\mho");
defineSymbol(math, textord, "\u2132", "\\Finv", true);
defineSymbol(math, textord, "\u2141", "\\Game", true);
defineSymbol(math, textord, "\u2035", "\\backprime");
defineSymbol(math, textord, "\u2036", "\\backdprime");
defineSymbol(math, textord, "\u2037", "\\backtrprime");
defineSymbol(math, textord, "\u25B2", "\\blacktriangle");
defineSymbol(math, textord, "\u25BC", "\\blacktriangledown");
defineSymbol(math, textord, "\u25A0", "\\blacksquare");
defineSymbol(math, textord, "\u29EB", "\\blacklozenge");
defineSymbol(math, textord, "\u2605", "\\bigstar");
defineSymbol(math, textord, "\u2222", "\\sphericalangle", true);
defineSymbol(math, textord, "\u2201", "\\complement", true);
defineSymbol(math, textord, "\u2571", "\\diagup");
defineSymbol(math, textord, "\u2572", "\\diagdown");
defineSymbol(math, textord, "\u25A1", "\\square");
defineSymbol(math, textord, "\u25A1", "\\Box");
defineSymbol(math, textord, "\u25CA", "\\Diamond");
defineSymbol(math, textord, "\xA5", "\\yen", true);
defineSymbol(text, textord, "\xA5", "\\yen", true);
defineSymbol(math, textord, "\u2713", "\\checkmark", true);
defineSymbol(text, textord, "\u2713", "\\checkmark");
defineSymbol(math, textord, "\u2717", "\\ballotx", true);
defineSymbol(text, textord, "\u2717", "\\ballotx");
defineSymbol(text, textord, "\u2022", "\\textbullet");
defineSymbol(math, textord, "\u2136", "\\beth", true);
defineSymbol(math, textord, "\u2138", "\\daleth", true);
defineSymbol(math, textord, "\u2137", "\\gimel", true);
defineSymbol(math, textord, "\u03DD", "\\digamma", true);
defineSymbol(math, textord, "\u03F0", "\\varkappa");
defineSymbol(math, open, "\u231C", "\\ulcorner", true);
defineSymbol(math, close, "\u231D", "\\urcorner", true);
defineSymbol(math, open, "\u231E", "\\llcorner", true);
defineSymbol(math, close, "\u231F", "\\lrcorner", true);
defineSymbol(math, rel, "\u2266", "\\leqq", true);
defineSymbol(math, rel, "\u2A7D", "\\leqslant", true);
defineSymbol(math, rel, "\u2A95", "\\eqslantless", true);
defineSymbol(math, rel, "\u2272", "\\lesssim", true);
defineSymbol(math, rel, "\u2A85", "\\lessapprox", true);
defineSymbol(math, rel, "\u224A", "\\approxeq", true);
defineSymbol(math, bin, "\u22D6", "\\lessdot");
defineSymbol(math, rel, "\u22D8", "\\lll", true);
defineSymbol(math, rel, "\u2276", "\\lessgtr", true);
defineSymbol(math, rel, "\u22DA", "\\lesseqgtr", true);
defineSymbol(math, rel, "\u2A8B", "\\lesseqqgtr", true);
defineSymbol(math, rel, "\u2251", "\\doteqdot");
defineSymbol(math, rel, "\u2253", "\\risingdotseq", true);
defineSymbol(math, rel, "\u2252", "\\fallingdotseq", true);
defineSymbol(math, rel, "\u223D", "\\backsim", true);
defineSymbol(math, rel, "\u22CD", "\\backsimeq", true);
defineSymbol(math, rel, "\u2AC5", "\\subseteqq", true);
defineSymbol(math, rel, "\u22D0", "\\Subset", true);
defineSymbol(math, rel, "\u228F", "\\sqsubset", true);
defineSymbol(math, rel, "\u227C", "\\preccurlyeq", true);
defineSymbol(math, rel, "\u22DE", "\\curlyeqprec", true);
defineSymbol(math, rel, "\u227E", "\\precsim", true);
defineSymbol(math, rel, "\u2AB7", "\\precapprox", true);
defineSymbol(math, rel, "\u22B2", "\\vartriangleleft");
defineSymbol(math, rel, "\u22B4", "\\trianglelefteq");
defineSymbol(math, rel, "\u22A8", "\\vDash", true);
defineSymbol(math, rel, "\u22AB", "\\VDash", true);
defineSymbol(math, rel, "\u22AA", "\\Vvdash", true);
defineSymbol(math, rel, "\u2323", "\\smallsmile");
defineSymbol(math, rel, "\u2322", "\\smallfrown");
defineSymbol(math, rel, "\u224F", "\\bumpeq", true);
defineSymbol(math, rel, "\u224E", "\\Bumpeq", true);
defineSymbol(math, rel, "\u2267", "\\geqq", true);
defineSymbol(math, rel, "\u2A7E", "\\geqslant", true);
defineSymbol(math, rel, "\u2A96", "\\eqslantgtr", true);
defineSymbol(math, rel, "\u2273", "\\gtrsim", true);
defineSymbol(math, rel, "\u2A86", "\\gtrapprox", true);
defineSymbol(math, bin, "\u22D7", "\\gtrdot");
defineSymbol(math, rel, "\u22D9", "\\ggg", true);
defineSymbol(math, rel, "\u2277", "\\gtrless", true);
defineSymbol(math, rel, "\u22DB", "\\gtreqless", true);
defineSymbol(math, rel, "\u2A8C", "\\gtreqqless", true);
defineSymbol(math, rel, "\u2256", "\\eqcirc", true);
defineSymbol(math, rel, "\u2257", "\\circeq", true);
defineSymbol(math, rel, "\u225C", "\\triangleq", true);
defineSymbol(math, rel, "\u223C", "\\thicksim");
defineSymbol(math, rel, "\u2248", "\\thickapprox");
defineSymbol(math, rel, "\u2AC6", "\\supseteqq", true);
defineSymbol(math, rel, "\u22D1", "\\Supset", true);
defineSymbol(math, rel, "\u2290", "\\sqsupset", true);
defineSymbol(math, rel, "\u227D", "\\succcurlyeq", true);
defineSymbol(math, rel, "\u22DF", "\\curlyeqsucc", true);
defineSymbol(math, rel, "\u227F", "\\succsim", true);
defineSymbol(math, rel, "\u2AB8", "\\succapprox", true);
defineSymbol(math, rel, "\u22B3", "\\vartriangleright");
defineSymbol(math, rel, "\u22B5", "\\trianglerighteq");
defineSymbol(math, rel, "\u22A9", "\\Vdash", true);
defineSymbol(math, rel, "\u2223", "\\shortmid");
defineSymbol(math, rel, "\u2225", "\\shortparallel");
defineSymbol(math, rel, "\u226C", "\\between", true);
defineSymbol(math, rel, "\u22D4", "\\pitchfork", true);
defineSymbol(math, rel, "\u221D", "\\varpropto");
defineSymbol(math, rel, "\u25C0", "\\blacktriangleleft");
defineSymbol(math, rel, "\u2234", "\\therefore", true);
defineSymbol(math, rel, "\u220D", "\\backepsilon");
defineSymbol(math, rel, "\u25B6", "\\blacktriangleright");
defineSymbol(math, rel, "\u2235", "\\because", true);
defineSymbol(math, rel, "\u22D8", "\\llless");
defineSymbol(math, rel, "\u22D9", "\\gggtr");
defineSymbol(math, bin, "\u22B2", "\\lhd");
defineSymbol(math, bin, "\u22B3", "\\rhd");
defineSymbol(math, rel, "\u2242", "\\eqsim", true);
defineSymbol(math, rel, "\u2251", "\\Doteq", true);
defineSymbol(math, rel, "\u297D", "\\strictif", true);
defineSymbol(math, rel, "\u297C", "\\strictfi", true);
defineSymbol(math, bin, "\u2214", "\\dotplus", true);
defineSymbol(math, bin, "\u2216", "\\smallsetminus");
defineSymbol(math, bin, "\u22D2", "\\Cap", true);
defineSymbol(math, bin, "\u22D3", "\\Cup", true);
defineSymbol(math, bin, "\u2A5E", "\\doublebarwedge", true);
defineSymbol(math, bin, "\u229F", "\\boxminus", true);
defineSymbol(math, bin, "\u229E", "\\boxplus", true);
defineSymbol(math, bin, "\u29C4", "\\boxslash", true);
defineSymbol(math, bin, "\u22C7", "\\divideontimes", true);
defineSymbol(math, bin, "\u22C9", "\\ltimes", true);
defineSymbol(math, bin, "\u22CA", "\\rtimes", true);
defineSymbol(math, bin, "\u22CB", "\\leftthreetimes", true);
defineSymbol(math, bin, "\u22CC", "\\rightthreetimes", true);
defineSymbol(math, bin, "\u22CF", "\\curlywedge", true);
defineSymbol(math, bin, "\u22CE", "\\curlyvee", true);
defineSymbol(math, bin, "\u229D", "\\circleddash", true);
defineSymbol(math, bin, "\u229B", "\\circledast", true);
defineSymbol(math, bin, "\u22BA", "\\intercal", true);
defineSymbol(math, bin, "\u22D2", "\\doublecap");
defineSymbol(math, bin, "\u22D3", "\\doublecup");
defineSymbol(math, bin, "\u22A0", "\\boxtimes", true);
defineSymbol(math, bin, "\u22C8", "\\bowtie", true);
defineSymbol(math, bin, "\u22C8", "\\Join");
defineSymbol(math, bin, "\u27D5", "\\leftouterjoin", true);
defineSymbol(math, bin, "\u27D6", "\\rightouterjoin", true);
defineSymbol(math, bin, "\u27D7", "\\fullouterjoin", true);
defineSymbol(math, bin, "\u2238", "\\dotminus", true);
defineSymbol(math, bin, "\u27D1", "\\wedgedot", true);
defineSymbol(math, bin, "\u27C7", "\\veedot", true);
defineSymbol(math, bin, "\u2A62", "\\doublebarvee", true);
defineSymbol(math, bin, "\u2A63", "\\veedoublebar", true);
defineSymbol(math, bin, "\u2A5F", "\\wedgebar", true);
defineSymbol(math, bin, "\u2A60", "\\wedgedoublebar", true);
defineSymbol(math, bin, "\u2A54", "\\Vee", true);
defineSymbol(math, bin, "\u2A53", "\\Wedge", true);
defineSymbol(math, bin, "\u2A43", "\\barcap", true);
defineSymbol(math, bin, "\u2A42", "\\barcup", true);
defineSymbol(math, bin, "\u2A48", "\\capbarcup", true);
defineSymbol(math, bin, "\u2A40", "\\capdot", true);
defineSymbol(math, bin, "\u2A47", "\\capovercup", true);
defineSymbol(math, bin, "\u2A46", "\\cupovercap", true);
defineSymbol(math, bin, "\u2A4D", "\\closedvarcap", true);
defineSymbol(math, bin, "\u2A4C", "\\closedvarcup", true);
defineSymbol(math, bin, "\u2A2A", "\\minusdot", true);
defineSymbol(math, bin, "\u2A2B", "\\minusfdots", true);
defineSymbol(math, bin, "\u2A2C", "\\minusrdots", true);
defineSymbol(math, bin, "\u22BB", "\\Xor", true);
defineSymbol(math, bin, "\u22BC", "\\Nand", true);
defineSymbol(math, bin, "\u22BD", "\\Nor", true);
defineSymbol(math, bin, "\u22BD", "\\barvee");
defineSymbol(math, bin, "\u2AF4", "\\interleave", true);
defineSymbol(math, bin, "\u29E2", "\\shuffle", true);
defineSymbol(math, bin, "\u2AF6", "\\threedotcolon", true);
defineSymbol(math, bin, "\u2982", "\\typecolon", true);
defineSymbol(math, bin, "\u223E", "\\invlazys", true);
defineSymbol(math, bin, "\u2A4B", "\\twocaps", true);
defineSymbol(math, bin, "\u2A4A", "\\twocups", true);
defineSymbol(math, bin, "\u2A4E", "\\Sqcap", true);
defineSymbol(math, bin, "\u2A4F", "\\Sqcup", true);
defineSymbol(math, bin, "\u2A56", "\\veeonvee", true);
defineSymbol(math, bin, "\u2A55", "\\wedgeonwedge", true);
defineSymbol(math, bin, "\u29D7", "\\blackhourglass", true);
defineSymbol(math, bin, "\u29C6", "\\boxast", true);
defineSymbol(math, bin, "\u29C8", "\\boxbox", true);
defineSymbol(math, bin, "\u29C7", "\\boxcircle", true);
defineSymbol(math, bin, "\u229C", "\\circledequal", true);
defineSymbol(math, bin, "\u29B7", "\\circledparallel", true);
defineSymbol(math, bin, "\u29B6", "\\circledvert", true);
defineSymbol(math, bin, "\u29B5", "\\circlehbar", true);
defineSymbol(math, bin, "\u27E1", "\\concavediamond", true);
defineSymbol(math, bin, "\u27E2", "\\concavediamondtickleft", true);
defineSymbol(math, bin, "\u27E3", "\\concavediamondtickright", true);
defineSymbol(math, bin, "\u22C4", "\\diamond", true);
defineSymbol(math, bin, "\u29D6", "\\hourglass", true);
defineSymbol(math, bin, "\u27E0", "\\lozengeminus", true);
defineSymbol(math, bin, "\u233D", "\\obar", true);
defineSymbol(math, bin, "\u29B8", "\\obslash", true);
defineSymbol(math, bin, "\u2A38", "\\odiv", true);
defineSymbol(math, bin, "\u29C1", "\\ogreaterthan", true);
defineSymbol(math, bin, "\u29C0", "\\olessthan", true);
defineSymbol(math, bin, "\u29B9", "\\operp", true);
defineSymbol(math, bin, "\u2A37", "\\Otimes", true);
defineSymbol(math, bin, "\u2A36", "\\otimeshat", true);
defineSymbol(math, bin, "\u22C6", "\\star", true);
defineSymbol(math, bin, "\u25B3", "\\triangle", true);
defineSymbol(math, bin, "\u2A3A", "\\triangleminus", true);
defineSymbol(math, bin, "\u2A39", "\\triangleplus", true);
defineSymbol(math, bin, "\u2A3B", "\\triangletimes", true);
defineSymbol(math, bin, "\u27E4", "\\whitesquaretickleft", true);
defineSymbol(math, bin, "\u27E5", "\\whitesquaretickright", true);
defineSymbol(math, bin, "\u2A33", "\\smashtimes", true);
defineSymbol(math, rel, "\u21E2", "\\dashrightarrow", true);
defineSymbol(math, rel, "\u21E0", "\\dashleftarrow", true);
defineSymbol(math, rel, "\u21C7", "\\leftleftarrows", true);
defineSymbol(math, rel, "\u21C6", "\\leftrightarrows", true);
defineSymbol(math, rel, "\u21DA", "\\Lleftarrow", true);
defineSymbol(math, rel, "\u219E", "\\twoheadleftarrow", true);
defineSymbol(math, rel, "\u21A2", "\\leftarrowtail", true);
defineSymbol(math, rel, "\u21AB", "\\looparrowleft", true);
defineSymbol(math, rel, "\u21CB", "\\leftrightharpoons", true);
defineSymbol(math, rel, "\u21B6", "\\curvearrowleft", true);
defineSymbol(math, rel, "\u21BA", "\\circlearrowleft", true);
defineSymbol(math, rel, "\u21B0", "\\Lsh", true);
defineSymbol(math, rel, "\u21C8", "\\upuparrows", true);
defineSymbol(math, rel, "\u21BF", "\\upharpoonleft", true);
defineSymbol(math, rel, "\u21C3", "\\downharpoonleft", true);
defineSymbol(math, rel, "\u22B6", "\\origof", true);
defineSymbol(math, rel, "\u22B7", "\\imageof", true);
defineSymbol(math, rel, "\u22B8", "\\multimap", true);
defineSymbol(math, rel, "\u21AD", "\\leftrightsquigarrow", true);
defineSymbol(math, rel, "\u21C9", "\\rightrightarrows", true);
defineSymbol(math, rel, "\u21C4", "\\rightleftarrows", true);
defineSymbol(math, rel, "\u21A0", "\\twoheadrightarrow", true);
defineSymbol(math, rel, "\u21A3", "\\rightarrowtail", true);
defineSymbol(math, rel, "\u21AC", "\\looparrowright", true);
defineSymbol(math, rel, "\u21B7", "\\curvearrowright", true);
defineSymbol(math, rel, "\u21BB", "\\circlearrowright", true);
defineSymbol(math, rel, "\u21B1", "\\Rsh", true);
defineSymbol(math, rel, "\u21CA", "\\downdownarrows", true);
defineSymbol(math, rel, "\u21BE", "\\upharpoonright", true);
defineSymbol(math, rel, "\u21C2", "\\downharpoonright", true);
defineSymbol(math, rel, "\u21DD", "\\rightsquigarrow", true);
defineSymbol(math, rel, "\u21DD", "\\leadsto");
defineSymbol(math, rel, "\u21DB", "\\Rrightarrow", true);
defineSymbol(math, rel, "\u21BE", "\\restriction");
defineSymbol(math, textord, "\u2018", "`");
defineSymbol(math, textord, "$", "\\$");
defineSymbol(text, textord, "$", "\\$");
defineSymbol(text, textord, "$", "\\textdollar");
defineSymbol(math, textord, "\xA2", "\\cent");
defineSymbol(text, textord, "\xA2", "\\cent");
defineSymbol(math, textord, "%", "\\%");
defineSymbol(text, textord, "%", "\\%");
defineSymbol(math, textord, "_", "\\_");
defineSymbol(text, textord, "_", "\\_");
defineSymbol(text, textord, "_", "\\textunderscore");
defineSymbol(text, textord, "\u2423", "\\textvisiblespace", true);
defineSymbol(math, textord, "\u2220", "\\angle", true);
defineSymbol(math, textord, "\u221E", "\\infty", true);
defineSymbol(math, textord, "\u2032", "\\prime");
defineSymbol(math, textord, "\u2033", "\\dprime");
defineSymbol(math, textord, "\u2034", "\\trprime");
defineSymbol(math, textord, "\u2057", "\\qprime");
defineSymbol(math, textord, "\u25B3", "\\triangle");
defineSymbol(text, textord, "\u0391", "\\Alpha", true);
defineSymbol(text, textord, "\u0392", "\\Beta", true);
defineSymbol(text, textord, "\u0393", "\\Gamma", true);
defineSymbol(text, textord, "\u0394", "\\Delta", true);
defineSymbol(text, textord, "\u0395", "\\Epsilon", true);
defineSymbol(text, textord, "\u0396", "\\Zeta", true);
defineSymbol(text, textord, "\u0397", "\\Eta", true);
defineSymbol(text, textord, "\u0398", "\\Theta", true);
defineSymbol(text, textord, "\u0399", "\\Iota", true);
defineSymbol(text, textord, "\u039A", "\\Kappa", true);
defineSymbol(text, textord, "\u039B", "\\Lambda", true);
defineSymbol(text, textord, "\u039C", "\\Mu", true);
defineSymbol(text, textord, "\u039D", "\\Nu", true);
defineSymbol(text, textord, "\u039E", "\\Xi", true);
defineSymbol(text, textord, "\u039F", "\\Omicron", true);
defineSymbol(text, textord, "\u03A0", "\\Pi", true);
defineSymbol(text, textord, "\u03A1", "\\Rho", true);
defineSymbol(text, textord, "\u03A3", "\\Sigma", true);
defineSymbol(text, textord, "\u03A4", "\\Tau", true);
defineSymbol(text, textord, "\u03A5", "\\Upsilon", true);
defineSymbol(text, textord, "\u03A6", "\\Phi", true);
defineSymbol(text, textord, "\u03A7", "\\Chi", true);
defineSymbol(text, textord, "\u03A8", "\\Psi", true);
defineSymbol(text, textord, "\u03A9", "\\Omega", true);
defineSymbol(math, mathord, "\u0391", "\\Alpha", true);
defineSymbol(math, mathord, "\u0392", "\\Beta", true);
defineSymbol(math, mathord, "\u0393", "\\Gamma", true);
defineSymbol(math, mathord, "\u0394", "\\Delta", true);
defineSymbol(math, mathord, "\u0395", "\\Epsilon", true);
defineSymbol(math, mathord, "\u0396", "\\Zeta", true);
defineSymbol(math, mathord, "\u0397", "\\Eta", true);
defineSymbol(math, mathord, "\u0398", "\\Theta", true);
defineSymbol(math, mathord, "\u0399", "\\Iota", true);
defineSymbol(math, mathord, "\u039A", "\\Kappa", true);
defineSymbol(math, mathord, "\u039B", "\\Lambda", true);
defineSymbol(math, mathord, "\u039C", "\\Mu", true);
defineSymbol(math, mathord, "\u039D", "\\Nu", true);
defineSymbol(math, mathord, "\u039E", "\\Xi", true);
defineSymbol(math, mathord, "\u039F", "\\Omicron", true);
defineSymbol(math, mathord, "\u03A0", "\\Pi", true);
defineSymbol(math, mathord, "\u03A1", "\\Rho", true);
defineSymbol(math, mathord, "\u03A3", "\\Sigma", true);
defineSymbol(math, mathord, "\u03A4", "\\Tau", true);
defineSymbol(math, mathord, "\u03A5", "\\Upsilon", true);
defineSymbol(math, mathord, "\u03A6", "\\Phi", true);
defineSymbol(math, mathord, "\u03A7", "\\Chi", true);
defineSymbol(math, mathord, "\u03A8", "\\Psi", true);
defineSymbol(math, mathord, "\u03A9", "\\Omega", true);
defineSymbol(math, open, "\xAC", "\\neg", true);
defineSymbol(math, open, "\xAC", "\\lnot");
defineSymbol(math, textord, "\u22A4", "\\top");
defineSymbol(math, textord, "\u22A5", "\\bot");
defineSymbol(math, textord, "\u2205", "\\emptyset");
defineSymbol(math, textord, "\u2300", "\\varnothing");
defineSymbol(math, mathord, "\u03B1", "\\alpha", true);
defineSymbol(math, mathord, "\u03B2", "\\beta", true);
defineSymbol(math, mathord, "\u03B3", "\\gamma", true);
defineSymbol(math, mathord, "\u03B4", "\\delta", true);
defineSymbol(math, mathord, "\u03F5", "\\epsilon", true);
defineSymbol(math, mathord, "\u03B6", "\\zeta", true);
defineSymbol(math, mathord, "\u03B7", "\\eta", true);
defineSymbol(math, mathord, "\u03B8", "\\theta", true);
defineSymbol(math, mathord, "\u03B9", "\\iota", true);
defineSymbol(math, mathord, "\u03BA", "\\kappa", true);
defineSymbol(math, mathord, "\u03BB", "\\lambda", true);
defineSymbol(math, mathord, "\u03BC", "\\mu", true);
defineSymbol(math, mathord, "\u03BD", "\\nu", true);
defineSymbol(math, mathord, "\u03BE", "\\xi", true);
defineSymbol(math, mathord, "\u03BF", "\\omicron", true);
defineSymbol(math, mathord, "\u03C0", "\\pi", true);
defineSymbol(math, mathord, "\u03C1", "\\rho", true);
defineSymbol(math, mathord, "\u03C3", "\\sigma", true);
defineSymbol(math, mathord, "\u03C4", "\\tau", true);
defineSymbol(math, mathord, "\u03C5", "\\upsilon", true);
defineSymbol(math, mathord, "\u03D5", "\\phi", true);
defineSymbol(math, mathord, "\u03C7", "\\chi", true);
defineSymbol(math, mathord, "\u03C8", "\\psi", true);
defineSymbol(math, mathord, "\u03C9", "\\omega", true);
defineSymbol(math, mathord, "\u03B5", "\\varepsilon", true);
defineSymbol(math, mathord, "\u03D1", "\\vartheta", true);
defineSymbol(math, mathord, "\u03D6", "\\varpi", true);
defineSymbol(math, mathord, "\u03F1", "\\varrho", true);
defineSymbol(math, mathord, "\u03C2", "\\varsigma", true);
defineSymbol(math, mathord, "\u03C6", "\\varphi", true);
defineSymbol(math, mathord, "\u03D8", "\\Coppa", true);
defineSymbol(math, mathord, "\u03D9", "\\coppa", true);
defineSymbol(math, mathord, "\u03D9", "\\varcoppa", true);
defineSymbol(math, mathord, "\u03DE", "\\Koppa", true);
defineSymbol(math, mathord, "\u03DF", "\\koppa", true);
defineSymbol(math, mathord, "\u03E0", "\\Sampi", true);
defineSymbol(math, mathord, "\u03E1", "\\sampi", true);
defineSymbol(math, mathord, "\u03DA", "\\Stigma", true);
defineSymbol(math, mathord, "\u03DB", "\\stigma", true);
defineSymbol(math, mathord, "\u2AEB", "\\Bot");
defineSymbol(math, textord, "\xF0", "\\eth", true);
defineSymbol(text, textord, "\xF0", "\xF0");
defineSymbol(math, textord, "\xC5", "\\AA");
defineSymbol(text, textord, "\xC5", "\\AA", true);
defineSymbol(math, textord, "\xC6", "\\AE", true);
defineSymbol(text, textord, "\xC6", "\\AE", true);
defineSymbol(math, textord, "\xD0", "\\DH", true);
defineSymbol(text, textord, "\xD0", "\\DH", true);
defineSymbol(math, textord, "\xDE", "\\TH", true);
defineSymbol(text, textord, "\xDE", "\\TH", true);
defineSymbol(math, textord, "\xDF", "\\ss", true);
defineSymbol(text, textord, "\xDF", "\\ss", true);
defineSymbol(math, textord, "\xE5", "\\aa");
defineSymbol(text, textord, "\xE5", "\\aa", true);
defineSymbol(math, textord, "\xE6", "\\ae", true);
defineSymbol(text, textord, "\xE6", "\\ae", true);
defineSymbol(math, textord, "\xF0", "\\dh");
defineSymbol(text, textord, "\xF0", "\\dh", true);
defineSymbol(math, textord, "\xFE", "\\th", true);
defineSymbol(text, textord, "\xFE", "\\th", true);
defineSymbol(math, textord, "\u0110", "\\DJ", true);
defineSymbol(text, textord, "\u0110", "\\DJ", true);
defineSymbol(math, textord, "\u0111", "\\dj", true);
defineSymbol(text, textord, "\u0111", "\\dj", true);
defineSymbol(math, textord, "\u0141", "\\L", true);
defineSymbol(text, textord, "\u0141", "\\L", true);
defineSymbol(math, textord, "\u0141", "\\l", true);
defineSymbol(text, textord, "\u0141", "\\l", true);
defineSymbol(math, textord, "\u014A", "\\NG", true);
defineSymbol(text, textord, "\u014A", "\\NG", true);
defineSymbol(math, textord, "\u014B", "\\ng", true);
defineSymbol(text, textord, "\u014B", "\\ng", true);
defineSymbol(math, textord, "\u0152", "\\OE", true);
defineSymbol(text, textord, "\u0152", "\\OE", true);
defineSymbol(math, textord, "\u0153", "\\oe", true);
defineSymbol(text, textord, "\u0153", "\\oe", true);
defineSymbol(math, bin, "\u2217", "\u2217", true);
defineSymbol(math, bin, "+", "+");
defineSymbol(math, bin, "\u2217", "*");
defineSymbol(math, bin, "\u2044", "/", true);
defineSymbol(math, bin, "\u2044", "\u2044");
defineSymbol(math, bin, "\u2212", "-", true);
defineSymbol(math, bin, "\u22C5", "\\cdot", true);
defineSymbol(math, bin, "\u2218", "\\circ", true);
defineSymbol(math, bin, "\xF7", "\\div", true);
defineSymbol(math, bin, "\xB1", "\\pm", true);
defineSymbol(math, bin, "\xD7", "\\times", true);
defineSymbol(math, bin, "\u2229", "\\cap", true);
defineSymbol(math, bin, "\u222A", "\\cup", true);
defineSymbol(math, bin, "\u2216", "\\setminus", true);
defineSymbol(math, bin, "\u2227", "\\land");
defineSymbol(math, bin, "\u2228", "\\lor");
defineSymbol(math, bin, "\u2227", "\\wedge", true);
defineSymbol(math, bin, "\u2228", "\\vee", true);
defineSymbol(math, open, "\u27E6", "\\llbracket", true);
defineSymbol(math, close, "\u27E7", "\\rrbracket", true);
defineSymbol(math, open, "\u27E8", "\\langle", true);
defineSymbol(math, open, "\u27EA", "\\lAngle", true);
defineSymbol(math, open, "\u2989", "\\llangle", true);
defineSymbol(math, open, "|", "\\lvert");
defineSymbol(math, open, "\u2016", "\\lVert", true);
defineSymbol(math, textord, "!", "\\oc");
defineSymbol(math, textord, "?", "\\wn");
defineSymbol(math, textord, "\u2193", "\\shpos");
defineSymbol(math, textord, "\u2195", "\\shift");
defineSymbol(math, textord, "\u2191", "\\shneg");
defineSymbol(math, close, "?", "?");
defineSymbol(math, close, "!", "!");
defineSymbol(math, close, "\u203C", "\u203C");
defineSymbol(math, close, "\u27E9", "\\rangle", true);
defineSymbol(math, close, "\u27EB", "\\rAngle", true);
defineSymbol(math, close, "\u298A", "\\rrangle", true);
defineSymbol(math, close, "|", "\\rvert");
defineSymbol(math, close, "\u2016", "\\rVert");
defineSymbol(math, open, "\u2983", "\\lBrace", true);
defineSymbol(math, close, "\u2984", "\\rBrace", true);
defineSymbol(math, rel, "=", "\\equal", true);
defineSymbol(math, rel, ":", ":");
defineSymbol(math, rel, "\u2248", "\\approx", true);
defineSymbol(math, rel, "\u2245", "\\cong", true);
defineSymbol(math, rel, "\u2265", "\\ge");
defineSymbol(math, rel, "\u2265", "\\geq", true);
defineSymbol(math, rel, "\u2190", "\\gets");
defineSymbol(math, rel, ">", "\\gt", true);
defineSymbol(math, rel, "\u2208", "\\in", true);
defineSymbol(math, rel, "\u2209", "\\notin", true);
defineSymbol(math, rel, "\uE020", "\\@not");
defineSymbol(math, rel, "\u2282", "\\subset", true);
defineSymbol(math, rel, "\u2283", "\\supset", true);
defineSymbol(math, rel, "\u2286", "\\subseteq", true);
defineSymbol(math, rel, "\u2287", "\\supseteq", true);
defineSymbol(math, rel, "\u2288", "\\nsubseteq", true);
defineSymbol(math, rel, "\u2288", "\\nsubseteqq");
defineSymbol(math, rel, "\u2289", "\\nsupseteq", true);
defineSymbol(math, rel, "\u2289", "\\nsupseteqq");
defineSymbol(math, rel, "\u22A8", "\\models");
defineSymbol(math, rel, "\u2190", "\\leftarrow", true);
defineSymbol(math, rel, "\u2264", "\\le");
defineSymbol(math, rel, "\u2264", "\\leq", true);
defineSymbol(math, rel, "<", "\\lt", true);
defineSymbol(math, rel, "\u2192", "\\rightarrow", true);
defineSymbol(math, rel, "\u2192", "\\to");
defineSymbol(math, rel, "\u2271", "\\ngeq", true);
defineSymbol(math, rel, "\u2271", "\\ngeqq");
defineSymbol(math, rel, "\u2271", "\\ngeqslant");
defineSymbol(math, rel, "\u2270", "\\nleq", true);
defineSymbol(math, rel, "\u2270", "\\nleqq");
defineSymbol(math, rel, "\u2270", "\\nleqslant");
defineSymbol(math, rel, "\u2AEB", "\\Perp", true);
defineSymbol(math, spacing, "\xA0", "\\ ");
defineSymbol(math, spacing, "\xA0", "\\space");
defineSymbol(math, spacing, "\xA0", "\\nobreakspace");
defineSymbol(text, spacing, "\xA0", "\\ ");
defineSymbol(text, spacing, "\xA0", " ");
defineSymbol(text, spacing, "\xA0", "\\space");
defineSymbol(text, spacing, "\xA0", "\\nobreakspace");
defineSymbol(math, spacing, null, "\\nobreak");
defineSymbol(math, spacing, null, "\\allowbreak");
defineSymbol(math, punct, ",", ",");
defineSymbol(text, punct, ":", ":");
defineSymbol(math, punct, ";", ";");
defineSymbol(math, bin, "\u22BC", "\\barwedge");
defineSymbol(math, bin, "\u22BB", "\\veebar");
defineSymbol(math, bin, "\u2299", "\\odot", true);
defineSymbol(math, bin, "\u2295\uFE0E", "\\oplus");
defineSymbol(math, bin, "\u2297", "\\otimes", true);
defineSymbol(math, textord, "\u2202", "\\partial", true);
defineSymbol(math, bin, "\u2298", "\\oslash", true);
defineSymbol(math, bin, "\u229A", "\\circledcirc", true);
defineSymbol(math, bin, "\u22A1", "\\boxdot", true);
defineSymbol(math, bin, "\u25B3", "\\bigtriangleup");
defineSymbol(math, bin, "\u25BD", "\\bigtriangledown");
defineSymbol(math, bin, "\u2020", "\\dagger");
defineSymbol(math, bin, "\u22C4", "\\diamond");
defineSymbol(math, bin, "\u25C3", "\\triangleleft");
defineSymbol(math, bin, "\u25B9", "\\triangleright");
defineSymbol(math, open, "{", "\\{");
defineSymbol(text, textord, "{", "\\{");
defineSymbol(text, textord, "{", "\\textbraceleft");
defineSymbol(math, close, "}", "\\}");
defineSymbol(text, textord, "}", "\\}");
defineSymbol(text, textord, "}", "\\textbraceright");
defineSymbol(math, open, "{", "\\lbrace");
defineSymbol(math, close, "}", "\\rbrace");
defineSymbol(math, open, "[", "\\lbrack", true);
defineSymbol(text, textord, "[", "\\lbrack", true);
defineSymbol(math, close, "]", "\\rbrack", true);
defineSymbol(text, textord, "]", "\\rbrack", true);
defineSymbol(math, open, "(", "\\lparen", true);
defineSymbol(math, close, ")", "\\rparen", true);
defineSymbol(math, open, "\u2987", "\\llparenthesis", true);
defineSymbol(math, close, "\u2988", "\\rrparenthesis", true);
defineSymbol(text, textord, "<", "\\textless", true);
defineSymbol(text, textord, ">", "\\textgreater", true);
defineSymbol(math, open, "\u230A", "\\lfloor", true);
defineSymbol(math, close, "\u230B", "\\rfloor", true);
defineSymbol(math, open, "\u2308", "\\lceil", true);
defineSymbol(math, close, "\u2309", "\\rceil", true);
defineSymbol(math, textord, "\\", "\\backslash");
defineSymbol(math, textord, "|", "|");
defineSymbol(math, textord, "|", "\\vert");
defineSymbol(text, textord, "|", "\\textbar", true);
defineSymbol(math, textord, "\u2016", "\\|");
defineSymbol(math, textord, "\u2016", "\\Vert");
defineSymbol(text, textord, "\u2016", "\\textbardbl");
defineSymbol(text, textord, "~", "\\textasciitilde");
defineSymbol(text, textord, "\\", "\\textbackslash");
defineSymbol(text, textord, "^", "\\textasciicircum");
defineSymbol(math, rel, "\u2191", "\\uparrow", true);
defineSymbol(math, rel, "\u21D1", "\\Uparrow", true);
defineSymbol(math, rel, "\u2193", "\\downarrow", true);
defineSymbol(math, rel, "\u21D3", "\\Downarrow", true);
defineSymbol(math, rel, "\u2195", "\\updownarrow", true);
defineSymbol(math, rel, "\u21D5", "\\Updownarrow", true);
defineSymbol(math, op, "\u2210", "\\coprod");
defineSymbol(math, op, "\u22C1", "\\bigvee");
defineSymbol(math, op, "\u22C0", "\\bigwedge");
defineSymbol(math, op, "\u2A04", "\\biguplus");
defineSymbol(math, op, "\u2A04", "\\bigcupplus");
defineSymbol(math, op, "\u2A03", "\\bigcupdot");
defineSymbol(math, op, "\u2A07", "\\bigdoublevee");
defineSymbol(math, op, "\u2A08", "\\bigdoublewedge");
defineSymbol(math, op, "\u22C2", "\\bigcap");
defineSymbol(math, op, "\u22C3", "\\bigcup");
defineSymbol(math, op, "\u222B", "\\int");
defineSymbol(math, op, "\u222B", "\\intop");
defineSymbol(math, op, "\u222C", "\\iint");
defineSymbol(math, op, "\u222D", "\\iiint");
defineSymbol(math, op, "\u220F", "\\prod");
defineSymbol(math, op, "\u2211", "\\sum");
defineSymbol(math, op, "\u2A02", "\\bigotimes");
defineSymbol(math, op, "\u2A01", "\\bigoplus");
defineSymbol(math, op, "\u2A00", "\\bigodot");
defineSymbol(math, op, "\u2A09", "\\bigtimes");
defineSymbol(math, op, "\u222E", "\\oint");
defineSymbol(math, op, "\u222F", "\\oiint");
defineSymbol(math, op, "\u2230", "\\oiiint");
defineSymbol(math, op, "\u2231", "\\intclockwise");
defineSymbol(math, op, "\u2232", "\\varointclockwise");
defineSymbol(math, op, "\u2A0C", "\\iiiint");
defineSymbol(math, op, "\u2A0D", "\\intbar");
defineSymbol(math, op, "\u2A0E", "\\intBar");
defineSymbol(math, op, "\u2A0F", "\\fint");
defineSymbol(math, op, "\u2A12", "\\rppolint");
defineSymbol(math, op, "\u2A13", "\\scpolint");
defineSymbol(math, op, "\u2A15", "\\pointint");
defineSymbol(math, op, "\u2A16", "\\sqint");
defineSymbol(math, op, "\u2A17", "\\intlarhk");
defineSymbol(math, op, "\u2A18", "\\intx");
defineSymbol(math, op, "\u2A19", "\\intcap");
defineSymbol(math, op, "\u2A1A", "\\intcup");
defineSymbol(math, op, "\u2A05", "\\bigsqcap");
defineSymbol(math, op, "\u2A06", "\\bigsqcup");
defineSymbol(math, op, "\u222B", "\\smallint");
defineSymbol(text, inner, "\u2026", "\\textellipsis");
defineSymbol(math, inner, "\u2026", "\\mathellipsis");
defineSymbol(text, inner, "\u2026", "\\ldots", true);
defineSymbol(math, inner, "\u2026", "\\ldots", true);
defineSymbol(math, inner, "\u22F0", "\\iddots", true);
defineSymbol(math, inner, "\u22EF", "\\@cdots", true);
defineSymbol(math, inner, "\u22F1", "\\ddots", true);
defineSymbol(math, textord, "\u22EE", "\\varvdots");
defineSymbol(text, textord, "\u22EE", "\\varvdots");
defineSymbol(math, accent, "\xB4", "\\acute");
defineSymbol(math, accent, "`", "\\grave");
defineSymbol(math, accent, "\xA8", "\\ddot");
defineSymbol(math, accent, "\u2026", "\\dddot");
defineSymbol(math, accent, "\u2026.", "\\ddddot");
defineSymbol(math, accent, "~", "\\tilde");
defineSymbol(math, accent, "\u203E", "\\bar");
defineSymbol(math, accent, "\u02D8", "\\breve");
defineSymbol(math, accent, "\u02C7", "\\check");
defineSymbol(math, accent, "\u02C6", "\\hat");
defineSymbol(math, accent, "\u2192", "\\vec");
defineSymbol(math, accent, "\u02D9", "\\dot");
defineSymbol(math, accent, "\u02DA", "\\mathring");
defineSymbol(math, mathord, "\u0131", "\\imath", true);
defineSymbol(math, mathord, "\u0237", "\\jmath", true);
defineSymbol(math, textord, "\u0131", "\u0131");
defineSymbol(math, textord, "\u0237", "\u0237");
defineSymbol(text, textord, "\u0131", "\\i", true);
defineSymbol(text, textord, "\u0237", "\\j", true);
defineSymbol(text, textord, "\xF8", "\\o", true);
defineSymbol(math, mathord, "\xF8", "\\o", true);
defineSymbol(text, textord, "\xD8", "\\O", true);
defineSymbol(math, mathord, "\xD8", "\\O", true);
defineSymbol(text, accent, "\u02CA", "\\'");
defineSymbol(text, accent, "\u02CB", "\\`");
defineSymbol(text, accent, "\u02C6", "\\^");
defineSymbol(text, accent, "~", "\\~");
defineSymbol(text, accent, "\u02C9", "\\=");
defineSymbol(text, accent, "\u02D8", "\\u");
defineSymbol(text, accent, "\u02D9", "\\.");
defineSymbol(text, accent, "\xB8", "\\c");
defineSymbol(text, accent, "\u02DA", "\\r");
defineSymbol(text, accent, "\u02C7", "\\v");
defineSymbol(text, accent, "\xA8", '\\"');
defineSymbol(text, accent, "\u02DD", "\\H");
defineSymbol(math, accent, "\u02CA", "\\'");
defineSymbol(math, accent, "\u02CB", "\\`");
defineSymbol(math, accent, "\u02C6", "\\^");
defineSymbol(math, accent, "~", "\\~");
defineSymbol(math, accent, "\u02C9", "\\=");
defineSymbol(math, accent, "\u02D8", "\\u");
defineSymbol(math, accent, "\u02D9", "\\.");
defineSymbol(math, accent, "\xB8", "\\c");
defineSymbol(math, accent, "\u02DA", "\\r");
defineSymbol(math, accent, "\u02C7", "\\v");
defineSymbol(math, accent, "\xA8", '\\"');
defineSymbol(math, accent, "\u02DD", "\\H");
var ligatures = {
  "--": true,
  "---": true,
  "``": true,
  "''": true
};
defineSymbol(text, textord, "\u2013", "--", true);
defineSymbol(text, textord, "\u2013", "\\textendash");
defineSymbol(text, textord, "\u2014", "---", true);
defineSymbol(text, textord, "\u2014", "\\textemdash");
defineSymbol(text, textord, "\u2018", "`", true);
defineSymbol(text, textord, "\u2018", "\\textquoteleft");
defineSymbol(text, textord, "\u2019", "'", true);
defineSymbol(text, textord, "\u2019", "\\textquoteright");
defineSymbol(text, textord, "\u201C", "``", true);
defineSymbol(text, textord, "\u201C", "\\textquotedblleft");
defineSymbol(text, textord, "\u201D", "''", true);
defineSymbol(text, textord, "\u201D", "\\textquotedblright");
defineSymbol(math, textord, "\xB0", "\\degree", true);
defineSymbol(text, textord, "\xB0", "\\degree");
defineSymbol(text, textord, "\xB0", "\\textdegree", true);
defineSymbol(math, textord, "\xA3", "\\pounds");
defineSymbol(math, textord, "\xA3", "\\mathsterling", true);
defineSymbol(text, textord, "\xA3", "\\pounds");
defineSymbol(text, textord, "\xA3", "\\textsterling", true);
defineSymbol(math, textord, "\u2720", "\\maltese");
defineSymbol(text, textord, "\u2720", "\\maltese");
defineSymbol(math, textord, "\u20AC", "\\euro", true);
defineSymbol(text, textord, "\u20AC", "\\euro", true);
defineSymbol(text, textord, "\u20AC", "\\texteuro");
defineSymbol(math, textord, "\xA9", "\\copyright", true);
defineSymbol(text, textord, "\xA9", "\\textcopyright");
defineSymbol(math, textord, "\u2300", "\\diameter", true);
defineSymbol(text, textord, "\u2300", "\\diameter");
defineSymbol(math, textord, "\u{1D6E4}", "\\varGamma");
defineSymbol(math, textord, "\u{1D6E5}", "\\varDelta");
defineSymbol(math, textord, "\u{1D6E9}", "\\varTheta");
defineSymbol(math, textord, "\u{1D6EC}", "\\varLambda");
defineSymbol(math, textord, "\u{1D6EF}", "\\varXi");
defineSymbol(math, textord, "\u{1D6F1}", "\\varPi");
defineSymbol(math, textord, "\u{1D6F4}", "\\varSigma");
defineSymbol(math, textord, "\u{1D6F6}", "\\varUpsilon");
defineSymbol(math, textord, "\u{1D6F7}", "\\varPhi");
defineSymbol(math, textord, "\u{1D6F9}", "\\varPsi");
defineSymbol(math, textord, "\u{1D6FA}", "\\varOmega");
defineSymbol(text, textord, "\u{1D6E4}", "\\varGamma");
defineSymbol(text, textord, "\u{1D6E5}", "\\varDelta");
defineSymbol(text, textord, "\u{1D6E9}", "\\varTheta");
defineSymbol(text, textord, "\u{1D6EC}", "\\varLambda");
defineSymbol(text, textord, "\u{1D6EF}", "\\varXi");
defineSymbol(text, textord, "\u{1D6F1}", "\\varPi");
defineSymbol(text, textord, "\u{1D6F4}", "\\varSigma");
defineSymbol(text, textord, "\u{1D6F6}", "\\varUpsilon");
defineSymbol(text, textord, "\u{1D6F7}", "\\varPhi");
defineSymbol(text, textord, "\u{1D6F9}", "\\varPsi");
defineSymbol(text, textord, "\u{1D6FA}", "\\varOmega");
var mathTextSymbols = '0123456789/@."';
for (let i = 0; i < mathTextSymbols.length; i++) {
  const ch = mathTextSymbols.charAt(i);
  defineSymbol(math, textord, ch, ch);
}
var textSymbols = '0123456789!@*()-=+";:?/.,';
for (let i = 0; i < textSymbols.length; i++) {
  const ch = textSymbols.charAt(i);
  defineSymbol(text, textord, ch, ch);
}
var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
for (let i = 0; i < letters.length; i++) {
  const ch = letters.charAt(i);
  defineSymbol(math, mathord, ch, ch);
  defineSymbol(text, textord, ch, ch);
}
var narrow = "\xC7\xD0\xDE\xE7\xFE\u2102\u210D\u2115\u2119\u211A\u211D\u2124\u210E\u210F\u210A\u210B\u210C\u2110\u2111\u2112\u2113\u2118\u211B\u211C\u212C\u2130\u2131\u2133\u212D\u2128";
for (let i = 0; i < narrow.length; i++) {
  const ch = narrow.charAt(i);
  defineSymbol(math, mathord, ch, ch);
  defineSymbol(text, textord, ch, ch);
}
var wideChar = "";
for (let i = 0; i < letters.length; i++) {
  wideChar = String.fromCharCode(55349, 56320 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 56372 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 56424 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 56580 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 56736 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 56788 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 56840 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 56944 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 56632 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  const ch = letters.charAt(i);
  wideChar = String.fromCharCode(55349, 56476 + i);
  defineSymbol(math, mathord, ch, wideChar);
  defineSymbol(text, textord, ch, wideChar);
}
for (let i = 0; i < 10; i++) {
  wideChar = String.fromCharCode(55349, 57294 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 57314 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 57324 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
  wideChar = String.fromCharCode(55349, 57334 + i);
  defineSymbol(math, mathord, wideChar, wideChar);
  defineSymbol(text, textord, wideChar, wideChar);
}
function setLineBreaks(expression, wrapMode, isDisplayMode) {
  const mtrs = [];
  let mrows = [];
  let block = [];
  let numTopLevelEquals = 0;
  let i = 0;
  while (i < expression.length) {
    while (expression[i] instanceof DocumentFragment) {
      expression.splice(i, 1, ...expression[i].children);
    }
    const node = expression[i];
    if (node.attributes && node.attributes.linebreak && node.attributes.linebreak === "newline") {
      if (block.length > 0) {
        mrows.push(new MathNode("mrow", block));
      }
      mrows.push(node);
      block = [];
      const mtd = new MathNode("mtd", mrows);
      mtd.style.textAlign = "left";
      mtrs.push(new MathNode("mtr", [mtd]));
      mrows = [];
      i += 1;
      continue;
    }
    block.push(node);
    if (node.type && node.type === "mo" && node.children.length === 1 && !(node.attributes.form && node.attributes.form === "prefix") && // unary operators
    !Object.prototype.hasOwnProperty.call(node.attributes, "movablelimits")) {
      const ch = node.children[0].text;
      if (wrapMode === "=" && ch === "=") {
        numTopLevelEquals += 1;
        if (numTopLevelEquals > 1) {
          block.pop();
          const element = new MathNode("mrow", block);
          mrows.push(element);
          block = [node];
        }
      } else if (wrapMode === "tex") {
        const next = i < expression.length - 1 ? expression[i + 1] : null;
        let glueIsFreeOfNobreak = true;
        if (!(next && next.type === "mtext" && next.attributes.linebreak && next.attributes.linebreak === "nobreak")) {
          for (let j = i + 1; j < expression.length; j++) {
            const nd = expression[j];
            if (nd.type && nd.type === "mspace" && !(nd.attributes.linebreak && nd.attributes.linebreak === "newline")) {
              block.push(nd);
              i += 1;
              if (nd.attributes && nd.attributes.linebreak && nd.attributes.linebreak === "nobreak") {
                glueIsFreeOfNobreak = false;
              }
            } else {
              break;
            }
          }
        }
        if (glueIsFreeOfNobreak) {
          const element = new MathNode("mrow", block);
          mrows.push(element);
          block = [];
        }
      }
    }
    i += 1;
  }
  if (block.length > 0) {
    const element = new MathNode("mrow", block);
    mrows.push(element);
  }
  if (mtrs.length > 0) {
    const mtd = new MathNode("mtd", mrows);
    mtd.style.textAlign = "left";
    const mtr = new MathNode("mtr", [mtd]);
    mtrs.push(mtr);
    const mtable = new MathNode("mtable", mtrs);
    if (!isDisplayMode) {
      mtable.setAttribute("columnalign", "left");
      mtable.setAttribute("rowspacing", "0em");
    }
    return mtable;
  }
  return newDocumentFragment(mrows);
}
var makeText = function(text2, mode, style) {
  if (symbols2[mode][text2] && symbols2[mode][text2].replace && text2.charCodeAt(0) !== 55349 && !(Object.prototype.hasOwnProperty.call(ligatures, text2) && style && (style.fontFamily && style.fontFamily.slice(4, 6) === "tt" || style.font && style.font.slice(4, 6) === "tt"))) {
    text2 = symbols2[mode][text2].replace;
  }
  return new TextNode2(text2);
};
var copyChar = (newRow, child) => {
  if (newRow.children.length === 0 || newRow.children[newRow.children.length - 1].type !== "mtext") {
    const mtext = new MathNode(
      "mtext",
      [new TextNode2(child.children[0].text)]
    );
    newRow.children.push(mtext);
  } else {
    newRow.children[newRow.children.length - 1].children[0].text += child.children[0].text;
  }
};
var consolidateText = (mrow) => {
  if (mrow.type !== "mrow" && mrow.type !== "mstyle") {
    return mrow;
  }
  if (mrow.children.length === 0) {
    return mrow;
  }
  const newRow = new MathNode("mrow");
  for (let i = 0; i < mrow.children.length; i++) {
    const child = mrow.children[i];
    if (child.type === "mtext" && Object.keys(child.attributes).length === 0) {
      copyChar(newRow, child);
    } else if (child.type === "mrow") {
      let canConsolidate = true;
      for (let j = 0; j < child.children.length; j++) {
        const grandChild = child.children[j];
        if (grandChild.type !== "mtext" || Object.keys(child.attributes).length !== 0) {
          canConsolidate = false;
          break;
        }
      }
      if (canConsolidate) {
        for (let j = 0; j < child.children.length; j++) {
          const grandChild = child.children[j];
          copyChar(newRow, grandChild);
        }
      } else {
        newRow.children.push(child);
      }
    } else {
      newRow.children.push(child);
    }
  }
  for (let i = 0; i < newRow.children.length; i++) {
    if (newRow.children[i].type === "mtext") {
      const mtext = newRow.children[i];
      if (mtext.children[0].text.charAt(0) === " ") {
        mtext.children[0].text = "\xA0" + mtext.children[0].text.slice(1);
      }
      const L = mtext.children[0].text.length;
      if (L > 0 && mtext.children[0].text.charAt(L - 1) === " ") {
        mtext.children[0].text = mtext.children[0].text.slice(0, -1) + "\xA0";
      }
      for (const [key2, value] of Object.entries(mrow.attributes)) {
        mtext.attributes[key2] = value;
      }
    }
  }
  if (newRow.children.length === 1 && newRow.children[0].type === "mtext") {
    return newRow.children[0];
  } else {
    return newRow;
  }
};
var makeRow = function(body, semisimple = false) {
  if (body.length === 1 && !(body[0] instanceof DocumentFragment)) {
    return body[0];
  } else if (!semisimple) {
    if (body[0] instanceof MathNode && body[0].type === "mo" && !body[0].attributes.fence) {
      body[0].attributes.lspace = "0em";
      body[0].attributes.rspace = "0em";
    }
    const end = body.length - 1;
    if (body[end] instanceof MathNode && body[end].type === "mo" && !body[end].attributes.fence) {
      body[end].attributes.lspace = "0em";
      body[end].attributes.rspace = "0em";
    }
  }
  return new MathNode("mrow", body);
};
function isNumberPunctuation(group) {
  if (!group) {
    return false;
  }
  if (group.type === "mi" && group.children.length === 1) {
    const child = group.children[0];
    return child instanceof TextNode2 && child.text === ".";
  } else if (group.type === "mtext" && group.children.length === 1) {
    const child = group.children[0];
    return child instanceof TextNode2 && child.text === "\u2008";
  } else if (group.type === "mo" && group.children.length === 1 && group.getAttribute("separator") === "true" && group.getAttribute("lspace") === "0em" && group.getAttribute("rspace") === "0em") {
    const child = group.children[0];
    return child instanceof TextNode2 && child.text === ",";
  } else {
    return false;
  }
}
var isComma = (expression, i) => {
  const node = expression[i];
  const followingNode = expression[i + 1];
  return node.type === "atom" && node.text === "," && // Don't consolidate if there is a space after the comma.
  node.loc && followingNode.loc && node.loc.end === followingNode.loc.start;
};
var isRel = (item) => {
  return item.type === "atom" && item.family === "rel" || item.type === "mclass" && item.mclass === "mrel";
};
var buildExpression = function(expression, style, semisimple = false) {
  if (!semisimple && expression.length === 1) {
    const group = buildGroup$1(expression[0], style);
    if (group instanceof MathNode && group.type === "mo") {
      group.setAttribute("lspace", "0em");
      group.setAttribute("rspace", "0em");
    }
    return [group];
  }
  const groups = [];
  const groupArray = [];
  let lastGroup;
  for (let i = 0; i < expression.length; i++) {
    groupArray.push(buildGroup$1(expression[i], style));
  }
  for (let i = 0; i < groupArray.length; i++) {
    const group = groupArray[i];
    if (i < expression.length - 1 && isRel(expression[i]) && isRel(expression[i + 1])) {
      group.setAttribute("rspace", "0em");
    }
    if (i > 0 && isRel(expression[i]) && isRel(expression[i - 1])) {
      group.setAttribute("lspace", "0em");
    }
    if (group.type === "mn" && lastGroup && lastGroup.type === "mn") {
      lastGroup.children.push(...group.children);
      continue;
    } else if (isNumberPunctuation(group) && lastGroup && lastGroup.type === "mn") {
      lastGroup.children.push(...group.children);
      continue;
    } else if (lastGroup && lastGroup.type === "mn" && i < groupArray.length - 1 && groupArray[i + 1].type === "mn" && isComma(expression, i)) {
      lastGroup.children.push(...group.children);
      continue;
    } else if (group.type === "mn" && isNumberPunctuation(lastGroup)) {
      group.children = [...lastGroup.children, ...group.children];
      groups.pop();
    } else if ((group.type === "msup" || group.type === "msub") && group.children.length >= 1 && lastGroup && (lastGroup.type === "mn" || isNumberPunctuation(lastGroup))) {
      const base = group.children[0];
      if (base instanceof MathNode && base.type === "mn" && lastGroup) {
        base.children = [...lastGroup.children, ...base.children];
        groups.pop();
      }
    }
    groups.push(group);
    lastGroup = group;
  }
  return groups;
};
var buildExpressionRow = function(expression, style, semisimple = false) {
  return makeRow(buildExpression(expression, style, semisimple), semisimple);
};
var buildGroup$1 = function(group, style) {
  if (!group) {
    return new MathNode("mrow");
  }
  if (_mathmlGroupBuilders[group.type]) {
    const result = _mathmlGroupBuilders[group.type](group, style);
    return result;
  } else {
    throw new ParseError("Got group of unknown type: '" + group.type + "'");
  }
};
var glue$1 = (_) => {
  return new MathNode("mtd", [], [], { padding: "0", width: "50%" });
};
var labelContainers = ["mrow", "mtd", "mtable", "mtr"];
var getLabel = (parent) => {
  for (const node of parent.children) {
    if (node.type && labelContainers.includes(node.type)) {
      if (node.classes && node.classes[0] === "tml-label") {
        const label = node.label;
        return label;
      } else {
        const label = getLabel(node);
        if (label) {
          return label;
        }
      }
    } else if (!node.type) {
      const label = getLabel(node);
      if (label) {
        return label;
      }
    }
  }
};
var taggedExpression = (expression, tag, style, leqno) => {
  tag = buildExpressionRow(tag[0].body, style);
  tag = consolidateText(tag);
  tag.classes.push("tml-tag");
  const label = getLabel(expression);
  expression = new MathNode("mtd", [expression]);
  const rowArray = [glue$1(), expression, glue$1()];
  rowArray[leqno ? 0 : 2].children.push(tag);
  const mtr = new MathNode("mtr", rowArray, ["tml-tageqn"]);
  if (label) {
    mtr.setAttribute("id", label);
  }
  const table2 = new MathNode("mtable", [mtr]);
  table2.style.width = "100%";
  table2.setAttribute("displaystyle", "true");
  return table2;
};
function buildMathML(tree, texExpression, style, settings) {
  let tag = null;
  if (tree.length === 1 && tree[0].type === "tag") {
    tag = tree[0].tag;
    tree = tree[0].body;
  }
  const expression = buildExpression(tree, style);
  if (expression.length === 1 && expression[0] instanceof AnchorNode) {
    return expression[0];
  }
  const wrap = settings.displayMode || settings.annotate ? "none" : settings.wrap;
  const n1 = expression.length === 0 ? null : expression[0];
  let wrapper = expression.length === 1 && tag === null && n1 instanceof MathNode ? expression[0] : setLineBreaks(expression, wrap, settings.displayMode);
  if (tag) {
    wrapper = taggedExpression(wrapper, tag, style, settings.leqno);
  }
  if (settings.annotate) {
    const annotation = new MathNode(
      "annotation",
      [new TextNode2(texExpression)]
    );
    annotation.setAttribute("encoding", "application/x-tex");
    wrapper = new MathNode("semantics", [wrapper, annotation]);
  }
  const math2 = new MathNode("math", [wrapper]);
  if (settings.xml) {
    math2.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
  }
  if (settings.displayMode) {
    math2.setAttribute("display", "block");
    math2.style.display = "block math";
    math2.classes = ["tml-display"];
  }
  return math2;
}
var smallNudge = "DHKLUcegorsuvxyz\u03A0\u03A5\u03A8\u03B1\u03B4\u03B7\u03B9\u03BC\u03BD\u03BF\u03C4\u03C5\u03C7\u03F5";
var mediumNudge = "BCEGIMNOPQRSTXZlpqtw\u0393\u0398\u039E\u03A3\u03A6\u03A9\u03B2\u03B5\u03B6\u03B8\u03BE\u03C1\u03C2\u03C6\u03C8\u03D1\u03D5\u03F1";
var largeNudge = "AFJdf\u0394\u039B";
var mathmlBuilder$a = (group, style) => {
  const accentNode$1 = group.isStretchy ? accentNode(group) : new MathNode("mo", [makeText(group.label, group.mode)]);
  if (!group.isStretchy) {
    accentNode$1.setAttribute("stretchy", "false");
  }
  if (group.label !== "\\vec") {
    accentNode$1.style.mathDepth = "0";
  }
  const tag = group.label === "\\c" ? "munder" : "mover";
  const needsWbkVertShift = needsWebkitVerticalShift.has(group.label);
  if (tag === "mover" && group.mode === "math" && !group.isStretchy && group.base.text && group.base.text.length === 1) {
    const text2 = group.base.text;
    const isVec = group.label === "\\vec";
    const vecPostfix = isVec === "\\vec" ? "-vec" : "";
    if (isVec) {
      accentNode$1.classes.push("tml-vec");
    }
    const wbkPostfix = isVec ? "-vec" : needsWbkVertShift ? "-acc" : "";
    if (smallNudge.indexOf(text2) > -1) {
      accentNode$1.classes.push(`chr-sml${vecPostfix}`);
      accentNode$1.classes.push(`wbk-sml${wbkPostfix}`);
    } else if (mediumNudge.indexOf(text2) > -1) {
      accentNode$1.classes.push(`chr-med${vecPostfix}`);
      accentNode$1.classes.push(`wbk-med${wbkPostfix}`);
    } else if (largeNudge.indexOf(text2) > -1) {
      accentNode$1.classes.push(`chr-lrg${vecPostfix}`);
      accentNode$1.classes.push(`wbk-lrg${wbkPostfix}`);
    } else if (isVec) {
      accentNode$1.classes.push(`wbk-vec`);
    } else if (needsWbkVertShift) {
      accentNode$1.classes.push(`wbk-acc`);
    }
  } else if (needsWbkVertShift) {
    accentNode$1.classes.push("wbk-acc");
  }
  const node = new MathNode(tag, [buildGroup$1(group.base, style), accentNode$1]);
  return node;
};
var nonStretchyAccents = /* @__PURE__ */ new Set([
  "\\acute",
  "\\check",
  "\\grave",
  "\\ddot",
  "\\dddot",
  "\\ddddot",
  "\\tilde",
  "\\bar",
  "\\breve",
  "\\check",
  "\\hat",
  "\\vec",
  "\\dot",
  "\\mathring"
]);
var needsWebkitVerticalShift = /* @__PURE__ */ new Set([
  "\\acute",
  "\\bar",
  "\\breve",
  "\\check",
  "\\dot",
  "\\ddot",
  "\\grave",
  "\\hat",
  "\\mathring",
  "\\`",
  "\\'",
  "\\^",
  "\\=",
  "\\u",
  "\\.",
  '\\"',
  "\\r",
  "\\H",
  "\\v"
]);
var combiningChar = {
  "\\`": "\u0300",
  "\\'": "\u0301",
  "\\^": "\u0302",
  "\\~": "\u0303",
  "\\=": "\u0304",
  "\\u": "\u0306",
  "\\.": "\u0307",
  '\\"': "\u0308",
  "\\r": "\u030A",
  "\\H": "\u030B",
  "\\v": "\u030C",
  "\\c": "\u0327"
};
defineFunction({
  type: "accent",
  names: [
    "\\acute",
    "\\grave",
    "\\ddot",
    "\\dddot",
    "\\ddddot",
    "\\tilde",
    "\\bar",
    "\\breve",
    "\\check",
    "\\hat",
    "\\vec",
    "\\dot",
    "\\mathring",
    "\\overparen",
    "\\widecheck",
    "\\widehat",
    "\\wideparen",
    "\\widetilde",
    "\\overrightarrow",
    "\\overleftarrow",
    "\\Overrightarrow",
    "\\overleftrightarrow",
    "\\overgroup",
    "\\overleftharpoon",
    "\\overrightharpoon"
  ],
  props: {
    numArgs: 1
  },
  handler: (context, args) => {
    const base = normalizeArgument(args[0]);
    const isStretchy = !nonStretchyAccents.has(context.funcName);
    return {
      type: "accent",
      mode: context.parser.mode,
      label: context.funcName,
      isStretchy,
      base
    };
  },
  mathmlBuilder: mathmlBuilder$a
});
defineFunction({
  type: "accent",
  names: ["\\'", "\\`", "\\^", "\\~", "\\=", "\\c", "\\u", "\\.", '\\"', "\\r", "\\H", "\\v"],
  props: {
    numArgs: 1,
    allowedInText: true,
    allowedInMath: true,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    const base = normalizeArgument(args[0]);
    const mode = context.parser.mode;
    if (mode === "math" && context.parser.settings.strict) {
      console.log(`Temml parse error: Command ${context.funcName} is invalid in math mode.`);
    }
    if (mode === "text" && base.text && base.text.length === 1 && context.funcName in combiningChar && smalls.indexOf(base.text) > -1) {
      return {
        type: "textord",
        mode: "text",
        text: base.text + combiningChar[context.funcName]
      };
    } else if (context.funcName === "\\c" && mode === "text" && base.text && base.text.length === 1) {
      return { type: "textord", mode: "text", text: base.text + "\u0327" };
    } else {
      return {
        type: "accent",
        mode,
        label: context.funcName,
        isStretchy: false,
        base
      };
    }
  },
  mathmlBuilder: mathmlBuilder$a
});
defineFunction({
  type: "accentUnder",
  names: [
    "\\underleftarrow",
    "\\underrightarrow",
    "\\underleftrightarrow",
    "\\undergroup",
    "\\underparen",
    "\\utilde"
  ],
  props: {
    numArgs: 1
  },
  handler: ({ parser, funcName }, args) => {
    const base = args[0];
    return {
      type: "accentUnder",
      mode: parser.mode,
      label: funcName,
      base
    };
  },
  mathmlBuilder: (group, style) => {
    const accentNode$1 = accentNode(group);
    accentNode$1.style["math-depth"] = 0;
    const node = new MathNode("munder", [
      buildGroup$1(group.base, style),
      accentNode$1
    ]);
    return node;
  }
});
var ptPerUnit = {
  // Convert to CSS (Postscipt) points, not TeX points
  // https://en.wikibooks.org/wiki/LaTeX/Lengths and
  // https://tex.stackexchange.com/a/8263
  pt: 800 / 803,
  // convert TeX point to CSS (Postscript) point
  pc: 12 * 800 / 803,
  // pica
  dd: 1238 / 1157 * 800 / 803,
  // didot
  cc: 14856 / 1157 * 800 / 803,
  // cicero (12 didot)
  nd: 685 / 642 * 800 / 803,
  // new didot
  nc: 1370 / 107 * 800 / 803,
  // new cicero (12 new didot)
  sp: 1 / 65536 * 800 / 803,
  // scaled point (TeX's internal smallest unit)
  mm: 25.4 / 72,
  cm: 2.54 / 72,
  in: 1 / 72,
  px: 96 / 72
};
var validUnits = [
  "em",
  "ex",
  "mu",
  "pt",
  "mm",
  "cm",
  "in",
  "px",
  "bp",
  "pc",
  "dd",
  "cc",
  "nd",
  "nc",
  "sp"
];
var validUnit = function(unit) {
  if (typeof unit !== "string") {
    unit = unit.unit;
  }
  return validUnits.indexOf(unit) > -1;
};
var emScale = (styleLevel) => {
  const scriptLevel2 = Math.max(styleLevel - 1, 0);
  return [1, 0.7, 0.5][scriptLevel2];
};
var calculateSize = function(sizeValue, style) {
  let number = sizeValue.number;
  if (style.maxSize[0] < 0 && number > 0) {
    return { number: 0, unit: "em" };
  }
  const unit = sizeValue.unit;
  switch (unit) {
    case "mm":
    case "cm":
    case "in":
    case "px": {
      const numInCssPts = number * ptPerUnit[unit];
      if (numInCssPts > style.maxSize[1]) {
        return { number: style.maxSize[1], unit: "pt" };
      }
      return { number, unit };
    }
    case "em":
    case "ex": {
      if (unit === "ex") {
        number *= 0.431;
      }
      number = Math.min(number / emScale(style.level), style.maxSize[0]);
      return { number: round(number), unit: "em" };
    }
    case "bp": {
      if (number > style.maxSize[1]) {
        number = style.maxSize[1];
      }
      return { number, unit: "pt" };
    }
    case "pt":
    case "pc":
    case "dd":
    case "cc":
    case "nd":
    case "nc":
    case "sp": {
      number = Math.min(number * ptPerUnit[unit], style.maxSize[1]);
      return { number: round(number), unit: "pt" };
    }
    case "mu": {
      number = Math.min(number / 18, style.maxSize[0]);
      return { number: round(number), unit: "em" };
    }
    default:
      throw new ParseError("Invalid unit: '" + unit + "'");
  }
};
var padding = (width) => {
  const node = new MathNode("mspace");
  node.setAttribute("width", width + "em");
  return node;
};
var paddedNode = (group, lspace = 0.3, rspace = 0, mustSmash = false) => {
  if (group == null && rspace === 0) {
    return padding(lspace);
  }
  const row = group ? [group] : [];
  if (lspace !== 0) {
    row.unshift(padding(lspace));
  }
  if (rspace > 0) {
    row.push(padding(rspace));
  }
  if (mustSmash) {
    const mpadded = new MathNode("mpadded", row);
    mpadded.setAttribute("height", "0.1px");
    return mpadded;
  } else {
    return new MathNode("mrow", row);
  }
};
var labelSize = (size, scriptLevel2) => Number(size) / emScale(scriptLevel2);
var munderoverNode = (fName, body, below, style) => {
  const arrowNode = mathMLnode(fName);
  const isEq = fName.slice(1, 3) === "eq";
  const minWidth = fName.charAt(1) === "x" ? "1.75" : fName.slice(2, 4) === "cd" ? "3.0" : isEq ? "1.0" : "2.0";
  arrowNode.setAttribute("lspace", "0");
  arrowNode.setAttribute("rspace", isEq ? "0.5em" : "0");
  const labelStyle = style.withLevel(style.level < 2 ? 2 : 3);
  const minArrowWidth = labelSize(minWidth, labelStyle.level);
  const dummyWidth = labelSize(minWidth, 3);
  const emptyLabel = paddedNode(null, minArrowWidth.toFixed(4), 0);
  const dummyNode = paddedNode(null, dummyWidth.toFixed(4), 0);
  const space2 = labelSize(isEq ? 0 : 0.3, labelStyle.level).toFixed(4);
  let upperNode;
  let lowerNode;
  const gotUpper = body && body.body && // \hphantom        visible content
  (body.body.body || body.body.length > 0);
  if (gotUpper) {
    let label = buildGroup$1(body, labelStyle);
    const mustSmash = fName === "\\\\cdrightarrow" || fName === "\\\\cdleftarrow";
    label = paddedNode(label, space2, space2, mustSmash);
    upperNode = new MathNode("mover", [label, dummyNode]);
  }
  const gotLower = below && below.body && (below.body.body || below.body.length > 0);
  if (gotLower) {
    let label = buildGroup$1(below, labelStyle);
    label = paddedNode(label, space2, space2);
    lowerNode = new MathNode("munder", [label, dummyNode]);
  }
  let node;
  if (!gotUpper && !gotLower) {
    node = new MathNode("mover", [arrowNode, emptyLabel]);
  } else if (gotUpper && gotLower) {
    node = new MathNode("munderover", [arrowNode, lowerNode, upperNode]);
  } else if (gotUpper) {
    node = new MathNode("mover", [arrowNode, upperNode]);
  } else {
    node = new MathNode("munder", [arrowNode, lowerNode]);
  }
  if (minWidth === "3.0") {
    node.style.height = "1em";
  }
  node.setAttribute("accent", "false");
  return node;
};
defineFunction({
  type: "xArrow",
  names: [
    "\\xleftarrow",
    "\\xrightarrow",
    "\\xLeftarrow",
    "\\xRightarrow",
    "\\xleftrightarrow",
    "\\xLeftrightarrow",
    "\\xhookleftarrow",
    "\\xhookrightarrow",
    "\\xmapsto",
    "\\xrightharpoondown",
    "\\xrightharpoonup",
    "\\xleftharpoondown",
    "\\xleftharpoonup",
    "\\xlongequal",
    "\\xtwoheadrightarrow",
    "\\xtwoheadleftarrow",
    "\\xtofrom",
    // expfeil
    "\\xleftrightharpoons",
    // mathtools
    "\\xrightleftharpoons",
    // mathtools
    // The next 7 functions are here only to support mhchem
    "\\yields",
    "\\yieldsLeft",
    "\\mesomerism",
    "\\longrightharpoonup",
    "\\longleftharpoondown",
    "\\yieldsLeftRight",
    "\\chemequilibrium",
    // The next 3 functions are here only to support the {CD} environment.
    "\\\\cdrightarrow",
    "\\\\cdleftarrow",
    "\\\\cdlongequal"
  ],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser, funcName }, args, optArgs) {
    return {
      type: "xArrow",
      mode: parser.mode,
      name: funcName,
      body: args[0],
      below: optArgs[0]
    };
  },
  mathmlBuilder(group, style) {
    const node = munderoverNode(group.name, group.body, group.below, style);
    const row = [node];
    row.unshift(padding(0.2778));
    row.push(padding(0.2778));
    return new MathNode("mrow", row);
  }
});
var arrowComponent = {
  "\\equilibriumRight": ["\\longrightharpoonup", "\\eqleftharpoondown"],
  "\\equilibriumLeft": ["\\eqrightharpoonup", "\\longleftharpoondown"]
};
defineFunction({
  type: "stackedArrow",
  names: [
    "\\equilibriumRight",
    "\\equilibriumLeft"
  ],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser, funcName }, args, optArgs) {
    const lowerArrowBody = args[0] ? {
      type: "hphantom",
      mode: parser.mode,
      body: args[0]
    } : null;
    const upperArrowBelow = optArgs[0] ? {
      type: "hphantom",
      mode: parser.mode,
      body: optArgs[0]
    } : null;
    return {
      type: "stackedArrow",
      mode: parser.mode,
      name: funcName,
      body: args[0],
      upperArrowBelow,
      lowerArrowBody,
      below: optArgs[0]
    };
  },
  mathmlBuilder(group, style) {
    const topLabel = arrowComponent[group.name][0];
    const botLabel = arrowComponent[group.name][1];
    const topArrow = munderoverNode(topLabel, group.body, group.upperArrowBelow, style);
    const botArrow = munderoverNode(botLabel, group.lowerArrowBody, group.below, style);
    let wrapper;
    const raiseNode = new MathNode("mpadded", [topArrow]);
    raiseNode.setAttribute("voffset", "0.3em");
    raiseNode.setAttribute("height", "+0.3em");
    raiseNode.setAttribute("depth", "-0.3em");
    if (group.name === "\\equilibriumLeft") {
      const botNode = new MathNode("mpadded", [botArrow]);
      botNode.setAttribute("width", "0.5em");
      wrapper = new MathNode(
        "mpadded",
        [padding(0.2778), botNode, raiseNode, padding(0.2778)]
      );
    } else {
      raiseNode.setAttribute("width", group.name === "\\equilibriumRight" ? "0.5em" : "0");
      wrapper = new MathNode(
        "mpadded",
        [padding(0.2778), raiseNode, botArrow, padding(0.2778)]
      );
    }
    wrapper.setAttribute("voffset", "-0.18em");
    wrapper.setAttribute("height", "-0.18em");
    wrapper.setAttribute("depth", "+0.18em");
    return wrapper;
  }
});
var _environments = {};
function defineEnvironment({ type, names, props, handler, mathmlBuilder: mathmlBuilder2 }) {
  const data = {
    type,
    numArgs: props.numArgs || 0,
    allowedInText: false,
    numOptionalArgs: 0,
    handler
  };
  for (let i = 0; i < names.length; ++i) {
    _environments[names[i]] = data;
  }
  if (mathmlBuilder2) {
    _mathmlGroupBuilders[type] = mathmlBuilder2;
  }
}
function assertNodeType(node, type) {
  if (!node || node.type !== type) {
    throw new Error(
      `Expected node of type ${type}, but got ` + (node ? `node of type ${node.type}` : String(node))
    );
  }
  return node;
}
function assertSymbolNodeType(node) {
  const typedNode = checkSymbolNodeType(node);
  if (!typedNode) {
    throw new Error(
      `Expected node of symbol group type, but got ` + (node ? `node of type ${node.type}` : String(node))
    );
  }
  return typedNode;
}
function checkSymbolNodeType(node) {
  if (node && (node.type === "atom" || node.type === "delimiter" || Object.prototype.hasOwnProperty.call(NON_ATOMS, node.type))) {
    return node;
  }
  return null;
}
var cdArrowFunctionName = {
  ">": "\\\\cdrightarrow",
  "<": "\\\\cdleftarrow",
  "=": "\\\\cdlongequal",
  A: "\\uparrow",
  V: "\\downarrow",
  "|": "\\Vert",
  ".": "no arrow"
};
var newCell = () => {
  return { type: "styling", body: [], mode: "math", scriptLevel: "display" };
};
var isStartOfArrow = (node) => {
  return node.type === "textord" && node.text === "@";
};
var isLabelEnd = (node, endChar) => {
  return (node.type === "mathord" || node.type === "atom") && node.text === endChar;
};
function cdArrow(arrowChar, labels, parser) {
  const funcName = cdArrowFunctionName[arrowChar];
  switch (funcName) {
    case "\\\\cdrightarrow":
    case "\\\\cdleftarrow":
      return parser.callFunction(funcName, [labels[0]], [labels[1]]);
    case "\\uparrow":
    case "\\downarrow": {
      const leftLabel = parser.callFunction("\\\\cdleft", [labels[0]], []);
      const bareArrow = {
        type: "atom",
        text: funcName,
        mode: "math",
        family: "rel"
      };
      const sizedArrow = parser.callFunction("\\Big", [bareArrow], []);
      const rightLabel = parser.callFunction("\\\\cdright", [labels[1]], []);
      const arrowGroup = {
        type: "ordgroup",
        mode: "math",
        body: [leftLabel, sizedArrow, rightLabel],
        semisimple: true
      };
      return parser.callFunction("\\\\cdparent", [arrowGroup], []);
    }
    case "\\\\cdlongequal":
      return parser.callFunction("\\\\cdlongequal", [], []);
    case "\\Vert": {
      const arrow = { type: "textord", text: "\\Vert", mode: "math" };
      return parser.callFunction("\\Big", [arrow], []);
    }
    default:
      return { type: "textord", text: " ", mode: "math" };
  }
}
function parseCD(parser) {
  const parsedRows = [];
  parser.gullet.beginGroup();
  parser.gullet.macros.set("\\cr", "\\\\\\relax");
  parser.gullet.beginGroup();
  while (true) {
    parsedRows.push(parser.parseExpression(false, "\\\\"));
    parser.gullet.endGroup();
    parser.gullet.beginGroup();
    const next = parser.fetch().text;
    if (next === "&" || next === "\\\\") {
      parser.consume();
    } else if (next === "\\end") {
      if (parsedRows[parsedRows.length - 1].length === 0) {
        parsedRows.pop();
      }
      break;
    } else {
      throw new ParseError("Expected \\\\ or \\cr or \\end", parser.nextToken);
    }
  }
  let row = [];
  const body = [row];
  for (let i = 0; i < parsedRows.length; i++) {
    const rowNodes = parsedRows[i];
    let cell2 = newCell();
    for (let j = 0; j < rowNodes.length; j++) {
      if (!isStartOfArrow(rowNodes[j])) {
        cell2.body.push(rowNodes[j]);
      } else {
        row.push(cell2);
        j += 1;
        const arrowChar = assertSymbolNodeType(rowNodes[j]).text;
        const labels = new Array(2);
        labels[0] = { type: "ordgroup", mode: "math", body: [] };
        labels[1] = { type: "ordgroup", mode: "math", body: [] };
        if ("=|.".indexOf(arrowChar) > -1) ;
        else if ("<>AV".indexOf(arrowChar) > -1) {
          for (let labelNum = 0; labelNum < 2; labelNum++) {
            let inLabel = true;
            for (let k = j + 1; k < rowNodes.length; k++) {
              if (isLabelEnd(rowNodes[k], arrowChar)) {
                inLabel = false;
                j = k;
                break;
              }
              if (isStartOfArrow(rowNodes[k])) {
                throw new ParseError(
                  "Missing a " + arrowChar + " character to complete a CD arrow.",
                  rowNodes[k]
                );
              }
              labels[labelNum].body.push(rowNodes[k]);
            }
            if (inLabel) {
              throw new ParseError(
                "Missing a " + arrowChar + " character to complete a CD arrow.",
                rowNodes[j]
              );
            }
          }
        } else {
          throw new ParseError(`Expected one of "<>AV=|." after @.`);
        }
        const arrow = cdArrow(arrowChar, labels, parser);
        row.push(arrow);
        cell2 = newCell();
      }
    }
    if (i % 2 === 0) {
      row.push(cell2);
    } else {
      row.shift();
    }
    row = [];
    body.push(row);
  }
  body.pop();
  parser.gullet.endGroup();
  parser.gullet.endGroup();
  return {
    type: "array",
    mode: "math",
    body,
    tags: null,
    labels: new Array(body.length + 1).fill(""),
    envClasses: ["jot", "cd"],
    cols: [],
    hLinesBeforeRow: new Array(body.length + 1).fill([])
  };
}
defineFunction({
  type: "cdlabel",
  names: ["\\\\cdleft", "\\\\cdright"],
  props: {
    numArgs: 1
  },
  handler({ parser, funcName }, args) {
    return {
      type: "cdlabel",
      mode: parser.mode,
      side: funcName.slice(4),
      label: args[0]
    };
  },
  mathmlBuilder(group, style) {
    if (group.label.body.length === 0) {
      return new MathNode("mrow", style);
    }
    const mrow = buildGroup$1(group.label, style);
    if (group.side === "left") {
      mrow.classes.push("tml-shift-left");
    }
    const mtd = new MathNode("mtd", [mrow]);
    mtd.style.padding = "0";
    const mtr = new MathNode("mtr", [mtd]);
    const mtable = new MathNode("mtable", [mtr]);
    const label = new MathNode("mpadded", [mtable]);
    label.setAttribute("width", "0.1px");
    label.setAttribute("displaystyle", "false");
    label.setAttribute("scriptlevel", "1");
    return label;
  }
});
defineFunction({
  type: "cdlabelparent",
  names: ["\\\\cdparent"],
  props: {
    numArgs: 1
  },
  handler({ parser }, args) {
    return {
      type: "cdlabelparent",
      mode: parser.mode,
      fragment: args[0]
    };
  },
  mathmlBuilder(group, style) {
    return new MathNode("mrow", [buildGroup$1(group.fragment, style)]);
  }
});
var ordGroup = (body) => {
  return {
    "type": "ordgroup",
    "mode": "math",
    "body": body,
    "semisimple": true
  };
};
var phantom = (body, type) => {
  return {
    "type": type,
    "mode": "math",
    "body": ordGroup(body)
  };
};
var bordermatrixParseTree = (matrix, delimiters2) => {
  const body = matrix.body;
  body[0].shift();
  const leftColumnBody = new Array(body.length - 1).fill().map(() => []);
  for (let i = 1; i < body.length; i++) {
    leftColumnBody[i - 1].push(body[i].shift());
    const phantomBody = [];
    for (let j = 0; j < body[i].length; j++) {
      phantomBody.push(body[i][j]);
    }
    leftColumnBody[i - 1].push(phantom(phantomBody, "vphantom"));
  }
  const topRowBody = new Array(body.length).fill().map(() => []);
  for (let j = 0; j < body[0].length; j++) {
    topRowBody[0].push(body[0][j]);
  }
  for (let i = 1; i < body.length; i++) {
    for (let j = 0; j < body[0].length; j++) {
      topRowBody[i].push(phantom(body[i][j].body, "hphantom"));
    }
  }
  for (let j = 0; j < body[0].length; j++) {
    body[0][j] = phantom(body[0][j].body, "hphantom");
  }
  const leftColumn = {
    type: "array",
    mode: "math",
    body: leftColumnBody,
    cols: [{ type: "align", align: "c" }],
    rowGaps: new Array(leftColumnBody.length - 1).fill(null),
    hLinesBeforeRow: new Array(leftColumnBody.length + 1).fill().map(() => []),
    envClasses: [],
    scriptLevel: "text",
    arraystretch: 1,
    labels: new Array(leftColumnBody.length).fill(""),
    arraycolsep: { "number": 0.04, unit: "em" }
  };
  const topRow = {
    type: "array",
    mode: "math",
    body: topRowBody,
    cols: new Array(topRowBody.length).fill({ type: "align", align: "c" }),
    rowGaps: new Array(topRowBody.length - 1).fill(null),
    hLinesBeforeRow: new Array(topRowBody.length + 1).fill().map(() => []),
    envClasses: [],
    scriptLevel: "text",
    arraystretch: 1,
    labels: new Array(topRowBody.length).fill(""),
    arraycolsep: null
  };
  const topWrapper = {
    type: "styling",
    mode: "math",
    scriptLevel: "text",
    // Must set this explicitly.
    body: [topRow]
    // Default level is "script".
  };
  const container = {
    type: "leftright",
    mode: "math",
    body: [matrix],
    left: delimiters2 ? delimiters2[0] : "(",
    right: delimiters2 ? delimiters2[1] : ")",
    rightColor: void 0
  };
  const base = {
    type: "op",
    // The base of a TeX \overset
    mode: "math",
    limits: true,
    alwaysHandleSupSub: true,
    parentIsSupSub: true,
    symbol: false,
    suppressBaseShift: true,
    body: [container]
  };
  const mover = {
    type: "supsub",
    // We're using the MathML equivalent
    mode: "math",
    // of TeX \overset.
    stack: true,
    base,
    // That keeps the {pmatrix} aligned with
    sup: topWrapper,
    // the math centerline.
    sub: null
  };
  return ordGroup([leftColumn, mover]);
};
var SourceLocation = class _SourceLocation {
  constructor(lexer, start, end) {
    this.lexer = lexer;
    this.start = start;
    this.end = end;
  }
  /**
   * Merges two `SourceLocation`s from location providers, given they are
   * provided in order of appearance.
   * - Returns the first one's location if only the first is provided.
   * - Returns a merged range of the first and the last if both are provided
   *   and their lexers match.
   * - Otherwise, returns null.
   */
  static range(first, second) {
    if (!second) {
      return first && first.loc;
    } else if (!first || !first.loc || !second.loc || first.loc.lexer !== second.loc.lexer) {
      return null;
    } else {
      return new _SourceLocation(first.loc.lexer, first.loc.start, second.loc.end);
    }
  }
};
var Token = class _Token {
  constructor(text2, loc) {
    this.text = text2;
    this.loc = loc;
  }
  /**
   * Given a pair of tokens (this and endToken), compute a `Token` encompassing
   * the whole input range enclosed by these two.
   */
  range(endToken, text2) {
    return new _Token(text2, SourceLocation.range(this, endToken));
  }
};
var StyleLevel = {
  DISPLAY: 0,
  TEXT: 1,
  SCRIPT: 2,
  SCRIPTSCRIPT: 3
};
var _macros = /* @__PURE__ */ Object.create(null);
function defineMacro(name2, body) {
  _macros[name2] = body;
}
var macros = _macros;
defineMacro("\\noexpand", function(context) {
  const t = context.popToken();
  if (context.isExpandable(t.text)) {
    t.noexpand = true;
    t.treatAsRelax = true;
  }
  return { tokens: [t], numArgs: 0 };
});
defineMacro("\\expandafter", function(context) {
  const t = context.popToken();
  context.expandOnce(true);
  return { tokens: [t], numArgs: 0 };
});
defineMacro("\\@firstoftwo", function(context) {
  const args = context.consumeArgs(2);
  return { tokens: args[0], numArgs: 0 };
});
defineMacro("\\@secondoftwo", function(context) {
  const args = context.consumeArgs(2);
  return { tokens: args[1], numArgs: 0 };
});
defineMacro("\\@ifnextchar", function(context) {
  const args = context.consumeArgs(3);
  context.consumeSpaces();
  const nextToken = context.future();
  if (args[0].length === 1 && args[0][0].text === nextToken.text) {
    return { tokens: args[1], numArgs: 0 };
  } else {
    return { tokens: args[2], numArgs: 0 };
  }
});
defineMacro("\\@ifstar", "\\@ifnextchar *{\\@firstoftwo{#1}}");
defineMacro("\\TextOrMath", function(context) {
  const args = context.consumeArgs(2);
  if (context.mode === "text") {
    return { tokens: args[0], numArgs: 0 };
  } else {
    return { tokens: args[1], numArgs: 0 };
  }
});
var stringFromArg = (arg2) => {
  let str = "";
  for (let i = arg2.length - 1; i > -1; i--) {
    str += arg2[i].text;
  }
  return str;
};
var digitToNumber = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  A: 10,
  b: 11,
  B: 11,
  c: 12,
  C: 12,
  d: 13,
  D: 13,
  e: 14,
  E: 14,
  f: 15,
  F: 15
};
var nextCharNumber = (context) => {
  const numStr = context.future().text;
  if (numStr === "EOF") {
    return [null, ""];
  }
  return [digitToNumber[numStr.charAt(0)], numStr];
};
var appendCharNumbers = (number, numStr, base) => {
  for (let i = 1; i < numStr.length; i++) {
    const digit = digitToNumber[numStr.charAt(i)];
    number *= base;
    number += digit;
  }
  return number;
};
defineMacro("\\char", function(context) {
  let token = context.popToken();
  let base;
  let number = "";
  if (token.text === "'") {
    base = 8;
    token = context.popToken();
  } else if (token.text === '"') {
    base = 16;
    token = context.popToken();
  } else if (token.text === "`") {
    token = context.popToken();
    if (token.text[0] === "\\") {
      number = token.text.charCodeAt(1);
    } else if (token.text === "EOF") {
      throw new ParseError("\\char` missing argument");
    } else {
      number = token.text.charCodeAt(0);
    }
  } else {
    base = 10;
  }
  if (base) {
    let numStr = token.text;
    number = digitToNumber[numStr.charAt(0)];
    if (number == null || number >= base) {
      throw new ParseError(`Invalid base-${base} digit ${token.text}`);
    }
    number = appendCharNumbers(number, numStr, base);
    let digit;
    [digit, numStr] = nextCharNumber(context);
    while (digit != null && digit < base) {
      number *= base;
      number += digit;
      number = appendCharNumbers(number, numStr, base);
      context.popToken();
      [digit, numStr] = nextCharNumber(context);
    }
  }
  return `\\@char{${number}}`;
});
function recreateArgStr(context) {
  const tokens = context.consumeArgs(1)[0];
  let str = "";
  let expectedLoc = tokens[tokens.length - 1].loc.start;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const actualLoc = tokens[i].loc.start;
    if (actualLoc > expectedLoc) {
      str += " ";
      expectedLoc = actualLoc;
    }
    str += tokens[i].text;
    expectedLoc += tokens[i].text.length;
  }
  return str;
}
defineMacro("\\surd", "\\sqrt{\\vphantom{|}}");
defineMacro("\u2295", "\\oplus");
defineMacro("\\long", "");
defineMacro("\\bgroup", "{");
defineMacro("\\egroup", "}");
defineMacro("~", "\\nobreakspace");
defineMacro("\\lq", "`");
defineMacro("\\rq", "'");
defineMacro("\\aa", "\\r a");
defineMacro("\\Bbbk", "\\Bbb{k}");
defineMacro("\\mathstrut", "\\vphantom{(}");
defineMacro("\\underbar", "\\underline{\\text{#1}}");
defineMacro("\\vdots", "{\\varvdots\\rule{0pt}{15pt}}");
defineMacro("\u22EE", "\\vdots");
defineMacro("\\arraystretch", "1");
defineMacro("\\arraycolsep", "6pt");
defineMacro("\\substack", "\\begin{subarray}{c}#1\\end{subarray}");
defineMacro("\\iff", "\\DOTSB\\;\\Longleftrightarrow\\;");
defineMacro("\\implies", "\\DOTSB\\;\\Longrightarrow\\;");
defineMacro("\\impliedby", "\\DOTSB\\;\\Longleftarrow\\;");
var dotsByToken = {
  ",": "\\dotsc",
  "\\not": "\\dotsb",
  // \keybin@ checks for the following:
  "+": "\\dotsb",
  "=": "\\dotsb",
  "<": "\\dotsb",
  ">": "\\dotsb",
  "-": "\\dotsb",
  "*": "\\dotsb",
  ":": "\\dotsb",
  // Symbols whose definition starts with \DOTSB:
  "\\DOTSB": "\\dotsb",
  "\\coprod": "\\dotsb",
  "\\bigvee": "\\dotsb",
  "\\bigwedge": "\\dotsb",
  "\\biguplus": "\\dotsb",
  "\\bigcap": "\\dotsb",
  "\\bigcup": "\\dotsb",
  "\\prod": "\\dotsb",
  "\\sum": "\\dotsb",
  "\\bigotimes": "\\dotsb",
  "\\bigoplus": "\\dotsb",
  "\\bigodot": "\\dotsb",
  "\\bigsqcap": "\\dotsb",
  "\\bigsqcup": "\\dotsb",
  "\\bigtimes": "\\dotsb",
  "\\And": "\\dotsb",
  "\\longrightarrow": "\\dotsb",
  "\\Longrightarrow": "\\dotsb",
  "\\longleftarrow": "\\dotsb",
  "\\Longleftarrow": "\\dotsb",
  "\\longleftrightarrow": "\\dotsb",
  "\\Longleftrightarrow": "\\dotsb",
  "\\mapsto": "\\dotsb",
  "\\longmapsto": "\\dotsb",
  "\\hookrightarrow": "\\dotsb",
  "\\doteq": "\\dotsb",
  // Symbols whose definition starts with \mathbin:
  "\\mathbin": "\\dotsb",
  // Symbols whose definition starts with \mathrel:
  "\\mathrel": "\\dotsb",
  "\\relbar": "\\dotsb",
  "\\Relbar": "\\dotsb",
  "\\xrightarrow": "\\dotsb",
  "\\xleftarrow": "\\dotsb",
  // Symbols whose definition starts with \DOTSI:
  "\\DOTSI": "\\dotsi",
  "\\int": "\\dotsi",
  "\\oint": "\\dotsi",
  "\\iint": "\\dotsi",
  "\\iiint": "\\dotsi",
  "\\iiiint": "\\dotsi",
  // Symbols whose definition starts with \DOTSX:
  "\\DOTSX": "\\dotsx"
};
defineMacro("\\dots", function(context) {
  let thedots = "\\dotso";
  const next = context.expandAfterFuture().text;
  if (next in dotsByToken) {
    thedots = dotsByToken[next];
  } else if (next.slice(0, 4) === "\\not") {
    thedots = "\\dotsb";
  } else if (next in symbols2.math) {
    if (["bin", "rel"].includes(symbols2.math[next].group)) {
      thedots = "\\dotsb";
    }
  }
  return thedots;
});
var spaceAfterDots = {
  // \rightdelim@ checks for the following:
  ")": true,
  "]": true,
  "\\rbrack": true,
  "\\}": true,
  "\\rbrace": true,
  "\\rangle": true,
  "\\rceil": true,
  "\\rfloor": true,
  "\\rgroup": true,
  "\\rmoustache": true,
  "\\right": true,
  "\\bigr": true,
  "\\biggr": true,
  "\\Bigr": true,
  "\\Biggr": true,
  // \extra@ also tests for the following:
  $: true,
  // \extrap@ checks for the following:
  ";": true,
  ".": true,
  ",": true
};
defineMacro("\\dotso", function(context) {
  const next = context.future().text;
  if (next in spaceAfterDots) {
    return "\\ldots\\,";
  } else {
    return "\\ldots";
  }
});
defineMacro("\\dotsc", function(context) {
  const next = context.future().text;
  if (next in spaceAfterDots && next !== ",") {
    return "\\ldots\\,";
  } else {
    return "\\ldots";
  }
});
defineMacro("\\cdots", function(context) {
  const next = context.future().text;
  if (next in spaceAfterDots) {
    return "\\@cdots\\,";
  } else {
    return "\\@cdots";
  }
});
defineMacro("\\dotsb", "\\cdots");
defineMacro("\\dotsm", "\\cdots");
defineMacro("\\dotsi", "\\!\\cdots");
defineMacro("\\idotsint", "\\int\\!\\cdots\\!\\int");
defineMacro("\\dotsx", "\\ldots\\,");
defineMacro("\\DOTSI", "\\relax");
defineMacro("\\DOTSB", "\\relax");
defineMacro("\\DOTSX", "\\relax");
defineMacro("\\tmspace", "\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax");
defineMacro("\\,", "{\\tmspace+{3mu}{.1667em}}");
defineMacro("\\thinspace", "\\,");
defineMacro("\\>", "\\mskip{4mu}");
defineMacro("\\:", "{\\tmspace+{4mu}{.2222em}}");
defineMacro("\\medspace", "\\:");
defineMacro("\\;", "{\\tmspace+{5mu}{.2777em}}");
defineMacro("\\thickspace", "\\;");
defineMacro("\\!", "{\\tmspace-{3mu}{.1667em}}");
defineMacro("\\negthinspace", "\\!");
defineMacro("\\negmedspace", "{\\tmspace-{4mu}{.2222em}}");
defineMacro("\\negthickspace", "{\\tmspace-{5mu}{.277em}}");
defineMacro("\\enspace", "\\kern.5em ");
defineMacro("\\enskip", "\\hskip.5em\\relax");
defineMacro("\\quad", "\\hskip1em\\relax");
defineMacro("\\qquad", "\\hskip2em\\relax");
defineMacro("\\AA", "\\TextOrMath{\\Angstrom}{\\mathring{A}}\\relax");
defineMacro("\\tag", "\\@ifstar\\tag@literal\\tag@paren");
defineMacro("\\tag@paren", "\\tag@literal{({#1})}");
defineMacro("\\tag@literal", (context) => {
  if (context.macros.get("\\df@tag")) {
    throw new ParseError("Multiple \\tag");
  }
  return "\\gdef\\df@tag{\\text{#1}}";
});
defineMacro("\\notag", "\\nonumber");
defineMacro("\\nonumber", "\\gdef\\@eqnsw{0}");
defineMacro("\\bmod", "\\mathbin{\\text{mod}}");
defineMacro(
  "\\pod",
  "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)"
);
defineMacro("\\pmod", "\\pod{{\\rm mod}\\mkern6mu#1}");
defineMacro(
  "\\mod",
  "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}{\\rm mod}\\,\\,#1"
);
defineMacro("\\newline", "\\\\\\relax");
defineMacro("\\TeX", "\\textrm{T}\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125em\\textrm{X}");
defineMacro(
  "\\LaTeX",
  "\\textrm{L}\\kern-.35em\\raisebox{0.2em}{\\scriptstyle A}\\kern-.15em\\TeX"
);
defineMacro(
  "\\Temml",
  // eslint-disable-next-line max-len
  "\\textrm{T}\\kern-0.2em\\lower{0.2em}{\\textrm{E}}\\kern-0.08em{\\textrm{M}\\kern-0.08em\\raise{0.2em}\\textrm{M}\\kern-0.08em\\textrm{L}}"
);
defineMacro("\\hspace", "\\@ifstar\\@hspacer\\@hspace");
defineMacro("\\@hspace", "\\hskip #1\\relax");
defineMacro("\\@hspacer", "\\rule{0pt}{0pt}\\hskip #1\\relax");
defineMacro("\\colon", `\\mathpunct{\\char"3a}`);
defineMacro("\\prescript", "\\pres@cript{_{#1}^{#2}}{}{#3}");
defineMacro("\\ordinarycolon", `\\char"3a`);
defineMacro("\\vcentcolon", "\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}}");
defineMacro("\\coloneq", '\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"2212}');
defineMacro("\\Coloneq", '\\mathrel{\\char"2237\\char"2212}');
defineMacro("\\Eqqcolon", '\\mathrel{\\char"3d\\char"2237}');
defineMacro("\\Eqcolon", '\\mathrel{\\char"2212\\char"2237}');
defineMacro("\\colonapprox", '\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"2248}');
defineMacro("\\Colonapprox", '\\mathrel{\\char"2237\\char"2248}');
defineMacro("\\colonsim", '\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"223c}');
defineMacro("\\Colonsim", '\\mathrel{\\raisebox{0.035em}{\\ordinarycolon}\\char"223c}');
defineMacro("\\ratio", "\\vcentcolon");
defineMacro("\\coloncolon", "\\dblcolon");
defineMacro("\\colonequals", "\\coloneqq");
defineMacro("\\coloncolonequals", "\\Coloneqq");
defineMacro("\\equalscolon", "\\eqqcolon");
defineMacro("\\equalscoloncolon", "\\Eqqcolon");
defineMacro("\\colonminus", "\\coloneq");
defineMacro("\\coloncolonminus", "\\Coloneq");
defineMacro("\\minuscolon", "\\eqcolon");
defineMacro("\\minuscoloncolon", "\\Eqcolon");
defineMacro("\\coloncolonapprox", "\\Colonapprox");
defineMacro("\\coloncolonsim", "\\Colonsim");
defineMacro("\\notni", "\\mathrel{\\char`\u220C}");
defineMacro("\\limsup", "\\DOTSB\\operatorname*{lim\\,sup}");
defineMacro("\\liminf", "\\DOTSB\\operatorname*{lim\\,inf}");
defineMacro("\\injlim", "\\DOTSB\\operatorname*{inj\\,lim}");
defineMacro("\\projlim", "\\DOTSB\\operatorname*{proj\\,lim}");
defineMacro("\\varlimsup", "\\DOTSB\\operatorname*{\\overline{\\text{lim}}}");
defineMacro("\\varliminf", "\\DOTSB\\operatorname*{\\underline{\\text{lim}}}");
defineMacro("\\varinjlim", "\\DOTSB\\operatorname*{\\underrightarrow{\\text{lim}}}");
defineMacro("\\varprojlim", "\\DOTSB\\operatorname*{\\underleftarrow{\\text{lim}}}");
defineMacro("\\centerdot", "{\\medspace\\rule{0.167em}{0.189em}\\medspace}");
defineMacro("\\argmin", "\\DOTSB\\operatorname*{arg\\,min}");
defineMacro("\\argmax", "\\DOTSB\\operatorname*{arg\\,max}");
defineMacro("\\plim", "\\DOTSB\\operatorname*{plim}");
defineMacro("\\leftmodels", "\\mathop{\\reflectbox{$\\models$}}");
defineMacro("\\bra", "\\mathinner{\\langle{#1}|}");
defineMacro("\\ket", "\\mathinner{|{#1}\\rangle}");
defineMacro("\\braket", "\\mathinner{\\langle{#1}\\rangle}");
defineMacro("\\Bra", "\\left\\langle#1\\right|");
defineMacro("\\Ket", "\\left|#1\\right\\rangle");
var replaceVert = (argStr, match) => {
  const ch = match[0] === "|" ? "\\vert" : "\\Vert";
  const replaceStr = `}\\,\\middle${ch}\\,{`;
  return argStr.slice(0, match.index) + replaceStr + argStr.slice(match.index + match[0].length);
};
defineMacro("\\Braket", function(context) {
  let argStr = recreateArgStr(context);
  const regEx = /\|\||\||\\\|/g;
  let match;
  while ((match = regEx.exec(argStr)) !== null) {
    argStr = replaceVert(argStr, match);
  }
  return "\\left\\langle{" + argStr + "}\\right\\rangle";
});
defineMacro("\\Set", function(context) {
  let argStr = recreateArgStr(context);
  const match = /\|\||\||\\\|/.exec(argStr);
  if (match) {
    argStr = replaceVert(argStr, match);
  }
  return "\\left\\{\\:{" + argStr + "}\\:\\right\\}";
});
defineMacro("\\set", function(context) {
  const argStr = recreateArgStr(context);
  return "\\{{" + argStr.replace(/\|/, "}\\mid{") + "}\\}";
});
defineMacro("\\angln", "{\\angl n}");
defineMacro("\\odv", "\\@ifstar\\odv@next\\odv@numerator");
defineMacro("\\odv@numerator", "\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}");
defineMacro("\\odv@next", "\\frac{\\mathrm{d}}{\\mathrm{d}#2}#1");
defineMacro("\\pdv", "\\@ifstar\\pdv@next\\pdv@numerator");
var pdvHelper = (args) => {
  const numerator = args[0][0].text;
  const denoms = stringFromArg(args[1]).split(",");
  const power = String(denoms.length);
  const numOp = power === "1" ? "\\partial" : `\\partial^${power}`;
  let denominator = "";
  denoms.map((e) => {
    denominator += "\\partial " + e.trim() + "\\,";
  });
  return [numerator, numOp, denominator.replace(/\\,$/, "")];
};
defineMacro("\\pdv@numerator", function(context) {
  const [numerator, numOp, denominator] = pdvHelper(context.consumeArgs(2));
  return `\\frac{${numOp} ${numerator}}{${denominator}}`;
});
defineMacro("\\pdv@next", function(context) {
  const [numerator, numOp, denominator] = pdvHelper(context.consumeArgs(2));
  return `\\frac{${numOp}}{${denominator}} ${numerator}`;
});
defineMacro("\\upalpha", "\\up@greek{\\alpha}");
defineMacro("\\upbeta", "\\up@greek{\\beta}");
defineMacro("\\upgamma", "\\up@greek{\\gamma}");
defineMacro("\\updelta", "\\up@greek{\\delta}");
defineMacro("\\upepsilon", "\\up@greek{\\epsilon}");
defineMacro("\\upzeta", "\\up@greek{\\zeta}");
defineMacro("\\upeta", "\\up@greek{\\eta}");
defineMacro("\\uptheta", "\\up@greek{\\theta}");
defineMacro("\\upiota", "\\up@greek{\\iota}");
defineMacro("\\upkappa", "\\up@greek{\\kappa}");
defineMacro("\\uplambda", "\\up@greek{\\lambda}");
defineMacro("\\upmu", "\\up@greek{\\mu}");
defineMacro("\\upnu", "\\up@greek{\\nu}");
defineMacro("\\upxi", "\\up@greek{\\xi}");
defineMacro("\\upomicron", "\\up@greek{\\omicron}");
defineMacro("\\uppi", "\\up@greek{\\pi}");
defineMacro("\\upalpha", "\\up@greek{\\alpha}");
defineMacro("\\uprho", "\\up@greek{\\rho}");
defineMacro("\\upsigma", "\\up@greek{\\sigma}");
defineMacro("\\uptau", "\\up@greek{\\tau}");
defineMacro("\\upupsilon", "\\up@greek{\\upsilon}");
defineMacro("\\upphi", "\\up@greek{\\phi}");
defineMacro("\\upchi", "\\up@greek{\\chi}");
defineMacro("\\uppsi", "\\up@greek{\\psi}");
defineMacro("\\upomega", "\\up@greek{\\omega}");
defineMacro("\\invamp", '\\mathbin{\\char"214b}');
defineMacro("\\parr", '\\mathbin{\\char"214b}');
defineMacro("\\upand", '\\mathbin{\\char"214b}');
defineMacro("\\with", '\\mathbin{\\char"26}');
defineMacro("\\multimapinv", '\\mathrel{\\char"27dc}');
defineMacro("\\multimapboth", '\\mathrel{\\char"29df}');
defineMacro("\\scoh", '{\\mkern5mu\\char"2322\\mkern5mu}');
defineMacro("\\sincoh", '{\\mkern5mu\\char"2323\\mkern5mu}');
defineMacro("\\coh", `{\\mkern5mu\\rule{}{0.7em}\\mathrlap{\\smash{\\raise2mu{\\char"2322}}}
{\\smash{\\lower4mu{\\char"2323}}}\\mkern5mu}`);
defineMacro("\\incoh", `{\\mkern5mu\\rule{}{0.7em}\\mathrlap{\\smash{\\raise2mu{\\char"2323}}}
{\\smash{\\lower4mu{\\char"2322}}}\\mkern5mu}`);
defineMacro("\\standardstate", "\\text{\\tiny\\char`\u29B5}");
defineMacro("\\ce", function(context) {
  return chemParse(context.consumeArgs(1)[0], "ce");
});
defineMacro("\\pu", function(context) {
  return chemParse(context.consumeArgs(1)[0], "pu");
});
defineMacro("\\uniDash", `{\\rule{0.672em}{0.06em}}`);
defineMacro("\\triDash", `{\\rule{0.15em}{0.06em}\\kern2mu\\rule{0.15em}{0.06em}\\kern2mu\\rule{0.15em}{0.06em}}`);
defineMacro("\\tripleDash", `\\kern0.075em\\raise0.25em{\\triDash}\\kern0.075em`);
defineMacro("\\tripleDashOverLine", `\\kern0.075em\\mathrlap{\\raise0.125em{\\uniDash}}\\raise0.34em{\\triDash}\\kern0.075em`);
defineMacro("\\tripleDashOverDoubleLine", `\\kern0.075em\\mathrlap{\\mathrlap{\\raise0.48em{\\triDash}}\\raise0.27em{\\uniDash}}{\\raise0.05em{\\uniDash}}\\kern0.075em`);
defineMacro("\\tripleDashBetweenDoubleLine", `\\kern0.075em\\mathrlap{\\mathrlap{\\raise0.48em{\\uniDash}}\\raise0.27em{\\triDash}}{\\raise0.05em{\\uniDash}}\\kern0.075em`);
var chemParse = function(tokens, stateMachine) {
  var str = "";
  var expectedLoc = tokens.length && tokens[tokens.length - 1].loc.start;
  for (var i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].loc.start > expectedLoc) {
      str += " ";
      expectedLoc = tokens[i].loc.start;
    }
    str += tokens[i].text;
    expectedLoc += tokens[i].text.length;
  }
  var tex = texify.go(mhchemParser.go(str, stateMachine));
  return tex;
};
var mhchemParser = {
  //
  // Parses mchem \ce syntax
  //
  // Call like
  //   go("H2O");
  //
  go: function(input, stateMachine) {
    if (!input) {
      return [];
    }
    if (stateMachine === void 0) {
      stateMachine = "ce";
    }
    var state2 = "0";
    var buffer = {};
    buffer["parenthesisLevel"] = 0;
    input = input.replace(/\n/g, " ");
    input = input.replace(/[\u2212\u2013\u2014\u2010]/g, "-");
    input = input.replace(/[\u2026]/g, "...");
    var lastInput;
    var watchdog = 10;
    var output2 = [];
    while (true) {
      if (lastInput !== input) {
        watchdog = 10;
        lastInput = input;
      } else {
        watchdog--;
      }
      var machine = mhchemParser.stateMachines[stateMachine];
      var t = machine.transitions[state2] || machine.transitions["*"];
      iterateTransitions:
        for (var i = 0; i < t.length; i++) {
          var matches = mhchemParser.patterns.match_(t[i].pattern, input);
          if (matches) {
            var task = t[i].task;
            for (var iA = 0; iA < task.action_.length; iA++) {
              var o;
              if (machine.actions[task.action_[iA].type_]) {
                o = machine.actions[task.action_[iA].type_](buffer, matches.match_, task.action_[iA].option);
              } else if (mhchemParser.actions[task.action_[iA].type_]) {
                o = mhchemParser.actions[task.action_[iA].type_](buffer, matches.match_, task.action_[iA].option);
              } else {
                throw ["MhchemBugA", "mhchem bug A. Please report. (" + task.action_[iA].type_ + ")"];
              }
              mhchemParser.concatArray(output2, o);
            }
            state2 = task.nextState || state2;
            if (input.length > 0) {
              if (!task.revisit) {
                input = matches.remainder;
              }
              if (!task.toContinue) {
                break iterateTransitions;
              }
            } else {
              return output2;
            }
          }
        }
      if (watchdog <= 0) {
        throw ["MhchemBugU", "mhchem bug U. Please report."];
      }
    }
  },
  concatArray: function(a, b) {
    if (b) {
      if (Array.isArray(b)) {
        for (var iB = 0; iB < b.length; iB++) {
          a.push(b[iB]);
        }
      } else {
        a.push(b);
      }
    }
  },
  patterns: {
    //
    // Matching patterns
    // either regexps or function that return null or {match_:"a", remainder:"bc"}
    //
    patterns: {
      // property names must not look like integers ("2") for correct property traversal order, later on
      "empty": /^$/,
      "else": /^./,
      "else2": /^./,
      "space": /^\s/,
      "space A": /^\s(?=[A-Z\\$])/,
      "space$": /^\s$/,
      "a-z": /^[a-z]/,
      "x": /^x/,
      "x$": /^x$/,
      "i$": /^i$/,
      "letters": /^(?:[a-zA-Z\u03B1-\u03C9\u0391-\u03A9?@]|(?:\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)(?:\s+|\{\}|(?![a-zA-Z]))))+/,
      "\\greek": /^\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)(?:\s+|\{\}|(?![a-zA-Z]))/,
      "one lowercase latin letter $": /^(?:([a-z])(?:$|[^a-zA-Z]))$/,
      "$one lowercase latin letter$ $": /^\$(?:([a-z])(?:$|[^a-zA-Z]))\$$/,
      "one lowercase greek letter $": /^(?:\$?[\u03B1-\u03C9]\$?|\$?\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\s*\$?)(?:\s+|\{\}|(?![a-zA-Z]))$/,
      "digits": /^[0-9]+/,
      "-9.,9": /^[+\-]?(?:[0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))/,
      "-9.,9 no missing 0": /^[+\-]?[0-9]+(?:[.,][0-9]+)?/,
      "(-)(9.,9)(e)(99)": function(input) {
        var m = input.match(/^(\+\-|\+\/\-|\+|\-|\\pm\s?)?([0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))?(\((?:[0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+))\))?(?:([eE]|\s*(\*|x|\\times|\u00D7)\s*10\^)([+\-]?[0-9]+|\{[+\-]?[0-9]+\}))?/);
        if (m && m[0]) {
          return { match_: m.splice(1), remainder: input.substr(m[0].length) };
        }
        return null;
      },
      "(-)(9)^(-9)": function(input) {
        var m = input.match(/^(\+\-|\+\/\-|\+|\-|\\pm\s?)?([0-9]+(?:[,.][0-9]+)?|[0-9]*(?:\.[0-9]+)?)\^([+\-]?[0-9]+|\{[+\-]?[0-9]+\})/);
        if (m && m[0]) {
          return { match_: m.splice(1), remainder: input.substr(m[0].length) };
        }
        return null;
      },
      "state of aggregation $": function(input) {
        var a = mhchemParser.patterns.findObserveGroups(input, "", /^\([a-z]{1,3}(?=[\),])/, ")", "");
        if (a && a.remainder.match(/^($|[\s,;\)\]\}])/)) {
          return a;
        }
        var m = input.match(/^(?:\((?:\\ca\s?)?\$[amothc]\$\))/);
        if (m) {
          return { match_: m[0], remainder: input.substr(m[0].length) };
        }
        return null;
      },
      "_{(state of aggregation)}$": /^_\{(\([a-z]{1,3}\))\}/,
      "{[(": /^(?:\\\{|\[|\()/,
      ")]}": /^(?:\)|\]|\\\})/,
      ", ": /^[,;]\s*/,
      ",": /^[,;]/,
      ".": /^[.]/,
      ". ": /^([.\u22C5\u00B7\u2022])\s*/,
      "...": /^\.\.\.(?=$|[^.])/,
      "* ": /^([*])\s*/,
      "^{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "^{", "", "", "}");
      },
      "^($...$)": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "^", "$", "$", "");
      },
      "^a": /^\^([0-9]+|[^\\_])/,
      "^\\x{}{}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "^", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true);
      },
      "^\\x{}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "^", /^\\[a-zA-Z]+\{/, "}", "");
      },
      "^\\x": /^\^(\\[a-zA-Z]+)\s*/,
      "^(-1)": /^\^(-?\d+)/,
      "'": /^'/,
      "_{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "_{", "", "", "}");
      },
      "_($...$)": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "_", "$", "$", "");
      },
      "_9": /^_([+\-]?[0-9]+|[^\\])/,
      "_\\x{}{}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "_", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true);
      },
      "_\\x{}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "_", /^\\[a-zA-Z]+\{/, "}", "");
      },
      "_\\x": /^_(\\[a-zA-Z]+)\s*/,
      "^_": /^(?:\^(?=_)|\_(?=\^)|[\^_]$)/,
      "{}": /^\{\}/,
      "{...}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "", "{", "}", "");
      },
      "{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "{", "", "", "}");
      },
      "$...$": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "", "$", "$", "");
      },
      "${(...)}$": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "${", "", "", "}$");
      },
      "$(...)$": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "$", "", "", "$");
      },
      "=<>": /^[=<>]/,
      "#": /^[#\u2261]/,
      "+": /^\+/,
      "-$": /^-(?=[\s_},;\]/]|$|\([a-z]+\))/,
      // -space -, -; -] -/ -$ -state-of-aggregation
      "-9": /^-(?=[0-9])/,
      "- orbital overlap": /^-(?=(?:[spd]|sp)(?:$|[\s,;\)\]\}]))/,
      "-": /^-/,
      "pm-operator": /^(?:\\pm|\$\\pm\$|\+-|\+\/-)/,
      "operator": /^(?:\+|(?:[\-=<>]|<<|>>|\\approx|\$\\approx\$)(?=\s|$|-?[0-9]))/,
      "arrowUpDown": /^(?:v|\(v\)|\^|\(\^\))(?=$|[\s,;\)\]\}])/,
      "\\bond{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\bond{", "", "", "}");
      },
      "->": /^(?:<->|<-->|->|<-|<=>>|<<=>|<=>|[\u2192\u27F6\u21CC])/,
      "CMT": /^[CMT](?=\[)/,
      "[(...)]": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "[", "", "", "]");
      },
      "1st-level escape": /^(&|\\\\|\\hline)\s*/,
      "\\,": /^(?:\\[,\ ;:])/,
      // \\x - but output no space before
      "\\x{}{}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "", /^\\[a-zA-Z]+\{/, "}", "", "", "{", "}", "", true);
      },
      "\\x{}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "", /^\\[a-zA-Z]+\{/, "}", "");
      },
      "\\ca": /^\\ca(?:\s+|(?![a-zA-Z]))/,
      "\\x": /^(?:\\[a-zA-Z]+\s*|\\[_&{}%])/,
      "orbital": /^(?:[0-9]{1,2}[spdfgh]|[0-9]{0,2}sp)(?=$|[^a-zA-Z])/,
      // only those with numbers in front, because the others will be formatted correctly anyway
      "others": /^[\/~|]/,
      "\\frac{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\frac{", "", "", "}", "{", "", "", "}");
      },
      "\\overset{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\overset{", "", "", "}", "{", "", "", "}");
      },
      "\\underset{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\underset{", "", "", "}", "{", "", "", "}");
      },
      "\\underbrace{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\underbrace{", "", "", "}_", "{", "", "", "}");
      },
      "\\color{(...)}0": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\color{", "", "", "}");
      },
      "\\color{(...)}{(...)}1": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\color{", "", "", "}", "{", "", "", "}");
      },
      "\\color(...){(...)}2": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\color", "\\", "", /^(?=\{)/, "{", "", "", "}");
      },
      "\\ce{(...)}": function(input) {
        return mhchemParser.patterns.findObserveGroups(input, "\\ce{", "", "", "}");
      },
      "oxidation$": /^(?:[+-][IVX]+|\\pm\s*0|\$\\pm\$\s*0)$/,
      "d-oxidation$": /^(?:[+-]?\s?[IVX]+|\\pm\s*0|\$\\pm\$\s*0)$/,
      // 0 could be oxidation or charge
      "roman numeral": /^[IVX]+/,
      "1/2$": /^[+\-]?(?:[0-9]+|\$[a-z]\$|[a-z])\/[0-9]+(?:\$[a-z]\$|[a-z])?$/,
      "amount": function(input) {
        var match;
        match = input.match(/^(?:(?:(?:\([+\-]?[0-9]+\/[0-9]+\)|[+\-]?(?:[0-9]+|\$[a-z]\$|[a-z])\/[0-9]+|[+\-]?[0-9]+[.,][0-9]+|[+\-]?\.[0-9]+|[+\-]?[0-9]+)(?:[a-z](?=\s*[A-Z]))?)|[+\-]?[a-z](?=\s*[A-Z])|\+(?!\s))/);
        if (match) {
          return { match_: match[0], remainder: input.substr(match[0].length) };
        }
        var a = mhchemParser.patterns.findObserveGroups(input, "", "$", "$", "");
        if (a) {
          match = a.match_.match(/^\$(?:\(?[+\-]?(?:[0-9]*[a-z]?[+\-])?[0-9]*[a-z](?:[+\-][0-9]*[a-z]?)?\)?|\+|-)\$$/);
          if (match) {
            return { match_: match[0], remainder: input.substr(match[0].length) };
          }
        }
        return null;
      },
      "amount2": function(input) {
        return this["amount"](input);
      },
      "(KV letters),": /^(?:[A-Z][a-z]{0,2}|i)(?=,)/,
      "formula$": function(input) {
        if (input.match(/^\([a-z]+\)$/)) {
          return null;
        }
        var match = input.match(/^(?:[a-z]|(?:[0-9\ \+\-\,\.\(\)]+[a-z])+[0-9\ \+\-\,\.\(\)]*|(?:[a-z][0-9\ \+\-\,\.\(\)]+)+[a-z]?)$/);
        if (match) {
          return { match_: match[0], remainder: input.substr(match[0].length) };
        }
        return null;
      },
      "uprightEntities": /^(?:pH|pOH|pC|pK|iPr|iBu)(?=$|[^a-zA-Z])/,
      "/": /^\s*(\/)\s*/,
      "//": /^\s*(\/\/)\s*/,
      "*": /^\s*[*.]\s*/
    },
    findObserveGroups: function(input, begExcl, begIncl, endIncl, endExcl, beg2Excl, beg2Incl, end2Incl, end2Excl, combine) {
      var _match = function(input2, pattern2) {
        if (typeof pattern2 === "string") {
          if (input2.indexOf(pattern2) !== 0) {
            return null;
          }
          return pattern2;
        } else {
          var match2 = input2.match(pattern2);
          if (!match2) {
            return null;
          }
          return match2[0];
        }
      };
      var _findObserveGroups = function(input2, i, endChars) {
        var braces = 0;
        while (i < input2.length) {
          var a = input2.charAt(i);
          var match2 = _match(input2.substr(i), endChars);
          if (match2 !== null && braces === 0) {
            return { endMatchBegin: i, endMatchEnd: i + match2.length };
          } else if (a === "{") {
            braces++;
          } else if (a === "}") {
            if (braces === 0) {
              throw ["ExtraCloseMissingOpen", "Extra close brace or missing open brace"];
            } else {
              braces--;
            }
          }
          i++;
        }
        if (braces > 0) {
          return null;
        }
        return null;
      };
      var match = _match(input, begExcl);
      if (match === null) {
        return null;
      }
      input = input.substr(match.length);
      match = _match(input, begIncl);
      if (match === null) {
        return null;
      }
      var e = _findObserveGroups(input, match.length, endIncl || endExcl);
      if (e === null) {
        return null;
      }
      var match1 = input.substring(0, endIncl ? e.endMatchEnd : e.endMatchBegin);
      if (!(beg2Excl || beg2Incl)) {
        return {
          match_: match1,
          remainder: input.substr(e.endMatchEnd)
        };
      } else {
        var group2 = this.findObserveGroups(input.substr(e.endMatchEnd), beg2Excl, beg2Incl, end2Incl, end2Excl);
        if (group2 === null) {
          return null;
        }
        var matchRet = [match1, group2.match_];
        return {
          match_: combine ? matchRet.join("") : matchRet,
          remainder: group2.remainder
        };
      }
    },
    //
    // Matching function
    // e.g. match("a", input) will look for the regexp called "a" and see if it matches
    // returns null or {match_:"a", remainder:"bc"}
    //
    match_: function(m, input) {
      var pattern2 = mhchemParser.patterns.patterns[m];
      if (pattern2 === void 0) {
        throw ["MhchemBugP", "mhchem bug P. Please report. (" + m + ")"];
      } else if (typeof pattern2 === "function") {
        return mhchemParser.patterns.patterns[m](input);
      } else {
        var match = input.match(pattern2);
        if (match) {
          var mm;
          if (match[2]) {
            mm = [match[1], match[2]];
          } else if (match[1]) {
            mm = match[1];
          } else {
            mm = match[0];
          }
          return { match_: mm, remainder: input.substr(match[0].length) };
        }
        return null;
      }
    }
  },
  //
  // Generic state machine actions
  //
  actions: {
    "a=": function(buffer, m) {
      buffer.a = (buffer.a || "") + m;
    },
    "b=": function(buffer, m) {
      buffer.b = (buffer.b || "") + m;
    },
    "p=": function(buffer, m) {
      buffer.p = (buffer.p || "") + m;
    },
    "o=": function(buffer, m) {
      buffer.o = (buffer.o || "") + m;
    },
    "q=": function(buffer, m) {
      buffer.q = (buffer.q || "") + m;
    },
    "d=": function(buffer, m) {
      buffer.d = (buffer.d || "") + m;
    },
    "rm=": function(buffer, m) {
      buffer.rm = (buffer.rm || "") + m;
    },
    "text=": function(buffer, m) {
      buffer.text_ = (buffer.text_ || "") + m;
    },
    "insert": function(buffer, m, a) {
      return { type_: a };
    },
    "insert+p1": function(buffer, m, a) {
      return { type_: a, p1: m };
    },
    "insert+p1+p2": function(buffer, m, a) {
      return { type_: a, p1: m[0], p2: m[1] };
    },
    "copy": function(buffer, m) {
      return m;
    },
    "rm": function(buffer, m) {
      return { type_: "rm", p1: m || "" };
    },
    "text": function(buffer, m) {
      return mhchemParser.go(m, "text");
    },
    "{text}": function(buffer, m) {
      var ret = ["{"];
      mhchemParser.concatArray(ret, mhchemParser.go(m, "text"));
      ret.push("}");
      return ret;
    },
    "tex-math": function(buffer, m) {
      return mhchemParser.go(m, "tex-math");
    },
    "tex-math tight": function(buffer, m) {
      return mhchemParser.go(m, "tex-math tight");
    },
    "bond": function(buffer, m, k) {
      return { type_: "bond", kind_: k || m };
    },
    "color0-output": function(buffer, m) {
      return { type_: "color0", color: m[0] };
    },
    "ce": function(buffer, m) {
      return mhchemParser.go(m);
    },
    "1/2": function(buffer, m) {
      var ret = [];
      if (m.match(/^[+\-]/)) {
        ret.push(m.substr(0, 1));
        m = m.substr(1);
      }
      var n = m.match(/^([0-9]+|\$[a-z]\$|[a-z])\/([0-9]+)(\$[a-z]\$|[a-z])?$/);
      n[1] = n[1].replace(/\$/g, "");
      ret.push({ type_: "frac", p1: n[1], p2: n[2] });
      if (n[3]) {
        n[3] = n[3].replace(/\$/g, "");
        ret.push({ type_: "tex-math", p1: n[3] });
      }
      return ret;
    },
    "9,9": function(buffer, m) {
      return mhchemParser.go(m, "9,9");
    }
  },
  //
  // createTransitions
  // convert  { 'letter': { 'state': { action_: 'output' } } }  to  { 'state' => [ { pattern: 'letter', task: { action_: [{type_: 'output'}] } } ] }
  // with expansion of 'a|b' to 'a' and 'b' (at 2 places)
  //
  createTransitions: function(o) {
    var pattern2, state2;
    var stateArray;
    var i;
    var transitions = {};
    for (pattern2 in o) {
      for (state2 in o[pattern2]) {
        stateArray = state2.split("|");
        o[pattern2][state2].stateArray = stateArray;
        for (i = 0; i < stateArray.length; i++) {
          transitions[stateArray[i]] = [];
        }
      }
    }
    for (pattern2 in o) {
      for (state2 in o[pattern2]) {
        stateArray = o[pattern2][state2].stateArray || [];
        for (i = 0; i < stateArray.length; i++) {
          var p = o[pattern2][state2];
          if (p.action_) {
            p.action_ = [].concat(p.action_);
            for (var k = 0; k < p.action_.length; k++) {
              if (typeof p.action_[k] === "string") {
                p.action_[k] = { type_: p.action_[k] };
              }
            }
          } else {
            p.action_ = [];
          }
          var patternArray = pattern2.split("|");
          for (var j = 0; j < patternArray.length; j++) {
            if (stateArray[i] === "*") {
              for (var t in transitions) {
                transitions[t].push({ pattern: patternArray[j], task: p });
              }
            } else {
              transitions[stateArray[i]].push({ pattern: patternArray[j], task: p });
            }
          }
        }
      }
    }
    return transitions;
  },
  stateMachines: {}
};
mhchemParser.stateMachines = {
  //
  // \ce state machines
  //
  //#region ce
  "ce": {
    // main parser
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": { action_: "output" }
      },
      "else": {
        "0|1|2": { action_: "beginsWithBond=false", revisit: true, toContinue: true }
      },
      "oxidation$": {
        "0": { action_: "oxidation-output" }
      },
      "CMT": {
        "r": { action_: "rdt=", nextState: "rt" },
        "rd": { action_: "rqt=", nextState: "rdt" }
      },
      "arrowUpDown": {
        "0|1|2|as": { action_: ["sb=false", "output", "operator"], nextState: "1" }
      },
      "uprightEntities": {
        "0|1|2": { action_: ["o=", "output"], nextState: "1" }
      },
      "orbital": {
        "0|1|2|3": { action_: "o=", nextState: "o" }
      },
      "->": {
        "0|1|2|3": { action_: "r=", nextState: "r" },
        "a|as": { action_: ["output", "r="], nextState: "r" },
        "*": { action_: ["output", "r="], nextState: "r" }
      },
      "+": {
        "o": { action_: "d= kv", nextState: "d" },
        "d|D": { action_: "d=", nextState: "d" },
        "q": { action_: "d=", nextState: "qd" },
        "qd|qD": { action_: "d=", nextState: "qd" },
        "dq": { action_: ["output", "d="], nextState: "d" },
        "3": { action_: ["sb=false", "output", "operator"], nextState: "0" }
      },
      "amount": {
        "0|2": { action_: "a=", nextState: "a" }
      },
      "pm-operator": {
        "0|1|2|a|as": { action_: ["sb=false", "output", { type_: "operator", option: "\\pm" }], nextState: "0" }
      },
      "operator": {
        "0|1|2|a|as": { action_: ["sb=false", "output", "operator"], nextState: "0" }
      },
      "-$": {
        "o|q": { action_: ["charge or bond", "output"], nextState: "qd" },
        "d": { action_: "d=", nextState: "d" },
        "D": { action_: ["output", { type_: "bond", option: "-" }], nextState: "3" },
        "q": { action_: "d=", nextState: "qd" },
        "qd": { action_: "d=", nextState: "qd" },
        "qD|dq": { action_: ["output", { type_: "bond", option: "-" }], nextState: "3" }
      },
      "-9": {
        "3|o": { action_: ["output", { type_: "insert", option: "hyphen" }], nextState: "3" }
      },
      "- orbital overlap": {
        "o": { action_: ["output", { type_: "insert", option: "hyphen" }], nextState: "2" },
        "d": { action_: ["output", { type_: "insert", option: "hyphen" }], nextState: "2" }
      },
      "-": {
        "0|1|2": { action_: [{ type_: "output", option: 1 }, "beginsWithBond=true", { type_: "bond", option: "-" }], nextState: "3" },
        "3": { action_: { type_: "bond", option: "-" } },
        "a": { action_: ["output", { type_: "insert", option: "hyphen" }], nextState: "2" },
        "as": { action_: [{ type_: "output", option: 2 }, { type_: "bond", option: "-" }], nextState: "3" },
        "b": { action_: "b=" },
        "o": { action_: { type_: "- after o/d", option: false }, nextState: "2" },
        "q": { action_: { type_: "- after o/d", option: false }, nextState: "2" },
        "d|qd|dq": { action_: { type_: "- after o/d", option: true }, nextState: "2" },
        "D|qD|p": { action_: ["output", { type_: "bond", option: "-" }], nextState: "3" }
      },
      "amount2": {
        "1|3": { action_: "a=", nextState: "a" }
      },
      "letters": {
        "0|1|2|3|a|as|b|p|bp|o": { action_: "o=", nextState: "o" },
        "q|dq": { action_: ["output", "o="], nextState: "o" },
        "d|D|qd|qD": { action_: "o after d", nextState: "o" }
      },
      "digits": {
        "o": { action_: "q=", nextState: "q" },
        "d|D": { action_: "q=", nextState: "dq" },
        "q": { action_: ["output", "o="], nextState: "o" },
        "a": { action_: "o=", nextState: "o" }
      },
      "space A": {
        "b|p|bp": {}
      },
      "space": {
        "a": { nextState: "as" },
        "0": { action_: "sb=false" },
        "1|2": { action_: "sb=true" },
        "r|rt|rd|rdt|rdq": { action_: "output", nextState: "0" },
        "*": { action_: ["output", "sb=true"], nextState: "1" }
      },
      "1st-level escape": {
        "1|2": { action_: ["output", { type_: "insert+p1", option: "1st-level escape" }] },
        "*": { action_: ["output", { type_: "insert+p1", option: "1st-level escape" }], nextState: "0" }
      },
      "[(...)]": {
        "r|rt": { action_: "rd=", nextState: "rd" },
        "rd|rdt": { action_: "rq=", nextState: "rdq" }
      },
      "...": {
        "o|d|D|dq|qd|qD": { action_: ["output", { type_: "bond", option: "..." }], nextState: "3" },
        "*": { action_: [{ type_: "output", option: 1 }, { type_: "insert", option: "ellipsis" }], nextState: "1" }
      },
      ". |* ": {
        "*": { action_: ["output", { type_: "insert", option: "addition compound" }], nextState: "1" }
      },
      "state of aggregation $": {
        "*": { action_: ["output", "state of aggregation"], nextState: "1" }
      },
      "{[(": {
        "a|as|o": { action_: ["o=", "output", "parenthesisLevel++"], nextState: "2" },
        "0|1|2|3": { action_: ["o=", "output", "parenthesisLevel++"], nextState: "2" },
        "*": { action_: ["output", "o=", "output", "parenthesisLevel++"], nextState: "2" }
      },
      ")]}": {
        "0|1|2|3|b|p|bp|o": { action_: ["o=", "parenthesisLevel--"], nextState: "o" },
        "a|as|d|D|q|qd|qD|dq": { action_: ["output", "o=", "parenthesisLevel--"], nextState: "o" }
      },
      ", ": {
        "*": { action_: ["output", "comma"], nextState: "0" }
      },
      "^_": {
        // ^ and _ without a sensible argument
        "*": {}
      },
      "^{(...)}|^($...$)": {
        "0|1|2|as": { action_: "b=", nextState: "b" },
        "p": { action_: "b=", nextState: "bp" },
        "3|o": { action_: "d= kv", nextState: "D" },
        "q": { action_: "d=", nextState: "qD" },
        "d|D|qd|qD|dq": { action_: ["output", "d="], nextState: "D" }
      },
      "^a|^\\x{}{}|^\\x{}|^\\x|'": {
        "0|1|2|as": { action_: "b=", nextState: "b" },
        "p": { action_: "b=", nextState: "bp" },
        "3|o": { action_: "d= kv", nextState: "d" },
        "q": { action_: "d=", nextState: "qd" },
        "d|qd|D|qD": { action_: "d=" },
        "dq": { action_: ["output", "d="], nextState: "d" }
      },
      "_{(state of aggregation)}$": {
        "d|D|q|qd|qD|dq": { action_: ["output", "q="], nextState: "q" }
      },
      "_{(...)}|_($...$)|_9|_\\x{}{}|_\\x{}|_\\x": {
        "0|1|2|as": { action_: "p=", nextState: "p" },
        "b": { action_: "p=", nextState: "bp" },
        "3|o": { action_: "q=", nextState: "q" },
        "d|D": { action_: "q=", nextState: "dq" },
        "q|qd|qD|dq": { action_: ["output", "q="], nextState: "q" }
      },
      "=<>": {
        "0|1|2|3|a|as|o|q|d|D|qd|qD|dq": { action_: [{ type_: "output", option: 2 }, "bond"], nextState: "3" }
      },
      "#": {
        "0|1|2|3|a|as|o": { action_: [{ type_: "output", option: 2 }, { type_: "bond", option: "#" }], nextState: "3" }
      },
      "{}": {
        "*": { action_: { type_: "output", option: 1 }, nextState: "1" }
      },
      "{...}": {
        "0|1|2|3|a|as|b|p|bp": { action_: "o=", nextState: "o" },
        "o|d|D|q|qd|qD|dq": { action_: ["output", "o="], nextState: "o" }
      },
      "$...$": {
        "a": { action_: "a=" },
        // 2$n$
        "0|1|2|3|as|b|p|bp|o": { action_: "o=", nextState: "o" },
        // not 'amount'
        "as|o": { action_: "o=" },
        "q|d|D|qd|qD|dq": { action_: ["output", "o="], nextState: "o" }
      },
      "\\bond{(...)}": {
        "*": { action_: [{ type_: "output", option: 2 }, "bond"], nextState: "3" }
      },
      "\\frac{(...)}": {
        "*": { action_: [{ type_: "output", option: 1 }, "frac-output"], nextState: "3" }
      },
      "\\overset{(...)}": {
        "*": { action_: [{ type_: "output", option: 2 }, "overset-output"], nextState: "3" }
      },
      "\\underset{(...)}": {
        "*": { action_: [{ type_: "output", option: 2 }, "underset-output"], nextState: "3" }
      },
      "\\underbrace{(...)}": {
        "*": { action_: [{ type_: "output", option: 2 }, "underbrace-output"], nextState: "3" }
      },
      "\\color{(...)}{(...)}1|\\color(...){(...)}2": {
        "*": { action_: [{ type_: "output", option: 2 }, "color-output"], nextState: "3" }
      },
      "\\color{(...)}0": {
        "*": { action_: [{ type_: "output", option: 2 }, "color0-output"] }
      },
      "\\ce{(...)}": {
        "*": { action_: [{ type_: "output", option: 2 }, "ce"], nextState: "3" }
      },
      "\\,": {
        "*": { action_: [{ type_: "output", option: 1 }, "copy"], nextState: "1" }
      },
      "\\x{}{}|\\x{}|\\x": {
        "0|1|2|3|a|as|b|p|bp|o|c0": { action_: ["o=", "output"], nextState: "3" },
        "*": { action_: ["output", "o=", "output"], nextState: "3" }
      },
      "others": {
        "*": { action_: [{ type_: "output", option: 1 }, "copy"], nextState: "3" }
      },
      "else2": {
        "a": { action_: "a to o", nextState: "o", revisit: true },
        "as": { action_: ["output", "sb=true"], nextState: "1", revisit: true },
        "r|rt|rd|rdt|rdq": { action_: ["output"], nextState: "0", revisit: true },
        "*": { action_: ["output", "copy"], nextState: "3" }
      }
    }),
    actions: {
      "o after d": function(buffer, m) {
        var ret;
        if ((buffer.d || "").match(/^[0-9]+$/)) {
          var tmp = buffer.d;
          buffer.d = void 0;
          ret = this["output"](buffer);
          buffer.b = tmp;
        } else {
          ret = this["output"](buffer);
        }
        mhchemParser.actions["o="](buffer, m);
        return ret;
      },
      "d= kv": function(buffer, m) {
        buffer.d = m;
        buffer.dType = "kv";
      },
      "charge or bond": function(buffer, m) {
        if (buffer["beginsWithBond"]) {
          var ret = [];
          mhchemParser.concatArray(ret, this["output"](buffer));
          mhchemParser.concatArray(ret, mhchemParser.actions["bond"](buffer, m, "-"));
          return ret;
        } else {
          buffer.d = m;
        }
      },
      "- after o/d": function(buffer, m, isAfterD) {
        var c1 = mhchemParser.patterns.match_("orbital", buffer.o || "");
        var c2 = mhchemParser.patterns.match_("one lowercase greek letter $", buffer.o || "");
        var c3 = mhchemParser.patterns.match_("one lowercase latin letter $", buffer.o || "");
        var c4 = mhchemParser.patterns.match_("$one lowercase latin letter$ $", buffer.o || "");
        var hyphenFollows = m === "-" && (c1 && c1.remainder === "" || c2 || c3 || c4);
        if (hyphenFollows && !buffer.a && !buffer.b && !buffer.p && !buffer.d && !buffer.q && !c1 && c3) {
          buffer.o = "$" + buffer.o + "$";
        }
        var ret = [];
        if (hyphenFollows) {
          mhchemParser.concatArray(ret, this["output"](buffer));
          ret.push({ type_: "hyphen" });
        } else {
          c1 = mhchemParser.patterns.match_("digits", buffer.d || "");
          if (isAfterD && c1 && c1.remainder === "") {
            mhchemParser.concatArray(ret, mhchemParser.actions["d="](buffer, m));
            mhchemParser.concatArray(ret, this["output"](buffer));
          } else {
            mhchemParser.concatArray(ret, this["output"](buffer));
            mhchemParser.concatArray(ret, mhchemParser.actions["bond"](buffer, m, "-"));
          }
        }
        return ret;
      },
      "a to o": function(buffer) {
        buffer.o = buffer.a;
        buffer.a = void 0;
      },
      "sb=true": function(buffer) {
        buffer.sb = true;
      },
      "sb=false": function(buffer) {
        buffer.sb = false;
      },
      "beginsWithBond=true": function(buffer) {
        buffer["beginsWithBond"] = true;
      },
      "beginsWithBond=false": function(buffer) {
        buffer["beginsWithBond"] = false;
      },
      "parenthesisLevel++": function(buffer) {
        buffer["parenthesisLevel"]++;
      },
      "parenthesisLevel--": function(buffer) {
        buffer["parenthesisLevel"]--;
      },
      "state of aggregation": function(buffer, m) {
        return { type_: "state of aggregation", p1: mhchemParser.go(m, "o") };
      },
      "comma": function(buffer, m) {
        var a = m.replace(/\s*$/, "");
        var withSpace = a !== m;
        if (withSpace && buffer["parenthesisLevel"] === 0) {
          return { type_: "comma enumeration L", p1: a };
        } else {
          return { type_: "comma enumeration M", p1: a };
        }
      },
      "output": function(buffer, m, entityFollows) {
        var ret;
        if (!buffer.r) {
          ret = [];
          if (!buffer.a && !buffer.b && !buffer.p && !buffer.o && !buffer.q && !buffer.d && !entityFollows) {
          } else {
            if (buffer.sb) {
              ret.push({ type_: "entitySkip" });
            }
            if (!buffer.o && !buffer.q && !buffer.d && !buffer.b && !buffer.p && entityFollows !== 2) {
              buffer.o = buffer.a;
              buffer.a = void 0;
            } else if (!buffer.o && !buffer.q && !buffer.d && (buffer.b || buffer.p)) {
              buffer.o = buffer.a;
              buffer.d = buffer.b;
              buffer.q = buffer.p;
              buffer.a = buffer.b = buffer.p = void 0;
            } else {
              if (buffer.o && buffer.dType === "kv" && mhchemParser.patterns.match_("d-oxidation$", buffer.d || "")) {
                buffer.dType = "oxidation";
              } else if (buffer.o && buffer.dType === "kv" && !buffer.q) {
                buffer.dType = void 0;
              }
            }
            ret.push({
              type_: "chemfive",
              a: mhchemParser.go(buffer.a, "a"),
              b: mhchemParser.go(buffer.b, "bd"),
              p: mhchemParser.go(buffer.p, "pq"),
              o: mhchemParser.go(buffer.o, "o"),
              q: mhchemParser.go(buffer.q, "pq"),
              d: mhchemParser.go(buffer.d, buffer.dType === "oxidation" ? "oxidation" : "bd"),
              dType: buffer.dType
            });
          }
        } else {
          var rd;
          if (buffer.rdt === "M") {
            rd = mhchemParser.go(buffer.rd, "tex-math");
          } else if (buffer.rdt === "T") {
            rd = [{ type_: "text", p1: buffer.rd || "" }];
          } else {
            rd = mhchemParser.go(buffer.rd);
          }
          var rq;
          if (buffer.rqt === "M") {
            rq = mhchemParser.go(buffer.rq, "tex-math");
          } else if (buffer.rqt === "T") {
            rq = [{ type_: "text", p1: buffer.rq || "" }];
          } else {
            rq = mhchemParser.go(buffer.rq);
          }
          ret = {
            type_: "arrow",
            r: buffer.r,
            rd,
            rq
          };
        }
        for (var p in buffer) {
          if (p !== "parenthesisLevel" && p !== "beginsWithBond") {
            delete buffer[p];
          }
        }
        return ret;
      },
      "oxidation-output": function(buffer, m) {
        var ret = ["{"];
        mhchemParser.concatArray(ret, mhchemParser.go(m, "oxidation"));
        ret.push("}");
        return ret;
      },
      "frac-output": function(buffer, m) {
        return { type_: "frac-ce", p1: mhchemParser.go(m[0]), p2: mhchemParser.go(m[1]) };
      },
      "overset-output": function(buffer, m) {
        return { type_: "overset", p1: mhchemParser.go(m[0]), p2: mhchemParser.go(m[1]) };
      },
      "underset-output": function(buffer, m) {
        return { type_: "underset", p1: mhchemParser.go(m[0]), p2: mhchemParser.go(m[1]) };
      },
      "underbrace-output": function(buffer, m) {
        return { type_: "underbrace", p1: mhchemParser.go(m[0]), p2: mhchemParser.go(m[1]) };
      },
      "color-output": function(buffer, m) {
        return { type_: "color", color1: m[0], color2: mhchemParser.go(m[1]) };
      },
      "r=": function(buffer, m) {
        buffer.r = m;
      },
      "rdt=": function(buffer, m) {
        buffer.rdt = m;
      },
      "rd=": function(buffer, m) {
        buffer.rd = m;
      },
      "rqt=": function(buffer, m) {
        buffer.rqt = m;
      },
      "rq=": function(buffer, m) {
        buffer.rq = m;
      },
      "operator": function(buffer, m, p1) {
        return { type_: "operator", kind_: p1 || m };
      }
    }
  },
  "a": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": {}
      },
      "1/2$": {
        "0": { action_: "1/2" }
      },
      "else": {
        "0": { nextState: "1", revisit: true }
      },
      "$(...)$": {
        "*": { action_: "tex-math tight", nextState: "1" }
      },
      ",": {
        "*": { action_: { type_: "insert", option: "commaDecimal" } }
      },
      "else2": {
        "*": { action_: "copy" }
      }
    }),
    actions: {}
  },
  "o": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": {}
      },
      "1/2$": {
        "0": { action_: "1/2" }
      },
      "else": {
        "0": { nextState: "1", revisit: true }
      },
      "letters": {
        "*": { action_: "rm" }
      },
      "\\ca": {
        "*": { action_: { type_: "insert", option: "circa" } }
      },
      "\\x{}{}|\\x{}|\\x": {
        "*": { action_: "copy" }
      },
      "${(...)}$|$(...)$": {
        "*": { action_: "tex-math" }
      },
      "{(...)}": {
        "*": { action_: "{text}" }
      },
      "else2": {
        "*": { action_: "copy" }
      }
    }),
    actions: {}
  },
  "text": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": { action_: "output" }
      },
      "{...}": {
        "*": { action_: "text=" }
      },
      "${(...)}$|$(...)$": {
        "*": { action_: "tex-math" }
      },
      "\\greek": {
        "*": { action_: ["output", "rm"] }
      },
      "\\,|\\x{}{}|\\x{}|\\x": {
        "*": { action_: ["output", "copy"] }
      },
      "else": {
        "*": { action_: "text=" }
      }
    }),
    actions: {
      "output": function(buffer) {
        if (buffer.text_) {
          var ret = { type_: "text", p1: buffer.text_ };
          for (var p in buffer) {
            delete buffer[p];
          }
          return ret;
        }
      }
    }
  },
  "pq": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": {}
      },
      "state of aggregation $": {
        "*": { action_: "state of aggregation" }
      },
      "i$": {
        "0": { nextState: "!f", revisit: true }
      },
      "(KV letters),": {
        "0": { action_: "rm", nextState: "0" }
      },
      "formula$": {
        "0": { nextState: "f", revisit: true }
      },
      "1/2$": {
        "0": { action_: "1/2" }
      },
      "else": {
        "0": { nextState: "!f", revisit: true }
      },
      "${(...)}$|$(...)$": {
        "*": { action_: "tex-math" }
      },
      "{(...)}": {
        "*": { action_: "text" }
      },
      "a-z": {
        "f": { action_: "tex-math" }
      },
      "letters": {
        "*": { action_: "rm" }
      },
      "-9.,9": {
        "*": { action_: "9,9" }
      },
      ",": {
        "*": { action_: { type_: "insert+p1", option: "comma enumeration S" } }
      },
      "\\color{(...)}{(...)}1|\\color(...){(...)}2": {
        "*": { action_: "color-output" }
      },
      "\\color{(...)}0": {
        "*": { action_: "color0-output" }
      },
      "\\ce{(...)}": {
        "*": { action_: "ce" }
      },
      "\\,|\\x{}{}|\\x{}|\\x": {
        "*": { action_: "copy" }
      },
      "else2": {
        "*": { action_: "copy" }
      }
    }),
    actions: {
      "state of aggregation": function(buffer, m) {
        return { type_: "state of aggregation subscript", p1: mhchemParser.go(m, "o") };
      },
      "color-output": function(buffer, m) {
        return { type_: "color", color1: m[0], color2: mhchemParser.go(m[1], "pq") };
      }
    }
  },
  "bd": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": {}
      },
      "x$": {
        "0": { nextState: "!f", revisit: true }
      },
      "formula$": {
        "0": { nextState: "f", revisit: true }
      },
      "else": {
        "0": { nextState: "!f", revisit: true }
      },
      "-9.,9 no missing 0": {
        "*": { action_: "9,9" }
      },
      ".": {
        "*": { action_: { type_: "insert", option: "electron dot" } }
      },
      "a-z": {
        "f": { action_: "tex-math" }
      },
      "x": {
        "*": { action_: { type_: "insert", option: "KV x" } }
      },
      "letters": {
        "*": { action_: "rm" }
      },
      "'": {
        "*": { action_: { type_: "insert", option: "prime" } }
      },
      "${(...)}$|$(...)$": {
        "*": { action_: "tex-math" }
      },
      "{(...)}": {
        "*": { action_: "text" }
      },
      "\\color{(...)}{(...)}1|\\color(...){(...)}2": {
        "*": { action_: "color-output" }
      },
      "\\color{(...)}0": {
        "*": { action_: "color0-output" }
      },
      "\\ce{(...)}": {
        "*": { action_: "ce" }
      },
      "\\,|\\x{}{}|\\x{}|\\x": {
        "*": { action_: "copy" }
      },
      "else2": {
        "*": { action_: "copy" }
      }
    }),
    actions: {
      "color-output": function(buffer, m) {
        return { type_: "color", color1: m[0], color2: mhchemParser.go(m[1], "bd") };
      }
    }
  },
  "oxidation": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": {}
      },
      "roman numeral": {
        "*": { action_: "roman-numeral" }
      },
      "${(...)}$|$(...)$": {
        "*": { action_: "tex-math" }
      },
      "else": {
        "*": { action_: "copy" }
      }
    }),
    actions: {
      "roman-numeral": function(buffer, m) {
        return { type_: "roman numeral", p1: m || "" };
      }
    }
  },
  "tex-math": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": { action_: "output" }
      },
      "\\ce{(...)}": {
        "*": { action_: ["output", "ce"] }
      },
      "{...}|\\,|\\x{}{}|\\x{}|\\x": {
        "*": { action_: "o=" }
      },
      "else": {
        "*": { action_: "o=" }
      }
    }),
    actions: {
      "output": function(buffer) {
        if (buffer.o) {
          var ret = { type_: "tex-math", p1: buffer.o };
          for (var p in buffer) {
            delete buffer[p];
          }
          return ret;
        }
      }
    }
  },
  "tex-math tight": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": { action_: "output" }
      },
      "\\ce{(...)}": {
        "*": { action_: ["output", "ce"] }
      },
      "{...}|\\,|\\x{}{}|\\x{}|\\x": {
        "*": { action_: "o=" }
      },
      "-|+": {
        "*": { action_: "tight operator" }
      },
      "else": {
        "*": { action_: "o=" }
      }
    }),
    actions: {
      "tight operator": function(buffer, m) {
        buffer.o = (buffer.o || "") + "{" + m + "}";
      },
      "output": function(buffer) {
        if (buffer.o) {
          var ret = { type_: "tex-math", p1: buffer.o };
          for (var p in buffer) {
            delete buffer[p];
          }
          return ret;
        }
      }
    }
  },
  "9,9": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": {}
      },
      ",": {
        "*": { action_: "comma" }
      },
      "else": {
        "*": { action_: "copy" }
      }
    }),
    actions: {
      "comma": function() {
        return { type_: "commaDecimal" };
      }
    }
  },
  //#endregion
  //
  // \pu state machines
  //
  //#region pu
  "pu": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": { action_: "output" }
      },
      "space$": {
        "*": { action_: ["output", "space"] }
      },
      "{[(|)]}": {
        "0|a": { action_: "copy" }
      },
      "(-)(9)^(-9)": {
        "0": { action_: "number^", nextState: "a" }
      },
      "(-)(9.,9)(e)(99)": {
        "0": { action_: "enumber", nextState: "a" }
      },
      "space": {
        "0|a": {}
      },
      "pm-operator": {
        "0|a": { action_: { type_: "operator", option: "\\pm" }, nextState: "0" }
      },
      "operator": {
        "0|a": { action_: "copy", nextState: "0" }
      },
      "//": {
        "d": { action_: "o=", nextState: "/" }
      },
      "/": {
        "d": { action_: "o=", nextState: "/" }
      },
      "{...}|else": {
        "0|d": { action_: "d=", nextState: "d" },
        "a": { action_: ["space", "d="], nextState: "d" },
        "/|q": { action_: "q=", nextState: "q" }
      }
    }),
    actions: {
      "enumber": function(buffer, m) {
        var ret = [];
        if (m[0] === "+-" || m[0] === "+/-") {
          ret.push("\\pm ");
        } else if (m[0]) {
          ret.push(m[0]);
        }
        if (m[1]) {
          mhchemParser.concatArray(ret, mhchemParser.go(m[1], "pu-9,9"));
          if (m[2]) {
            if (m[2].match(/[,.]/)) {
              mhchemParser.concatArray(ret, mhchemParser.go(m[2], "pu-9,9"));
            } else {
              ret.push(m[2]);
            }
          }
          m[3] = m[4] || m[3];
          if (m[3]) {
            m[3] = m[3].trim();
            if (m[3] === "e" || m[3].substr(0, 1) === "*") {
              ret.push({ type_: "cdot" });
            } else {
              ret.push({ type_: "times" });
            }
          }
        }
        if (m[3]) {
          ret.push("10^{" + m[5] + "}");
        }
        return ret;
      },
      "number^": function(buffer, m) {
        var ret = [];
        if (m[0] === "+-" || m[0] === "+/-") {
          ret.push("\\pm ");
        } else if (m[0]) {
          ret.push(m[0]);
        }
        mhchemParser.concatArray(ret, mhchemParser.go(m[1], "pu-9,9"));
        ret.push("^{" + m[2] + "}");
        return ret;
      },
      "operator": function(buffer, m, p1) {
        return { type_: "operator", kind_: p1 || m };
      },
      "space": function() {
        return { type_: "pu-space-1" };
      },
      "output": function(buffer) {
        var ret;
        var md = mhchemParser.patterns.match_("{(...)}", buffer.d || "");
        if (md && md.remainder === "") {
          buffer.d = md.match_;
        }
        var mq = mhchemParser.patterns.match_("{(...)}", buffer.q || "");
        if (mq && mq.remainder === "") {
          buffer.q = mq.match_;
        }
        if (buffer.d) {
          buffer.d = buffer.d.replace(/\u00B0C|\^oC|\^{o}C/g, "{}^{\\circ}C");
          buffer.d = buffer.d.replace(/\u00B0F|\^oF|\^{o}F/g, "{}^{\\circ}F");
        }
        if (buffer.q) {
          buffer.q = buffer.q.replace(/\u00B0C|\^oC|\^{o}C/g, "{}^{\\circ}C");
          buffer.q = buffer.q.replace(/\u00B0F|\^oF|\^{o}F/g, "{}^{\\circ}F");
          var b5 = {
            d: mhchemParser.go(buffer.d, "pu"),
            q: mhchemParser.go(buffer.q, "pu")
          };
          if (buffer.o === "//") {
            ret = { type_: "pu-frac", p1: b5.d, p2: b5.q };
          } else {
            ret = b5.d;
            if (b5.d.length > 1 || b5.q.length > 1) {
              ret.push({ type_: " / " });
            } else {
              ret.push({ type_: "/" });
            }
            mhchemParser.concatArray(ret, b5.q);
          }
        } else {
          ret = mhchemParser.go(buffer.d, "pu-2");
        }
        for (var p in buffer) {
          delete buffer[p];
        }
        return ret;
      }
    }
  },
  "pu-2": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "*": { action_: "output" }
      },
      "*": {
        "*": { action_: ["output", "cdot"], nextState: "0" }
      },
      "\\x": {
        "*": { action_: "rm=" }
      },
      "space": {
        "*": { action_: ["output", "space"], nextState: "0" }
      },
      "^{(...)}|^(-1)": {
        "1": { action_: "^(-1)" }
      },
      "-9.,9": {
        "0": { action_: "rm=", nextState: "0" },
        "1": { action_: "^(-1)", nextState: "0" }
      },
      "{...}|else": {
        "*": { action_: "rm=", nextState: "1" }
      }
    }),
    actions: {
      "cdot": function() {
        return { type_: "tight cdot" };
      },
      "^(-1)": function(buffer, m) {
        buffer.rm += "^{" + m + "}";
      },
      "space": function() {
        return { type_: "pu-space-2" };
      },
      "output": function(buffer) {
        var ret = [];
        if (buffer.rm) {
          var mrm = mhchemParser.patterns.match_("{(...)}", buffer.rm || "");
          if (mrm && mrm.remainder === "") {
            ret = mhchemParser.go(mrm.match_, "pu");
          } else {
            ret = { type_: "rm", p1: buffer.rm };
          }
        }
        for (var p in buffer) {
          delete buffer[p];
        }
        return ret;
      }
    }
  },
  "pu-9,9": {
    transitions: mhchemParser.createTransitions({
      "empty": {
        "0": { action_: "output-0" },
        "o": { action_: "output-o" }
      },
      ",": {
        "0": { action_: ["output-0", "comma"], nextState: "o" }
      },
      ".": {
        "0": { action_: ["output-0", "copy"], nextState: "o" }
      },
      "else": {
        "*": { action_: "text=" }
      }
    }),
    actions: {
      "comma": function() {
        return { type_: "commaDecimal" };
      },
      "output-0": function(buffer) {
        var ret = [];
        buffer.text_ = buffer.text_ || "";
        if (buffer.text_.length > 4) {
          var a = buffer.text_.length % 3;
          if (a === 0) {
            a = 3;
          }
          for (var i = buffer.text_.length - 3; i > 0; i -= 3) {
            ret.push(buffer.text_.substr(i, 3));
            ret.push({ type_: "1000 separator" });
          }
          ret.push(buffer.text_.substr(0, a));
          ret.reverse();
        } else {
          ret.push(buffer.text_);
        }
        for (var p in buffer) {
          delete buffer[p];
        }
        return ret;
      },
      "output-o": function(buffer) {
        var ret = [];
        buffer.text_ = buffer.text_ || "";
        if (buffer.text_.length > 4) {
          var a = buffer.text_.length - 3;
          for (var i = 0; i < a; i += 3) {
            ret.push(buffer.text_.substr(i, 3));
            ret.push({ type_: "1000 separator" });
          }
          ret.push(buffer.text_.substr(i));
        } else {
          ret.push(buffer.text_);
        }
        for (var p in buffer) {
          delete buffer[p];
        }
        return ret;
      }
    }
  }
  //#endregion
};
var texify = {
  go: function(input, isInner) {
    if (!input) {
      return "";
    }
    var res = "";
    var cee = false;
    for (var i = 0; i < input.length; i++) {
      var inputi = input[i];
      if (typeof inputi === "string") {
        res += inputi;
      } else {
        res += texify._go2(inputi);
        if (inputi.type_ === "1st-level escape") {
          cee = true;
        }
      }
    }
    if (!isInner && !cee && res) {
      res = "{" + res + "}";
    }
    return res;
  },
  _goInner: function(input) {
    if (!input) {
      return input;
    }
    return texify.go(input, true);
  },
  _go2: function(buf) {
    var res;
    switch (buf.type_) {
      case "chemfive":
        res = "";
        var b5 = {
          a: texify._goInner(buf.a),
          b: texify._goInner(buf.b),
          p: texify._goInner(buf.p),
          o: texify._goInner(buf.o),
          q: texify._goInner(buf.q),
          d: texify._goInner(buf.d)
        };
        if (b5.a) {
          if (b5.a.match(/^[+\-]/)) {
            b5.a = "{" + b5.a + "}";
          }
          res += b5.a + "\\,";
        }
        if (b5.b || b5.p) {
          res += "{\\vphantom{X}}";
          res += "^{\\hphantom{" + (b5.b || "") + "}}_{\\hphantom{" + (b5.p || "") + "}}";
          res += "{\\vphantom{X}}";
          res += "^{\\vphantom{2}\\mathllap{" + (b5.b || "") + "}}";
          res += "_{\\vphantom{2}\\mathllap{" + (b5.p || "") + "}}";
        }
        if (b5.o) {
          if (b5.o.match(/^[+\-]/)) {
            b5.o = "{" + b5.o + "}";
          }
          res += b5.o;
        }
        if (buf.dType === "kv") {
          if (b5.d || b5.q) {
            res += "{\\vphantom{X}}";
          }
          if (b5.d) {
            res += "^{" + b5.d + "}";
          }
          if (b5.q) {
            res += "_{" + b5.q + "}";
          }
        } else if (buf.dType === "oxidation") {
          if (b5.d) {
            res += "{\\vphantom{X}}";
            res += "^{" + b5.d + "}";
          }
          if (b5.q) {
            res += "{{}}";
            res += "_{" + b5.q + "}";
          }
        } else {
          if (b5.q) {
            res += "{{}}";
            res += "_{" + b5.q + "}";
          }
          if (b5.d) {
            res += "{{}}";
            res += "^{" + b5.d + "}";
          }
        }
        break;
      case "rm":
        res = "\\mathrm{" + buf.p1 + "}";
        break;
      case "text":
        if (buf.p1.match(/[\^_]/)) {
          buf.p1 = buf.p1.replace(" ", "~").replace("-", "\\text{-}");
          res = "\\mathrm{" + buf.p1 + "}";
        } else {
          res = "\\text{" + buf.p1 + "}";
        }
        break;
      case "roman numeral":
        res = "\\mathrm{" + buf.p1 + "}";
        break;
      case "state of aggregation":
        res = "\\mskip2mu " + texify._goInner(buf.p1);
        break;
      case "state of aggregation subscript":
        res = "\\mskip1mu " + texify._goInner(buf.p1);
        break;
      case "bond":
        res = texify._getBond(buf.kind_);
        if (!res) {
          throw ["MhchemErrorBond", "mhchem Error. Unknown bond type (" + buf.kind_ + ")"];
        }
        break;
      case "frac":
        var c = "\\frac{" + buf.p1 + "}{" + buf.p2 + "}";
        res = "\\mathchoice{\\textstyle" + c + "}{" + c + "}{" + c + "}{" + c + "}";
        break;
      case "pu-frac":
        var d = "\\frac{" + texify._goInner(buf.p1) + "}{" + texify._goInner(buf.p2) + "}";
        res = "\\mathchoice{\\textstyle" + d + "}{" + d + "}{" + d + "}{" + d + "}";
        break;
      case "tex-math":
        res = buf.p1 + " ";
        break;
      case "frac-ce":
        res = "\\frac{" + texify._goInner(buf.p1) + "}{" + texify._goInner(buf.p2) + "}";
        break;
      case "overset":
        res = "\\overset{" + texify._goInner(buf.p1) + "}{" + texify._goInner(buf.p2) + "}";
        break;
      case "underset":
        res = "\\underset{" + texify._goInner(buf.p1) + "}{" + texify._goInner(buf.p2) + "}";
        break;
      case "underbrace":
        res = "\\underbrace{" + texify._goInner(buf.p1) + "}_{" + texify._goInner(buf.p2) + "}";
        break;
      case "color":
        res = "{\\color{" + buf.color1 + "}{" + texify._goInner(buf.color2) + "}}";
        break;
      case "color0":
        res = "\\color{" + buf.color + "}";
        break;
      case "arrow":
        var b6 = {
          rd: texify._goInner(buf.rd),
          rq: texify._goInner(buf.rq)
        };
        var arrow = texify._getArrow(buf.r);
        if (b6.rq) {
          arrow += "[{\\rm " + b6.rq + "}]";
        }
        if (b6.rd) {
          arrow += "{\\rm " + b6.rd + "}";
        } else {
          arrow += "{}";
        }
        res = arrow;
        break;
      case "operator":
        res = texify._getOperator(buf.kind_);
        break;
      case "1st-level escape":
        res = buf.p1 + " ";
        break;
      case "space":
        res = " ";
        break;
      case "entitySkip":
        res = "~";
        break;
      case "pu-space-1":
        res = "~";
        break;
      case "pu-space-2":
        res = "\\mkern3mu ";
        break;
      case "1000 separator":
        res = "\\mkern2mu ";
        break;
      case "commaDecimal":
        res = "{,}";
        break;
      case "comma enumeration L":
        res = "{" + buf.p1 + "}\\mkern6mu ";
        break;
      case "comma enumeration M":
        res = "{" + buf.p1 + "}\\mkern3mu ";
        break;
      case "comma enumeration S":
        res = "{" + buf.p1 + "}\\mkern1mu ";
        break;
      case "hyphen":
        res = "\\text{-}";
        break;
      case "addition compound":
        res = "\\,{\\cdot}\\,";
        break;
      case "electron dot":
        res = "\\mkern1mu \\text{\\textbullet}\\mkern1mu ";
        break;
      case "KV x":
        res = "{\\times}";
        break;
      case "prime":
        res = "\\prime ";
        break;
      case "cdot":
        res = "\\cdot ";
        break;
      case "tight cdot":
        res = "\\mkern1mu{\\cdot}\\mkern1mu ";
        break;
      case "times":
        res = "\\times ";
        break;
      case "circa":
        res = "{\\sim}";
        break;
      case "^":
        res = "uparrow";
        break;
      case "v":
        res = "downarrow";
        break;
      case "ellipsis":
        res = "\\ldots ";
        break;
      case "/":
        res = "/";
        break;
      case " / ":
        res = "\\,/\\,";
        break;
      default:
        assertNever2(buf);
        throw ["MhchemBugT", "mhchem bug T. Please report."];
    }
    assertString(res);
    return res;
  },
  _getArrow: function(a) {
    switch (a) {
      case "->":
        return "\\yields";
      case "\u2192":
        return "\\yields";
      case "\u27F6":
        return "\\yields";
      case "<-":
        return "\\yieldsLeft";
      case "<->":
        return "\\mesomerism";
      case "<-->":
        return "\\yieldsLeftRight";
      case "<=>":
        return "\\chemequilibrium";
      case "\u21CC":
        return "\\chemequilibrium";
      case "<=>>":
        return "\\equilibriumRight";
      case "<<=>":
        return "\\equilibriumLeft";
      default:
        assertNever2(a);
        throw ["MhchemBugT", "mhchem bug T. Please report."];
    }
  },
  _getBond: function(a) {
    switch (a) {
      case "-":
        return "{-}";
      case "1":
        return "{-}";
      case "=":
        return "{=}";
      case "2":
        return "{=}";
      case "#":
        return "{\\equiv}";
      case "3":
        return "{\\equiv}";
      case "~":
        return "{\\tripleDash}";
      case "~-":
        return "{\\tripleDashOverLine}";
      case "~=":
        return "{\\tripleDashOverDoubleLine}";
      case "~--":
        return "{\\tripleDashOverDoubleLine}";
      case "-~-":
        return "{\\tripleDashBetweenDoubleLine}";
      case "...":
        return "{{\\cdot}{\\cdot}{\\cdot}}";
      case "....":
        return "{{\\cdot}{\\cdot}{\\cdot}{\\cdot}}";
      case "->":
        return "{\\rightarrow}";
      case "<-":
        return "{\\leftarrow}";
      case "<":
        return "{<}";
      case ">":
        return "{>}";
      default:
        assertNever2(a);
        throw ["MhchemBugT", "mhchem bug T. Please report."];
    }
  },
  _getOperator: function(a) {
    switch (a) {
      case "+":
        return " {}+{} ";
      case "-":
        return " {}-{} ";
      case "=":
        return " {}={} ";
      case "<":
        return " {}<{} ";
      case ">":
        return " {}>{} ";
      case "<<":
        return " {}\\ll{} ";
      case ">>":
        return " {}\\gg{} ";
      case "\\pm":
        return " {}\\pm{} ";
      case "\\approx":
        return " {}\\approx{} ";
      case "$\\approx$":
        return " {}\\approx{} ";
      case "v":
        return " \\downarrow{} ";
      case "(v)":
        return " \\downarrow{} ";
      case "^":
        return " \\uparrow{} ";
      case "(^)":
        return " \\uparrow{} ";
      default:
        assertNever2(a);
        throw ["MhchemBugT", "mhchem bug T. Please report."];
    }
  }
};
function assertNever2(a) {
}
function assertString(a) {
}
defineMacro("\\darr", "\\downarrow");
defineMacro("\\dArr", "\\Downarrow");
defineMacro("\\Darr", "\\Downarrow");
defineMacro("\\lang", "\\langle");
defineMacro("\\rang", "\\rangle");
defineMacro("\\uarr", "\\uparrow");
defineMacro("\\uArr", "\\Uparrow");
defineMacro("\\Uarr", "\\Uparrow");
defineMacro("\\N", "\\mathbb{N}");
defineMacro("\\R", "\\mathbb{R}");
defineMacro("\\Z", "\\mathbb{Z}");
defineMacro("\\alef", "\\aleph");
defineMacro("\\alefsym", "\\aleph");
defineMacro("\\bull", "\\bullet");
defineMacro("\\clubs", "\\clubsuit");
defineMacro("\\cnums", "\\mathbb{C}");
defineMacro("\\Complex", "\\mathbb{C}");
defineMacro("\\Dagger", "\\ddagger");
defineMacro("\\diamonds", "\\diamondsuit");
defineMacro("\\empty", "\\emptyset");
defineMacro("\\exist", "\\exists");
defineMacro("\\harr", "\\leftrightarrow");
defineMacro("\\hArr", "\\Leftrightarrow");
defineMacro("\\Harr", "\\Leftrightarrow");
defineMacro("\\hearts", "\\heartsuit");
defineMacro("\\image", "\\Im");
defineMacro("\\infin", "\\infty");
defineMacro("\\isin", "\\in");
defineMacro("\\larr", "\\leftarrow");
defineMacro("\\lArr", "\\Leftarrow");
defineMacro("\\Larr", "\\Leftarrow");
defineMacro("\\lrarr", "\\leftrightarrow");
defineMacro("\\lrArr", "\\Leftrightarrow");
defineMacro("\\Lrarr", "\\Leftrightarrow");
defineMacro("\\natnums", "\\mathbb{N}");
defineMacro("\\plusmn", "\\pm");
defineMacro("\\rarr", "\\rightarrow");
defineMacro("\\rArr", "\\Rightarrow");
defineMacro("\\Rarr", "\\Rightarrow");
defineMacro("\\real", "\\Re");
defineMacro("\\reals", "\\mathbb{R}");
defineMacro("\\Reals", "\\mathbb{R}");
defineMacro("\\sdot", "\\cdot");
defineMacro("\\sect", "\\S");
defineMacro("\\spades", "\\spadesuit");
defineMacro("\\sub", "\\subset");
defineMacro("\\sube", "\\subseteq");
defineMacro("\\supe", "\\supseteq");
defineMacro("\\thetasym", "\\vartheta");
defineMacro("\\weierp", "\\wp");
defineMacro("\\quantity", "{\\left\\{ #1 \\right\\}}");
defineMacro("\\qty", "{\\left\\{ #1 \\right\\}}");
defineMacro("\\pqty", "{\\left( #1 \\right)}");
defineMacro("\\bqty", "{\\left[ #1 \\right]}");
defineMacro("\\vqty", "{\\left\\vert #1 \\right\\vert}");
defineMacro("\\Bqty", "{\\left\\{ #1 \\right\\}}");
defineMacro("\\absolutevalue", "{\\left\\vert #1 \\right\\vert}");
defineMacro("\\abs", "{\\left\\vert #1 \\right\\vert}");
defineMacro("\\norm", "{\\left\\Vert #1 \\right\\Vert}");
defineMacro("\\evaluated", "{\\left.#1 \\right\\vert}");
defineMacro("\\eval", "{\\left.#1 \\right\\vert}");
defineMacro("\\order", "{\\mathcal{O} \\left( #1 \\right)}");
defineMacro("\\commutator", "{\\left[ #1 , #2 \\right]}");
defineMacro("\\comm", "{\\left[ #1 , #2 \\right]}");
defineMacro("\\anticommutator", "{\\left\\{ #1 , #2 \\right\\}}");
defineMacro("\\acomm", "{\\left\\{ #1 , #2 \\right\\}}");
defineMacro("\\poissonbracket", "{\\left\\{ #1 , #2 \\right\\}}");
defineMacro("\\pb", "{\\left\\{ #1 , #2 \\right\\}}");
defineMacro("\\vectorbold", "{\\boldsymbol{ #1 }}");
defineMacro("\\vb", "{\\boldsymbol{ #1 }}");
defineMacro("\\vectorarrow", "{\\vec{\\boldsymbol{ #1 }}}");
defineMacro("\\va", "{\\vec{\\boldsymbol{ #1 }}}");
defineMacro("\\vectorunit", "{{\\boldsymbol{\\hat{ #1 }}}}");
defineMacro("\\vu", "{{\\boldsymbol{\\hat{ #1 }}}}");
defineMacro("\\dotproduct", "\\mathbin{\\boldsymbol\\cdot}");
defineMacro("\\vdot", "{\\boldsymbol\\cdot}");
defineMacro("\\crossproduct", "\\mathbin{\\boldsymbol\\times}");
defineMacro("\\cross", "\\mathbin{\\boldsymbol\\times}");
defineMacro("\\cp", "\\mathbin{\\boldsymbol\\times}");
defineMacro("\\gradient", "{\\boldsymbol\\nabla}");
defineMacro("\\grad", "{\\boldsymbol\\nabla}");
defineMacro("\\divergence", "{\\grad\\vdot}");
defineMacro("\\curl", "{\\grad\\cross}");
defineMacro("\\laplacian", "\\nabla^2");
defineMacro("\\tr", "{\\operatorname{tr}}");
defineMacro("\\Tr", "{\\operatorname{Tr}}");
defineMacro("\\rank", "{\\operatorname{rank}}");
defineMacro("\\erf", "{\\operatorname{erf}}");
defineMacro("\\Res", "{\\operatorname{Res}}");
defineMacro("\\principalvalue", "{\\mathcal{P}}");
defineMacro("\\pv", "{\\mathcal{P}}");
defineMacro("\\PV", "{\\operatorname{P.V.}}");
defineMacro("\\qqtext", "{\\quad\\text{ #1 }\\quad}");
defineMacro("\\qq", "{\\quad\\text{ #1 }\\quad}");
defineMacro("\\qcomma", "{\\text{,}\\quad}");
defineMacro("\\qc", "{\\text{,}\\quad}");
defineMacro("\\qcc", "{\\quad\\text{c.c.}\\quad}");
defineMacro("\\qif", "{\\quad\\text{if}\\quad}");
defineMacro("\\qthen", "{\\quad\\text{then}\\quad}");
defineMacro("\\qelse", "{\\quad\\text{else}\\quad}");
defineMacro("\\qotherwise", "{\\quad\\text{otherwise}\\quad}");
defineMacro("\\qunless", "{\\quad\\text{unless}\\quad}");
defineMacro("\\qgiven", "{\\quad\\text{given}\\quad}");
defineMacro("\\qusing", "{\\quad\\text{using}\\quad}");
defineMacro("\\qassume", "{\\quad\\text{assume}\\quad}");
defineMacro("\\qsince", "{\\quad\\text{since}\\quad}");
defineMacro("\\qlet", "{\\quad\\text{let}\\quad}");
defineMacro("\\qfor", "{\\quad\\text{for}\\quad}");
defineMacro("\\qall", "{\\quad\\text{all}\\quad}");
defineMacro("\\qeven", "{\\quad\\text{even}\\quad}");
defineMacro("\\qodd", "{\\quad\\text{odd}\\quad}");
defineMacro("\\qinteger", "{\\quad\\text{integer}\\quad}");
defineMacro("\\qand", "{\\quad\\text{and}\\quad}");
defineMacro("\\qor", "{\\quad\\text{or}\\quad}");
defineMacro("\\qas", "{\\quad\\text{as}\\quad}");
defineMacro("\\qin", "{\\quad\\text{in}\\quad}");
defineMacro("\\differential", "{\\text{d}}");
defineMacro("\\dd", "{\\text{d}}");
defineMacro("\\derivative", "{\\frac{\\text{d}{ #1 }}{\\text{d}{ #2 }}}");
defineMacro("\\dv", "{\\frac{\\text{d}{ #1 }}{\\text{d}{ #2 }}}");
defineMacro("\\partialderivative", "{\\frac{\\partial{ #1 }}{\\partial{ #2 }}}");
defineMacro("\\variation", "{\\delta}");
defineMacro("\\var", "{\\delta}");
defineMacro("\\functionalderivative", "{\\frac{\\delta{ #1 }}{\\delta{ #2 }}}");
defineMacro("\\fdv", "{\\frac{\\delta{ #1 }}{\\delta{ #2 }}}");
defineMacro("\\innerproduct", "{\\left\\langle {#1} \\mid { #2} \\right\\rangle}");
defineMacro(
  "\\outerproduct",
  "{\\left\\vert { #1 } \\right\\rangle\\left\\langle { #2} \\right\\vert}"
);
defineMacro(
  "\\dyad",
  "{\\left\\vert { #1 } \\right\\rangle\\left\\langle { #2} \\right\\vert}"
);
defineMacro(
  "\\ketbra",
  "{\\left\\vert { #1 } \\right\\rangle\\left\\langle { #2} \\right\\vert}"
);
defineMacro(
  "\\op",
  "{\\left\\vert { #1 } \\right\\rangle\\left\\langle { #2} \\right\\vert}"
);
defineMacro("\\expectationvalue", "{\\left\\langle {#1 } \\right\\rangle}");
defineMacro("\\expval", "{\\left\\langle {#1 } \\right\\rangle}");
defineMacro("\\ev", "{\\left\\langle {#1 } \\right\\rangle}");
defineMacro(
  "\\matrixelement",
  "{\\left\\langle{ #1 }\\right\\vert{ #2 }\\left\\vert{#3}\\right\\rangle}"
);
defineMacro(
  "\\matrixel",
  "{\\left\\langle{ #1 }\\right\\vert{ #2 }\\left\\vert{#3}\\right\\rangle}"
);
defineMacro(
  "\\mel",
  "{\\left\\langle{ #1 }\\right\\vert{ #2 }\\left\\vert{#3}\\right\\rangle}"
);
function getHLines(parser) {
  const hlineInfo = [];
  parser.consumeSpaces();
  let nxt = parser.fetch().text;
  if (nxt === "\\relax") {
    parser.consume();
    parser.consumeSpaces();
    nxt = parser.fetch().text;
  }
  while (nxt === "\\hline" || nxt === "\\hdashline") {
    parser.consume();
    hlineInfo.push(nxt === "\\hdashline");
    parser.consumeSpaces();
    nxt = parser.fetch().text;
  }
  return hlineInfo;
}
var validateAmsEnvironmentContext = (context) => {
  const settings = context.parser.settings;
  if (!settings.displayMode) {
    throw new ParseError(`{${context.envName}} can be used only in display mode.`);
  }
};
var sizeRegEx$1 = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/;
var arrayGaps = (macros2) => {
  let arraystretch = macros2.get("\\arraystretch");
  if (typeof arraystretch !== "string") {
    arraystretch = stringFromArg(arraystretch.tokens);
  }
  arraystretch = isNaN(arraystretch) ? null : Number(arraystretch);
  let arraycolsepStr = macros2.get("\\arraycolsep");
  if (typeof arraycolsepStr !== "string") {
    arraycolsepStr = stringFromArg(arraycolsepStr.tokens);
  }
  const match = sizeRegEx$1.exec(arraycolsepStr);
  const arraycolsep = match ? { number: +(match[1] + match[2]), unit: match[3] } : null;
  return [arraystretch, arraycolsep];
};
var checkCellForLabels = (cell2) => {
  let rowLabel = "";
  for (let i = 0; i < cell2.length; i++) {
    if (cell2[i].type === "label") {
      if (rowLabel) {
        throw new ParseError("Multiple \\labels in one row");
      }
      rowLabel = cell2[i].string;
    }
  }
  return rowLabel;
};
function getAutoTag(name2) {
  if (name2.indexOf("ed") === -1) {
    return name2.indexOf("*") === -1;
  }
}
function parseArray(parser, {
  cols,
  // [{ type: string , align: l|c|r|null }]
  envClasses,
  // align(ed|at|edat) | array | cases | cd | small | multline
  autoTag,
  // boolean
  singleRow,
  // boolean
  emptySingleRow,
  // boolean
  maxNumCols,
  // number
  leqno,
  // boolean
  arraystretch,
  // number  | null
  arraycolsep
  // size value | null
}, scriptLevel2) {
  const endToken = envClasses && envClasses.includes("bordermatrix") ? "}" : "\\end";
  parser.gullet.beginGroup();
  if (!singleRow) {
    parser.gullet.macros.set("\\cr", "\\\\\\relax");
  }
  parser.gullet.beginGroup();
  let row = [];
  const body = [row];
  const rowGaps = [];
  const labels = [];
  const hLinesBeforeRow = [];
  const tags = autoTag != null ? [] : void 0;
  function beginRow() {
    if (autoTag) {
      parser.gullet.macros.set("\\@eqnsw", "1", true);
    }
  }
  function endRow() {
    if (tags) {
      if (parser.gullet.macros.get("\\df@tag")) {
        tags.push(parser.subparse([new Token("\\df@tag")]));
        parser.gullet.macros.set("\\df@tag", void 0, true);
      } else {
        tags.push(Boolean(autoTag) && parser.gullet.macros.get("\\@eqnsw") === "1");
      }
    }
  }
  beginRow();
  hLinesBeforeRow.push(getHLines(parser));
  while (true) {
    let cell2 = parser.parseExpression(false, singleRow ? "\\end" : "\\\\");
    parser.gullet.endGroup();
    parser.gullet.beginGroup();
    cell2 = {
      type: "ordgroup",
      mode: parser.mode,
      body: cell2,
      semisimple: true
    };
    row.push(cell2);
    const next = parser.fetch().text;
    if (next === "&") {
      if (maxNumCols && row.length === maxNumCols) {
        if (envClasses.includes("array")) {
          if (parser.settings.strict) {
            throw new ParseError(
              "Too few columns specified in the {array} column argument.",
              parser.nextToken
            );
          }
        } else if (maxNumCols === 2) {
          throw new ParseError(
            "The split environment accepts no more than two columns",
            parser.nextToken
          );
        } else {
          throw new ParseError(
            "The equation environment accepts only one column",
            parser.nextToken
          );
        }
      }
      parser.consume();
    } else if (next === endToken) {
      endRow();
      if (row.length === 1 && cell2.body.length === 0 && (body.length > 1 || !emptySingleRow)) {
        body.pop();
      }
      labels.push(checkCellForLabels(cell2.body));
      if (hLinesBeforeRow.length < body.length + 1) {
        hLinesBeforeRow.push([]);
      }
      break;
    } else if (next === "\\\\") {
      parser.consume();
      let size;
      if (parser.gullet.future().text !== " ") {
        size = parser.parseSizeGroup(true);
      }
      rowGaps.push(size ? size.value : null);
      endRow();
      labels.push(checkCellForLabels(cell2.body));
      hLinesBeforeRow.push(getHLines(parser));
      row = [];
      body.push(row);
      beginRow();
    } else {
      throw new ParseError("Expected & or \\\\ or \\cr or " + endToken, parser.nextToken);
    }
  }
  parser.gullet.endGroup();
  parser.gullet.endGroup();
  return {
    type: "array",
    mode: parser.mode,
    body,
    cols,
    rowGaps,
    hLinesBeforeRow,
    envClasses,
    autoTag,
    scriptLevel: scriptLevel2,
    tags,
    labels,
    leqno,
    arraystretch,
    arraycolsep
  };
}
function dCellStyle(envName) {
  return envName.slice(0, 1) === "d" ? "display" : "text";
}
var alignMap = {
  c: "center ",
  l: "left ",
  r: "right "
};
var glue = (group) => {
  const glueNode = new MathNode("mtd", []);
  glueNode.style = { padding: "0", width: "50%" };
  if (group.envClasses.includes("multline")) {
    glueNode.style.width = "7.5%";
  }
  return glueNode;
};
var mathmlBuilder$9 = function(group, style) {
  const tbl = [];
  const numRows = group.body.length;
  const hlines = group.hLinesBeforeRow;
  const tagIsPresent = group.tags && group.tags.some((tag) => tag);
  for (let i = 0; i < numRows; i++) {
    const rw = group.body[i];
    const row = [];
    const cellLevel = group.scriptLevel === "text" ? StyleLevel.TEXT : group.scriptLevel === "script" ? StyleLevel.SCRIPT : StyleLevel.DISPLAY;
    for (let j = 0; j < rw.length; j++) {
      const mtd = new MathNode(
        "mtd",
        [buildGroup$1(rw[j], style.withLevel(cellLevel))]
      );
      if (group.envClasses.includes("multline")) {
        const align = i === 0 ? "left" : i === numRows - 1 ? "right" : "center";
        if (align !== "center") {
          mtd.classes.push("tml-" + align);
        }
      }
      row.push(mtd);
    }
    const numColumns = group.body[0].length;
    for (let k = 0; k < numColumns - rw.length; k++) {
      row.push(new MathNode("mtd", [], [], style));
    }
    if (tagIsPresent) {
      const tag = group.tags[i];
      let tagElement;
      if (tag === true) {
        tagElement = new MathNode("mtext", [new Span(["tml-eqn"])]);
      } else if (tag === false) {
        tagElement = new MathNode("mtext", [], []);
      } else {
        tagElement = buildExpressionRow(tag[0].body, style.withLevel(cellLevel), true);
        tagElement = consolidateText(tagElement);
        tagElement.classes = ["tml-tag"];
      }
      if (tagElement) {
        row.unshift(glue(group));
        row.push(glue(group));
        if (group.leqno) {
          row[0].children.push(tagElement);
        } else {
          row[row.length - 1].children.push(tagElement);
        }
      }
    }
    const mtr = new MathNode("mtr", row, []);
    const label = group.labels.shift();
    if (label && group.tags && group.tags[i]) {
      mtr.setAttribute("id", label);
      if (Array.isArray(group.tags[i])) {
        mtr.classes.push("tml-tageqn");
      }
    }
    if (i === 0 && hlines[0].length > 0) {
      if (hlines[0].length === 2) {
        mtr.children.forEach((cell2) => {
          cell2.style.borderTop = "0.15em double";
        });
      } else {
        mtr.children.forEach((cell2) => {
          cell2.style.borderTop = hlines[0][0] ? "0.06em dashed" : "0.06em solid";
        });
      }
    }
    if (hlines[i + 1].length > 0) {
      if (hlines[i + 1].length === 2) {
        mtr.children.forEach((cell2) => {
          cell2.style.borderBottom = "0.15em double";
        });
      } else {
        mtr.children.forEach((cell2) => {
          cell2.style.borderBottom = hlines[i + 1][0] ? "0.06em dashed" : "0.06em solid";
        });
      }
    }
    let mustSquashRow = true;
    for (let j = 0; j < mtr.children.length; j++) {
      const child = mtr.children[j].children[0];
      if (!(child && child.type === "mpadded" && child.attributes.height === "0px")) {
        mustSquashRow = false;
        break;
      }
    }
    if (mustSquashRow) {
      mtr.classes.push("ff-squash");
      for (let j = 0; j < mtr.children.length; j++) {
        mtr.children[j].style.paddingTop = "0";
        mtr.children[j].style.paddingBottom = "0";
      }
    }
    tbl.push(mtr);
  }
  if (group.arraystretch && group.arraystretch !== 1) {
    const pad2 = String(1.4 * group.arraystretch - 0.8) + "ex";
    for (let i = 0; i < tbl.length; i++) {
      for (let j = 0; j < tbl[i].children.length; j++) {
        tbl[i].children[j].style.paddingTop = pad2;
        tbl[i].children[j].style.paddingBottom = pad2;
      }
    }
  }
  let sidePadding;
  let sidePadUnit;
  if (group.envClasses.length > 0) {
    sidePadding = group.envClasses.includes("abut") ? "0" : group.envClasses.includes("cases") ? "0" : group.envClasses.includes("small") ? "0.1389" : group.envClasses.includes("cd") ? "0.25" : "0.4";
    sidePadUnit = "em";
  }
  if (group.arraycolsep) {
    const arraySidePad = calculateSize(group.arraycolsep, style);
    sidePadding = arraySidePad.number.toFixed(4);
    sidePadUnit = arraySidePad.unit;
  }
  if (sidePadding) {
    const numCols = tbl.length === 0 ? 0 : tbl[0].children.length;
    const sidePad = (j, hand) => {
      if (j === 0 && hand === 0) {
        return "0";
      }
      if (j === numCols - 1 && hand === 1) {
        return "0";
      }
      if (group.envClasses[0] !== "align") {
        return sidePadding;
      }
      if (hand === 1) {
        return "0";
      }
      if (tagIsPresent) {
        return j % 2 ? "1" : "0";
      } else {
        return j % 2 ? "0" : "1";
      }
    };
    for (let i = 0; i < tbl.length; i++) {
      for (let j = 0; j < tbl[i].children.length; j++) {
        tbl[i].children[j].style.paddingLeft = `${sidePad(j, 0)}${sidePadUnit}`;
        tbl[i].children[j].style.paddingRight = `${sidePad(j, 1)}${sidePadUnit}`;
      }
    }
  }
  if (group.envClasses.length === 0) {
    for (let i = 0; i < tbl.length; i++) {
      tbl[i].children[0].style.paddingLeft = "0em";
      if (tbl[i].children.length === tbl[0].children.length) {
        tbl[i].children[tbl[i].children.length - 1].style.paddingRight = "0em";
      }
    }
  }
  if (group.envClasses.length > 0) {
    const align = group.envClasses.includes("align") || group.envClasses.includes("alignat");
    for (let i = 0; i < tbl.length; i++) {
      const row = tbl[i];
      if (align) {
        for (let j = 0; j < row.children.length; j++) {
          row.children[j].classes = ["tml-" + (j % 2 ? "left" : "right")];
        }
        if (tagIsPresent) {
          const k = group.leqno ? 0 : row.children.length - 1;
          row.children[k].classes = [];
        }
      }
      if (row.children.length > 1 && group.envClasses.includes("cases")) {
        row.children[1].style.paddingLeft = "1em";
      }
      if (group.envClasses.includes("cases") || group.envClasses.includes("subarray")) {
        for (const cell2 of row.children) {
          cell2.classes.push("tml-left");
        }
      }
    }
  }
  let table2 = new MathNode("mtable", tbl);
  if (group.envClasses.length > 0) {
    if (group.envClasses.includes("jot")) {
      table2.classes.push("tml-jot");
    } else if (group.envClasses.includes("small")) {
      table2.classes.push("tml-small");
    }
  }
  if (group.scriptLevel === "display") {
    table2.setAttribute("displaystyle", "true");
  }
  if (group.autoTag || group.envClasses.includes("multline")) {
    table2.style.width = "100%";
  }
  if (group.cols && group.cols.length > 0) {
    const cols = group.cols;
    let prevTypeWasAlign = false;
    let iStart = 0;
    let iEnd = cols.length;
    while (cols[iStart].type === "separator") {
      iStart += 1;
    }
    while (cols[iEnd - 1].type === "separator") {
      iEnd -= 1;
    }
    if (cols[0].type === "separator") {
      const sep = cols[1].type === "separator" ? "0.15em double" : cols[0].separator === "|" ? "0.06em solid " : "0.06em dashed ";
      for (const row of table2.children) {
        row.children[0].style.borderLeft = sep;
      }
    }
    let iCol = tagIsPresent ? 0 : -1;
    for (let i = iStart; i < iEnd; i++) {
      if (cols[i].type === "align") {
        const colAlign = alignMap[cols[i].align];
        iCol += 1;
        for (const row of table2.children) {
          if (colAlign.trim() !== "center" && iCol < row.children.length) {
            row.children[iCol].classes = ["tml-" + colAlign.trim()];
          }
        }
        prevTypeWasAlign = true;
      } else if (cols[i].type === "separator") {
        if (prevTypeWasAlign) {
          const sep = cols[i + 1].type === "separator" ? "0.15em double" : cols[i].separator === "|" ? "0.06em solid" : "0.06em dashed";
          for (const row of table2.children) {
            if (iCol < row.children.length) {
              row.children[iCol].style.borderRight = sep;
            }
          }
        }
        prevTypeWasAlign = false;
      }
    }
    if (cols[cols.length - 1].type === "separator") {
      const sep = cols[cols.length - 2].type === "separator" ? "0.15em double" : cols[cols.length - 1].separator === "|" ? "0.06em solid" : "0.06em dashed";
      for (const row of table2.children) {
        row.children[row.children.length - 1].style.borderRight = sep;
        row.children[row.children.length - 1].style.paddingRight = "0.4em";
      }
    }
  }
  if (group.envClasses.includes("small")) {
    table2 = new MathNode("mstyle", [table2]);
    table2.setAttribute("scriptlevel", "1");
  }
  return table2;
};
var alignedHandler = function(context, args) {
  if (context.envName.indexOf("ed") === -1) {
    validateAmsEnvironmentContext(context);
  }
  const isSplit = context.envName === "split";
  const cols = [];
  const res = parseArray(
    context.parser,
    {
      cols,
      emptySingleRow: true,
      autoTag: isSplit ? void 0 : getAutoTag(context.envName),
      envClasses: ["abut", "jot"],
      // set row spacing & provisional column spacing
      maxNumCols: context.envName === "split" ? 2 : void 0,
      leqno: context.parser.settings.leqno
    },
    "display"
  );
  let numMaths;
  let numCols = 0;
  const isAlignedAt = context.envName.indexOf("at") > -1;
  if (args[0] && isAlignedAt) {
    let arg0 = "";
    for (let i = 0; i < args[0].body.length; i++) {
      const textord2 = assertNodeType(args[0].body[i], "textord");
      arg0 += textord2.text;
    }
    if (isNaN(arg0)) {
      throw new ParseError("The alignat enviroment requires a numeric first argument.");
    }
    numMaths = Number(arg0);
    numCols = numMaths * 2;
  }
  res.body.forEach(function(row) {
    if (isAlignedAt) {
      const curMaths = row.length / 2;
      if (numMaths < curMaths) {
        throw new ParseError(
          `Too many math in a row: expected ${numMaths}, but got ${curMaths}`,
          row[0]
        );
      }
    } else if (numCols < row.length) {
      numCols = row.length;
    }
  });
  for (let i = 0; i < numCols; ++i) {
    let align = "r";
    if (i % 2 === 1) {
      align = "l";
    }
    cols[i] = {
      type: "align",
      align
    };
  }
  if (context.envName === "split") ;
  else if (isAlignedAt) {
    res.envClasses.push("alignat");
  } else {
    res.envClasses[0] = "align";
  }
  return res;
};
defineEnvironment({
  type: "array",
  names: ["array", "darray"],
  props: {
    numArgs: 1
  },
  handler(context, args) {
    const symNode = checkSymbolNodeType(args[0]);
    const colalign = symNode ? [args[0]] : assertNodeType(args[0], "ordgroup").body;
    const cols = colalign.map(function(nde) {
      const node = assertSymbolNodeType(nde);
      const ca = node.text;
      if ("lcr".indexOf(ca) !== -1) {
        return {
          type: "align",
          align: ca
        };
      } else if (ca === "|") {
        return {
          type: "separator",
          separator: "|"
        };
      } else if (ca === ":") {
        return {
          type: "separator",
          separator: ":"
        };
      }
      throw new ParseError("Unknown column alignment: " + ca, nde);
    });
    const [arraystretch, arraycolsep] = arrayGaps(context.parser.gullet.macros);
    const res = {
      cols,
      envClasses: ["array"],
      maxNumCols: cols.length,
      arraystretch,
      arraycolsep
    };
    return parseArray(context.parser, res, dCellStyle(context.envName));
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: [
    "matrix",
    "pmatrix",
    "bmatrix",
    "Bmatrix",
    "vmatrix",
    "Vmatrix",
    "matrix*",
    "pmatrix*",
    "bmatrix*",
    "Bmatrix*",
    "vmatrix*",
    "Vmatrix*"
  ],
  props: {
    numArgs: 0
  },
  handler(context) {
    const delimiters2 = {
      matrix: null,
      pmatrix: ["(", ")"],
      bmatrix: ["[", "]"],
      Bmatrix: ["\\{", "\\}"],
      vmatrix: ["|", "|"],
      Vmatrix: ["\\Vert", "\\Vert"]
    }[context.envName.replace("*", "")];
    let colAlign = "c";
    const payload = {
      envClasses: [],
      cols: []
    };
    if (context.envName.charAt(context.envName.length - 1) === "*") {
      const parser = context.parser;
      parser.consumeSpaces();
      if (parser.fetch().text === "[") {
        parser.consume();
        parser.consumeSpaces();
        colAlign = parser.fetch().text;
        if ("lcr".indexOf(colAlign) === -1) {
          throw new ParseError("Expected l or c or r", parser.nextToken);
        }
        parser.consume();
        parser.consumeSpaces();
        parser.expect("]");
        parser.consume();
        payload.cols = [];
      }
    }
    const res = parseArray(context.parser, payload, "text");
    res.cols = res.body.length > 0 ? new Array(res.body[0].length).fill({ type: "align", align: colAlign }) : [];
    const [arraystretch, arraycolsep] = arrayGaps(context.parser.gullet.macros);
    res.arraystretch = arraystretch;
    if (arraycolsep && !(arraycolsep === 6 && arraycolsep === "pt")) {
      res.arraycolsep = arraycolsep;
    }
    return delimiters2 ? {
      type: "leftright",
      mode: context.mode,
      body: [res],
      left: delimiters2[0],
      right: delimiters2[1],
      rightColor: void 0
      // \right uninfluenced by \color in array
    } : res;
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["bordermatrix"],
  props: {
    numArgs: 0
  },
  handler(context) {
    const payload = { cols: [], envClasses: ["bordermatrix"] };
    const res = parseArray(context.parser, payload, "text");
    res.cols = res.body.length > 0 ? new Array(res.body[0].length).fill({ type: "align", align: "c" }) : [];
    res.envClasses = [];
    res.arraystretch = 1;
    if (context.envName === "matrix") {
      return res;
    }
    return bordermatrixParseTree(res, context.delimiters);
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["smallmatrix"],
  props: {
    numArgs: 0
  },
  handler(context) {
    const payload = { envClasses: ["small"] };
    const res = parseArray(context.parser, payload, "script");
    return res;
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["subarray"],
  props: {
    numArgs: 1
  },
  handler(context, args) {
    const symNode = checkSymbolNodeType(args[0]);
    const colalign = symNode ? [args[0]] : assertNodeType(args[0], "ordgroup").body;
    const cols = colalign.map(function(nde) {
      const node = assertSymbolNodeType(nde);
      const ca = node.text;
      if ("lc".indexOf(ca) !== -1) {
        return {
          type: "align",
          align: ca
        };
      }
      throw new ParseError("Unknown column alignment: " + ca, nde);
    });
    if (cols.length > 1) {
      throw new ParseError("{subarray} can contain only one column");
    }
    let res = {
      cols,
      envClasses: ["small"]
    };
    res = parseArray(context.parser, res, "script");
    if (res.body.length > 0 && res.body[0].length > 1) {
      throw new ParseError("{subarray} can contain only one column");
    }
    return res;
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["cases", "dcases", "rcases", "drcases"],
  props: {
    numArgs: 0
  },
  handler(context) {
    const payload = {
      cols: [],
      envClasses: ["cases"]
    };
    const res = parseArray(context.parser, payload, dCellStyle(context.envName));
    return {
      type: "leftright",
      mode: context.mode,
      body: [res],
      left: context.envName.indexOf("r") > -1 ? "." : "\\{",
      right: context.envName.indexOf("r") > -1 ? "\\}" : ".",
      rightColor: void 0
    };
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["align", "align*", "aligned", "split"],
  props: {
    numArgs: 0
  },
  handler: alignedHandler,
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["alignat", "alignat*", "alignedat"],
  props: {
    numArgs: 1
  },
  handler: alignedHandler,
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["gathered", "gather", "gather*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    if (context.envName !== "gathered") {
      validateAmsEnvironmentContext(context);
    }
    const res = {
      cols: [],
      envClasses: ["abut", "jot"],
      autoTag: getAutoTag(context.envName),
      emptySingleRow: true,
      leqno: context.parser.settings.leqno
    };
    return parseArray(context.parser, res, "display");
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["equation", "equation*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    const res = {
      autoTag: getAutoTag(context.envName),
      emptySingleRow: true,
      singleRow: true,
      maxNumCols: 1,
      envClasses: ["align"],
      leqno: context.parser.settings.leqno
    };
    return parseArray(context.parser, res, "display");
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["multline", "multline*"],
  props: {
    numArgs: 0
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    const res = {
      autoTag: context.envName === "multline",
      maxNumCols: 1,
      envClasses: ["jot", "multline"],
      leqno: context.parser.settings.leqno
    };
    return parseArray(context.parser, res, "display");
  },
  mathmlBuilder: mathmlBuilder$9
});
defineEnvironment({
  type: "array",
  names: ["CD"],
  props: {
    numArgs: 0
  },
  handler(context) {
    validateAmsEnvironmentContext(context);
    return parseCD(context.parser);
  },
  mathmlBuilder: mathmlBuilder$9
});
defineFunction({
  type: "text",
  // Doesn't matter what this is.
  names: ["\\hline", "\\hdashline"],
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInMath: true
  },
  handler(context, args) {
    throw new ParseError(`${context.funcName} valid only within array environment`);
  }
});
var environments = _environments;
defineFunction({
  type: "bordermatrix",
  names: ["\\bordermatrix", "\\matrix"],
  props: {
    numArgs: 0,
    numOptionalArgs: 1
  },
  handler: ({ parser, funcName }, args, optArgs) => {
    let delimiters2 = ["(", ")"];
    if (funcName === "\\bordermatrix" && optArgs[0] && optArgs[0].body) {
      const body = optArgs[0].body;
      if (body.length === 1 && body[0].type === "delimiter") {
        delimiters2 = [body[0].left, body[0].right];
      }
    }
    parser.consumeSpaces();
    parser.consume();
    const env = environments["bordermatrix"];
    const context = {
      mode: parser.mode,
      envName: funcName.slice(1),
      delimiters: delimiters2,
      parser
    };
    const result = env.handler(context);
    parser.expect("}", true);
    return result;
  }
});
defineFunction({
  type: "cancelto",
  names: ["\\cancelto"],
  props: {
    numArgs: 2
  },
  handler({ parser }, args) {
    const to = args[0];
    const body = args[1];
    return {
      type: "cancelto",
      mode: parser.mode,
      body,
      to,
      isCharacterBox: isCharacterBox(body)
    };
  },
  mathmlBuilder(group, style) {
    const fromNode = new MathNode(
      "mrow",
      [buildGroup$1(group.body, style)],
      ["ff-narrow"]
      // A zero-width mrow.
    );
    const phantom2 = new MathNode("mphantom", [buildGroup$1(group.body, style)]);
    const arrow = new MathNode("mrow", [phantom2], ["tml-cancelto"]);
    arrow.style.color = style.color;
    if (group.isCharacterBox && smalls.indexOf(group.body.body[0].text) > -1) {
      arrow.style.left = "0.1em";
      arrow.style.width = "90%";
    }
    const node = new MathNode("mrow", [fromNode, arrow], ["menclose"]);
    if (!group.isCharacterBox || /[f∫∑]/.test(group.body.body[0].text)) {
      phantom2.style.paddingRight = "0.2em";
    } else {
      phantom2.style.padding = "0.5ex 0.1em 0 0";
      const strut = new MathNode("mspace", []);
      strut.setAttribute("height", "0.85em");
      fromNode.children.push(strut);
    }
    let dummyNode;
    if (group.isCharacterBox) {
      dummyNode = new MathNode("mspace", []);
      dummyNode.setAttribute("height", "1em");
    } else {
      const inner2 = buildGroup$1(group.body, style);
      const zeroWidthNode = new MathNode("mpadded", [inner2]);
      zeroWidthNode.setAttribute("width", "0.1px");
      dummyNode = new MathNode("mphantom", [zeroWidthNode]);
    }
    const toNode2 = buildGroup$1(group.to, style);
    toNode2.style.color = style.color;
    const zeroWidthToNode = new MathNode("mpadded", [toNode2]);
    if (!group.isCharacterBox || /[f∫∑]/.test(group.body.body[0].text)) {
      const w = new MathNode("mspace", []);
      w.setAttribute("width", "0.2em");
      zeroWidthToNode.children.unshift(w);
    }
    zeroWidthToNode.setAttribute("width", "0.1px");
    const mover = new MathNode("mover", [dummyNode, zeroWidthToNode]);
    const nudgeLeft = new MathNode("mrow", [], ["ff-nudge-left"]);
    return newDocumentFragment([makeRow([node, mover]), nudgeLeft]);
  }
});
defineFunction({
  type: "textord",
  names: ["\\@char"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler({ parser, token }, args) {
    const arg2 = assertNodeType(args[0], "ordgroup");
    const group = arg2.body;
    let number = "";
    for (let i = 0; i < group.length; i++) {
      const node = assertNodeType(group[i], "textord");
      number += node.text;
    }
    const code = parseInt(number);
    if (isNaN(code)) {
      throw new ParseError(`\\@char has non-numeric argument ${number}`, token);
    }
    return {
      type: "textord",
      mode: parser.mode,
      text: String.fromCodePoint(code)
    };
  }
});
var htmlRegEx = /^(#[a-f0-9]{3}|#?[a-f0-9]{6})$/i;
var htmlOrNameRegEx = /^(#[a-f0-9]{3}|#?[a-f0-9]{6}|[a-z]+)$/i;
var RGBregEx = /^ *\d{1,3} *(?:, *\d{1,3} *){2}$/;
var rgbRegEx = /^ *[10](?:\.\d*)? *(?:, *[10](?:\.\d*)? *){2}$/;
var xcolorHtmlRegEx = /^[a-f0-9]{6}$/i;
var toHex = (num) => {
  let str = num.toString(16);
  if (str.length === 1) {
    str = "0" + str;
  }
  return str;
};
var xcolors = JSON.parse(`{
  "Apricot": "#ffb484",
  "Aquamarine": "#08b4bc",
  "Bittersweet": "#c84c14",
  "blue": "#0000FF",
  "Blue": "#303494",
  "BlueGreen": "#08b4bc",
  "BlueViolet": "#503c94",
  "BrickRed": "#b8341c",
  "brown": "#BF8040",
  "Brown": "#802404",
  "BurntOrange": "#f8941c",
  "CadetBlue": "#78749c",
  "CarnationPink": "#f884b4",
  "Cerulean": "#08a4e4",
  "CornflowerBlue": "#40ace4",
  "cyan": "#00FFFF",
  "Cyan": "#08acec",
  "Dandelion": "#ffbc44",
  "darkgray": "#404040",
  "DarkOrchid": "#a8548c",
  "Emerald": "#08ac9c",
  "ForestGreen": "#089c54",
  "Fuchsia": "#90348c",
  "Goldenrod": "#ffdc44",
  "gray": "#808080",
  "Gray": "#98949c",
  "green": "#00FF00",
  "Green": "#08a44c",
  "GreenYellow": "#e0e474",
  "JungleGreen": "#08ac9c",
  "Lavender": "#f89cc4",
  "lightgray": "#c0c0c0",
  "lime": "#BFFF00",
  "LimeGreen": "#90c43c",
  "magenta": "#FF00FF",
  "Magenta": "#f0048c",
  "Mahogany": "#b0341c",
  "Maroon": "#b03434",
  "Melon": "#f89c7c",
  "MidnightBlue": "#086494",
  "Mulberry": "#b03c94",
  "NavyBlue": "#086cbc",
  "olive": "#7F7F00",
  "OliveGreen": "#407c34",
  "orange": "#FF8000",
  "Orange": "#f8843c",
  "OrangeRed": "#f0145c",
  "Orchid": "#b074ac",
  "Peach": "#f8945c",
  "Periwinkle": "#8074bc",
  "PineGreen": "#088c74",
  "pink": "#ff7f7f",
  "Plum": "#98248c",
  "ProcessBlue": "#08b4ec",
  "purple": "#BF0040",
  "Purple": "#a0449c",
  "RawSienna": "#983c04",
  "red": "#ff0000",
  "Red": "#f01c24",
  "RedOrange": "#f86434",
  "RedViolet": "#a0246c",
  "Rhodamine": "#f0549c",
  "Royallue": "#0874bc",
  "RoyalPurple": "#683c9c",
  "RubineRed": "#f0047c",
  "Salmon": "#f8948c",
  "SeaGreen": "#30bc9c",
  "Sepia": "#701404",
  "SkyBlue": "#48c4dc",
  "SpringGreen": "#c8dc64",
  "Tan": "#e09c74",
  "teal": "#007F7F",
  "TealBlue": "#08acb4",
  "Thistle": "#d884b4",
  "Turquoise": "#08b4cc",
  "violet": "#800080",
  "Violet": "#60449c",
  "VioletRed": "#f054a4",
  "WildStrawberry": "#f0246c",
  "yellow": "#FFFF00",
  "Yellow": "#fff404",
  "YellowGreen": "#98cc6c",
  "YellowOrange": "#ffa41c"
}`);
var colorFromSpec = (model, spec) => {
  let color = "";
  if (model === "HTML") {
    if (!htmlRegEx.test(spec)) {
      throw new ParseError("Invalid HTML input.");
    }
    color = spec;
  } else if (model === "RGB") {
    if (!RGBregEx.test(spec)) {
      throw new ParseError("Invalid RGB input.");
    }
    spec.split(",").map((e) => {
      color += toHex(Number(e.trim()));
    });
  } else {
    if (!rgbRegEx.test(spec)) {
      throw new ParseError("Invalid rbg input.");
    }
    spec.split(",").map((e) => {
      const num = Number(e.trim());
      if (num > 1) {
        throw new ParseError("Color rgb input must be < 1.");
      }
      color += toHex(Number((num * 255).toFixed(0)));
    });
  }
  if (color.charAt(0) !== "#") {
    color = "#" + color;
  }
  return color;
};
var validateColor = (color, macros2, token) => {
  const macroName = `\\\\color@${color}`;
  const match = htmlOrNameRegEx.exec(color);
  if (!match) {
    throw new ParseError("Invalid color: '" + color + "'", token);
  }
  if (xcolorHtmlRegEx.test(color)) {
    return "#" + color;
  } else if (color.charAt(0) === "#") {
    return color;
  } else if (macros2.has(macroName)) {
    color = macros2.get(macroName).tokens[0].text;
  } else if (xcolors[color]) {
    color = xcolors[color];
  }
  return color;
};
var mathmlBuilder$8 = (group, style) => {
  let expr = buildExpression(group.body, style.withColor(group.color));
  if (expr.length === 0) {
    expr.push(new MathNode("mrow"));
  }
  expr = expr.map((e) => {
    e.style.color = group.color;
    return e;
  });
  return newDocumentFragment(expr);
};
defineFunction({
  type: "color",
  names: ["\\textcolor"],
  props: {
    numArgs: 2,
    numOptionalArgs: 1,
    allowedInText: true,
    argTypes: ["raw", "raw", "original"]
  },
  handler({ parser, token }, args, optArgs) {
    const model = optArgs[0] && assertNodeType(optArgs[0], "raw").string;
    let color = "";
    if (model) {
      const spec = assertNodeType(args[0], "raw").string;
      color = colorFromSpec(model, spec);
    } else {
      color = validateColor(assertNodeType(args[0], "raw").string, parser.gullet.macros, token);
    }
    const body = args[1];
    return {
      type: "color",
      mode: parser.mode,
      color,
      isTextColor: true,
      body: ordargument(body)
    };
  },
  mathmlBuilder: mathmlBuilder$8
});
defineFunction({
  type: "color",
  names: ["\\color"],
  props: {
    numArgs: 1,
    numOptionalArgs: 1,
    allowedInText: true,
    argTypes: ["raw", "raw"]
  },
  handler({ parser, breakOnTokenText, token }, args, optArgs) {
    const model = optArgs[0] && assertNodeType(optArgs[0], "raw").string;
    let color = "";
    if (model) {
      const spec = assertNodeType(args[0], "raw").string;
      color = colorFromSpec(model, spec);
    } else {
      color = validateColor(assertNodeType(args[0], "raw").string, parser.gullet.macros, token);
    }
    const body = parser.parseExpression(true, breakOnTokenText, true);
    return {
      type: "color",
      mode: parser.mode,
      color,
      isTextColor: false,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$8
});
defineFunction({
  type: "color",
  names: ["\\definecolor"],
  props: {
    numArgs: 3,
    allowedInText: true,
    argTypes: ["raw", "raw", "raw"]
  },
  handler({ parser, funcName, token }, args) {
    const name2 = assertNodeType(args[0], "raw").string;
    if (!/^[A-Za-z]+$/.test(name2)) {
      throw new ParseError("Color name must be latin letters.", token);
    }
    const model = assertNodeType(args[1], "raw").string;
    if (!["HTML", "RGB", "rgb"].includes(model)) {
      throw new ParseError("Color model must be HTML, RGB, or rgb.", token);
    }
    const spec = assertNodeType(args[2], "raw").string;
    const color = colorFromSpec(model, spec);
    parser.gullet.macros.set(`\\\\color@${name2}`, { tokens: [{ text: color }], numArgs: 0 });
    return { type: "internal", mode: parser.mode };
  }
  // No mathmlBuilder. The point of \definecolor is to set a macro.
});
defineFunction({
  type: "cr",
  names: ["\\\\"],
  props: {
    numArgs: 0,
    numOptionalArgs: 0,
    allowedInText: true
  },
  handler({ parser }, args, optArgs) {
    const size = parser.gullet.future().text === "[" ? parser.parseSizeGroup(true) : null;
    const newLine = !parser.settings.displayMode;
    return {
      type: "cr",
      mode: parser.mode,
      newLine,
      size: size && assertNodeType(size, "size").value
    };
  },
  // The following builder is called only at the top level,
  // not within tabular/array environments.
  mathmlBuilder(group, style) {
    const node = new MathNode("mo");
    if (group.newLine) {
      node.setAttribute("linebreak", "newline");
      if (group.size) {
        const size = calculateSize(group.size, style);
        node.setAttribute("height", size.number + size.unit);
      }
    }
    return node;
  }
});
var globalMap = {
  "\\global": "\\global",
  "\\long": "\\\\globallong",
  "\\\\globallong": "\\\\globallong",
  "\\def": "\\gdef",
  "\\gdef": "\\gdef",
  "\\edef": "\\xdef",
  "\\xdef": "\\xdef",
  "\\let": "\\\\globallet",
  "\\futurelet": "\\\\globalfuture"
};
var checkControlSequence = (tok) => {
  const name2 = tok.text;
  if (/^(?:[\\{}$&#^_]|EOF)$/.test(name2)) {
    throw new ParseError("Expected a control sequence", tok);
  }
  return name2;
};
var getRHS = (parser) => {
  let tok = parser.gullet.popToken();
  if (tok.text === "=") {
    tok = parser.gullet.popToken();
    if (tok.text === " ") {
      tok = parser.gullet.popToken();
    }
  }
  return tok;
};
var letCommand = (parser, name2, tok, global) => {
  let macro = parser.gullet.macros.get(tok.text);
  if (macro == null) {
    tok.noexpand = true;
    macro = {
      tokens: [tok],
      numArgs: 0,
      // reproduce the same behavior in expansion
      unexpandable: !parser.gullet.isExpandable(tok.text)
    };
  }
  parser.gullet.macros.set(name2, macro, global);
};
defineFunction({
  type: "internal",
  names: [
    "\\global",
    "\\long",
    "\\\\globallong"
    // can’t be entered directly
  ],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler({ parser, funcName }) {
    parser.consumeSpaces();
    const token = parser.fetch();
    if (globalMap[token.text]) {
      if (funcName === "\\global" || funcName === "\\\\globallong") {
        token.text = globalMap[token.text];
      }
      return assertNodeType(parser.parseFunction(), "internal");
    }
    throw new ParseError(`Invalid token after macro prefix`, token);
  }
});
defineFunction({
  type: "internal",
  names: ["\\def", "\\gdef", "\\edef", "\\xdef"],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ parser, funcName }) {
    let tok = parser.gullet.popToken();
    const name2 = tok.text;
    if (/^(?:[\\{}$&#^_]|EOF)$/.test(name2)) {
      throw new ParseError("Expected a control sequence", tok);
    }
    let numArgs = 0;
    let insert;
    const delimiters2 = [[]];
    while (parser.gullet.future().text !== "{") {
      tok = parser.gullet.popToken();
      if (tok.text === "#") {
        if (parser.gullet.future().text === "{") {
          insert = parser.gullet.future();
          delimiters2[numArgs].push("{");
          break;
        }
        tok = parser.gullet.popToken();
        if (!/^[1-9]$/.test(tok.text)) {
          throw new ParseError(`Invalid argument number "${tok.text}"`);
        }
        if (parseInt(tok.text) !== numArgs + 1) {
          throw new ParseError(`Argument number "${tok.text}" out of order`);
        }
        numArgs++;
        delimiters2.push([]);
      } else if (tok.text === "EOF") {
        throw new ParseError("Expected a macro definition");
      } else {
        delimiters2[numArgs].push(tok.text);
      }
    }
    let { tokens } = parser.gullet.consumeArg();
    if (insert) {
      tokens.unshift(insert);
    }
    if (funcName === "\\edef" || funcName === "\\xdef") {
      tokens = parser.gullet.expandTokens(tokens);
      if (tokens.length > parser.gullet.settings.maxExpand) {
        throw new ParseError("Too many expansions in an " + funcName);
      }
      tokens.reverse();
    }
    parser.gullet.macros.set(
      name2,
      { tokens, numArgs, delimiters: delimiters2 },
      funcName === globalMap[funcName]
    );
    return { type: "internal", mode: parser.mode };
  }
});
defineFunction({
  type: "internal",
  names: [
    "\\let",
    "\\\\globallet"
    // can’t be entered directly
  ],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ parser, funcName }) {
    const name2 = checkControlSequence(parser.gullet.popToken());
    parser.gullet.consumeSpaces();
    const tok = getRHS(parser);
    letCommand(parser, name2, tok, funcName === "\\\\globallet");
    return { type: "internal", mode: parser.mode };
  }
});
defineFunction({
  type: "internal",
  names: [
    "\\futurelet",
    "\\\\globalfuture"
    // can’t be entered directly
  ],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ parser, funcName }) {
    const name2 = checkControlSequence(parser.gullet.popToken());
    const middle = parser.gullet.popToken();
    const tok = parser.gullet.popToken();
    letCommand(parser, name2, tok, funcName === "\\\\globalfuture");
    parser.gullet.pushToken(tok);
    parser.gullet.pushToken(middle);
    return { type: "internal", mode: parser.mode };
  }
});
defineFunction({
  type: "internal",
  names: ["\\newcommand", "\\renewcommand", "\\providecommand"],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ parser, funcName }) {
    let name2 = "";
    const tok = parser.gullet.popToken();
    if (tok.text === "{") {
      name2 = checkControlSequence(parser.gullet.popToken());
      parser.gullet.popToken();
    } else {
      name2 = checkControlSequence(tok);
    }
    const exists = parser.gullet.isDefined(name2);
    if (exists && funcName === "\\newcommand") {
      throw new ParseError(
        `\\newcommand{${name2}} attempting to redefine ${name2}; use \\renewcommand`
      );
    }
    if (!exists && funcName === "\\renewcommand") {
      throw new ParseError(
        `\\renewcommand{${name2}} when command ${name2} does not yet exist; use \\newcommand`
      );
    }
    let numArgs = 0;
    if (parser.gullet.future().text === "[") {
      let tok2 = parser.gullet.popToken();
      tok2 = parser.gullet.popToken();
      if (!/^[0-9]$/.test(tok2.text)) {
        throw new ParseError(`Invalid number of arguments: "${tok2.text}"`);
      }
      numArgs = parseInt(tok2.text);
      tok2 = parser.gullet.popToken();
      if (tok2.text !== "]") {
        throw new ParseError(`Invalid argument "${tok2.text}"`);
      }
    }
    const { tokens } = parser.gullet.consumeArg();
    if (!(funcName === "\\providecommand" && parser.gullet.macros.has(name2))) {
      parser.gullet.macros.set(
        name2,
        { tokens, numArgs }
      );
    }
    return { type: "internal", mode: parser.mode };
  }
});
var delimiterSizes = {
  "\\bigl": { mclass: "mopen", size: 1 },
  "\\Bigl": { mclass: "mopen", size: 2 },
  "\\biggl": { mclass: "mopen", size: 3 },
  "\\Biggl": { mclass: "mopen", size: 4 },
  "\\bigr": { mclass: "mclose", size: 1 },
  "\\Bigr": { mclass: "mclose", size: 2 },
  "\\biggr": { mclass: "mclose", size: 3 },
  "\\Biggr": { mclass: "mclose", size: 4 },
  "\\bigm": { mclass: "mrel", size: 1 },
  "\\Bigm": { mclass: "mrel", size: 2 },
  "\\biggm": { mclass: "mrel", size: 3 },
  "\\Biggm": { mclass: "mrel", size: 4 },
  "\\big": { mclass: "mord", size: 1 },
  "\\Big": { mclass: "mord", size: 2 },
  "\\bigg": { mclass: "mord", size: 3 },
  "\\Bigg": { mclass: "mord", size: 4 }
};
var leftToRight = {
  "(": ")",
  "\\lparen": "\\rparen",
  "[": "]",
  "\\lbrack": "\\rbrack",
  "\\{": "\\}",
  "\\lbrace": "\\rbrace",
  "\u2987": "\u2988",
  "\\llparenthesis": "\\rrparenthesis",
  "\\lfloor": "\\rfloor",
  "\u230A": "\u230B",
  "\\lceil": "\\rceil",
  "\u2308": "\u2309",
  "\\langle": "\\rangle",
  "\u27E8": "\u27E9",
  "\\lAngle": "\\rAngle",
  "\u27EA": "\u27EB",
  "\\llangle": "\\rrangle",
  "\u2989": "\u298A",
  "\\lvert": "\\rvert",
  "\\lVert": "\\rVert",
  "\\lgroup": "\\rgroup",
  "\u27EE": "\u27EF",
  "\\lmoustache": "\\rmoustache",
  "\u23B0": "\u23B1",
  "\\llbracket": "\\rrbracket",
  "\u27E6": "\u27E7",
  "\\lBrace": "\\rBrace",
  "\u2983": "\u2984"
};
var leftDelimiterNames = new Set(Object.keys(leftToRight));
new Set(Object.values(leftToRight));
var delimiters = /* @__PURE__ */ new Set([
  "(",
  "\\lparen",
  ")",
  "\\rparen",
  "[",
  "\\lbrack",
  "]",
  "\\rbrack",
  "\\{",
  "\\lbrace",
  "\\}",
  "\\rbrace",
  "\u2987",
  "\\llparenthesis",
  "\u2988",
  "\\rrparenthesis",
  "\\lfloor",
  "\\rfloor",
  "\u230A",
  "\u230B",
  "\\lceil",
  "\\rceil",
  "\u2308",
  "\u2309",
  "<",
  ">",
  "\\langle",
  "\u27E8",
  "\\rangle",
  "\u27E9",
  "\\lAngle",
  "\u27EA",
  "\\rAngle",
  "\u27EB",
  "\\llangle",
  "\u2989",
  "\\rrangle",
  "\u298A",
  "\\lt",
  "\\gt",
  "\\lvert",
  "\\rvert",
  "\\lVert",
  "\\rVert",
  "\\lgroup",
  "\\rgroup",
  "\u27EE",
  "\u27EF",
  "\\lmoustache",
  "\\rmoustache",
  "\u23B0",
  "\u23B1",
  "\\llbracket",
  "\\rrbracket",
  "\u27E6",
  "\u27E7",
  "\\lBrace",
  "\\rBrace",
  "\u2983",
  "\u2984",
  "/",
  "\\backslash",
  "|",
  "\\vert",
  "\\|",
  "\\Vert",
  "\u2016",
  "\\uparrow",
  "\\Uparrow",
  "\\downarrow",
  "\\Downarrow",
  "\\updownarrow",
  "\\Updownarrow",
  "."
]);
var dels = /* @__PURE__ */ new Set(["}", "\\left", "\\middle", "\\right"]);
var isDelimiter = (str) => str.length > 0 && (delimiters.has(str) || delimiterSizes[str] || dels.has(str));
var sizeToMaxHeight = [0, 1.2, 1.8, 2.4, 3];
function checkDelimiter(delim, context) {
  if (delim.type === "ordgroup" && delim.body.length === 1) {
    delim = delim.body[0];
  }
  const symDelim = checkSymbolNodeType(delim);
  if (symDelim && delimiters.has(symDelim.text)) {
    if (symDelim.text === "<" || symDelim.text === "\\lt") {
      symDelim.text = "\u27E8";
    }
    if (symDelim.text === ">" || symDelim.text === "\\gt") {
      symDelim.text = "\u27E9";
    }
    return symDelim;
  } else if (symDelim) {
    throw new ParseError(`Invalid delimiter '${symDelim.text}' after '${context.funcName}'`, delim);
  } else {
    throw new ParseError(`Invalid delimiter type '${delim.type}'`, delim);
  }
}
var needExplicitStretch = /* @__PURE__ */ new Set(["/", "\\", "\\backslash", "\u2216", "\\vert", "|"]);
var makeFenceMo = (delim, mode, form, isStretchy) => {
  const text2 = delim === "." ? "" : delim;
  const node = new MathNode("mo", [makeText(text2, mode)]);
  node.setAttribute("fence", "true");
  node.setAttribute("form", form);
  node.setAttribute("stretchy", isStretchy ? "true" : "false");
  return node;
};
defineFunction({
  type: "delimsizing",
  names: [
    "\\bigl",
    "\\Bigl",
    "\\biggl",
    "\\Biggl",
    "\\bigr",
    "\\Bigr",
    "\\biggr",
    "\\Biggr",
    "\\bigm",
    "\\Bigm",
    "\\biggm",
    "\\Biggm",
    "\\big",
    "\\Big",
    "\\bigg",
    "\\Bigg"
  ],
  props: {
    numArgs: 1,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    const delim = checkDelimiter(args[0], context);
    const delimNode = {
      type: "delimsizing",
      mode: context.parser.mode,
      size: delimiterSizes[context.funcName].size,
      mclass: delimiterSizes[context.funcName].mclass,
      delim: delim.text
    };
    const nextToken = context.parser.fetch().text;
    if (nextToken !== "^" && nextToken !== "_") {
      return delimNode;
    } else {
      return {
        type: "ordgroup",
        mode: "math",
        body: [delimNode, { type: "ordgroup", mode: "math", body: [] }]
      };
    }
  },
  mathmlBuilder: (group) => {
    const children = [];
    const delim = group.delim === "." ? "" : group.delim;
    children.push(makeText(delim, group.mode));
    const node = new MathNode("mo", children);
    if (group.mclass === "mopen" || group.mclass === "mclose") {
      node.setAttribute("fence", "true");
    } else {
      node.setAttribute("fence", "false");
    }
    if (needExplicitStretch.has(delim) || delim.indexOf("arrow") > -1) {
      node.setAttribute("stretchy", "true");
    }
    node.setAttribute("symmetric", "true");
    node.setAttribute("minsize", sizeToMaxHeight[group.size] + "em");
    node.setAttribute("maxsize", sizeToMaxHeight[group.size] + "em");
    return node;
  }
});
function assertParsed(group) {
  if (!group.body) {
    throw new Error("Bug: The delim ParseNode wasn't fully parsed.");
  }
}
defineFunction({
  type: "leftright-right",
  names: ["\\right"],
  props: {
    numArgs: 1,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    return {
      type: "leftright-right",
      mode: context.parser.mode,
      delim: checkDelimiter(args[0], context).text
    };
  }
});
defineFunction({
  type: "leftright",
  names: ["\\left"],
  props: {
    numArgs: 1,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    const delim = checkDelimiter(args[0], context);
    const parser = context.parser;
    ++parser.leftrightDepth;
    let body = parser.parseExpression(false, "\\right", true);
    let nextToken = parser.fetch();
    while (nextToken.text === "\\middle") {
      parser.consume();
      const middle = parser.fetch().text;
      if (!symbols2.math[middle]) {
        throw new ParseError(`Invalid delimiter '${middle}' after '\\middle'`);
      }
      checkDelimiter({ type: "atom", mode: "math", text: middle }, { funcName: "\\middle" });
      body.push({ type: "middle", mode: "math", delim: middle });
      parser.consume();
      body = body.concat(parser.parseExpression(false, "\\right", true));
      nextToken = parser.fetch();
    }
    --parser.leftrightDepth;
    parser.expect("\\right", false);
    const right = assertNodeType(parser.parseFunction(), "leftright-right");
    return {
      type: "leftright",
      mode: parser.mode,
      body,
      left: delim.text,
      right: right.delim,
      isStretchy: true
    };
  },
  mathmlBuilder: (group, style) => {
    assertParsed(group);
    const inner2 = buildExpression(group.body, style);
    const leftNode = makeFenceMo(group.left, group.mode, "prefix", true);
    inner2.unshift(leftNode);
    const rightNode = makeFenceMo(group.right, group.mode, "postfix", true);
    if (group.body.length > 0) {
      const lastElement = group.body[group.body.length - 1];
      if (lastElement.type === "color" && !lastElement.isTextColor) {
        rightNode.setAttribute("mathcolor", lastElement.color);
      }
    }
    inner2.push(rightNode);
    return makeRow(inner2);
  }
});
defineFunction({
  type: "delimiter",
  names: Array.from(leftDelimiterNames),
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInMath: true,
    allowedInArgument: true
  },
  handler: ({ parser, funcName, token }) => {
    if (parser.mode === "text") {
      return {
        type: "textord",
        mode: "text",
        text: funcName,
        loc: token.loc
      };
    } else if (!parser.settings.wrapDelimiterPairs) {
      return {
        type: "atom",
        mode: "math",
        family: "open",
        loc: token.loc,
        text: funcName
      };
    }
    const rightDelim = leftToRight[funcName];
    const body = parser.parseExpression(false, rightDelim, false);
    const nextToken = parser.fetch().text;
    if (nextToken !== rightDelim) {
      throw new ParseError("Unmatched delimiter");
    }
    parser.consume();
    return {
      type: "delimiter",
      mode: parser.mode,
      body,
      left: funcName,
      right: rightDelim
    };
  },
  mathmlBuilder: (group, style) => {
    assertParsed(group);
    const inner2 = buildExpression(group.body, style);
    const leftNode = makeFenceMo(group.left, group.mode, "prefix", false);
    inner2.unshift(leftNode);
    const rightNode = makeFenceMo(group.right, group.mode, "postfix", false);
    if (group.body.length > 0) {
      const lastElement = group.body[group.body.length - 1];
      if (lastElement.type === "color" && !lastElement.isTextColor) {
        rightNode.setAttribute("mathcolor", lastElement.color);
      }
    }
    inner2.push(rightNode);
    return makeRow(inner2);
  }
});
defineFunction({
  type: "middle",
  names: ["\\middle"],
  props: {
    numArgs: 1,
    argTypes: ["primitive"]
  },
  handler: (context, args) => {
    const delim = checkDelimiter(args[0], context);
    if (!context.parser.leftrightDepth) {
      throw new ParseError("\\middle without preceding \\left", delim);
    }
    return {
      type: "middle",
      mode: context.parser.mode,
      delim: delim.text
    };
  },
  mathmlBuilder: (group) => {
    const textNode = makeText(group.delim, group.mode);
    const middleNode = new MathNode("mo", [textNode]);
    middleNode.setAttribute("stretchy", "true");
    middleNode.setAttribute("form", "infix");
    if (textNode.text !== "/") {
      middleNode.setAttribute("lspace", "0.05em");
      middleNode.setAttribute("rspace", "0.05em");
    }
    return middleNode;
  }
});
var boxTags = ["\\boxed", "\\fcolorbox", "\\colorbox"];
var mathmlBuilder$7 = (group, style) => {
  const tag = boxTags.includes(group.label) ? "mrow" : "menclose";
  const node = new MathNode(tag, [buildGroup$1(group.body, style)]);
  switch (group.label) {
    case "\\overline":
      node.setAttribute("notation", "top");
      node.classes.push("tml-overline");
      break;
    case "\\underline":
      node.setAttribute("notation", "bottom");
      node.classes.push("tml-underline");
      break;
    case "\\cancel":
      node.setAttribute("notation", "updiagonalstrike");
      node.children.push(new MathNode("mrow", [], ["tml-cancel", "upstrike"]));
      break;
    case "\\bcancel":
      node.setAttribute("notation", "downdiagonalstrike");
      node.children.push(new MathNode("mrow", [], ["tml-cancel", "downstrike"]));
      break;
    case "\\sout":
      node.setAttribute("notation", "horizontalstrike");
      node.children.push(new MathNode("mrow", [], ["tml-cancel", "sout"]));
      break;
    case "\\xcancel":
      node.setAttribute("notation", "updiagonalstrike downdiagonalstrike");
      node.children.push(new MathNode("mrow", [], ["tml-cancel", "tml-xcancel"]));
      break;
    // cancelto is handled in cancelto.js
    case "\\longdiv":
      node.setAttribute("notation", "longdiv");
      node.classes.push("longdiv-top");
      node.children.push(new MathNode("mrow", [], ["longdiv-arc"]));
      break;
    case "\\phase":
      node.setAttribute("notation", "phasorangle");
      node.classes.push("phasor-bottom");
      node.children.push(new MathNode("mrow", [], ["phasor-angle"]));
      break;
    case "\\textcircled":
      node.setAttribute("notation", "circle");
      node.classes.push("circle-pad");
      node.children.push(new MathNode("mrow", [], ["textcircle"]));
      break;
    case "\\angl":
      node.setAttribute("notation", "actuarial");
      node.classes.push("actuarial");
      break;
    case "\\boxed":
      node.style.padding = "3pt";
      node.style.border = "1px solid";
      node.setAttribute("scriptlevel", "0");
      node.setAttribute("displaystyle", "true");
      break;
    case "\\fbox":
      node.setAttribute("notation", "box");
      node.classes.push("tml-fbox");
      break;
    case "\\fcolorbox":
    case "\\colorbox": {
      node.style.padding = "0.3em";
      if (group.label === "\\fcolorbox") {
        node.style.border = "0.0667em solid " + String(group.borderColor);
      }
      break;
    }
  }
  if (group.backgroundColor) {
    node.setAttribute("mathbackground", group.backgroundColor);
  }
  return node;
};
defineFunction({
  type: "enclose",
  names: ["\\colorbox"],
  props: {
    numArgs: 2,
    numOptionalArgs: 1,
    allowedInText: true,
    argTypes: ["raw", "raw", "text"]
  },
  handler({ parser, funcName }, args, optArgs) {
    const model = optArgs[0] && assertNodeType(optArgs[0], "raw").string;
    let color = "";
    if (model) {
      const spec = assertNodeType(args[0], "raw").string;
      color = colorFromSpec(model, spec);
    } else {
      color = validateColor(assertNodeType(args[0], "raw").string, parser.gullet.macros);
    }
    const body = args[1];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      backgroundColor: color,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$7
});
defineFunction({
  type: "enclose",
  names: ["\\fcolorbox"],
  props: {
    numArgs: 3,
    numOptionalArgs: 1,
    allowedInText: true,
    argTypes: ["raw", "raw", "raw", "text"]
  },
  handler({ parser, funcName }, args, optArgs) {
    const model = optArgs[0] && assertNodeType(optArgs[0], "raw").string;
    let borderColor = "";
    let backgroundColor;
    if (model) {
      const borderSpec = assertNodeType(args[0], "raw").string;
      const backgroundSpec = assertNodeType(args[0], "raw").string;
      borderColor = colorFromSpec(model, borderSpec);
      backgroundColor = colorFromSpec(model, backgroundSpec);
    } else {
      borderColor = validateColor(assertNodeType(args[0], "raw").string, parser.gullet.macros);
      backgroundColor = validateColor(assertNodeType(args[1], "raw").string, parser.gullet.macros);
    }
    const body = args[2];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      backgroundColor,
      borderColor,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$7
});
defineFunction({
  type: "enclose",
  names: ["\\fbox"],
  props: {
    numArgs: 1,
    argTypes: ["hbox"],
    allowedInText: true
  },
  handler({ parser }, args) {
    return {
      type: "enclose",
      mode: parser.mode,
      label: "\\fbox",
      body: args[0]
    };
  }
});
defineFunction({
  type: "enclose",
  names: [
    "\\angl",
    "\\cancel",
    "\\bcancel",
    "\\xcancel",
    "\\overline",
    "\\boxed",
    "\\longdiv",
    "\\phase"
  ],
  props: {
    numArgs: 1
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$7
});
defineFunction({
  type: "enclose",
  names: ["\\sout"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$7
});
defineFunction({
  type: "enclose",
  names: ["\\underline"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$7
});
defineFunction({
  type: "enclose",
  names: ["\\textcircled"],
  props: {
    numArgs: 1,
    argTypes: ["text"],
    allowedInArgument: true,
    allowedInText: true
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: "enclose",
      mode: parser.mode,
      label: funcName,
      body
    };
  },
  mathmlBuilder: mathmlBuilder$7
});
defineFunction({
  type: "environment",
  names: ["\\begin", "\\end"],
  props: {
    numArgs: 1,
    argTypes: ["text"]
  },
  handler({ parser, funcName }, args) {
    const nameGroup = args[0];
    if (nameGroup.type !== "ordgroup") {
      throw new ParseError("Invalid environment name", nameGroup);
    }
    let envName = "";
    for (let i = 0; i < nameGroup.body.length; ++i) {
      envName += assertNodeType(nameGroup.body[i], "textord").text;
    }
    if (funcName === "\\begin") {
      if (!Object.prototype.hasOwnProperty.call(environments, envName)) {
        throw new ParseError("No such environment: " + envName, nameGroup);
      }
      const env = environments[envName];
      const { args: args2, optArgs } = parser.parseArguments("\\begin{" + envName + "}", env);
      const context = {
        mode: parser.mode,
        envName,
        parser
      };
      const result = env.handler(context, args2, optArgs);
      parser.expect("\\end", false);
      const endNameToken = parser.nextToken;
      const end = assertNodeType(parser.parseFunction(), "environment");
      if (end.name !== envName) {
        throw new ParseError(
          `Mismatch: \\begin{${envName}} matched by \\end{${end.name}}`,
          endNameToken
        );
      }
      return result;
    }
    return {
      type: "environment",
      mode: parser.mode,
      name: envName,
      nameGroup
    };
  }
});
defineFunction({
  type: "envTag",
  names: ["\\env@tag"],
  props: {
    numArgs: 1,
    argTypes: ["math"]
  },
  handler({ parser }, args) {
    return {
      type: "envTag",
      mode: parser.mode,
      body: args[0]
    };
  },
  mathmlBuilder(group, style) {
    return new MathNode("mrow");
  }
});
defineFunction({
  type: "noTag",
  names: ["\\env@notag"],
  props: {
    numArgs: 0
  },
  handler({ parser }) {
    return {
      type: "noTag",
      mode: parser.mode
    };
  },
  mathmlBuilder(group, style) {
    return new MathNode("mrow");
  }
});
var script = Object.freeze({
  B: 8426,
  // Offset from ASCII B to Unicode script B
  E: 8427,
  F: 8427,
  H: 8387,
  I: 8391,
  L: 8390,
  M: 8422,
  R: 8393,
  e: 8394,
  g: 8355,
  o: 8389
});
var frak = Object.freeze({
  C: 8426,
  H: 8388,
  I: 8392,
  R: 8394,
  Z: 8398
});
var bbb = Object.freeze({
  C: 8383,
  // blackboard bold
  H: 8389,
  N: 8391,
  P: 8393,
  Q: 8393,
  R: 8395,
  Z: 8394
});
var bold = Object.freeze({
  "\u03F5": 119527,
  // lunate epsilon
  "\u03D1": 119564,
  // vartheta
  "\u03F0": 119534,
  // varkappa
  "\u03C6": 119577,
  // varphi
  "\u03F1": 119535,
  // varrho
  "\u03D6": 119563
  // varpi
});
var boldItalic = Object.freeze({
  "\u03F5": 119643,
  // lunate epsilon
  "\u03D1": 119680,
  // vartheta
  "\u03F0": 119650,
  // varkappa
  "\u03C6": 119693,
  // varphi
  "\u03F1": 119651,
  // varrho
  "\u03D6": 119679
  // varpi
});
var boldsf = Object.freeze({
  "\u03F5": 119701,
  // lunate epsilon
  "\u03D1": 119738,
  // vartheta
  "\u03F0": 119708,
  // varkappa
  "\u03C6": 119751,
  // varphi
  "\u03F1": 119709,
  // varrho
  "\u03D6": 119737
  // varpi
});
var bisf = Object.freeze({
  "\u03F5": 119759,
  // lunate epsilon
  "\u03D1": 119796,
  // vartheta
  "\u03F0": 119766,
  // varkappa
  "\u03C6": 119809,
  // varphi
  "\u03F1": 119767,
  // varrho
  "\u03D6": 119795
  // varpi
});
var offset = Object.freeze({
  upperCaseLatin: {
    // A-Z
    "normal": (ch) => {
      return 0;
    },
    "bold": (ch) => {
      return 119743;
    },
    "italic": (ch) => {
      return 119795;
    },
    "bold-italic": (ch) => {
      return 119847;
    },
    "script": (ch) => {
      return script[ch] || 119899;
    },
    "script-bold": (ch) => {
      return 119951;
    },
    "fraktur": (ch) => {
      return frak[ch] || 120003;
    },
    "fraktur-bold": (ch) => {
      return 120107;
    },
    "double-struck": (ch) => {
      return bbb[ch] || 120055;
    },
    "sans-serif": (ch) => {
      return 120159;
    },
    "sans-serif-bold": (ch) => {
      return 120211;
    },
    "sans-serif-italic": (ch) => {
      return 120263;
    },
    "sans-serif-bold-italic": (ch) => {
      return 120380;
    },
    "monospace": (ch) => {
      return 120367;
    }
  },
  lowerCaseLatin: {
    // a-z
    "normal": (ch) => {
      return 0;
    },
    "bold": (ch) => {
      return 119737;
    },
    "italic": (ch) => {
      return ch === "h" ? 8358 : 119789;
    },
    "bold-italic": (ch) => {
      return 119841;
    },
    "script": (ch) => {
      return script[ch] || 119893;
    },
    "script-bold": (ch) => {
      return 119945;
    },
    "fraktur": (ch) => {
      return 119997;
    },
    "fraktur-bold": (ch) => {
      return 120101;
    },
    "double-struck": (ch) => {
      return 120049;
    },
    "sans-serif": (ch) => {
      return 120153;
    },
    "sans-serif-bold": (ch) => {
      return 120205;
    },
    "sans-serif-italic": (ch) => {
      return 120257;
    },
    "sans-serif-bold-italic": (ch) => {
      return 120309;
    },
    "monospace": (ch) => {
      return 120361;
    }
  },
  upperCaseGreek: {
    // A-Ω
    "normal": (ch) => {
      return 0;
    },
    "bold": (ch) => {
      return 119575;
    },
    "italic": (ch) => {
      return 119633;
    },
    // \boldsymbol actually returns upright bold for upperCaseGreek
    "bold-italic": (ch) => {
      return 119575;
    },
    "script": (ch) => {
      return 0;
    },
    "script-bold": (ch) => {
      return 0;
    },
    "fraktur": (ch) => {
      return 0;
    },
    "fraktur-bold": (ch) => {
      return 0;
    },
    "double-struck": (ch) => {
      return 0;
    },
    // Unicode has no code points for regular-weight san-serif Greek. Use bold.
    "sans-serif": (ch) => {
      return 119749;
    },
    "sans-serif-bold": (ch) => {
      return 119749;
    },
    "sans-serif-italic": (ch) => {
      return 0;
    },
    "sans-serif-bold-italic": (ch) => {
      return 119807;
    },
    "monospace": (ch) => {
      return 0;
    }
  },
  lowerCaseGreek: {
    // α-ω
    "normal": (ch) => {
      return 0;
    },
    "bold": (ch) => {
      return 119569;
    },
    "italic": (ch) => {
      return 119627;
    },
    "bold-italic": (ch) => {
      return ch === "\u03D5" ? 119678 : 119685;
    },
    "script": (ch) => {
      return 0;
    },
    "script-bold": (ch) => {
      return 0;
    },
    "fraktur": (ch) => {
      return 0;
    },
    "fraktur-bold": (ch) => {
      return 0;
    },
    "double-struck": (ch) => {
      return 0;
    },
    // Unicode has no code points for regular-weight san-serif Greek. Use bold.
    "sans-serif": (ch) => {
      return 119743;
    },
    "sans-serif-bold": (ch) => {
      return 119743;
    },
    "sans-serif-italic": (ch) => {
      return 0;
    },
    "sans-serif-bold-italic": (ch) => {
      return 119801;
    },
    "monospace": (ch) => {
      return 0;
    }
  },
  varGreek: {
    // \varGamma, etc
    "normal": (ch) => {
      return 0;
    },
    "bold": (ch) => {
      return bold[ch] || -51;
    },
    "italic": (ch) => {
      return 0;
    },
    "bold-italic": (ch) => {
      return boldItalic[ch] || 58;
    },
    "script": (ch) => {
      return 0;
    },
    "script-bold": (ch) => {
      return 0;
    },
    "fraktur": (ch) => {
      return 0;
    },
    "fraktur-bold": (ch) => {
      return 0;
    },
    "double-struck": (ch) => {
      return 0;
    },
    "sans-serif": (ch) => {
      return boldsf[ch] || 116;
    },
    "sans-serif-bold": (ch) => {
      return boldsf[ch] || 116;
    },
    "sans-serif-italic": (ch) => {
      return 0;
    },
    "sans-serif-bold-italic": (ch) => {
      return bisf[ch] || 174;
    },
    "monospace": (ch) => {
      return 0;
    }
  },
  numeral: {
    // 0-9
    "normal": (ch) => {
      return 0;
    },
    "bold": (ch) => {
      return 120734;
    },
    "italic": (ch) => {
      return 0;
    },
    "bold-italic": (ch) => {
      return 0;
    },
    "script": (ch) => {
      return 0;
    },
    "script-bold": (ch) => {
      return 0;
    },
    "fraktur": (ch) => {
      return 0;
    },
    "fraktur-bold": (ch) => {
      return 0;
    },
    "double-struck": (ch) => {
      return 120744;
    },
    "sans-serif": (ch) => {
      return 120754;
    },
    "sans-serif-bold": (ch) => {
      return 120764;
    },
    "sans-serif-italic": (ch) => {
      return 0;
    },
    "sans-serif-bold-italic": (ch) => {
      return 0;
    },
    "monospace": (ch) => {
      return 120774;
    }
  }
});
var variantChar = (ch, variant) => {
  const codePoint = ch.codePointAt(0);
  const block = 64 < codePoint && codePoint < 91 ? "upperCaseLatin" : 96 < codePoint && codePoint < 123 ? "lowerCaseLatin" : 912 < codePoint && codePoint < 938 ? "upperCaseGreek" : 944 < codePoint && codePoint < 970 || ch === "\u03D5" ? "lowerCaseGreek" : 120545 < codePoint && codePoint < 120572 || bold[ch] ? "varGreek" : 47 < codePoint && codePoint < 58 ? "numeral" : "other";
  return block === "other" ? ch : String.fromCodePoint(codePoint + offset[block][variant](ch));
};
var smallCaps = Object.freeze({
  a: "\u1D00",
  b: "\u0299",
  c: "\u1D04",
  d: "\u1D05",
  e: "\u1D07",
  f: "\uA730",
  g: "\u0262",
  h: "\u029C",
  i: "\u026A",
  j: "\u1D0A",
  k: "\u1D0B",
  l: "\u029F",
  m: "\u1D0D",
  n: "\u0274",
  o: "\u1D0F",
  p: "\u1D18",
  q: "\u01EB",
  r: "\u0280",
  s: "s",
  t: "\u1D1B",
  u: "\u1D1C",
  v: "\u1D20",
  w: "\u1D21",
  x: "x",
  y: "\u028F",
  z: "\u1D22"
});
var varNameFonts = ["mathrm", "mathit"];
var isLongVariableName = (group, font) => {
  if (!varNameFonts.includes(font) || !group.body || group.body.type !== "ordgroup" || group.body.body.length === 1) {
    return false;
  }
  if (group.body.body[0].type !== "mathord") {
    return false;
  }
  for (let i = 1; i < group.body.body.length; i++) {
    const parseNodeType = group.body.body[i].type;
    if (!(parseNodeType === "mathord" || parseNodeType === "textord" && !isNaN(group.body.body[i].text))) {
      return false;
    }
  }
  return true;
};
var mathmlBuilder$6 = (group, style) => {
  const font = group.font;
  const newStyle = style.withFont(font);
  const mathGroup = buildGroup$1(group.body, newStyle);
  if (mathGroup.children.length === 0) {
    return mathGroup;
  }
  if (font === "boldsymbol" && ["mo", "mpadded", "mrow"].includes(mathGroup.type)) {
    mathGroup.style.fontWeight = "bold";
    return mathGroup;
  }
  if (isLongVariableName(group, font)) {
    const mi2 = mathGroup.children[0].children[0].children ? mathGroup.children[0].children[0] : mathGroup.children[0];
    delete mi2.attributes.mathvariant;
    for (let i = 1; i < mathGroup.children.length; i++) {
      mi2.children[0].text += mathGroup.children[i].children[0].children ? mathGroup.children[i].children[0].children[0].text : mathGroup.children[i].children[0].text;
    }
    if (font === "mathit") {
      mi2.children[0].text = mi2.children[0].text.split("").map((c) => variantChar(c, "italic")).join("");
      return mi2;
    }
    const mpadded = new MathNode("mpadded", [mi2]);
    mpadded.setAttribute("lspace", "0");
    return mpadded;
  }
  let canConsolidate = mathGroup.children[0].type === "mo";
  for (let i = 1; i < mathGroup.children.length; i++) {
    if (mathGroup.children[i].type === "mo" && font === "boldsymbol") {
      mathGroup.children[i].style.fontWeight = "bold";
    }
    if (mathGroup.children[i].type !== "mi") {
      canConsolidate = false;
    }
    const localVariant = mathGroup.children[i].attributes && mathGroup.children[i].attributes.mathvariant || "";
    if (localVariant !== "normal") {
      canConsolidate = false;
    }
  }
  if (!canConsolidate) {
    return mathGroup;
  }
  const mi = mathGroup.children[0];
  for (let i = 1; i < mathGroup.children.length; i++) {
    mi.children.push(mathGroup.children[i].children[0]);
  }
  if (mi.attributes.mathvariant && mi.attributes.mathvariant === "normal") {
    const bogus = new MathNode("mtext", new TextNode2("\u200B"));
    return new MathNode("mrow", [bogus, mi]);
  }
  return mi;
};
var fontAliases = {
  "\\Bbb": "\\mathbb",
  "\\bold": "\\mathbf",
  "\\frak": "\\mathfrak",
  "\\bm": "\\boldsymbol"
};
defineFunction({
  type: "font",
  names: [
    // styles
    "\\mathrm",
    "\\mathit",
    "\\mathbf",
    "\\mathnormal",
    "\\up@greek",
    "\\boldsymbol",
    // families
    "\\mathbb",
    "\\mathcal",
    "\\mathfrak",
    "\\mathscr",
    "\\mathsf",
    "\\mathsfit",
    "\\mathtt",
    // aliases
    "\\Bbb",
    "\\bm",
    "\\bold",
    "\\frak"
  ],
  props: {
    numArgs: 1,
    allowedInArgument: true
  },
  handler: ({ parser, funcName }, args) => {
    const body = normalizeArgument(args[0]);
    let func = funcName;
    if (func in fontAliases) {
      func = fontAliases[func];
    }
    return {
      type: "font",
      mode: parser.mode,
      font: func.slice(1),
      body
    };
  },
  mathmlBuilder: mathmlBuilder$6
});
defineFunction({
  type: "font",
  names: ["\\rm", "\\sf", "\\tt", "\\bf", "\\it", "\\cal"],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler: ({ parser, funcName, breakOnTokenText }, args) => {
    const { mode } = parser;
    const body = parser.parseExpression(true, breakOnTokenText, true);
    const fontStyle = `math${funcName.slice(1)}`;
    return {
      type: "font",
      mode,
      font: fontStyle,
      body: {
        type: "ordgroup",
        mode: parser.mode,
        body
      }
    };
  },
  mathmlBuilder: mathmlBuilder$6
});
var stylArray = ["display", "text", "script", "scriptscript"];
var scriptLevel = { auto: -1, display: 0, text: 0, script: 1, scriptscript: 2 };
var adjustStyle = (functionSize, originalStyle) => {
  let style = originalStyle;
  if (functionSize === "display") {
    const newSize = style.level >= StyleLevel.SCRIPT ? StyleLevel.TEXT : StyleLevel.DISPLAY;
    style = style.withLevel(newSize);
  } else if (functionSize === "text" && style.level === StyleLevel.DISPLAY) {
    style = style.withLevel(StyleLevel.TEXT);
  } else if (functionSize === "auto") {
    style = style.incrementLevel();
  } else if (functionSize === "script") {
    style = style.withLevel(StyleLevel.SCRIPT);
  } else if (functionSize === "scriptscript") {
    style = style.withLevel(StyleLevel.SCRIPTSCRIPT);
  }
  return style;
};
var mathmlBuilder$5 = (group, style) => {
  style = adjustStyle(group.scriptLevel, style);
  const numer = buildGroup$1(group.numer, style);
  const denom = buildGroup$1(group.denom, style);
  if (style.level === 3) {
    numer.style.mathDepth = "2";
    numer.setAttribute("scriptlevel", "2");
    denom.style.mathDepth = "2";
    denom.setAttribute("scriptlevel", "2");
  }
  let node = new MathNode("mfrac", [numer, denom]);
  if (!group.hasBarLine) {
    node.setAttribute("linethickness", "0px");
  } else if (group.barSize) {
    const ruleWidth = calculateSize(group.barSize, style);
    node.setAttribute("linethickness", ruleWidth.number + ruleWidth.unit);
  }
  if (group.leftDelim != null || group.rightDelim != null) {
    const withDelims = [];
    if (group.leftDelim != null) {
      const leftOp = new MathNode("mo", [
        new TextNode2(group.leftDelim.replace("\\", ""))
      ]);
      leftOp.setAttribute("fence", "true");
      withDelims.push(leftOp);
    }
    withDelims.push(node);
    if (group.rightDelim != null) {
      const rightOp = new MathNode("mo", [
        new TextNode2(group.rightDelim.replace("\\", ""))
      ]);
      rightOp.setAttribute("fence", "true");
      withDelims.push(rightOp);
    }
    node = makeRow(withDelims);
  }
  if (group.scriptLevel !== "auto") {
    node = new MathNode("mstyle", [node]);
    node.setAttribute("displaystyle", String(group.scriptLevel === "display"));
    node.setAttribute("scriptlevel", scriptLevel[group.scriptLevel]);
  }
  return node;
};
defineFunction({
  type: "genfrac",
  names: [
    "\\cfrac",
    "\\dfrac",
    "\\frac",
    "\\tfrac",
    "\\dbinom",
    "\\binom",
    "\\tbinom",
    "\\\\atopfrac",
    // can’t be entered directly
    "\\\\bracefrac",
    "\\\\brackfrac"
    // ditto
  ],
  props: {
    numArgs: 2,
    allowedInArgument: true
  },
  handler: ({ parser, funcName }, args) => {
    const numer = args[0];
    const denom = args[1];
    let hasBarLine = false;
    let leftDelim = null;
    let rightDelim = null;
    let scriptLevel2 = "auto";
    switch (funcName) {
      case "\\cfrac":
      case "\\dfrac":
      case "\\frac":
      case "\\tfrac":
        hasBarLine = true;
        break;
      case "\\\\atopfrac":
        hasBarLine = false;
        break;
      case "\\dbinom":
      case "\\binom":
      case "\\tbinom":
        leftDelim = "(";
        rightDelim = ")";
        break;
      case "\\\\bracefrac":
        leftDelim = "\\{";
        rightDelim = "\\}";
        break;
      case "\\\\brackfrac":
        leftDelim = "[";
        rightDelim = "]";
        break;
      default:
        throw new Error("Unrecognized genfrac command");
    }
    if (funcName === "\\cfrac" || funcName.startsWith("\\d")) {
      scriptLevel2 = "display";
    } else if (funcName.startsWith("\\t")) {
      scriptLevel2 = "text";
    }
    return {
      type: "genfrac",
      mode: parser.mode,
      continued: false,
      numer,
      denom,
      hasBarLine,
      leftDelim,
      rightDelim,
      scriptLevel: scriptLevel2,
      barSize: null
    };
  },
  mathmlBuilder: mathmlBuilder$5
});
defineFunction({
  type: "infix",
  names: ["\\over", "\\choose", "\\atop", "\\brace", "\\brack"],
  props: {
    numArgs: 0,
    infix: true
  },
  handler({ parser, funcName, token }) {
    let replaceWith;
    switch (funcName) {
      case "\\over":
        replaceWith = "\\frac";
        break;
      case "\\choose":
        replaceWith = "\\binom";
        break;
      case "\\atop":
        replaceWith = "\\\\atopfrac";
        break;
      case "\\brace":
        replaceWith = "\\\\bracefrac";
        break;
      case "\\brack":
        replaceWith = "\\\\brackfrac";
        break;
      default:
        throw new Error("Unrecognized infix genfrac command");
    }
    return {
      type: "infix",
      mode: parser.mode,
      replaceWith,
      token
    };
  }
});
var delimFromValue = function(delimString) {
  let delim = null;
  if (delimString.length > 0) {
    delim = delimString;
    delim = delim === "." ? null : delim;
  }
  return delim;
};
defineFunction({
  type: "genfrac",
  names: ["\\genfrac"],
  props: {
    numArgs: 6,
    allowedInArgument: true,
    argTypes: ["math", "math", "size", "text", "math", "math"]
  },
  handler({ parser }, args) {
    const numer = args[4];
    const denom = args[5];
    const leftNode = normalizeArgument(args[0]);
    const leftDelim = leftNode.type === "atom" && leftNode.family === "open" ? delimFromValue(leftNode.text) : null;
    const rightNode = normalizeArgument(args[1]);
    const rightDelim = rightNode.type === "atom" && rightNode.family === "close" ? delimFromValue(rightNode.text) : null;
    const barNode = assertNodeType(args[2], "size");
    let hasBarLine;
    let barSize = null;
    if (barNode.isBlank) {
      hasBarLine = true;
    } else {
      barSize = barNode.value;
      hasBarLine = barSize.number > 0;
    }
    let scriptLevel2 = "auto";
    let styl = args[3];
    if (styl.type === "ordgroup") {
      if (styl.body.length > 0) {
        const textOrd = assertNodeType(styl.body[0], "textord");
        scriptLevel2 = stylArray[Number(textOrd.text)];
      }
    } else {
      styl = assertNodeType(styl, "textord");
      scriptLevel2 = stylArray[Number(styl.text)];
    }
    return {
      type: "genfrac",
      mode: parser.mode,
      numer,
      denom,
      continued: false,
      hasBarLine,
      barSize,
      leftDelim,
      rightDelim,
      scriptLevel: scriptLevel2
    };
  },
  mathmlBuilder: mathmlBuilder$5
});
defineFunction({
  type: "infix",
  names: ["\\above"],
  props: {
    numArgs: 1,
    argTypes: ["size"],
    infix: true
  },
  handler({ parser, funcName, token }, args) {
    return {
      type: "infix",
      mode: parser.mode,
      replaceWith: "\\\\abovefrac",
      barSize: assertNodeType(args[0], "size").value,
      token
    };
  }
});
defineFunction({
  type: "genfrac",
  names: ["\\\\abovefrac"],
  props: {
    numArgs: 3,
    argTypes: ["math", "size", "math"]
  },
  handler: ({ parser, funcName }, args) => {
    const numer = args[0];
    const barSize = assert(assertNodeType(args[1], "infix").barSize);
    const denom = args[2];
    const hasBarLine = barSize.number > 0;
    return {
      type: "genfrac",
      mode: parser.mode,
      numer,
      denom,
      continued: false,
      hasBarLine,
      barSize,
      leftDelim: null,
      rightDelim: null,
      scriptLevel: "auto"
    };
  },
  mathmlBuilder: mathmlBuilder$5
});
defineFunction({
  type: "hbox",
  names: ["\\hbox"],
  props: {
    numArgs: 1,
    argTypes: ["hbox"],
    allowedInArgument: true,
    allowedInText: false
  },
  handler({ parser }, args) {
    return {
      type: "hbox",
      mode: parser.mode,
      body: ordargument(args[0])
    };
  },
  mathmlBuilder(group, style) {
    const newStyle = style.withLevel(StyleLevel.TEXT);
    const mrow = buildExpressionRow(group.body, newStyle);
    return consolidateText(mrow);
  }
});
var mathmlBuilder$4 = (group, style) => {
  const accentNode2 = mathMLnode(group.label);
  accentNode2.style["math-depth"] = 0;
  return new MathNode(group.isOver ? "mover" : "munder", [
    buildGroup$1(group.base, style),
    accentNode2
  ]);
};
defineFunction({
  type: "horizBracket",
  names: ["\\overbrace", "\\underbrace", "\\overbracket", "\\underbracket"],
  props: {
    numArgs: 1
  },
  handler({ parser, funcName }, args) {
    return {
      type: "horizBracket",
      mode: parser.mode,
      label: funcName,
      isOver: /^\\over/.test(funcName),
      base: args[0]
    };
  },
  mathmlBuilder: mathmlBuilder$4
});
defineFunction({
  type: "html",
  names: ["\\class", "\\id", "\\style", "\\data"],
  props: {
    numArgs: 2,
    argTypes: ["raw", "original"],
    allowedInText: true
  },
  handler: ({ parser, funcName, token }, args) => {
    const value = assertNodeType(args[0], "raw").string;
    const body = args[1];
    if (parser.settings.strict) {
      throw new ParseError(`Function "${funcName}" is disabled in strict mode`, token);
    }
    let trustContext;
    const attributes = {};
    switch (funcName) {
      case "\\class":
        attributes.class = value;
        trustContext = {
          command: "\\class",
          class: value
        };
        break;
      case "\\id":
        attributes.id = value;
        trustContext = {
          command: "\\id",
          id: value
        };
        break;
      case "\\style":
        attributes.style = value;
        trustContext = {
          command: "\\style",
          style: value
        };
        break;
      case "\\data": {
        const data = value.split(",");
        for (let i = 0; i < data.length; i++) {
          const keyVal = data[i].split("=");
          if (keyVal.length !== 2) {
            throw new ParseError("Error parsing key-value for \\data");
          }
          attributes["data-" + keyVal[0].trim()] = keyVal[1].trim();
        }
        trustContext = {
          command: "\\data",
          attributes
        };
        break;
      }
      default:
        throw new Error("Unrecognized html command");
    }
    if (!parser.settings.isTrusted(trustContext)) {
      throw new ParseError(`Function "${funcName}" is not trusted`, token);
    }
    return {
      type: "html",
      mode: parser.mode,
      attributes,
      body: ordargument(body)
    };
  },
  mathmlBuilder: (group, style) => {
    const element = buildExpressionRow(group.body, style);
    const classes = [];
    if (group.attributes.class) {
      classes.push(...group.attributes.class.trim().split(/\s+/));
    }
    element.classes = classes;
    for (const attr in group.attributes) {
      if (attr !== "class" && Object.prototype.hasOwnProperty.call(group.attributes, attr)) {
        element.setAttribute(attr, group.attributes[attr]);
      }
    }
    return element;
  }
});
var sizeData = function(str) {
  if (/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(str)) {
    return { number: +str, unit: "bp" };
  } else {
    const match = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(str);
    if (!match) {
      throw new ParseError("Invalid size: '" + str + "' in \\includegraphics");
    }
    const data = {
      number: +(match[1] + match[2]),
      // sign + magnitude, cast to number
      unit: match[3]
    };
    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "' in \\includegraphics.");
    }
    return data;
  }
};
defineFunction({
  type: "includegraphics",
  names: ["\\includegraphics"],
  props: {
    numArgs: 1,
    numOptionalArgs: 1,
    argTypes: ["raw", "url"],
    allowedInText: false
  },
  handler: ({ parser, token }, args, optArgs) => {
    let width = { number: 0, unit: "em" };
    let height = { number: 0.9, unit: "em" };
    let totalheight = { number: 0, unit: "em" };
    let alt = "";
    if (optArgs[0]) {
      const attributeStr = assertNodeType(optArgs[0], "raw").string;
      const attributes = attributeStr.split(",");
      for (let i = 0; i < attributes.length; i++) {
        const keyVal = attributes[i].split("=");
        if (keyVal.length === 2) {
          const str = keyVal[1].trim();
          switch (keyVal[0].trim()) {
            case "alt":
              alt = str;
              break;
            case "width":
              width = sizeData(str);
              break;
            case "height":
              height = sizeData(str);
              break;
            case "totalheight":
              totalheight = sizeData(str);
              break;
            default:
              throw new ParseError("Invalid key: '" + keyVal[0] + "' in \\includegraphics.");
          }
        }
      }
    }
    const src = assertNodeType(args[0], "url").url;
    if (alt === "") {
      alt = src;
      alt = alt.replace(/^.*[\\/]/, "");
      alt = alt.substring(0, alt.lastIndexOf("."));
    }
    if (!parser.settings.isTrusted({
      command: "\\includegraphics",
      url: src
    })) {
      throw new ParseError(`Function "\\includegraphics" is not trusted`, token);
    }
    return {
      type: "includegraphics",
      mode: parser.mode,
      alt,
      width,
      height,
      totalheight,
      src
    };
  },
  mathmlBuilder: (group, style) => {
    const height = calculateSize(group.height, style);
    const depth = { number: 0, unit: "em" };
    if (group.totalheight.number > 0) {
      if (group.totalheight.unit === height.unit && group.totalheight.number > height.number) {
        depth.number = group.totalheight.number - height.number;
        depth.unit = height.unit;
      }
    }
    let width = 0;
    if (group.width.number > 0) {
      width = calculateSize(group.width, style);
    }
    const graphicStyle = { height: height.number + depth.number + "em" };
    if (width.number > 0) {
      graphicStyle.width = width.number + width.unit;
    }
    if (depth.number > 0) {
      graphicStyle.verticalAlign = -depth.number + depth.unit;
    }
    const node = new Img(group.src, group.alt, graphicStyle);
    node.height = height;
    node.depth = depth;
    return new MathNode("mtext", [node]);
  }
});
defineFunction({
  type: "kern",
  names: ["\\kern", "\\mkern", "\\hskip", "\\mskip"],
  props: {
    numArgs: 1,
    argTypes: ["size"],
    primitive: true,
    allowedInText: true
  },
  handler({ parser, funcName, token }, args) {
    const size = assertNodeType(args[0], "size");
    if (parser.settings.strict) {
      const mathFunction = funcName[1] === "m";
      const muUnit = size.value.unit === "mu";
      if (mathFunction) {
        if (!muUnit) {
          throw new ParseError(`LaTeX's ${funcName} supports only mu units, not ${size.value.unit} units`, token);
        }
        if (parser.mode !== "math") {
          throw new ParseError(`LaTeX's ${funcName} works only in math mode`, token);
        }
      } else {
        if (muUnit) {
          throw new ParseError(`LaTeX's ${funcName} doesn't support mu units`, token);
        }
      }
    }
    return {
      type: "kern",
      mode: parser.mode,
      dimension: size.value
    };
  },
  mathmlBuilder(group, style) {
    const dimension = calculateSize(group.dimension, style);
    const ch = dimension.number > 0 && dimension.unit === "em" ? spaceCharacter(dimension.number) : "";
    if (group.mode === "text" && ch.length > 0) {
      const character = new TextNode2(ch);
      return new MathNode("mtext", [character]);
    } else {
      if (dimension.number >= 0) {
        const node = new MathNode("mspace");
        node.setAttribute("width", dimension.number + dimension.unit);
        return node;
      } else {
        const node = new MathNode("mrow");
        node.style.marginLeft = dimension.number + dimension.unit;
        return node;
      }
    }
  }
});
var spaceCharacter = function(width) {
  if (width >= 0.05555 && width <= 0.05556) {
    return "\u200A";
  } else if (width >= 0.1666 && width <= 0.1667) {
    return "\u2009";
  } else if (width >= 0.2222 && width <= 0.2223) {
    return "\u2005";
  } else if (width >= 0.2777 && width <= 0.2778) {
    return "\u2005\u200A";
  } else {
    return "";
  }
};
var invalidIdRegEx = /[^A-Za-z_0-9-]/g;
defineFunction({
  type: "label",
  names: ["\\label"],
  props: {
    numArgs: 1,
    argTypes: ["raw"]
  },
  handler({ parser }, args) {
    return {
      type: "label",
      mode: parser.mode,
      string: args[0].string.replace(invalidIdRegEx, "")
    };
  },
  mathmlBuilder(group, style) {
    const node = new MathNode("mrow", [], ["tml-label"]);
    if (group.string.length > 0) {
      node.setLabel(group.string);
    }
    return node;
  }
});
var textModeLap = ["\\clap", "\\llap", "\\rlap"];
defineFunction({
  type: "lap",
  names: ["\\mathllap", "\\mathrlap", "\\mathclap", "\\clap", "\\llap", "\\rlap"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser, funcName, token }, args) => {
    if (textModeLap.includes(funcName)) {
      if (parser.settings.strict && parser.mode !== "text") {
        throw new ParseError(`{${funcName}} can be used only in text mode.
 Try \\math${funcName.slice(1)}`, token);
      }
      funcName = funcName.slice(1);
    } else {
      funcName = funcName.slice(5);
    }
    const body = args[0];
    return {
      type: "lap",
      mode: parser.mode,
      alignment: funcName,
      body
    };
  },
  mathmlBuilder: (group, style) => {
    let strut;
    if (group.alignment === "llap") {
      const phantomInner = buildExpression(ordargument(group.body), style);
      const phantom2 = new MathNode("mphantom", phantomInner);
      strut = new MathNode("mpadded", [phantom2]);
      strut.setAttribute("width", "0.1px");
    }
    const inner2 = buildGroup$1(group.body, style);
    let node;
    if (group.alignment === "llap") {
      inner2.style.position = "absolute";
      inner2.style.right = "0";
      inner2.style.bottom = `0`;
      node = new MathNode("mpadded", [strut, inner2]);
    } else {
      node = new MathNode("mpadded", [inner2]);
    }
    if (group.alignment === "rlap") {
      if (group.body.body.length > 0 && group.body.body[0].type === "genfrac") {
        node.setAttribute("lspace", "0.16667em");
      }
    } else {
      const offset2 = group.alignment === "llap" ? "-1" : "-0.5";
      node.setAttribute("lspace", offset2 + "width");
      if (group.alignment === "llap") {
        node.style.position = "relative";
      } else {
        node.style.display = "flex";
        node.style.justifyContent = "center";
      }
    }
    node.setAttribute("width", "0.1px");
    return node;
  }
});
defineFunction({
  type: "ordgroup",
  names: ["\\(", "$"],
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInMath: false
  },
  handler({ funcName, parser }, args) {
    const outerMode = parser.mode;
    parser.switchMode("math");
    const close2 = funcName === "\\(" ? "\\)" : "$";
    const body = parser.parseExpression(false, close2);
    parser.expect(close2);
    parser.switchMode(outerMode);
    return {
      type: "ordgroup",
      mode: parser.mode,
      body
    };
  }
});
defineFunction({
  type: "text",
  // Doesn't matter what this is.
  names: ["\\)", "\\]"],
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInMath: false
  },
  handler(context, token) {
    throw new ParseError(`Mismatched ${context.funcName}`, token);
  }
});
var chooseStyle = (group, style) => {
  switch (style.level) {
    case StyleLevel.DISPLAY:
      return group.display;
    case StyleLevel.TEXT:
      return group.text;
    case StyleLevel.SCRIPT:
      return group.script;
    case StyleLevel.SCRIPTSCRIPT:
      return group.scriptscript;
    default:
      return group.text;
  }
};
defineFunction({
  type: "mathchoice",
  names: ["\\mathchoice"],
  props: {
    numArgs: 4,
    primitive: true
  },
  handler: ({ parser }, args) => {
    return {
      type: "mathchoice",
      mode: parser.mode,
      display: ordargument(args[0]),
      text: ordargument(args[1]),
      script: ordargument(args[2]),
      scriptscript: ordargument(args[3])
    };
  },
  mathmlBuilder: (group, style) => {
    const body = chooseStyle(group, style);
    return buildExpressionRow(body, style);
  }
});
var textAtomTypes = ["text", "textord", "mathord", "atom"];
function mathmlBuilder$3(group, style) {
  let node;
  const inner2 = buildExpression(group.body, style);
  if (group.mclass === "minner") {
    node = new MathNode("mpadded", inner2);
  } else if (group.mclass === "mord") {
    if (group.isCharacterBox || inner2[0].type === "mathord") {
      node = inner2[0];
      node.type = "mi";
      if (node.children.length === 1 && node.children[0].text && node.children[0].text === "\u2207") {
        node.setAttribute("mathvariant", "normal");
      }
    } else {
      node = new MathNode("mi", inner2);
    }
  } else {
    node = new MathNode("mrow", inner2);
    if (group.mustPromote) {
      node = inner2[0];
      node.type = "mo";
      if (group.isCharacterBox && group.body[0].text && /[A-Za-z]/.test(group.body[0].text)) {
        node.setAttribute("mathvariant", "italic");
      }
    } else {
      node = new MathNode("mrow", inner2);
    }
    const doSpacing = style.level < 2;
    if (node.type === "mrow") {
      if (doSpacing) {
        if (group.mclass === "mbin") {
          node.children.unshift(padding(0.2222));
          node.children.push(padding(0.2222));
        } else if (group.mclass === "mrel") {
          node.children.unshift(padding(0.2778));
          node.children.push(padding(0.2778));
        } else if (group.mclass === "mpunct") {
          node.children.push(padding(0.1667));
        } else if (group.mclass === "minner") {
          node.children.unshift(padding(0.0556));
          node.children.push(padding(0.0556));
        }
      }
    } else {
      if (group.mclass === "mbin") {
        node.attributes.lspace = doSpacing ? "0.2222em" : "0";
        node.attributes.rspace = doSpacing ? "0.2222em" : "0";
      } else if (group.mclass === "mrel") {
        node.attributes.lspace = doSpacing ? "0.2778em" : "0";
        node.attributes.rspace = doSpacing ? "0.2778em" : "0";
      } else if (group.mclass === "mpunct") {
        node.attributes.lspace = "0em";
        node.attributes.rspace = doSpacing ? "0.1667em" : "0";
      } else if (group.mclass === "mopen" || group.mclass === "mclose") {
        node.attributes.lspace = "0em";
        node.attributes.rspace = "0em";
      } else if (group.mclass === "minner" && doSpacing) {
        node.attributes.lspace = "0.0556em";
        node.attributes.width = "+0.1111em";
      }
    }
    if (!(group.mclass === "mopen" || group.mclass === "mclose")) {
      delete node.attributes.stretchy;
      delete node.attributes.form;
    }
  }
  return node;
}
defineFunction({
  type: "mclass",
  names: [
    "\\mathord",
    "\\mathbin",
    "\\mathrel",
    "\\mathopen",
    "\\mathclose",
    "\\mathpunct",
    "\\mathinner"
  ],
  props: {
    numArgs: 1,
    primitive: true
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    const isCharacterBox$1 = isCharacterBox(body);
    let mustPromote = true;
    const mord = { type: "mathord", text: "", mode: parser.mode };
    const arr = body.body ? body.body : [body];
    for (const arg2 of arr) {
      if (textAtomTypes.includes(arg2.type)) {
        if (symbols2[parser.mode][arg2.text]) {
          mord.text += symbols2[parser.mode][arg2.text].replace;
        } else if (arg2.text) {
          mord.text += arg2.text;
        } else if (arg2.body) {
          arg2.body.map((e) => {
            mord.text += e.text;
          });
        }
      } else {
        mustPromote = false;
        break;
      }
    }
    if (mustPromote && funcName === "\\mathord" && mord.type === "mathord" && mord.text.length > 1) {
      return mord;
    } else {
      return {
        type: "mclass",
        mode: parser.mode,
        mclass: "m" + funcName.slice(5),
        body: ordargument(mustPromote ? mord : body),
        isCharacterBox: isCharacterBox$1,
        mustPromote
      };
    }
  },
  mathmlBuilder: mathmlBuilder$3
});
var binrelClass = (arg2) => {
  const atom = arg2.type === "ordgroup" && arg2.body.length && arg2.body.length === 1 ? arg2.body[0] : arg2;
  if (atom.type === "atom") {
    const family = arg2.body.length > 0 && arg2.body[0].text && symbols2.math[arg2.body[0].text] ? symbols2.math[arg2.body[0].text].group : atom.family;
    if (family === "bin" || family === "rel") {
      return "m" + family;
    } else {
      return "mord";
    }
  } else {
    return "mord";
  }
};
defineFunction({
  type: "mclass",
  names: ["\\@binrel"],
  props: {
    numArgs: 2
  },
  handler({ parser }, args) {
    return {
      type: "mclass",
      mode: parser.mode,
      mclass: binrelClass(args[0]),
      body: ordargument(args[1]),
      isCharacterBox: isCharacterBox(args[1])
    };
  }
});
defineFunction({
  type: "mclass",
  names: ["\\stackrel", "\\overset", "\\underset"],
  props: {
    numArgs: 2
  },
  handler({ parser, funcName }, args) {
    const baseArg = args[1];
    const shiftedArg = args[0];
    let mclass;
    if (funcName !== "\\stackrel") {
      mclass = binrelClass(baseArg);
    } else {
      mclass = "mrel";
    }
    const baseType = mclass === "mrel" || mclass === "mbin" ? "op" : "ordgroup";
    const baseOp = {
      type: baseType,
      mode: baseArg.mode,
      limits: true,
      alwaysHandleSupSub: true,
      parentIsSupSub: false,
      symbol: false,
      suppressBaseShift: funcName !== "\\stackrel",
      body: ordargument(baseArg)
    };
    return {
      type: "supsub",
      mode: shiftedArg.mode,
      stack: true,
      base: baseOp,
      sup: funcName === "\\underset" ? null : shiftedArg,
      sub: funcName === "\\underset" ? shiftedArg : null
    };
  },
  mathmlBuilder: mathmlBuilder$3
});
var buildGroup = (el, style, noneNode) => {
  if (!el) {
    return noneNode;
  }
  const node = buildGroup$1(el, style);
  if (node.type === "mrow" && node.children.length === 0) {
    return noneNode;
  }
  return node;
};
defineFunction({
  type: "multiscript",
  names: ["\\sideset", "\\pres@cript"],
  // See macros.js for \prescript
  props: {
    numArgs: 3
  },
  handler({ parser, funcName, token }, args) {
    if (args[2].body.length === 0) {
      throw new ParseError(funcName + `cannot parse an empty base.`);
    }
    const base = args[2].body[0];
    if (parser.settings.strict && funcName === "\\sideset" && !base.symbol) {
      throw new ParseError(`The base of \\sideset must be a big operator. Try \\prescript.`);
    }
    if (args[0].body.length > 0 && args[0].body[0].type !== "supsub" || args[1].body.length > 0 && args[1].body[0].type !== "supsub") {
      throw new ParseError("\\sideset can parse only subscripts and superscripts in its first two arguments", token);
    }
    const prescripts = args[0].body.length > 0 ? args[0].body[0] : null;
    const postscripts = args[1].body.length > 0 ? args[1].body[0] : null;
    if (!prescripts && !postscripts) {
      return base;
    } else if (!prescripts) {
      return {
        type: "styling",
        mode: parser.mode,
        scriptLevel: "text",
        body: [{
          type: "supsub",
          mode: parser.mode,
          base,
          sup: postscripts.sup,
          sub: postscripts.sub
        }]
      };
    } else {
      return {
        type: "multiscript",
        mode: parser.mode,
        isSideset: funcName === "\\sideset",
        prescripts,
        postscripts,
        base
      };
    }
  },
  mathmlBuilder(group, style) {
    const base = buildGroup$1(group.base, style);
    const prescriptsNode = new MathNode("mprescripts");
    const noneNode = new MathNode("none");
    let children = [];
    const preSub = buildGroup(group.prescripts.sub, style, noneNode);
    const preSup = buildGroup(group.prescripts.sup, style, noneNode);
    if (group.isSideset) {
      preSub.setAttribute("style", "text-align: left;");
      preSup.setAttribute("style", "text-align: left;");
    }
    if (group.postscripts) {
      const postSub = buildGroup(group.postscripts.sub, style, noneNode);
      const postSup = buildGroup(group.postscripts.sup, style, noneNode);
      children = [base, postSub, postSup, prescriptsNode, preSub, preSup];
    } else {
      children = [base, prescriptsNode, preSub, preSup];
    }
    return new MathNode("mmultiscripts", children);
  }
});
defineFunction({
  type: "not",
  names: ["\\not"],
  props: {
    numArgs: 1,
    primitive: true,
    allowedInText: false
  },
  handler({ parser }, args) {
    const isCharacterBox$1 = isCharacterBox(args[0]);
    let body;
    if (isCharacterBox$1) {
      body = ordargument(args[0]);
      if (body[0].text.charAt(0) === "\\") {
        body[0].text = symbols2.math[body[0].text].replace;
      }
      body[0].text = body[0].text.slice(0, 1) + "\u0338" + body[0].text.slice(1);
    } else {
      const notNode = { type: "textord", mode: "math", text: "\u0338" };
      const kernNode = { type: "kern", mode: "math", dimension: { number: -0.6, unit: "em" } };
      body = [notNode, kernNode, args[0]];
    }
    return {
      type: "not",
      mode: parser.mode,
      body,
      isCharacterBox: isCharacterBox$1
    };
  },
  mathmlBuilder(group, style) {
    if (group.isCharacterBox) {
      const inner2 = buildExpression(group.body, style, true);
      return inner2[0];
    } else {
      return buildExpressionRow(group.body, style);
    }
  }
});
var ordAtomTypes = ["textord", "mathord", "atom"];
var noSuccessor = ["\\smallint"];
var ordTypes = ["textord", "mathord", "ordgroup", "close", "leftright", "font"];
var setSpacing = (node) => {
  node.attributes.lspace = "0.1667em";
  node.attributes.rspace = "0.1667em";
};
var mathmlBuilder$2 = (group, style) => {
  let node;
  if (group.symbol) {
    node = new MathNode("mo", [makeText(group.name, group.mode)]);
    if (noSuccessor.includes(group.name)) {
      node.setAttribute("largeop", "false");
    } else {
      node.setAttribute("movablelimits", "false");
    }
    if (group.fromMathOp) {
      setSpacing(node);
    }
  } else if (group.body) {
    node = new MathNode("mo", buildExpression(group.body, style));
    if (group.fromMathOp) {
      setSpacing(node);
    }
  } else {
    node = new MathNode("mi", [new TextNode2(group.name.slice(1))]);
    if (!group.parentIsSupSub) {
      const operator = new MathNode("mo", [makeText("\u2061", "text")]);
      const row = [node, operator];
      if (group.needsLeadingSpace) {
        const lead = new MathNode("mspace");
        lead.setAttribute("width", "0.1667em");
        row.unshift(lead);
      }
      if (!group.isFollowedByDelimiter) {
        const trail = new MathNode("mspace");
        trail.setAttribute("width", "0.1667em");
        row.push(trail);
      }
      node = new MathNode("mrow", row);
    }
  }
  return node;
};
var singleCharBigOps = {
  "\u220F": "\\prod",
  "\u2210": "\\coprod",
  "\u2211": "\\sum",
  "\u22C0": "\\bigwedge",
  "\u22C1": "\\bigvee",
  "\u22C2": "\\bigcap",
  "\u22C3": "\\bigcup",
  "\u2A00": "\\bigodot",
  "\u2A01": "\\bigoplus",
  "\u2A02": "\\bigotimes",
  "\u2A04": "\\biguplus",
  "\u2A05": "\\bigsqcap",
  "\u2A06": "\\bigsqcup",
  "\u2A03": "\\bigcupdot",
  "\u2A07": "\\bigdoublevee",
  "\u2A08": "\\bigdoublewedge",
  "\u2A09": "\\bigtimes"
};
defineFunction({
  type: "op",
  names: [
    "\\coprod",
    "\\bigvee",
    "\\bigwedge",
    "\\biguplus",
    "\\bigcupplus",
    "\\bigcupdot",
    "\\bigcap",
    "\\bigcup",
    "\\bigdoublevee",
    "\\bigdoublewedge",
    "\\intop",
    "\\prod",
    "\\sum",
    "\\bigotimes",
    "\\bigoplus",
    "\\bigodot",
    "\\bigsqcap",
    "\\bigsqcup",
    "\\bigtimes",
    "\\smallint",
    "\u220F",
    "\u2210",
    "\u2211",
    "\u22C0",
    "\u22C1",
    "\u22C2",
    "\u22C3",
    "\u2A00",
    "\u2A01",
    "\u2A02",
    "\u2A03",
    "\u2A04",
    "\u2A05",
    "\u2A06",
    "\u2A07",
    "\u2A08",
    "\u2A09"
  ],
  props: {
    numArgs: 0
  },
  handler: ({ parser, funcName }, args) => {
    let fName = funcName;
    if (fName.length === 1) {
      fName = singleCharBigOps[fName];
    }
    return {
      type: "op",
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: true,
      stack: false,
      // This is true for \stackrel{}, not here.
      name: fName
    };
  },
  mathmlBuilder: mathmlBuilder$2
});
defineFunction({
  type: "op",
  names: ["\\mathop"],
  props: {
    numArgs: 1,
    primitive: true
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    const arr = body.body ? body.body : [body];
    const isSymbol = arr.length === 1 && ordAtomTypes.includes(arr[0].type);
    return {
      type: "op",
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: isSymbol,
      fromMathOp: true,
      stack: false,
      name: isSymbol ? arr[0].text : null,
      body: isSymbol ? null : ordargument(body)
    };
  },
  mathmlBuilder: mathmlBuilder$2
});
var singleCharIntegrals = {
  "\u222B": "\\int",
  "\u222C": "\\iint",
  "\u222D": "\\iiint",
  "\u222E": "\\oint",
  "\u222F": "\\oiint",
  "\u2230": "\\oiiint",
  "\u2231": "\\intclockwise",
  "\u2232": "\\varointclockwise",
  "\u2A0C": "\\iiiint",
  "\u2A0D": "\\intbar",
  "\u2A0E": "\\intBar",
  "\u2A0F": "\\fint",
  "\u2A12": "\\rppolint",
  "\u2A13": "\\scpolint",
  "\u2A15": "\\pointint",
  "\u2A16": "\\sqint",
  "\u2A17": "\\intlarhk",
  "\u2A18": "\\intx",
  "\u2A19": "\\intcap",
  "\u2A1A": "\\intcup"
};
defineFunction({
  type: "op",
  names: [
    "\\arcsin",
    "\\arccos",
    "\\arctan",
    "\\arctg",
    "\\arcctg",
    "\\arg",
    "\\ch",
    "\\cos",
    "\\cosec",
    "\\cosh",
    "\\cot",
    "\\cotg",
    "\\coth",
    "\\csc",
    "\\ctg",
    "\\cth",
    "\\deg",
    "\\dim",
    "\\exp",
    "\\hom",
    "\\ker",
    "\\lg",
    "\\ln",
    "\\log",
    "\\sec",
    "\\sin",
    "\\sinh",
    "\\sh",
    "\\sgn",
    "\\tan",
    "\\tanh",
    "\\tg",
    "\\th"
  ],
  props: {
    numArgs: 0
  },
  handler({ parser, funcName }) {
    const prevAtomType = parser.prevAtomType;
    const next = parser.gullet.future().text;
    return {
      type: "op",
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: false,
      stack: false,
      isFollowedByDelimiter: isDelimiter(next),
      needsLeadingSpace: prevAtomType.length > 0 && ordTypes.includes(prevAtomType),
      name: funcName
    };
  },
  mathmlBuilder: mathmlBuilder$2
});
defineFunction({
  type: "op",
  names: ["\\det", "\\gcd", "\\inf", "\\lim", "\\max", "\\min", "\\Pr", "\\sup"],
  props: {
    numArgs: 0
  },
  handler({ parser, funcName }) {
    const prevAtomType = parser.prevAtomType;
    const next = parser.gullet.future().text;
    return {
      type: "op",
      mode: parser.mode,
      limits: true,
      parentIsSupSub: false,
      symbol: false,
      stack: false,
      isFollowedByDelimiter: isDelimiter(next),
      needsLeadingSpace: prevAtomType.length > 0 && ordTypes.includes(prevAtomType),
      name: funcName
    };
  },
  mathmlBuilder: mathmlBuilder$2
});
defineFunction({
  type: "op",
  names: [
    "\\int",
    "\\iint",
    "\\iiint",
    "\\iiiint",
    "\\oint",
    "\\oiint",
    "\\oiiint",
    "\\intclockwise",
    "\\varointclockwise",
    "\\intbar",
    "\\intBar",
    "\\fint",
    "\\rppolint",
    "\\scpolint",
    "\\pointint",
    "\\sqint",
    "\\intlarhk",
    "\\intx",
    "\\intcap",
    "\\intcup",
    "\u222B",
    "\u222C",
    "\u222D",
    "\u222E",
    "\u222F",
    "\u2230",
    "\u2231",
    "\u2232",
    "\u2A0C",
    "\u2A0D",
    "\u2A0E",
    "\u2A0F",
    "\u2A12",
    "\u2A13",
    "\u2A15",
    "\u2A16",
    "\u2A17",
    "\u2A18",
    "\u2A19",
    "\u2A1A"
  ],
  props: {
    numArgs: 0,
    allowedInArgument: true
  },
  handler({ parser, funcName }) {
    let fName = funcName;
    if (fName.length === 1) {
      fName = singleCharIntegrals[fName];
    }
    return {
      type: "op",
      mode: parser.mode,
      limits: false,
      parentIsSupSub: false,
      symbol: true,
      stack: false,
      name: fName
    };
  },
  mathmlBuilder: mathmlBuilder$2
});
var mathmlBuilder$1 = (group, style) => {
  let expression = buildExpression(group.body, style.withFont("mathrm"));
  let isAllString = true;
  for (let i = 0; i < expression.length; i++) {
    let node = expression[i];
    if (node instanceof MathNode) {
      if ((node.type === "mrow" || node.type === "mpadded") && node.children.length === 1 && node.children[0] instanceof MathNode) {
        node = node.children[0];
      } else if (node.type === "mrow" && node.children.length === 2 && node.children[0] instanceof MathNode && node.children[1] instanceof MathNode && node.children[1].type === "mspace" && !node.children[1].attributes.width && node.children[1].children.length === 0) {
        node = node.children[0];
      }
      switch (node.type) {
        case "mi":
        case "mn":
        case "ms":
        case "mtext":
          break;
        // Do nothing yet.
        case "mspace":
          {
            if (node.attributes.width) {
              const width = node.attributes.width.replace("em", "");
              const ch = spaceCharacter(Number(width));
              if (ch === "") {
                isAllString = false;
              } else {
                expression[i] = new MathNode("mtext", [new TextNode2(ch)]);
              }
            }
          }
          break;
        case "mo": {
          const child = node.children[0];
          if (node.children.length === 1 && child instanceof TextNode2) {
            child.text = child.text.replace(/\u2212/, "-").replace(/\u2217/, "*");
          } else {
            isAllString = false;
          }
          break;
        }
        default:
          isAllString = false;
      }
    } else {
      isAllString = false;
    }
  }
  if (isAllString) {
    const word = expression.map((node) => node.toText()).join("");
    expression = [new TextNode2(word)];
  } else if (expression.length === 1 && ["mover", "munder"].includes(expression[0].type) && (expression[0].children[0].type === "mi" || expression[0].children[0].type === "mtext")) {
    expression[0].children[0].type = "mi";
    if (group.parentIsSupSub) {
      return new MathNode("mrow", expression);
    } else {
      const operator = new MathNode("mo", [makeText("\u2061", "text")]);
      return newDocumentFragment([expression[0], operator]);
    }
  }
  let wrapper;
  if (isAllString) {
    wrapper = new MathNode("mi", expression);
    if (expression[0].text.length === 1) {
      wrapper.setAttribute("mathvariant", "normal");
    }
  } else {
    wrapper = new MathNode("mrow", expression);
  }
  if (!group.parentIsSupSub) {
    const operator = new MathNode("mo", [makeText("\u2061", "text")]);
    const fragment = [wrapper, operator];
    if (group.needsLeadingSpace) {
      const space2 = new MathNode("mspace");
      space2.setAttribute("width", "0.1667em");
      fragment.unshift(space2);
    }
    if (!group.isFollowedByDelimiter) {
      const trail = new MathNode("mspace");
      trail.setAttribute("width", "0.1667em");
      fragment.push(trail);
    }
    return newDocumentFragment(fragment);
  }
  return wrapper;
};
defineFunction({
  type: "operatorname",
  names: ["\\operatorname@", "\\operatornamewithlimits"],
  props: {
    numArgs: 1,
    allowedInArgument: true
  },
  handler: ({ parser, funcName }, args) => {
    const body = args[0];
    const prevAtomType = parser.prevAtomType;
    const next = parser.gullet.future().text;
    return {
      type: "operatorname",
      mode: parser.mode,
      body: ordargument(body),
      alwaysHandleSupSub: funcName === "\\operatornamewithlimits",
      limits: false,
      parentIsSupSub: false,
      isFollowedByDelimiter: isDelimiter(next),
      needsLeadingSpace: prevAtomType.length > 0 && ordTypes.includes(prevAtomType)
    };
  },
  mathmlBuilder: mathmlBuilder$1
});
defineMacro(
  "\\operatorname",
  "\\@ifstar\\operatornamewithlimits\\operatorname@"
);
defineFunctionBuilders({
  type: "ordgroup",
  mathmlBuilder(group, style) {
    return buildExpressionRow(group.body, style, group.semisimple);
  }
});
defineFunction({
  type: "phantom",
  names: ["\\phantom"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    return {
      type: "phantom",
      mode: parser.mode,
      body: ordargument(body)
    };
  },
  mathmlBuilder: (group, style) => {
    const inner2 = buildExpression(group.body, style);
    return new MathNode("mphantom", inner2);
  }
});
defineFunction({
  type: "hphantom",
  names: ["\\hphantom"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    return {
      type: "hphantom",
      mode: parser.mode,
      body
    };
  },
  mathmlBuilder: (group, style) => {
    const inner2 = buildExpression(ordargument(group.body), style);
    const phantom2 = new MathNode("mphantom", inner2);
    const node = new MathNode("mpadded", [phantom2]);
    node.setAttribute("height", "0px");
    node.setAttribute("depth", "0px");
    return node;
  }
});
defineFunction({
  type: "vphantom",
  names: ["\\vphantom"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser }, args) => {
    const body = args[0];
    return {
      type: "vphantom",
      mode: parser.mode,
      body
    };
  },
  mathmlBuilder: (group, style) => {
    const inner2 = buildExpression(ordargument(group.body), style);
    const phantom2 = new MathNode("mphantom", inner2);
    const node = new MathNode("mpadded", [phantom2]);
    node.setAttribute("width", "0.1px");
    return node;
  }
});
defineFunction({
  type: "pmb",
  names: ["\\pmb"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler({ parser }, args) {
    return {
      type: "pmb",
      mode: parser.mode,
      body: ordargument(args[0])
    };
  },
  mathmlBuilder(group, style) {
    const inner2 = buildExpression(group.body, style);
    const node = wrapWithMstyle(inner2);
    node.setAttribute("style", "font-weight:bold");
    return node;
  }
});
var mathmlBuilder = (group, style) => {
  const newStyle = style.withLevel(StyleLevel.TEXT);
  const node = new MathNode("mpadded", [buildGroup$1(group.body, newStyle)]);
  const dy = calculateSize(group.dy, style);
  node.setAttribute("voffset", dy.number + dy.unit);
  if (dy.number > 0) {
    node.style.padding = dy.number + dy.unit + " 0 0 0";
  } else {
    node.style.padding = "0 0 " + Math.abs(dy.number) + dy.unit + " 0";
  }
  return node;
};
defineFunction({
  type: "raise",
  names: ["\\raise", "\\lower"],
  props: {
    numArgs: 2,
    argTypes: ["size", "primitive"],
    primitive: true
  },
  handler({ parser, funcName }, args) {
    const amount = assertNodeType(args[0], "size").value;
    if (funcName === "\\lower") {
      amount.number *= -1;
    }
    const body = args[1];
    return {
      type: "raise",
      mode: parser.mode,
      dy: amount,
      body
    };
  },
  mathmlBuilder
});
defineFunction({
  type: "raise",
  names: ["\\raisebox"],
  props: {
    numArgs: 2,
    argTypes: ["size", "hbox"],
    allowedInText: true
  },
  handler({ parser, funcName }, args) {
    const amount = assertNodeType(args[0], "size").value;
    const body = args[1];
    return {
      type: "raise",
      mode: parser.mode,
      dy: amount,
      body
    };
  },
  mathmlBuilder
});
defineFunction({
  type: "ref",
  names: ["\\ref", "\\eqref"],
  props: {
    numArgs: 1,
    argTypes: ["raw"]
  },
  handler({ parser, funcName }, args) {
    return {
      type: "ref",
      mode: parser.mode,
      funcName,
      string: args[0].string.replace(invalidIdRegEx, "")
    };
  },
  mathmlBuilder(group, style) {
    const classes = group.funcName === "\\ref" ? ["tml-ref"] : ["tml-ref", "tml-eqref"];
    return new AnchorNode("#" + group.string, classes, null);
  }
});
defineFunction({
  type: "reflect",
  names: ["\\reflectbox"],
  props: {
    numArgs: 1,
    argTypes: ["hbox"],
    allowedInText: true
  },
  handler({ parser }, args) {
    return {
      type: "reflect",
      mode: parser.mode,
      body: args[0]
    };
  },
  mathmlBuilder(group, style) {
    const node = buildGroup$1(group.body, style);
    node.style.transform = "scaleX(-1)";
    return node;
  }
});
defineFunction({
  type: "internal",
  names: ["\\relax"],
  props: {
    numArgs: 0,
    allowedInText: true,
    allowedInArgument: true
  },
  handler({ parser }) {
    return {
      type: "internal",
      mode: parser.mode
    };
  }
});
defineFunction({
  type: "rule",
  names: ["\\rule"],
  props: {
    numArgs: 2,
    numOptionalArgs: 1,
    allowedInText: true,
    allowedInMath: true,
    argTypes: ["size", "size", "size"]
  },
  handler({ parser }, args, optArgs) {
    const shift = optArgs[0];
    const width = assertNodeType(args[0], "size");
    const height = assertNodeType(args[1], "size");
    return {
      type: "rule",
      mode: parser.mode,
      shift: shift && assertNodeType(shift, "size").value,
      width: width.value,
      height: height.value
    };
  },
  mathmlBuilder(group, style) {
    const width = calculateSize(group.width, style);
    const height = calculateSize(group.height, style);
    const shift = group.shift ? calculateSize(group.shift, style) : { number: 0, unit: "em" };
    const color = style.color && style.getColor() || "black";
    const rule = new MathNode("mspace");
    if (width.number > 0 && height.number > 0) {
      rule.setAttribute("mathbackground", color);
    }
    rule.setAttribute("width", width.number + width.unit);
    rule.setAttribute("height", height.number + height.unit);
    if (shift.number === 0) {
      return rule;
    }
    const wrapper = new MathNode("mpadded", [rule]);
    if (shift.number >= 0) {
      wrapper.setAttribute("height", "+" + shift.number + shift.unit);
    } else {
      wrapper.setAttribute("height", shift.number + shift.unit);
      wrapper.setAttribute("depth", "+" + -shift.number + shift.unit);
    }
    wrapper.setAttribute("voffset", shift.number + shift.unit);
    return wrapper;
  }
});
var numRegEx = /^[0-9]$/;
var unicodeNumSubs = {
  "0": "\u2080",
  "1": "\u2081",
  "2": "\u2082",
  "3": "\u2083",
  "4": "\u2084",
  "5": "\u2085",
  "6": "\u2086",
  "7": "\u2087",
  "8": "\u2088",
  "9": "\u2089"
};
var unicodeNumSups = {
  "0": "\u2070",
  "1": "\xB9",
  "2": "\xB2",
  "3": "\xB3",
  "4": "\u2074",
  "5": "\u2075",
  "6": "\u2076",
  "7": "\u2077",
  "8": "\u2078",
  "9": "\u2079"
};
defineFunction({
  type: "sfrac",
  names: ["\\sfrac"],
  props: {
    numArgs: 2,
    allowedInText: true,
    allowedInMath: true
  },
  handler({ parser }, args) {
    let numerator = "";
    for (const node of args[0].body) {
      if (node.type !== "textord" || !numRegEx.test(node.text)) {
        throw new ParseError("Numerator must be an integer.", node);
      }
      numerator += node.text;
    }
    let denominator = "";
    for (const node of args[1].body) {
      if (node.type !== "textord" || !numRegEx.test(node.text)) {
        throw new ParseError("Denominator must be an integer.", node);
      }
      denominator += node.text;
    }
    return {
      type: "sfrac",
      mode: parser.mode,
      numerator,
      denominator
    };
  },
  mathmlBuilder(group, style) {
    const numerator = group.numerator.split("").map((c) => unicodeNumSups[c]).join("");
    const denominator = group.denominator.split("").map((c) => unicodeNumSubs[c]).join("");
    const text2 = new TextNode2(numerator + "\u2044" + denominator, group.mode, style);
    return new MathNode("mn", [text2], ["special-fraction"]);
  }
});
var sizeMap = {
  "\\tiny": 0.5,
  "\\sixptsize": 0.6,
  "\\Tiny": 0.6,
  "\\scriptsize": 0.7,
  "\\footnotesize": 0.8,
  "\\small": 0.9,
  "\\normalsize": 1,
  "\\large": 1.2,
  "\\Large": 1.44,
  "\\LARGE": 1.728,
  "\\huge": 2.074,
  "\\Huge": 2.488
};
defineFunction({
  type: "sizing",
  names: [
    "\\tiny",
    "\\sixptsize",
    "\\Tiny",
    "\\scriptsize",
    "\\footnotesize",
    "\\small",
    "\\normalsize",
    "\\large",
    "\\Large",
    "\\LARGE",
    "\\huge",
    "\\Huge"
  ],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler: ({ breakOnTokenText, funcName, parser }, args) => {
    if (parser.settings.strict && parser.mode === "math") {
      console.log(`Temml strict-mode warning: Command ${funcName} is invalid in math mode.`);
    }
    const body = parser.parseExpression(false, breakOnTokenText, true);
    return {
      type: "sizing",
      mode: parser.mode,
      funcName,
      body
    };
  },
  mathmlBuilder: (group, style) => {
    const newStyle = style.withFontSize(sizeMap[group.funcName]);
    const inner2 = buildExpression(group.body, newStyle);
    const node = wrapWithMstyle(inner2);
    const factor = (sizeMap[group.funcName] / style.fontSize).toFixed(4);
    node.setAttribute("mathsize", factor + "em");
    return node;
  }
});
defineFunction({
  type: "smash",
  names: ["\\smash"],
  props: {
    numArgs: 1,
    numOptionalArgs: 1,
    allowedInText: true
  },
  handler: ({ parser }, args, optArgs) => {
    let smashHeight = false;
    let smashDepth = false;
    const tbArg = optArgs[0] && assertNodeType(optArgs[0], "ordgroup");
    if (tbArg) {
      let letter = "";
      for (let i = 0; i < tbArg.body.length; ++i) {
        const node = tbArg.body[i];
        letter = node.text;
        if (letter === "t") {
          smashHeight = true;
        } else if (letter === "b") {
          smashDepth = true;
        } else {
          smashHeight = false;
          smashDepth = false;
          break;
        }
      }
    } else {
      smashHeight = true;
      smashDepth = true;
    }
    const body = args[0];
    return {
      type: "smash",
      mode: parser.mode,
      body,
      smashHeight,
      smashDepth
    };
  },
  mathmlBuilder: (group, style) => {
    const node = new MathNode("mpadded", [buildGroup$1(group.body, style)]);
    if (group.smashHeight) {
      node.setAttribute("height", "0px");
    }
    if (group.smashDepth) {
      node.setAttribute("depth", "0px");
    }
    return node;
  }
});
var xHeights = [
  "a",
  "c",
  "e",
  "\u0131",
  "m",
  "n",
  "o",
  "r",
  "s",
  "u",
  "v",
  "w",
  "x",
  "z",
  "\u03B1",
  "\u03B5",
  "\u03B9",
  "\u03BA",
  "\u03BD",
  "\u03BF",
  "\u03C0",
  "\u03C3",
  "\u03C4",
  "\u03C5",
  "\u03C9",
  "\\alpha",
  "\\epsilon",
  "\\iota",
  "\\kappa",
  "\\nu",
  "\\omega",
  "\\pi",
  "\\tau",
  "\\omega"
];
defineFunction({
  type: "sqrt",
  names: ["\\sqrt"],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser }, args, optArgs) {
    const index = optArgs[0];
    const body = args[0];
    if (body.body && body.body.length === 1 && body.body[0].text && xHeights.includes(body.body[0].text)) {
      body.body.push({
        "type": "rule",
        "mode": "math",
        "shift": null,
        "width": { "number": 0, "unit": "pt" },
        "height": { "number": 0.5, "unit": "em" }
      });
    }
    return {
      type: "sqrt",
      mode: parser.mode,
      body,
      index
    };
  },
  mathmlBuilder(group, style) {
    const { body, index } = group;
    return index ? new MathNode("mroot", [
      buildGroup$1(body, style),
      buildGroup$1(index, style.incrementLevel())
    ]) : new MathNode("msqrt", [buildGroup$1(body, style)]);
  }
});
var styleMap = {
  display: 0,
  text: 1,
  script: 2,
  scriptscript: 3
};
var styleAttributes = {
  display: ["0", "true"],
  text: ["0", "false"],
  script: ["1", "false"],
  scriptscript: ["2", "false"]
};
defineFunction({
  type: "styling",
  names: ["\\displaystyle", "\\textstyle", "\\scriptstyle", "\\scriptscriptstyle"],
  props: {
    numArgs: 0,
    allowedInText: true,
    primitive: true
  },
  handler({ breakOnTokenText, funcName, parser }, args) {
    const body = parser.parseExpression(true, breakOnTokenText, true);
    const scriptLevel2 = funcName.slice(1, funcName.length - 5);
    return {
      type: "styling",
      mode: parser.mode,
      // Figure out what scriptLevel to use by pulling out the scriptLevel from
      // the function name
      scriptLevel: scriptLevel2,
      body
    };
  },
  mathmlBuilder(group, style) {
    const newStyle = style.withLevel(styleMap[group.scriptLevel]);
    const inner2 = buildExpression(group.body, newStyle);
    const node = wrapWithMstyle(inner2);
    const attr = styleAttributes[group.scriptLevel];
    node.setAttribute("scriptlevel", attr[0]);
    node.setAttribute("displaystyle", attr[1]);
    return node;
  }
});
var symbolRegEx = /^m(over|under|underover)$/;
var smallPad = "DHKLUcegorsuvxyz\u03A0\u03A5\u03A8\u03B1\u03B4\u03B7\u03B9\u03BC\u03BD\u03BF\u03C4\u03C5\u03C7\u03F5";
var mediumPad = "BCEFGIMNOPQRSTXZlpqtw\u0393\u0398\u039E\u03A3\u03A6\u03A9\u03B2\u03B5\u03B6\u03B8\u03BE\u03C1\u03C2\u03C6\u03C8\u03D1\u03D5\u03F1";
var largePad = "AJdf\u0394\u039B";
defineFunctionBuilders({
  type: "supsub",
  mathmlBuilder(group, style) {
    let isBracket = false;
    let isOver;
    let isSup;
    let appendApplyFunction = false;
    let appendSpace = false;
    let needsLeadingSpace = false;
    if (group.base && group.base.type === "horizBracket") {
      isSup = !!group.sup;
      if (isSup === group.base.isOver) {
        isBracket = true;
        isOver = group.base.isOver;
      }
    }
    if (group.base && !group.stack && (group.base.type === "op" || group.base.type === "operatorname")) {
      group.base.parentIsSupSub = true;
      appendApplyFunction = !group.base.symbol;
      appendSpace = appendApplyFunction && !group.isFollowedByDelimiter;
      needsLeadingSpace = group.base.needsLeadingSpace;
    }
    const children = group.stack && group.base.body.length === 1 ? [buildGroup$1(group.base.body[0], style)] : [buildGroup$1(group.base, style)];
    const childStyle = style.inSubOrSup();
    if (group.sub) {
      const sub = buildGroup$1(group.sub, childStyle);
      if (style.level === 3) {
        sub.setAttribute("scriptlevel", "2");
      }
      children.push(sub);
    }
    if (group.sup) {
      const sup = buildGroup$1(group.sup, childStyle);
      if (style.level === 3) {
        sup.setAttribute("scriptlevel", "2");
      }
      if (group.base && group.base.text && group.base.text.length === 1) {
        const text2 = group.base.text;
        if (smallPad.indexOf(text2) > -1) {
          sup.classes.push("tml-sml-pad");
        } else if (mediumPad.indexOf(text2) > -1) {
          sup.classes.push("tml-med-pad");
        } else if (largePad.indexOf(text2) > -1) {
          sup.classes.push("tml-lrg-pad");
        }
      }
      children.push(sup);
    }
    let nodeType;
    if (isBracket) {
      nodeType = isOver ? "mover" : "munder";
    } else if (!group.sub) {
      const base = group.base;
      if (base && base.type === "op" && base.limits && (style.level === StyleLevel.DISPLAY || base.alwaysHandleSupSub)) {
        nodeType = "mover";
      } else if (base && base.type === "operatorname" && base.alwaysHandleSupSub && (base.limits || style.level === StyleLevel.DISPLAY)) {
        nodeType = "mover";
      } else {
        nodeType = "msup";
      }
    } else if (!group.sup) {
      const base = group.base;
      if (group.stack) {
        nodeType = "munder";
      } else if (base && base.type === "op" && base.limits && (style.level === StyleLevel.DISPLAY || base.alwaysHandleSupSub)) {
        nodeType = "munder";
      } else if (base && base.type === "operatorname" && base.alwaysHandleSupSub && (base.limits || style.level === StyleLevel.DISPLAY)) {
        nodeType = "munder";
      } else {
        nodeType = "msub";
      }
    } else {
      const base = group.base;
      if (base && (base.type === "op" && base.limits || base.type === "multiscript") && (style.level === StyleLevel.DISPLAY || base.alwaysHandleSupSub)) {
        nodeType = "munderover";
      } else if (base && base.type === "operatorname" && base.alwaysHandleSupSub && (style.level === StyleLevel.DISPLAY || base.limits)) {
        nodeType = "munderover";
      } else {
        nodeType = "msubsup";
      }
    }
    let node = new MathNode(nodeType, children);
    if (appendApplyFunction) {
      const operator = new MathNode("mo", [makeText("\u2061", "text")]);
      if (needsLeadingSpace) {
        const space2 = new MathNode("mspace");
        space2.setAttribute("width", "0.1667em");
        node = newDocumentFragment([space2, node, operator]);
      } else {
        node = newDocumentFragment([node, operator]);
      }
      if (appendSpace) {
        const space2 = new MathNode("mspace");
        space2.setAttribute("width", "0.1667em");
        node.children.push(space2);
      }
    } else if (symbolRegEx.test(nodeType)) {
      node = new MathNode("mrow", [node]);
    }
    return node;
  }
});
var short = [
  "\\shortmid",
  "\\nshortmid",
  "\\shortparallel",
  "\\nshortparallel",
  "\\smallsetminus"
];
var arrows = ["\\Rsh", "\\Lsh", "\\restriction"];
var isArrow = (str) => {
  if (str.length === 1) {
    const codePoint = str.codePointAt(0);
    return 8591 < codePoint && codePoint < 8704;
  }
  return str.indexOf("arrow") > -1 || str.indexOf("harpoon") > -1 || arrows.includes(str);
};
defineFunctionBuilders({
  type: "atom",
  mathmlBuilder(group, style) {
    const node = new MathNode("mo", [makeText(group.text, group.mode)]);
    if (group.family === "punct") {
      node.setAttribute("separator", "true");
    } else if (group.family === "open" || group.family === "close") {
      if (group.family === "open") {
        node.setAttribute("form", "prefix");
        node.setAttribute("stretchy", "false");
      } else if (group.family === "close") {
        node.setAttribute("form", "postfix");
        node.setAttribute("stretchy", "false");
      }
    } else if (group.text === "\\mid") {
      node.setAttribute("lspace", "0.22em");
      node.setAttribute("rspace", "0.22em");
      node.setAttribute("stretchy", "false");
    } else if (group.family === "rel" && isArrow(group.text)) {
      node.setAttribute("stretchy", "false");
    } else if (short.includes(group.text)) {
      node.setAttribute("mathsize", "70%");
    } else if (group.text === ":") {
      node.attributes.lspace = "0.2222em";
      node.attributes.rspace = "0.2222em";
    } else if (group.needsSpacing) {
      if (group.family === "bin") {
        return new MathNode("mrow", [padding(0.222), node, padding(0.222)]);
      } else {
        return new MathNode("mrow", [padding(0.2778), node, padding(0.2778)]);
      }
    }
    return node;
  }
});
var fontMap = {
  // styles
  mathbf: "bold",
  mathrm: "normal",
  textit: "italic",
  mathit: "italic",
  mathnormal: "italic",
  // families
  mathbb: "double-struck",
  mathcal: "script",
  mathfrak: "fraktur",
  mathscr: "script",
  mathsf: "sans-serif",
  mathtt: "monospace"
};
var getVariant = function(group, style) {
  if (style.fontFamily === "texttt") {
    return "monospace";
  } else if (style.fontFamily === "textsc") {
    return "normal";
  } else if (style.fontFamily === "textsf") {
    if (style.fontShape === "textit" && style.fontWeight === "textbf") {
      return "sans-serif-bold-italic";
    } else if (style.fontShape === "textit") {
      return "sans-serif-italic";
    } else if (style.fontWeight === "textbf") {
      return "sans-serif-bold";
    } else {
      return "sans-serif";
    }
  } else if (style.fontShape === "textit" && style.fontWeight === "textbf") {
    return "bold-italic";
  } else if (style.fontShape === "textit") {
    return "italic";
  } else if (style.fontWeight === "textbf") {
    return "bold";
  }
  const font = style.font;
  if (!font || font === "mathnormal") {
    return null;
  }
  const mode = group.mode;
  switch (font) {
    case "mathit":
      return "italic";
    case "mathrm": {
      const codePoint = group.text.codePointAt(0);
      return 939 < codePoint && codePoint < 975 ? "italic" : "normal";
    }
    case "greekItalic":
      return "italic";
    case "up@greek":
      return "normal";
    case "boldsymbol":
    case "mathboldsymbol":
      return "bold-italic";
    case "mathbf":
      return "bold";
    case "mathbb":
      return "double-struck";
    case "mathfrak":
      return "fraktur";
    case "mathscr":
    case "mathcal":
      return "script";
    case "mathsf":
      return "sans-serif";
    case "mathsfit":
      return "sans-serif-italic";
    case "mathtt":
      return "monospace";
  }
  let text2 = group.text;
  if (symbols2[mode][text2] && symbols2[mode][text2].replace) {
    text2 = symbols2[mode][text2].replace;
  }
  return Object.prototype.hasOwnProperty.call(fontMap, font) ? fontMap[font] : null;
};
var numberRegEx = /^\d(?:[\d,.]*\d)?$/;
var latinRegEx = /[A-Ba-z]/;
var primes = /* @__PURE__ */ new Set([
  "\\prime",
  "\\dprime",
  "\\trprime",
  "\\qprime",
  "\\backprime",
  "\\backdprime",
  "\\backtrprime"
]);
var italicNumber = (text2, variant, tag) => {
  const mn = new MathNode(tag, [text2]);
  const wrapper = new MathNode("mstyle", [mn]);
  wrapper.style["font-style"] = "italic";
  wrapper.style["font-family"] = "Cambria, 'Times New Roman', serif";
  if (variant === "bold-italic") {
    wrapper.style["font-weight"] = "bold";
  }
  return wrapper;
};
defineFunctionBuilders({
  type: "mathord",
  mathmlBuilder(group, style) {
    const text2 = makeText(group.text, group.mode, style);
    const codePoint = text2.text.codePointAt(0);
    const defaultVariant = 912 < codePoint && codePoint < 938 ? "normal" : "italic";
    const variant = getVariant(group, style) || defaultVariant;
    if (variant === "script") {
      text2.text = variantChar(text2.text, variant);
      return new MathNode("mi", [text2], [style.font]);
    } else if (variant !== "italic") {
      text2.text = variantChar(text2.text, variant);
    }
    let node = new MathNode("mi", [text2]);
    if (variant === "normal") {
      node.setAttribute("mathvariant", "normal");
      if (text2.text.length === 1) {
        const mspace = new MathNode("mspace", []);
        node = new MathNode("mrow", [node, mspace]);
      }
    }
    return node;
  }
});
defineFunctionBuilders({
  type: "textord",
  mathmlBuilder(group, style) {
    let ch = group.text;
    const codePoint = ch.codePointAt(0);
    if (style.fontFamily === "textsc") {
      if (96 < codePoint && codePoint < 123) {
        ch = smallCaps[ch];
      }
    }
    const text2 = makeText(ch, group.mode, style);
    const variant = getVariant(group, style) || "normal";
    let node;
    if (numberRegEx.test(group.text)) {
      const tag = group.mode === "text" ? "mtext" : "mn";
      if (variant === "italic" || variant === "bold-italic") {
        return italicNumber(text2, variant, tag);
      } else {
        if (variant !== "normal") {
          text2.text = text2.text.split("").map((c) => variantChar(c, variant)).join("");
        }
        node = new MathNode(tag, [text2]);
      }
    } else if (group.mode === "text") {
      if (variant !== "normal") {
        text2.text = variantChar(text2.text, variant);
      }
      node = new MathNode("mtext", [text2]);
    } else if (primes.has(group.text)) {
      node = new MathNode("mo", [text2]);
      node.classes.push("tml-prime");
    } else {
      const origText = text2.text;
      if (variant !== "italic") {
        text2.text = variantChar(text2.text, variant);
      }
      node = new MathNode("mi", [text2]);
      if (text2.text === origText && latinRegEx.test(origText)) {
        node.setAttribute("mathvariant", "italic");
      }
    }
    return node;
  }
});
var cssSpace = {
  "\\nobreak": "nobreak",
  "\\allowbreak": "allowbreak"
};
var regularSpace = {
  " ": {},
  "\\ ": {},
  "~": {
    className: "nobreak"
  },
  "\\space": {},
  "\\nobreakspace": {
    className: "nobreak"
  }
};
defineFunctionBuilders({
  type: "spacing",
  mathmlBuilder(group, style) {
    let node;
    if (Object.prototype.hasOwnProperty.call(regularSpace, group.text)) {
      node = new MathNode("mtext", [new TextNode2("\xA0")]);
    } else if (Object.prototype.hasOwnProperty.call(cssSpace, group.text)) {
      node = new MathNode("mo");
      if (group.text === "\\nobreak") {
        node.setAttribute("linebreak", "nobreak");
      }
    } else {
      throw new ParseError(`Unknown type of space "${group.text}"`);
    }
    return node;
  }
});
defineFunctionBuilders({
  type: "tag"
});
var textFontFamilies = {
  "\\text": void 0,
  "\\textrm": "textrm",
  "\\textsf": "textsf",
  "\\texttt": "texttt",
  "\\textnormal": "textrm",
  "\\textsc": "textsc"
  // small caps
};
var textFontWeights = {
  "\\textbf": "textbf",
  "\\textmd": "textmd"
};
var textFontShapes = {
  "\\textit": "textit",
  "\\textup": "textup"
};
var styleWithFont = (group, style) => {
  const font = group.font;
  if (!font) {
    return style;
  } else if (textFontFamilies[font]) {
    return style.withTextFontFamily(textFontFamilies[font]);
  } else if (textFontWeights[font]) {
    return style.withTextFontWeight(textFontWeights[font]);
  } else if (font === "\\emph") {
    return style.fontShape === "textit" ? style.withTextFontShape("textup") : style.withTextFontShape("textit");
  }
  return style.withTextFontShape(textFontShapes[font]);
};
defineFunction({
  type: "text",
  names: [
    // Font families
    "\\text",
    "\\textrm",
    "\\textsf",
    "\\texttt",
    "\\textnormal",
    "\\textsc",
    // Font weights
    "\\textbf",
    "\\textmd",
    // Font Shapes
    "\\textit",
    "\\textup",
    "\\emph"
  ],
  props: {
    numArgs: 1,
    argTypes: ["text"],
    allowedInArgument: true,
    allowedInText: true
  },
  handler({ parser, funcName }, args) {
    const body = args[0];
    return {
      type: "text",
      mode: parser.mode,
      body: ordargument(body),
      font: funcName
    };
  },
  mathmlBuilder(group, style) {
    const newStyle = styleWithFont(group, style);
    const mrow = buildExpressionRow(group.body, newStyle);
    return consolidateText(mrow);
  }
});
defineFunction({
  type: "vcenter",
  names: ["\\vcenter"],
  props: {
    numArgs: 1,
    argTypes: ["original"],
    allowedInText: false
  },
  handler({ parser }, args) {
    return {
      type: "vcenter",
      mode: parser.mode,
      body: args[0]
    };
  },
  mathmlBuilder(group, style) {
    const mtd = new MathNode("mtd", [buildGroup$1(group.body, style)]);
    mtd.style.padding = "0";
    const mtr = new MathNode("mtr", [mtd]);
    return new MathNode("mtable", [mtr]);
  }
});
defineFunction({
  type: "verb",
  names: ["\\verb"],
  props: {
    numArgs: 0,
    allowedInText: true
  },
  handler(context, args, optArgs) {
    throw new ParseError("\\verb ended by end of line instead of matching delimiter");
  },
  mathmlBuilder(group, style) {
    const text2 = new TextNode2(makeVerb(group));
    const node = new MathNode("mtext", [text2]);
    node.setAttribute("mathvariant", "monospace");
    return node;
  }
});
var makeVerb = (group) => group.body.replace(/ /g, group.star ? "\u2423" : "\xA0");
var functions = _functions;
var spaceRegexString = "[ \r\n	]";
var controlWordRegexString = "\\\\[a-zA-Z@]+";
var controlSymbolRegexString = "\\\\[^\uD800-\uDFFF]";
var controlWordWhitespaceRegexString = `(${controlWordRegexString})${spaceRegexString}*`;
var controlSpaceRegexString = "\\\\(\n|[ \r	]+\n?)[ \r	]*";
var combiningDiacriticalMarkString = "[\u0300-\u036F]";
var combiningDiacriticalMarksEndRegex = new RegExp(`${combiningDiacriticalMarkString}+$`);
var tokenRegexString = `(${spaceRegexString}+)|${controlSpaceRegexString}|([!-\\[\\]-\u2027\u202A-\uD7FF\uF900-\uFFFF]${combiningDiacriticalMarkString}*|[\uD800-\uDBFF][\uDC00-\uDFFF]${combiningDiacriticalMarkString}*|\\\\verb\\*([^]).*?\\4|\\\\verb([^*a-zA-Z]).*?\\5|${controlWordWhitespaceRegexString}|${controlSymbolRegexString})`;
var Lexer = class {
  constructor(input, settings) {
    this.input = input;
    this.settings = settings;
    this.tokenRegex = new RegExp(tokenRegexString, "g");
    this.catcodes = {
      "%": 14,
      // comment character
      "~": 13
      // active character
    };
  }
  setCatcode(char, code) {
    this.catcodes[char] = code;
  }
  /**
   * This function lexes a single token.
   */
  lex() {
    const input = this.input;
    const pos = this.tokenRegex.lastIndex;
    if (pos === input.length) {
      return new Token("EOF", new SourceLocation(this, pos, pos));
    }
    const match = this.tokenRegex.exec(input);
    if (match === null || match.index !== pos) {
      throw new ParseError(
        `Unexpected character: '${input[pos]}'`,
        new Token(input[pos], new SourceLocation(this, pos, pos + 1))
      );
    }
    const text2 = match[6] || match[3] || (match[2] ? "\\ " : " ");
    if (this.catcodes[text2] === 14) {
      const nlIndex = input.indexOf("\n", this.tokenRegex.lastIndex);
      if (nlIndex === -1) {
        this.tokenRegex.lastIndex = input.length;
        if (this.settings.strict) {
          throw new ParseError("% comment has no terminating newline; LaTeX would fail because of commenting the end of math mode");
        }
      } else {
        this.tokenRegex.lastIndex = nlIndex + 1;
      }
      return this.lex();
    }
    return new Token(text2, new SourceLocation(this, pos, this.tokenRegex.lastIndex));
  }
};
var Namespace = class {
  /**
   * Both arguments are optional.  The first argument is an object of
   * built-in mappings which never change.  The second argument is an object
   * of initial (global-level) mappings, which will constantly change
   * according to any global/top-level `set`s done.
   */
  constructor(builtins = /* @__PURE__ */ Object.create(null), globalMacros = /* @__PURE__ */ Object.create(null)) {
    this.current = globalMacros;
    this.builtins = builtins;
    this.undefStack = [];
  }
  /**
   * Start a new nested group, affecting future local `set`s.
   */
  beginGroup() {
    this.undefStack.push(/* @__PURE__ */ Object.create(null));
  }
  /**
   * End current nested group, restoring values before the group began.
   */
  endGroup() {
    if (this.undefStack.length === 0) {
      throw new ParseError(
        "Unbalanced namespace destruction: attempt to pop global namespace; please report this as a bug"
      );
    }
    const undefs = this.undefStack.pop();
    for (const undef in undefs) {
      if (Object.prototype.hasOwnProperty.call(undefs, undef)) {
        if (undefs[undef] === void 0) {
          delete this.current[undef];
        } else {
          this.current[undef] = undefs[undef];
        }
      }
    }
  }
  /**
   * Detect whether `name` has a definition.  Equivalent to
   * `get(name) != null`.
   */
  has(name2) {
    return Object.prototype.hasOwnProperty.call(this.current, name2) || Object.prototype.hasOwnProperty.call(this.builtins, name2);
  }
  /**
   * Get the current value of a name, or `undefined` if there is no value.
   *
   * Note: Do not use `if (namespace.get(...))` to detect whether a macro
   * is defined, as the definition may be the empty string which evaluates
   * to `false` in JavaScript.  Use `if (namespace.get(...) != null)` or
   * `if (namespace.has(...))`.
   */
  get(name2) {
    if (Object.prototype.hasOwnProperty.call(this.current, name2)) {
      return this.current[name2];
    } else {
      return this.builtins[name2];
    }
  }
  /**
   * Set the current value of a name, and optionally set it globally too.
   * Local set() sets the current value and (when appropriate) adds an undo
   * operation to the undo stack.  Global set() may change the undo
   * operation at every level, so takes time linear in their number.
   */
  set(name2, value, global = false) {
    if (global) {
      for (let i = 0; i < this.undefStack.length; i++) {
        delete this.undefStack[i][name2];
      }
      if (this.undefStack.length > 0) {
        this.undefStack[this.undefStack.length - 1][name2] = value;
      }
    } else {
      const top = this.undefStack[this.undefStack.length - 1];
      if (top && !Object.prototype.hasOwnProperty.call(top, name2)) {
        top[name2] = this.current[name2];
      }
    }
    this.current[name2] = value;
  }
};
var implicitCommands = {
  "^": true,
  // Parser.js
  _: true,
  // Parser.js
  "\\limits": true,
  // Parser.js
  "\\nolimits": true
  // Parser.js
};
var MacroExpander = class {
  constructor(input, settings, mode) {
    this.settings = settings;
    this.expansionCount = 0;
    this.feed(input);
    this.macros = new Namespace(macros, settings.macros);
    this.mode = mode;
    this.stack = [];
  }
  /**
   * Feed a new input string to the same MacroExpander
   * (with existing macros etc.).
   */
  feed(input) {
    this.lexer = new Lexer(input, this.settings);
  }
  /**
   * Switches between "text" and "math" modes.
   */
  switchMode(newMode) {
    this.mode = newMode;
  }
  /**
   * Start a new group nesting within all namespaces.
   */
  beginGroup() {
    this.macros.beginGroup();
  }
  /**
   * End current group nesting within all namespaces.
   */
  endGroup() {
    this.macros.endGroup();
  }
  /**
   * Returns the topmost token on the stack, without expanding it.
   * Similar in behavior to TeX's `\futurelet`.
   */
  future() {
    if (this.stack.length === 0) {
      this.pushToken(this.lexer.lex());
    }
    return this.stack[this.stack.length - 1];
  }
  /**
   * Remove and return the next unexpanded token.
   */
  popToken() {
    this.future();
    return this.stack.pop();
  }
  /**
   * Add a given token to the token stack.  In particular, this get be used
   * to put back a token returned from one of the other methods.
   */
  pushToken(token) {
    this.stack.push(token);
  }
  /**
   * Append an array of tokens to the token stack.
   */
  pushTokens(tokens) {
    this.stack.push(...tokens);
  }
  /**
   * Find an macro argument without expanding tokens and append the array of
   * tokens to the token stack. Uses Token as a container for the result.
   */
  scanArgument(isOptional) {
    let start;
    let end;
    let tokens;
    if (isOptional) {
      this.consumeSpaces();
      if (this.future().text !== "[") {
        return null;
      }
      start = this.popToken();
      ({ tokens, end } = this.consumeArg(["]"]));
    } else {
      ({ tokens, start, end } = this.consumeArg());
    }
    this.pushToken(new Token("EOF", end.loc));
    this.pushTokens(tokens);
    return new Token("", SourceLocation.range(start, end));
  }
  /**
   * Consume all following space tokens, without expansion.
   */
  consumeSpaces() {
    for (; ; ) {
      const token = this.future();
      if (token.text === " ") {
        this.stack.pop();
      } else {
        break;
      }
    }
  }
  /**
   * Consume an argument from the token stream, and return the resulting array
   * of tokens and start/end token.
   */
  consumeArg(delims) {
    const tokens = [];
    const isDelimited = delims && delims.length > 0;
    if (!isDelimited) {
      this.consumeSpaces();
    }
    const start = this.future();
    let tok;
    let depth = 0;
    let match = 0;
    do {
      tok = this.popToken();
      tokens.push(tok);
      if (tok.text === "{") {
        ++depth;
      } else if (tok.text === "}") {
        --depth;
        if (depth === -1) {
          throw new ParseError("Extra }", tok);
        }
      } else if (tok.text === "EOF") {
        throw new ParseError(
          "Unexpected end of input in a macro argument, expected '" + (delims && isDelimited ? delims[match] : "}") + "'",
          tok
        );
      }
      if (delims && isDelimited) {
        if ((depth === 0 || depth === 1 && delims[match] === "{") && tok.text === delims[match]) {
          ++match;
          if (match === delims.length) {
            tokens.splice(-match, match);
            break;
          }
        } else {
          match = 0;
        }
      }
    } while (depth !== 0 || isDelimited);
    if (start.text === "{" && tokens[tokens.length - 1].text === "}") {
      tokens.pop();
      tokens.shift();
    }
    tokens.reverse();
    return { tokens, start, end: tok };
  }
  /**
   * Consume the specified number of (delimited) arguments from the token
   * stream and return the resulting array of arguments.
   */
  consumeArgs(numArgs, delimiters2) {
    if (delimiters2) {
      if (delimiters2.length !== numArgs + 1) {
        throw new ParseError("The length of delimiters doesn't match the number of args!");
      }
      const delims = delimiters2[0];
      for (let i = 0; i < delims.length; i++) {
        const tok = this.popToken();
        if (delims[i] !== tok.text) {
          throw new ParseError("Use of the macro doesn't match its definition", tok);
        }
      }
    }
    const args = [];
    for (let i = 0; i < numArgs; i++) {
      args.push(this.consumeArg(delimiters2 && delimiters2[i + 1]).tokens);
    }
    return args;
  }
  /**
   * Expand the next token only once if possible.
   *
   * If the token is expanded, the resulting tokens will be pushed onto
   * the stack in reverse order, and the number of such tokens will be
   * returned.  This number might be zero or positive.
   *
   * If not, the return value is `false`, and the next token remains at the
   * top of the stack.
   *
   * In either case, the next token will be on the top of the stack,
   * or the stack will be empty (in case of empty expansion
   * and no other tokens).
   *
   * Used to implement `expandAfterFuture` and `expandNextToken`.
   *
   * If expandableOnly, only expandable tokens are expanded and
   * an undefined control sequence results in an error.
   */
  expandOnce(expandableOnly) {
    const topToken = this.popToken();
    const name2 = topToken.text;
    const expansion = !topToken.noexpand ? this._getExpansion(name2) : null;
    if (expansion == null || expandableOnly && expansion.unexpandable) {
      if (expandableOnly && expansion == null && name2[0] === "\\" && !this.isDefined(name2)) {
        throw new ParseError("Undefined control sequence: " + name2);
      }
      this.pushToken(topToken);
      return false;
    }
    this.expansionCount++;
    if (this.expansionCount > this.settings.maxExpand) {
      throw new ParseError(
        "Too many expansions: infinite loop or need to increase maxExpand setting"
      );
    }
    let tokens = expansion.tokens;
    const args = this.consumeArgs(expansion.numArgs, expansion.delimiters);
    if (expansion.numArgs) {
      tokens = tokens.slice();
      for (let i = tokens.length - 1; i >= 0; --i) {
        let tok = tokens[i];
        if (tok.text === "#") {
          if (i === 0) {
            throw new ParseError("Incomplete placeholder at end of macro body", tok);
          }
          tok = tokens[--i];
          if (tok.text === "#") {
            tokens.splice(i + 1, 1);
          } else if (/^[1-9]$/.test(tok.text)) {
            tokens.splice(i, 2, ...args[+tok.text - 1]);
          } else {
            throw new ParseError("Not a valid argument number", tok);
          }
        }
      }
    }
    this.pushTokens(tokens);
    return tokens.length;
  }
  /**
   * Expand the next token only once (if possible), and return the resulting
   * top token on the stack (without removing anything from the stack).
   * Similar in behavior to TeX's `\expandafter\futurelet`.
   * Equivalent to expandOnce() followed by future().
   */
  expandAfterFuture() {
    this.expandOnce();
    return this.future();
  }
  /**
   * Recursively expand first token, then return first non-expandable token.
   */
  expandNextToken() {
    for (; ; ) {
      if (this.expandOnce() === false) {
        const token = this.stack.pop();
        if (token.treatAsRelax) {
          token.text = "\\relax";
        }
        return token;
      }
    }
    throw new Error();
  }
  /**
   * Fully expand the given macro name and return the resulting list of
   * tokens, or return `undefined` if no such macro is defined.
   */
  expandMacro(name2) {
    return this.macros.has(name2) ? this.expandTokens([new Token(name2)]) : void 0;
  }
  /**
   * Fully expand the given token stream and return the resulting list of
   * tokens.  Note that the input tokens are in reverse order, but the
   * output tokens are in forward order.
   */
  expandTokens(tokens) {
    const output2 = [];
    const oldStackLength = this.stack.length;
    this.pushTokens(tokens);
    while (this.stack.length > oldStackLength) {
      if (this.expandOnce(true) === false) {
        const token = this.stack.pop();
        if (token.treatAsRelax) {
          token.noexpand = false;
          token.treatAsRelax = false;
        }
        output2.push(token);
      }
    }
    return output2;
  }
  /**
   * Fully expand the given macro name and return the result as a string,
   * or return `undefined` if no such macro is defined.
   */
  expandMacroAsText(name2) {
    const tokens = this.expandMacro(name2);
    if (tokens) {
      return tokens.map((token) => token.text).join("");
    } else {
      return tokens;
    }
  }
  /**
   * Returns the expanded macro as a reversed array of tokens and a macro
   * argument count.  Or returns `null` if no such macro.
   */
  _getExpansion(name2) {
    const definition = this.macros.get(name2);
    if (definition == null) {
      return definition;
    }
    if (name2.length === 1) {
      const catcode = this.lexer.catcodes[name2];
      if (catcode != null && catcode !== 13) {
        return;
      }
    }
    const expansion = typeof definition === "function" ? definition(this) : definition;
    if (typeof expansion === "string") {
      let numArgs = 0;
      if (expansion.indexOf("#") !== -1) {
        const stripped = expansion.replace(/##/g, "");
        while (stripped.indexOf("#" + (numArgs + 1)) !== -1) {
          ++numArgs;
        }
      }
      const bodyLexer = new Lexer(expansion, this.settings);
      const tokens = [];
      let tok = bodyLexer.lex();
      while (tok.text !== "EOF") {
        tokens.push(tok);
        tok = bodyLexer.lex();
      }
      tokens.reverse();
      const expanded = { tokens, numArgs };
      return expanded;
    }
    return expansion;
  }
  /**
   * Determine whether a command is currently "defined" (has some
   * functionality), meaning that it's a macro (in the current group),
   * a function, a symbol, or one of the special commands listed in
   * `implicitCommands`.
   */
  isDefined(name2) {
    return this.macros.has(name2) || Object.prototype.hasOwnProperty.call(functions, name2) || Object.prototype.hasOwnProperty.call(symbols2.math, name2) || Object.prototype.hasOwnProperty.call(symbols2.text, name2) || Object.prototype.hasOwnProperty.call(implicitCommands, name2);
  }
  /**
   * Determine whether a command is expandable.
   */
  isExpandable(name2) {
    const macro = this.macros.get(name2);
    return macro != null ? typeof macro === "string" || typeof macro === "function" || !macro.unexpandable : Object.prototype.hasOwnProperty.call(functions, name2) && !functions[name2].primitive;
  }
};
var unicodeSubRegEx = /^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/;
var uSubsAndSups = Object.freeze({
  "\u208A": "+",
  "\u208B": "-",
  "\u208C": "=",
  "\u208D": "(",
  "\u208E": ")",
  "\u2080": "0",
  "\u2081": "1",
  "\u2082": "2",
  "\u2083": "3",
  "\u2084": "4",
  "\u2085": "5",
  "\u2086": "6",
  "\u2087": "7",
  "\u2088": "8",
  "\u2089": "9",
  "\u2090": "a",
  "\u2091": "e",
  "\u2095": "h",
  "\u1D62": "i",
  "\u2C7C": "j",
  "\u2096": "k",
  "\u2097": "l",
  "\u2098": "m",
  "\u2099": "n",
  "\u2092": "o",
  "\u209A": "p",
  "\u1D63": "r",
  "\u209B": "s",
  "\u209C": "t",
  "\u1D64": "u",
  "\u1D65": "v",
  "\u2093": "x",
  "\u1D66": "\u03B2",
  "\u1D67": "\u03B3",
  "\u1D68": "\u03C1",
  "\u1D69": "\u03D5",
  "\u1D6A": "\u03C7",
  "\u207A": "+",
  "\u207B": "-",
  "\u207C": "=",
  "\u207D": "(",
  "\u207E": ")",
  "\u2070": "0",
  "\xB9": "1",
  "\xB2": "2",
  "\xB3": "3",
  "\u2074": "4",
  "\u2075": "5",
  "\u2076": "6",
  "\u2077": "7",
  "\u2078": "8",
  "\u2079": "9",
  "\u1D2C": "A",
  "\u1D2E": "B",
  "\u1D30": "D",
  "\u1D31": "E",
  "\u1D33": "G",
  "\u1D34": "H",
  "\u1D35": "I",
  "\u1D36": "J",
  "\u1D37": "K",
  "\u1D38": "L",
  "\u1D39": "M",
  "\u1D3A": "N",
  "\u1D3C": "O",
  "\u1D3E": "P",
  "\u1D3F": "R",
  "\u1D40": "T",
  "\u1D41": "U",
  "\u2C7D": "V",
  "\u1D42": "W",
  "\u1D43": "a",
  "\u1D47": "b",
  "\u1D9C": "c",
  "\u1D48": "d",
  "\u1D49": "e",
  "\u1DA0": "f",
  "\u1D4D": "g",
  "\u02B0": "h",
  "\u2071": "i",
  "\u02B2": "j",
  "\u1D4F": "k",
  "\u02E1": "l",
  "\u1D50": "m",
  "\u207F": "n",
  "\u1D52": "o",
  "\u1D56": "p",
  "\u02B3": "r",
  "\u02E2": "s",
  "\u1D57": "t",
  "\u1D58": "u",
  "\u1D5B": "v",
  "\u02B7": "w",
  "\u02E3": "x",
  "\u02B8": "y",
  "\u1DBB": "z",
  "\u1D5D": "\u03B2",
  "\u1D5E": "\u03B3",
  "\u1D5F": "\u03B4",
  "\u1D60": "\u03D5",
  "\u1D61": "\u03C7",
  "\u1DBF": "\u03B8"
});
var asciiFromScript = Object.freeze({
  "\u{1D49C}": "A",
  "\u212C": "B",
  "\u{1D49E}": "C",
  "\u{1D49F}": "D",
  "\u2130": "E",
  "\u2131": "F",
  "\u{1D4A2}": "G",
  "\u210B": "H",
  "\u2110": "I",
  "\u{1D4A5}": "J",
  "\u{1D4A6}": "K",
  "\u2112": "L",
  "\u2133": "M",
  "\u{1D4A9}": "N",
  "\u{1D4AA}": "O",
  "\u{1D4AB}": "P",
  "\u{1D4AC}": "Q",
  "\u211B": "R",
  "\u{1D4AE}": "S",
  "\u{1D4AF}": "T",
  "\u{1D4B0}": "U",
  "\u{1D4B1}": "V",
  "\u{1D4B2}": "W",
  "\u{1D4B3}": "X",
  "\u{1D4B4}": "Y",
  "\u{1D4B5}": "Z"
});
var unicodeAccents = {
  "\u0301": { text: "\\'", math: "\\acute" },
  "\u0300": { text: "\\`", math: "\\grave" },
  "\u0308": { text: '\\"', math: "\\ddot" },
  "\u0303": { text: "\\~", math: "\\tilde" },
  "\u0304": { text: "\\=", math: "\\bar" },
  "\u0306": { text: "\\u", math: "\\breve" },
  "\u030C": { text: "\\v", math: "\\check" },
  "\u0302": { text: "\\^", math: "\\hat" },
  "\u0307": { text: "\\.", math: "\\dot" },
  "\u030A": { text: "\\r", math: "\\mathring" },
  "\u030B": { text: "\\H" },
  "\u0327": { text: "\\c" }
};
var unicodeSymbols = {
  "\xE1": "a\u0301",
  "\xE0": "a\u0300",
  "\xE4": "a\u0308",
  "\u01DF": "a\u0308\u0304",
  "\xE3": "a\u0303",
  "\u0101": "a\u0304",
  "\u0103": "a\u0306",
  "\u1EAF": "a\u0306\u0301",
  "\u1EB1": "a\u0306\u0300",
  "\u1EB5": "a\u0306\u0303",
  "\u01CE": "a\u030C",
  "\xE2": "a\u0302",
  "\u1EA5": "a\u0302\u0301",
  "\u1EA7": "a\u0302\u0300",
  "\u1EAB": "a\u0302\u0303",
  "\u0227": "a\u0307",
  "\u01E1": "a\u0307\u0304",
  "\xE5": "a\u030A",
  "\u01FB": "a\u030A\u0301",
  "\u1E03": "b\u0307",
  "\u0107": "c\u0301",
  "\u010D": "c\u030C",
  "\u0109": "c\u0302",
  "\u010B": "c\u0307",
  "\u010F": "d\u030C",
  "\u1E0B": "d\u0307",
  "\xE9": "e\u0301",
  "\xE8": "e\u0300",
  "\xEB": "e\u0308",
  "\u1EBD": "e\u0303",
  "\u0113": "e\u0304",
  "\u1E17": "e\u0304\u0301",
  "\u1E15": "e\u0304\u0300",
  "\u0115": "e\u0306",
  "\u011B": "e\u030C",
  "\xEA": "e\u0302",
  "\u1EBF": "e\u0302\u0301",
  "\u1EC1": "e\u0302\u0300",
  "\u1EC5": "e\u0302\u0303",
  "\u0117": "e\u0307",
  "\u1E1F": "f\u0307",
  "\u01F5": "g\u0301",
  "\u1E21": "g\u0304",
  "\u011F": "g\u0306",
  "\u01E7": "g\u030C",
  "\u011D": "g\u0302",
  "\u0121": "g\u0307",
  "\u1E27": "h\u0308",
  "\u021F": "h\u030C",
  "\u0125": "h\u0302",
  "\u1E23": "h\u0307",
  "\xED": "i\u0301",
  "\xEC": "i\u0300",
  "\xEF": "i\u0308",
  "\u1E2F": "i\u0308\u0301",
  "\u0129": "i\u0303",
  "\u012B": "i\u0304",
  "\u012D": "i\u0306",
  "\u01D0": "i\u030C",
  "\xEE": "i\u0302",
  "\u01F0": "j\u030C",
  "\u0135": "j\u0302",
  "\u1E31": "k\u0301",
  "\u01E9": "k\u030C",
  "\u013A": "l\u0301",
  "\u013E": "l\u030C",
  "\u1E3F": "m\u0301",
  "\u1E41": "m\u0307",
  "\u0144": "n\u0301",
  "\u01F9": "n\u0300",
  "\xF1": "n\u0303",
  "\u0148": "n\u030C",
  "\u1E45": "n\u0307",
  "\xF3": "o\u0301",
  "\xF2": "o\u0300",
  "\xF6": "o\u0308",
  "\u022B": "o\u0308\u0304",
  "\xF5": "o\u0303",
  "\u1E4D": "o\u0303\u0301",
  "\u1E4F": "o\u0303\u0308",
  "\u022D": "o\u0303\u0304",
  "\u014D": "o\u0304",
  "\u1E53": "o\u0304\u0301",
  "\u1E51": "o\u0304\u0300",
  "\u014F": "o\u0306",
  "\u01D2": "o\u030C",
  "\xF4": "o\u0302",
  "\u1ED1": "o\u0302\u0301",
  "\u1ED3": "o\u0302\u0300",
  "\u1ED7": "o\u0302\u0303",
  "\u022F": "o\u0307",
  "\u0231": "o\u0307\u0304",
  "\u0151": "o\u030B",
  "\u1E55": "p\u0301",
  "\u1E57": "p\u0307",
  "\u0155": "r\u0301",
  "\u0159": "r\u030C",
  "\u1E59": "r\u0307",
  "\u015B": "s\u0301",
  "\u1E65": "s\u0301\u0307",
  "\u0161": "s\u030C",
  "\u1E67": "s\u030C\u0307",
  "\u015D": "s\u0302",
  "\u1E61": "s\u0307",
  "\u1E97": "t\u0308",
  "\u0165": "t\u030C",
  "\u1E6B": "t\u0307",
  "\xFA": "u\u0301",
  "\xF9": "u\u0300",
  "\xFC": "u\u0308",
  "\u01D8": "u\u0308\u0301",
  "\u01DC": "u\u0308\u0300",
  "\u01D6": "u\u0308\u0304",
  "\u01DA": "u\u0308\u030C",
  "\u0169": "u\u0303",
  "\u1E79": "u\u0303\u0301",
  "\u016B": "u\u0304",
  "\u1E7B": "u\u0304\u0308",
  "\u016D": "u\u0306",
  "\u01D4": "u\u030C",
  "\xFB": "u\u0302",
  "\u016F": "u\u030A",
  "\u0171": "u\u030B",
  "\u1E7D": "v\u0303",
  "\u1E83": "w\u0301",
  "\u1E81": "w\u0300",
  "\u1E85": "w\u0308",
  "\u0175": "w\u0302",
  "\u1E87": "w\u0307",
  "\u1E98": "w\u030A",
  "\u1E8D": "x\u0308",
  "\u1E8B": "x\u0307",
  "\xFD": "y\u0301",
  "\u1EF3": "y\u0300",
  "\xFF": "y\u0308",
  "\u1EF9": "y\u0303",
  "\u0233": "y\u0304",
  "\u0177": "y\u0302",
  "\u1E8F": "y\u0307",
  "\u1E99": "y\u030A",
  "\u017A": "z\u0301",
  "\u017E": "z\u030C",
  "\u1E91": "z\u0302",
  "\u017C": "z\u0307",
  "\xC1": "A\u0301",
  "\xC0": "A\u0300",
  "\xC4": "A\u0308",
  "\u01DE": "A\u0308\u0304",
  "\xC3": "A\u0303",
  "\u0100": "A\u0304",
  "\u0102": "A\u0306",
  "\u1EAE": "A\u0306\u0301",
  "\u1EB0": "A\u0306\u0300",
  "\u1EB4": "A\u0306\u0303",
  "\u01CD": "A\u030C",
  "\xC2": "A\u0302",
  "\u1EA4": "A\u0302\u0301",
  "\u1EA6": "A\u0302\u0300",
  "\u1EAA": "A\u0302\u0303",
  "\u0226": "A\u0307",
  "\u01E0": "A\u0307\u0304",
  "\xC5": "A\u030A",
  "\u01FA": "A\u030A\u0301",
  "\u1E02": "B\u0307",
  "\u0106": "C\u0301",
  "\u010C": "C\u030C",
  "\u0108": "C\u0302",
  "\u010A": "C\u0307",
  "\u010E": "D\u030C",
  "\u1E0A": "D\u0307",
  "\xC9": "E\u0301",
  "\xC8": "E\u0300",
  "\xCB": "E\u0308",
  "\u1EBC": "E\u0303",
  "\u0112": "E\u0304",
  "\u1E16": "E\u0304\u0301",
  "\u1E14": "E\u0304\u0300",
  "\u0114": "E\u0306",
  "\u011A": "E\u030C",
  "\xCA": "E\u0302",
  "\u1EBE": "E\u0302\u0301",
  "\u1EC0": "E\u0302\u0300",
  "\u1EC4": "E\u0302\u0303",
  "\u0116": "E\u0307",
  "\u1E1E": "F\u0307",
  "\u01F4": "G\u0301",
  "\u1E20": "G\u0304",
  "\u011E": "G\u0306",
  "\u01E6": "G\u030C",
  "\u011C": "G\u0302",
  "\u0120": "G\u0307",
  "\u1E26": "H\u0308",
  "\u021E": "H\u030C",
  "\u0124": "H\u0302",
  "\u1E22": "H\u0307",
  "\xCD": "I\u0301",
  "\xCC": "I\u0300",
  "\xCF": "I\u0308",
  "\u1E2E": "I\u0308\u0301",
  "\u0128": "I\u0303",
  "\u012A": "I\u0304",
  "\u012C": "I\u0306",
  "\u01CF": "I\u030C",
  "\xCE": "I\u0302",
  "\u0130": "I\u0307",
  "\u0134": "J\u0302",
  "\u1E30": "K\u0301",
  "\u01E8": "K\u030C",
  "\u0139": "L\u0301",
  "\u013D": "L\u030C",
  "\u1E3E": "M\u0301",
  "\u1E40": "M\u0307",
  "\u0143": "N\u0301",
  "\u01F8": "N\u0300",
  "\xD1": "N\u0303",
  "\u0147": "N\u030C",
  "\u1E44": "N\u0307",
  "\xD3": "O\u0301",
  "\xD2": "O\u0300",
  "\xD6": "O\u0308",
  "\u022A": "O\u0308\u0304",
  "\xD5": "O\u0303",
  "\u1E4C": "O\u0303\u0301",
  "\u1E4E": "O\u0303\u0308",
  "\u022C": "O\u0303\u0304",
  "\u014C": "O\u0304",
  "\u1E52": "O\u0304\u0301",
  "\u1E50": "O\u0304\u0300",
  "\u014E": "O\u0306",
  "\u01D1": "O\u030C",
  "\xD4": "O\u0302",
  "\u1ED0": "O\u0302\u0301",
  "\u1ED2": "O\u0302\u0300",
  "\u1ED6": "O\u0302\u0303",
  "\u022E": "O\u0307",
  "\u0230": "O\u0307\u0304",
  "\u0150": "O\u030B",
  "\u1E54": "P\u0301",
  "\u1E56": "P\u0307",
  "\u0154": "R\u0301",
  "\u0158": "R\u030C",
  "\u1E58": "R\u0307",
  "\u015A": "S\u0301",
  "\u1E64": "S\u0301\u0307",
  "\u0160": "S\u030C",
  "\u1E66": "S\u030C\u0307",
  "\u015C": "S\u0302",
  "\u1E60": "S\u0307",
  "\u0164": "T\u030C",
  "\u1E6A": "T\u0307",
  "\xDA": "U\u0301",
  "\xD9": "U\u0300",
  "\xDC": "U\u0308",
  "\u01D7": "U\u0308\u0301",
  "\u01DB": "U\u0308\u0300",
  "\u01D5": "U\u0308\u0304",
  "\u01D9": "U\u0308\u030C",
  "\u0168": "U\u0303",
  "\u1E78": "U\u0303\u0301",
  "\u016A": "U\u0304",
  "\u1E7A": "U\u0304\u0308",
  "\u016C": "U\u0306",
  "\u01D3": "U\u030C",
  "\xDB": "U\u0302",
  "\u016E": "U\u030A",
  "\u0170": "U\u030B",
  "\u1E7C": "V\u0303",
  "\u1E82": "W\u0301",
  "\u1E80": "W\u0300",
  "\u1E84": "W\u0308",
  "\u0174": "W\u0302",
  "\u1E86": "W\u0307",
  "\u1E8C": "X\u0308",
  "\u1E8A": "X\u0307",
  "\xDD": "Y\u0301",
  "\u1EF2": "Y\u0300",
  "\u0178": "Y\u0308",
  "\u1EF8": "Y\u0303",
  "\u0232": "Y\u0304",
  "\u0176": "Y\u0302",
  "\u1E8E": "Y\u0307",
  "\u0179": "Z\u0301",
  "\u017D": "Z\u030C",
  "\u1E90": "Z\u0302",
  "\u017B": "Z\u0307",
  "\u03AC": "\u03B1\u0301",
  "\u1F70": "\u03B1\u0300",
  "\u1FB1": "\u03B1\u0304",
  "\u1FB0": "\u03B1\u0306",
  "\u03AD": "\u03B5\u0301",
  "\u1F72": "\u03B5\u0300",
  "\u03AE": "\u03B7\u0301",
  "\u1F74": "\u03B7\u0300",
  "\u03AF": "\u03B9\u0301",
  "\u1F76": "\u03B9\u0300",
  "\u03CA": "\u03B9\u0308",
  "\u0390": "\u03B9\u0308\u0301",
  "\u1FD2": "\u03B9\u0308\u0300",
  "\u1FD1": "\u03B9\u0304",
  "\u1FD0": "\u03B9\u0306",
  "\u03CC": "\u03BF\u0301",
  "\u1F78": "\u03BF\u0300",
  "\u03CD": "\u03C5\u0301",
  "\u1F7A": "\u03C5\u0300",
  "\u03CB": "\u03C5\u0308",
  "\u03B0": "\u03C5\u0308\u0301",
  "\u1FE2": "\u03C5\u0308\u0300",
  "\u1FE1": "\u03C5\u0304",
  "\u1FE0": "\u03C5\u0306",
  "\u03CE": "\u03C9\u0301",
  "\u1F7C": "\u03C9\u0300",
  "\u038E": "\u03A5\u0301",
  "\u1FEA": "\u03A5\u0300",
  "\u03AB": "\u03A5\u0308",
  "\u1FE9": "\u03A5\u0304",
  "\u1FE8": "\u03A5\u0306",
  "\u038F": "\u03A9\u0301",
  "\u1FFA": "\u03A9\u0300"
};
var binLeftCancellers = ["bin", "op", "open", "punct", "rel"];
var sizeRegEx = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/;
var textRegEx = /^ *\\text/;
var Parser = class _Parser {
  constructor(input, settings, isPreamble = false) {
    this.mode = "math";
    this.gullet = new MacroExpander(input, settings, this.mode);
    this.settings = settings;
    this.isPreamble = isPreamble;
    this.leftrightDepth = 0;
    this.prevAtomType = "";
  }
  /**
   * Checks a result to make sure it has the right type, and throws an
   * appropriate error otherwise.
   */
  expect(text2, consume = true) {
    if (this.fetch().text !== text2) {
      throw new ParseError(`Expected '${text2}', got '${this.fetch().text}'`, this.fetch());
    }
    if (consume) {
      this.consume();
    }
  }
  /**
   * Discards the current lookahead token, considering it consumed.
   */
  consume() {
    this.nextToken = null;
  }
  /**
   * Return the current lookahead token, or if there isn't one (at the
   * beginning, or if the previous lookahead token was consume()d),
   * fetch the next token as the new lookahead token and return it.
   */
  fetch() {
    if (this.nextToken == null) {
      this.nextToken = this.gullet.expandNextToken();
    }
    return this.nextToken;
  }
  /**
   * Switches between "text" and "math" modes.
   */
  switchMode(newMode) {
    this.mode = newMode;
    this.gullet.switchMode(newMode);
  }
  /**
   * Main parsing function, which parses an entire input.
   */
  parse() {
    this.gullet.beginGroup();
    if (this.settings.colorIsTextColor) {
      this.gullet.macros.set("\\color", "\\textcolor");
    }
    const parse = this.parseExpression(false);
    this.expect("EOF");
    if (this.isPreamble) {
      const macros2 = /* @__PURE__ */ Object.create(null);
      Object.entries(this.gullet.macros.current).forEach(([key2, value]) => {
        macros2[key2] = value;
      });
      this.gullet.endGroup();
      return macros2;
    }
    const tag = this.gullet.macros.get("\\df@tag");
    this.gullet.endGroup();
    if (tag) {
      this.gullet.macros.current["\\df@tag"] = tag;
    }
    return parse;
  }
  static get endOfExpression() {
    return ["}", "\\endgroup", "\\end", "\\right", "\\endtoggle", "&"];
  }
  /**
   * Fully parse a separate sequence of tokens as a separate job.
   * Tokens should be specified in reverse order, as in a MacroDefinition.
   */
  subparse(tokens) {
    const oldToken = this.nextToken;
    this.consume();
    this.gullet.pushToken(new Token("}"));
    this.gullet.pushTokens(tokens);
    const parse = this.parseExpression(false);
    this.expect("}");
    this.nextToken = oldToken;
    return parse;
  }
  /**
     * Parses an "expression", which is a list of atoms.
     *
     * `breakOnInfix`: Should the parsing stop when we hit infix nodes? This
     *                 happens when functions have higher precedence than infix
     *                 nodes in implicit parses.
     *
     * `breakOnTokenText`: The text of the token that the expression should end
     *                     with, or `null` if something else should end the
     *                     expression.
     *
     * `breakOnMiddle`: \color, \over, and old styling functions work on an implicit group.
     *                  These groups end just before the usual tokens, but they also
     *                  end just before `\middle`.
     */
  parseExpression(breakOnInfix, breakOnTokenText, breakOnMiddle) {
    const body = [];
    this.prevAtomType = "";
    while (true) {
      if (this.mode === "math") {
        this.consumeSpaces();
      }
      const lex = this.fetch();
      if (_Parser.endOfExpression.indexOf(lex.text) !== -1) {
        break;
      }
      if (breakOnTokenText && lex.text === breakOnTokenText) {
        break;
      }
      if (breakOnMiddle && lex.text === "\\middle") {
        break;
      }
      if (breakOnInfix && functions[lex.text] && functions[lex.text].infix) {
        break;
      }
      const atom = this.parseAtom(breakOnTokenText);
      if (!atom) {
        break;
      } else if (atom.type === "internal") {
        continue;
      }
      body.push(atom);
      this.prevAtomType = atom.type === "atom" ? atom.family : atom.type;
    }
    if (this.mode === "text") {
      this.formLigatures(body);
    }
    return this.handleInfixNodes(body);
  }
  /**
   * Rewrites infix operators such as \over with corresponding commands such
   * as \frac.
   *
   * There can only be one infix operator per group.  If there's more than one
   * then the expression is ambiguous.  This can be resolved by adding {}.
   */
  handleInfixNodes(body) {
    let overIndex = -1;
    let funcName;
    for (let i = 0; i < body.length; i++) {
      if (body[i].type === "infix") {
        if (overIndex !== -1) {
          throw new ParseError("only one infix operator per group", body[i].token);
        }
        overIndex = i;
        funcName = body[i].replaceWith;
      }
    }
    if (overIndex !== -1 && funcName) {
      let numerNode;
      let denomNode;
      const numerBody = body.slice(0, overIndex);
      const denomBody = body.slice(overIndex + 1);
      if (numerBody.length === 1 && numerBody[0].type === "ordgroup") {
        numerNode = numerBody[0];
      } else {
        numerNode = { type: "ordgroup", mode: this.mode, body: numerBody };
      }
      if (denomBody.length === 1 && denomBody[0].type === "ordgroup") {
        denomNode = denomBody[0];
      } else {
        denomNode = { type: "ordgroup", mode: this.mode, body: denomBody };
      }
      let node;
      if (funcName === "\\\\abovefrac") {
        node = this.callFunction(funcName, [numerNode, body[overIndex], denomNode], []);
      } else {
        node = this.callFunction(funcName, [numerNode, denomNode], []);
      }
      return [node];
    } else {
      return body;
    }
  }
  /**
   * Handle a subscript or superscript with nice errors.
   */
  handleSupSubscript(name2) {
    const symbolToken = this.fetch();
    const symbol = symbolToken.text;
    this.consume();
    this.consumeSpaces();
    let group;
    do {
      group = this.parseGroup(name2);
    } while (group.type && group.type === "internal");
    if (!group) {
      throw new ParseError("Expected group after '" + symbol + "'", symbolToken);
    }
    return group;
  }
  /**
   * Converts the textual input of an unsupported command into a text node
   * contained within a color node whose color is determined by errorColor
   */
  formatUnsupportedCmd(text2) {
    const textordArray = [];
    for (let i = 0; i < text2.length; i++) {
      textordArray.push({ type: "textord", mode: "text", text: text2[i] });
    }
    const textNode = {
      type: "text",
      mode: this.mode,
      body: textordArray
    };
    const colorNode = {
      type: "color",
      mode: this.mode,
      color: this.settings.errorColor,
      body: [textNode]
    };
    return colorNode;
  }
  /**
   * Parses a group with optional super/subscripts.
   */
  parseAtom(breakOnTokenText) {
    const base = this.parseGroup("atom", breakOnTokenText);
    if (base && base.type === "internal") {
      return base;
    }
    if (this.mode === "text") {
      return base;
    }
    let superscript;
    let subscript;
    while (true) {
      this.consumeSpaces();
      const lex = this.fetch();
      if (lex.text === "\\limits" || lex.text === "\\nolimits") {
        if (base && base.type === "op") {
          const limits = lex.text === "\\limits";
          base.limits = limits;
          base.alwaysHandleSupSub = true;
        } else if (base && base.type === "operatorname") {
          if (base.alwaysHandleSupSub) {
            base.limits = lex.text === "\\limits";
          }
        } else {
          throw new ParseError("Limit controls must follow a math operator", lex);
        }
        this.consume();
      } else if (lex.text === "^") {
        if (superscript) {
          throw new ParseError("Double superscript", lex);
        }
        superscript = this.handleSupSubscript("superscript");
      } else if (lex.text === "_") {
        if (subscript) {
          throw new ParseError("Double subscript", lex);
        }
        subscript = this.handleSupSubscript("subscript");
      } else if (lex.text === "'") {
        if (superscript) {
          throw new ParseError("Double superscript", lex);
        }
        const prime = { type: "textord", mode: this.mode, text: "\\prime" };
        const primes2 = [prime];
        this.consume();
        while (this.fetch().text === "'") {
          primes2.push(prime);
          this.consume();
        }
        if (this.fetch().text === "^") {
          primes2.push(this.handleSupSubscript("superscript"));
        }
        superscript = { type: "ordgroup", mode: this.mode, body: primes2 };
      } else if (uSubsAndSups[lex.text]) {
        const isSub = unicodeSubRegEx.test(lex.text);
        const subsupTokens = [];
        subsupTokens.push(new Token(uSubsAndSups[lex.text]));
        this.consume();
        while (true) {
          const token = this.fetch().text;
          if (!uSubsAndSups[token]) {
            break;
          }
          if (unicodeSubRegEx.test(token) !== isSub) {
            break;
          }
          subsupTokens.unshift(new Token(uSubsAndSups[token]));
          this.consume();
        }
        const body = this.subparse(subsupTokens);
        if (isSub) {
          subscript = { type: "ordgroup", mode: "math", body };
        } else {
          superscript = { type: "ordgroup", mode: "math", body };
        }
      } else {
        break;
      }
    }
    if (superscript || subscript) {
      if (base && base.type === "multiscript" && !base.postscripts) {
        base.postscripts = { sup: superscript, sub: subscript };
        return base;
      } else {
        const isFollowedByDelimiter = !base || base.type !== "op" && base.type !== "operatorname" ? void 0 : isDelimiter(this.nextToken.text);
        return {
          type: "supsub",
          mode: this.mode,
          base,
          sup: superscript,
          sub: subscript,
          isFollowedByDelimiter
        };
      }
    } else {
      return base;
    }
  }
  /**
   * Parses an entire function, including its base and all of its arguments.
   */
  parseFunction(breakOnTokenText, name2) {
    const token = this.fetch();
    const func = token.text;
    const funcData = functions[func];
    if (!funcData) {
      return null;
    }
    this.consume();
    if (name2 && name2 !== "atom" && !funcData.allowedInArgument) {
      throw new ParseError(
        "Got function '" + func + "' with no arguments" + (name2 ? " as " + name2 : ""),
        token
      );
    } else if (this.mode === "text" && !funcData.allowedInText) {
      throw new ParseError("Can't use function '" + func + "' in text mode", token);
    } else if (this.mode === "math" && funcData.allowedInMath === false) {
      throw new ParseError("Can't use function '" + func + "' in math mode", token);
    }
    const prevAtomType = this.prevAtomType;
    const { args, optArgs } = this.parseArguments(func, funcData);
    this.prevAtomType = prevAtomType;
    return this.callFunction(func, args, optArgs, token, breakOnTokenText);
  }
  /**
   * Call a function handler with a suitable context and arguments.
   */
  callFunction(name2, args, optArgs, token, breakOnTokenText) {
    const context = {
      funcName: name2,
      parser: this,
      token,
      breakOnTokenText
    };
    const func = functions[name2];
    if (func && func.handler) {
      return func.handler(context, args, optArgs);
    } else {
      throw new ParseError(`No function handler for ${name2}`);
    }
  }
  /**
   * Parses the arguments of a function or environment
   */
  parseArguments(func, funcData) {
    const totalArgs = funcData.numArgs + funcData.numOptionalArgs;
    if (totalArgs === 0) {
      return { args: [], optArgs: [] };
    }
    const args = [];
    const optArgs = [];
    for (let i = 0; i < totalArgs; i++) {
      let argType = funcData.argTypes && funcData.argTypes[i];
      const isOptional = i < funcData.numOptionalArgs;
      if (funcData.primitive && argType == null || // \sqrt expands into primitive if optional argument doesn't exist
      funcData.type === "sqrt" && i === 1 && optArgs[0] == null) {
        argType = "primitive";
      }
      const arg2 = this.parseGroupOfType(`argument to '${func}'`, argType, isOptional);
      if (isOptional) {
        optArgs.push(arg2);
      } else if (arg2 != null) {
        args.push(arg2);
      } else {
        throw new ParseError("Null argument, please report this as a bug");
      }
    }
    return { args, optArgs };
  }
  /**
   * Parses a group when the mode is changing.
   */
  parseGroupOfType(name2, type, optional) {
    switch (type) {
      case "size":
        return this.parseSizeGroup(optional);
      case "url":
        return this.parseUrlGroup(optional);
      case "math":
      case "text":
        return this.parseArgumentGroup(optional, type);
      case "hbox": {
        const group = this.parseArgumentGroup(optional, "text");
        return group != null ? {
          type: "styling",
          mode: group.mode,
          body: [group],
          scriptLevel: "text"
          // simulate \textstyle
        } : null;
      }
      case "raw": {
        const token = this.parseStringGroup("raw", optional);
        return token != null ? {
          type: "raw",
          mode: "text",
          string: token.text
        } : null;
      }
      case "primitive": {
        if (optional) {
          throw new ParseError("A primitive argument cannot be optional");
        }
        const group = this.parseGroup(name2);
        if (group == null) {
          throw new ParseError("Expected group as " + name2, this.fetch());
        }
        return group;
      }
      case "original":
      case null:
      case void 0:
        return this.parseArgumentGroup(optional);
      default:
        throw new ParseError("Unknown group type as " + name2, this.fetch());
    }
  }
  /**
   * Discard any space tokens, fetching the next non-space token.
   */
  consumeSpaces() {
    while (true) {
      const ch = this.fetch().text;
      if (ch === " " || ch === "\xA0" || ch === "\uFE0E") {
        this.consume();
      } else {
        break;
      }
    }
  }
  /**
   * Parses a group, essentially returning the string formed by the
   * brace-enclosed tokens plus some position information.
   */
  parseStringGroup(modeName, optional) {
    const argToken = this.gullet.scanArgument(optional);
    if (argToken == null) {
      return null;
    }
    let str = "";
    let nextToken;
    while ((nextToken = this.fetch()).text !== "EOF") {
      str += nextToken.text;
      this.consume();
    }
    this.consume();
    argToken.text = str;
    return argToken;
  }
  /**
   * Parses a regex-delimited group: the largest sequence of tokens
   * whose concatenated strings match `regex`. Returns the string
   * formed by the tokens plus some position information.
   */
  parseRegexGroup(regex, modeName) {
    const firstToken = this.fetch();
    let lastToken = firstToken;
    let str = "";
    let nextToken;
    while ((nextToken = this.fetch()).text !== "EOF" && regex.test(str + nextToken.text)) {
      lastToken = nextToken;
      str += lastToken.text;
      this.consume();
    }
    if (str === "") {
      throw new ParseError("Invalid " + modeName + ": '" + firstToken.text + "'", firstToken);
    }
    return firstToken.range(lastToken, str);
  }
  /**
   * Parses a size specification, consisting of magnitude and unit.
   */
  parseSizeGroup(optional) {
    let res;
    let isBlank = false;
    this.gullet.consumeSpaces();
    if (!optional && this.gullet.future().text !== "{") {
      res = this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/, "size");
    } else {
      res = this.parseStringGroup("size", optional);
    }
    if (!res) {
      return null;
    }
    if (!optional && res.text.length === 0) {
      res.text = "0pt";
      isBlank = true;
    }
    const match = sizeRegEx.exec(res.text);
    if (!match) {
      throw new ParseError("Invalid size: '" + res.text + "'", res);
    }
    const data = {
      number: +(match[1] + match[2]),
      // sign + magnitude, cast to number
      unit: match[3]
    };
    if (!validUnit(data)) {
      throw new ParseError("Invalid unit: '" + data.unit + "'", res);
    }
    return {
      type: "size",
      mode: this.mode,
      value: data,
      isBlank
    };
  }
  /**
   * Parses an URL, checking escaped letters and allowed protocols,
   * and setting the catcode of % as an active character (as in \hyperref).
   */
  parseUrlGroup(optional) {
    this.gullet.lexer.setCatcode("%", 13);
    this.gullet.lexer.setCatcode("~", 12);
    const res = this.parseStringGroup("url", optional);
    this.gullet.lexer.setCatcode("%", 14);
    this.gullet.lexer.setCatcode("~", 13);
    if (res == null) {
      return null;
    }
    let url = res.text.replace(/\\([#$%&~_^{}])/g, "$1");
    url = res.text.replace(/{\u2044}/g, "/");
    return {
      type: "url",
      mode: this.mode,
      url
    };
  }
  /**
   * Parses an argument with the mode specified.
   */
  parseArgumentGroup(optional, mode) {
    const argToken = this.gullet.scanArgument(optional);
    if (argToken == null) {
      return null;
    }
    const outerMode = this.mode;
    if (mode) {
      this.switchMode(mode);
    }
    this.gullet.beginGroup();
    const expression = this.parseExpression(false, "EOF");
    this.expect("EOF");
    this.gullet.endGroup();
    const result = {
      type: "ordgroup",
      mode: this.mode,
      loc: argToken.loc,
      body: expression
    };
    if (mode) {
      this.switchMode(outerMode);
    }
    return result;
  }
  /**
   * Parses an ordinary group, which is either a single nucleus (like "x")
   * or an expression in braces (like "{x+y}") or an implicit group, a group
   * that starts at the current position, and ends right before a higher explicit
   * group ends, or at EOF.
   */
  parseGroup(name2, breakOnTokenText) {
    const firstToken = this.fetch();
    const text2 = firstToken.text;
    if (name2 === "argument to '\\left'") {
      return this.parseSymbol();
    }
    let result;
    if (text2 === "{" || text2 === "\\begingroup" || text2 === "\\toggle") {
      this.consume();
      const groupEnd = text2 === "{" ? "}" : text2 === "\\begingroup" ? "\\endgroup" : "\\endtoggle";
      this.gullet.beginGroup();
      const expression = this.parseExpression(false, groupEnd);
      const lastToken = this.fetch();
      this.expect(groupEnd);
      this.gullet.endGroup();
      result = {
        type: lastToken.text === "\\endtoggle" ? "toggle" : "ordgroup",
        mode: this.mode,
        loc: SourceLocation.range(firstToken, lastToken),
        body: expression,
        // A group formed by \begingroup...\endgroup is a semi-simple group
        // which doesn't affect spacing in math mode, i.e., is transparent.
        // https://tex.stackexchange.com/questions/1930/
        semisimple: text2 === "\\begingroup" || void 0
      };
    } else {
      result = this.parseFunction(breakOnTokenText, name2) || this.parseSymbol();
      if (result == null && text2[0] === "\\" && !Object.prototype.hasOwnProperty.call(implicitCommands, text2)) {
        if (this.settings.throwOnError) {
          throw new ParseError("Unsupported function name: " + text2, firstToken);
        }
        result = this.formatUnsupportedCmd(text2);
        this.consume();
      }
    }
    return result;
  }
  /**
   * Form ligature-like combinations of characters for text mode.
   * This includes inputs like "--", "---", "``" and "''".
   * The result will simply replace multiple textord nodes with a single
   * character in each value by a single textord node having multiple
   * characters in its value.  The representation is still ASCII source.
   * The group will be modified in place.
   */
  formLigatures(group) {
    let n = group.length - 1;
    for (let i = 0; i < n; ++i) {
      const a = group[i];
      const v = a.text;
      if (v === "-" && group[i + 1].text === "-") {
        if (i + 1 < n && group[i + 2].text === "-") {
          group.splice(i, 3, {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(a, group[i + 2]),
            text: "---"
          });
          n -= 2;
        } else {
          group.splice(i, 2, {
            type: "textord",
            mode: "text",
            loc: SourceLocation.range(a, group[i + 1]),
            text: "--"
          });
          n -= 1;
        }
      }
      if ((v === "'" || v === "`") && group[i + 1].text === v) {
        group.splice(i, 2, {
          type: "textord",
          mode: "text",
          loc: SourceLocation.range(a, group[i + 1]),
          text: v + v
        });
        n -= 1;
      }
    }
  }
  /**
   * Parse a single symbol out of the string. Here, we handle single character
   * symbols and special functions like \verb.
   */
  parseSymbol() {
    const nucleus = this.fetch();
    let text2 = nucleus.text;
    if (/^\\verb[^a-zA-Z]/.test(text2)) {
      this.consume();
      let arg2 = text2.slice(5);
      const star = arg2.charAt(0) === "*";
      if (star) {
        arg2 = arg2.slice(1);
      }
      if (arg2.length < 2 || arg2.charAt(0) !== arg2.slice(-1)) {
        throw new ParseError(`\\verb assertion failed --
                    please report what input caused this bug`);
      }
      arg2 = arg2.slice(1, -1);
      return {
        type: "verb",
        mode: "text",
        body: arg2,
        star
      };
    }
    if (Object.prototype.hasOwnProperty.call(unicodeSymbols, text2[0]) && this.mode === "math" && !symbols2[this.mode][text2[0]]) {
      if (this.settings.strict && this.mode === "math") {
        throw new ParseError(
          `Accented Unicode text character "${text2[0]}" used in math mode`,
          nucleus
        );
      }
      text2 = unicodeSymbols[text2[0]] + text2.slice(1);
    }
    const match = this.mode === "math" ? combiningDiacriticalMarksEndRegex.exec(text2) : null;
    if (match) {
      text2 = text2.substring(0, match.index);
      if (text2 === "i") {
        text2 = "\u0131";
      } else if (text2 === "j") {
        text2 = "\u0237";
      }
    }
    let symbol;
    if (symbols2[this.mode][text2]) {
      let group = symbols2[this.mode][text2].group;
      if (group === "bin" && (binLeftCancellers.includes(this.prevAtomType) || this.prevAtomType === "")) {
        group = "open";
      }
      const loc = SourceLocation.range(nucleus);
      let s;
      if (Object.prototype.hasOwnProperty.call(ATOMS, group)) {
        const family = group;
        s = {
          type: "atom",
          mode: this.mode,
          family,
          loc,
          text: text2
        };
        if ((family === "rel" || family === "bin") && this.prevAtomType === "text") {
          if (textRegEx.test(loc.lexer.input.slice(loc.end))) {
            s.needsSpacing = true;
          }
        }
      } else {
        if (asciiFromScript[text2]) {
          this.consume();
          const nextCode = this.fetch().text.charCodeAt(0);
          const font = nextCode === 65025 ? "mathscr" : "mathcal";
          if (nextCode === 65024 || nextCode === 65025) {
            this.consume();
          }
          return {
            type: "font",
            mode: "math",
            font,
            body: { type: "mathord", mode: "math", loc, text: asciiFromScript[text2] }
          };
        }
        s = {
          type: group,
          mode: this.mode,
          loc,
          text: text2
        };
      }
      symbol = s;
    } else if (text2.charCodeAt(0) >= 128 || combiningDiacriticalMarksEndRegex.exec(text2)) {
      if (this.settings.strict && this.mode === "math") {
        throw new ParseError(`Unicode text character "${text2[0]}" used in math mode`, nucleus);
      }
      symbol = {
        type: "textord",
        mode: "text",
        loc: SourceLocation.range(nucleus),
        text: text2
      };
    } else {
      return null;
    }
    this.consume();
    if (match) {
      for (let i = 0; i < match[0].length; i++) {
        const accent2 = match[0][i];
        if (!unicodeAccents[accent2]) {
          throw new ParseError(`Unknown accent ' ${accent2}'`, nucleus);
        }
        const command = unicodeAccents[accent2][this.mode] || unicodeAccents[accent2].text;
        if (!command) {
          throw new ParseError(`Accent ${accent2} unsupported in ${this.mode} mode`, nucleus);
        }
        symbol = {
          type: "accent",
          mode: this.mode,
          loc: SourceLocation.range(nucleus),
          label: command,
          isStretchy: false,
          base: symbol
        };
      }
    }
    return symbol;
  }
};
var parseTree = function(toParse, settings) {
  if (!(typeof toParse === "string" || toParse instanceof String)) {
    throw new TypeError("Temml can only parse string typed expression");
  }
  let tree;
  let parser;
  try {
    parser = new Parser(toParse, settings);
    delete parser.gullet.macros.current["\\df@tag"];
    tree = parser.parse();
  } catch (error) {
    if (error.toString() === "ParseError:  Unmatched delimiter") {
      settings.wrapDelimiterPairs = false;
      parser = new Parser(toParse, settings);
      delete parser.gullet.macros.current["\\df@tag"];
      tree = parser.parse();
    } else {
      throw error;
    }
  }
  if (!(tree.length > 0 && tree[0].type && tree[0].type === "array" && tree[0].addEqnNum)) {
    if (parser.gullet.macros.get("\\df@tag")) {
      if (!settings.displayMode) {
        throw new ParseError("\\tag works only in display mode");
      }
      parser.gullet.feed("\\df@tag");
      tree = [
        {
          type: "tag",
          mode: "text",
          body: tree,
          tag: parser.parse()
        }
      ];
    }
  }
  return tree;
};
var subOrSupLevel = [2, 2, 3, 3];
var Style = class _Style {
  constructor(data) {
    this.level = data.level;
    this.color = data.color;
    this.font = data.font || "";
    this.fontFamily = data.fontFamily || "";
    this.fontSize = data.fontSize || 1;
    this.fontWeight = data.fontWeight || "";
    this.fontShape = data.fontShape || "";
    this.maxSize = data.maxSize;
  }
  /**
   * Returns a new style object with the same properties as "this".  Properties
   * from "extension" will be copied to the new style object.
   */
  extend(extension) {
    const data = {
      level: this.level,
      color: this.color,
      font: this.font,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontShape: this.fontShape,
      maxSize: this.maxSize
    };
    for (const key2 in extension) {
      if (Object.prototype.hasOwnProperty.call(extension, key2)) {
        data[key2] = extension[key2];
      }
    }
    return new _Style(data);
  }
  withLevel(n) {
    return this.extend({
      level: n
    });
  }
  incrementLevel() {
    return this.extend({
      level: Math.min(this.level + 1, 3)
    });
  }
  inSubOrSup() {
    return this.extend({
      level: subOrSupLevel[this.level]
    });
  }
  /**
   * Create a new style object with the given color.
   */
  withColor(color) {
    return this.extend({
      color
    });
  }
  /**
   * Creates a new style object with the given math font or old text font.
   * @type {[type]}
   */
  withFont(font) {
    return this.extend({
      font
    });
  }
  /**
   * Create a new style objects with the given fontFamily.
   */
  withTextFontFamily(fontFamily) {
    return this.extend({
      fontFamily,
      font: ""
    });
  }
  /**
   * Creates a new style object with the given font size
   */
  withFontSize(num) {
    return this.extend({
      fontSize: num
    });
  }
  /**
   * Creates a new style object with the given font weight
   */
  withTextFontWeight(fontWeight) {
    return this.extend({
      fontWeight,
      font: ""
    });
  }
  /**
   * Creates a new style object with the given font weight
   */
  withTextFontShape(fontShape) {
    return this.extend({
      fontShape,
      font: ""
    });
  }
  /**
   * Gets the CSS color of the current style object
   */
  getColor() {
    return this.color;
  }
};
var version2 = "0.13.5";
function postProcess(block) {
  const labelMap = {};
  let i = 0;
  const amsEqns = document.getElementsByClassName("tml-eqn");
  for (let parent of amsEqns) {
    i += 1;
    parent.setAttribute("id", "tml-eqn-" + String(i));
    while (true) {
      if (parent.tagName === "mtable") {
        break;
      }
      const labels = parent.getElementsByClassName("tml-label");
      if (labels.length > 0) {
        const id = parent.attributes.id.value;
        labelMap[id] = String(i);
        break;
      } else {
        parent = parent.parentElement;
      }
    }
  }
  const taggedEqns = document.getElementsByClassName("tml-tageqn");
  for (const parent of taggedEqns) {
    const labels = parent.getElementsByClassName("tml-label");
    if (labels.length > 0) {
      const tags = parent.getElementsByClassName("tml-tag");
      if (tags.length > 0) {
        const id = parent.attributes.id.value;
        labelMap[id] = tags[0].textContent;
      }
    }
  }
  const refs = block.getElementsByClassName("tml-ref");
  [...refs].forEach((ref) => {
    const attr = ref.getAttribute("href");
    let str = labelMap[attr.slice(1)];
    if (ref.className.indexOf("tml-eqref") === -1) {
      str = str.replace(/^\(/, "");
      str = str.replace(/\)$/, "");
    } else {
      if (str.charAt(0) !== "(") {
        str = "(" + str;
      }
      if (str.slice(-1) !== ")") {
        str = str + ")";
      }
    }
    const mtext = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mtext");
    mtext.appendChild(document.createTextNode(str));
    const math2 = document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
    math2.appendChild(mtext);
    ref.textContent = "";
    ref.appendChild(math2);
  });
}
var findEndOfMath = function(delimiter, text2, startIndex) {
  let index = startIndex;
  let braceLevel = 0;
  const delimLength = delimiter.length;
  while (index < text2.length) {
    const character = text2[index];
    if (braceLevel <= 0 && text2.slice(index, index + delimLength) === delimiter) {
      return index;
    } else if (character === "\\") {
      index++;
    } else if (character === "{") {
      braceLevel++;
    } else if (character === "}") {
      braceLevel--;
    }
    index++;
  }
  return -1;
};
var escapeRegex = function(string) {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};
var amsRegex = /^\\(?:begin|(?:eq)?ref){/;
var splitAtDelimiters = function(text2, delimiters2) {
  let index;
  const data = [];
  const regexLeft = new RegExp(
    "(" + delimiters2.map((x) => escapeRegex(x.left)).join("|") + ")"
  );
  while (true) {
    index = text2.search(regexLeft);
    if (index === -1) {
      break;
    }
    if (index > 0) {
      data.push({
        type: "text",
        data: text2.slice(0, index)
      });
      text2 = text2.slice(index);
    }
    const i = delimiters2.findIndex((delim) => text2.startsWith(delim.left));
    index = findEndOfMath(delimiters2[i].right, text2, delimiters2[i].left.length);
    if (index === -1) {
      break;
    }
    const rawData = text2.slice(0, index + delimiters2[i].right.length);
    const math2 = amsRegex.test(rawData) ? rawData : text2.slice(delimiters2[i].left.length, index);
    data.push({
      type: "math",
      data: math2,
      rawData,
      display: delimiters2[i].display
    });
    text2 = text2.slice(index + delimiters2[i].right.length);
  }
  if (text2 !== "") {
    data.push({
      type: "text",
      data: text2
    });
  }
  return data;
};
var defaultDelimiters = [
  { left: "$$", right: "$$", display: true },
  { left: "\\(", right: "\\)", display: false },
  // LaTeX uses $…$, but it ruins the display of normal `$` in text:
  // {left: "$", right: "$", display: false},
  // $ must come after $$
  // Render AMS environments even if outside $$…$$ delimiters.
  { left: "\\begin{equation}", right: "\\end{equation}", display: true },
  { left: "\\begin{equation*}", right: "\\end{equation*}", display: true },
  { left: "\\begin{align}", right: "\\end{align}", display: true },
  { left: "\\begin{align*}", right: "\\end{align*}", display: true },
  { left: "\\begin{alignat}", right: "\\end{alignat}", display: true },
  { left: "\\begin{alignat*}", right: "\\end{alignat*}", display: true },
  { left: "\\begin{gather}", right: "\\end{gather}", display: true },
  { left: "\\begin{gather*}", right: "\\end{gather*}", display: true },
  { left: "\\begin{CD}", right: "\\end{CD}", display: true },
  // Ditto \ref & \eqref
  { left: "\\ref{", right: "}", display: false },
  { left: "\\eqref{", right: "}", display: false },
  { left: "\\[", right: "\\]", display: true }
];
var firstDraftDelimiters = {
  "$": [
    { left: "$$", right: "$$", display: true },
    { left: "$`", right: "`$", display: false },
    { left: "$", right: "$", display: false }
  ],
  "(": [
    { left: "\\[", right: "\\]", display: true },
    { left: "\\(", right: "\\)", display: false }
  ]
};
var amsDelimiters = [
  { left: "\\begin{equation}", right: "\\end{equation}", display: true },
  { left: "\\begin{equation*}", right: "\\end{equation*}", display: true },
  { left: "\\begin{align}", right: "\\end{align}", display: true },
  { left: "\\begin{align*}", right: "\\end{align*}", display: true },
  { left: "\\begin{alignat}", right: "\\end{alignat}", display: true },
  { left: "\\begin{alignat*}", right: "\\end{alignat*}", display: true },
  { left: "\\begin{gather}", right: "\\end{gather}", display: true },
  { left: "\\begin{gather*}", right: "\\end{gather*}", display: true },
  { left: "\\begin{CD}", right: "\\end{CD}", display: true },
  { left: "\\ref{", right: "}", display: false },
  { left: "\\eqref{", right: "}", display: false }
];
var delimitersFromKey = (key2) => {
  if (key2 === "$" || key2 === "(") {
    return firstDraftDelimiters[key2];
  } else if (key2 === "$+" || key2 === "(+") {
    const firstDraft = firstDraftDelimiters[key2.slice(0, 1)];
    return firstDraft.concat(amsDelimiters);
  } else if (key2 === "ams") {
    return amsDelimiters;
  } else if (key2 === "all") {
    return firstDraftDelimiters["("].concat(firstDraftDelimiters["$"]).concat(amsDelimiters);
  } else {
    return defaultDelimiters;
  }
};
var renderMathInText = function(text2, optionsCopy) {
  const data = splitAtDelimiters(text2, optionsCopy.delimiters);
  if (data.length === 1 && data[0].type === "text") {
    return null;
  }
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < data.length; i++) {
    if (data[i].type === "text") {
      fragment.appendChild(document.createTextNode(data[i].data));
    } else {
      const span = document.createElement("span");
      let math2 = data[i].data;
      optionsCopy.displayMode = data[i].display;
      try {
        if (optionsCopy.preProcess) {
          math2 = optionsCopy.preProcess(math2);
        }
        temml.render(math2, span, optionsCopy);
      } catch (e) {
        if (!(e instanceof ParseError)) {
          throw e;
        }
        optionsCopy.errorCallback(
          "Temml auto-render: Failed to parse `" + data[i].data + "` with ",
          e
        );
        fragment.appendChild(document.createTextNode(data[i].rawData));
        continue;
      }
      fragment.appendChild(span);
    }
  }
  return fragment;
};
var renderElem = function(elem, optionsCopy) {
  for (let i = 0; i < elem.childNodes.length; i++) {
    const childNode = elem.childNodes[i];
    if (childNode.nodeType === 3) {
      const frag = renderMathInText(childNode.textContent, optionsCopy);
      if (frag) {
        i += frag.childNodes.length - 1;
        elem.replaceChild(frag, childNode);
      }
    } else if (childNode.nodeType === 1) {
      const className = " " + childNode.className + " ";
      const shouldRender = optionsCopy.ignoredTags.indexOf(childNode.nodeName.toLowerCase()) === -1 && optionsCopy.ignoredClasses.every((x) => className.indexOf(" " + x + " ") === -1);
      if (shouldRender) {
        renderElem(childNode, optionsCopy);
      }
    }
  }
};
var renderMathInElement = function(elem, options) {
  if (!elem) {
    throw new Error("No element provided to render");
  }
  const optionsCopy = {};
  for (const option in options) {
    if (Object.prototype.hasOwnProperty.call(options, option)) {
      optionsCopy[option] = options[option];
    }
  }
  if (optionsCopy.fences) {
    optionsCopy.delimiters = delimitersFromKey(optionsCopy.fences);
  } else {
    optionsCopy.delimiters = optionsCopy.delimiters || defaultDelimiters;
  }
  optionsCopy.ignoredTags = optionsCopy.ignoredTags || [
    "script",
    "noscript",
    "style",
    "textarea",
    "pre",
    "code",
    "option"
  ];
  optionsCopy.ignoredClasses = optionsCopy.ignoredClasses || [];
  optionsCopy.errorCallback = optionsCopy.errorCallback || console.error;
  optionsCopy.macros = optionsCopy.macros || /* @__PURE__ */ Object.create(null);
  renderElem(elem, optionsCopy);
  postProcess(elem);
};
var render = function(expression, baseNode, options = {}) {
  baseNode.textContent = "";
  const alreadyInMathElement = baseNode.tagName.toLowerCase() === "math";
  if (alreadyInMathElement) {
    options.wrap = "none";
  }
  const math2 = renderToMathMLTree(expression, options);
  if (alreadyInMathElement) {
    baseNode.textContent = "";
    math2.children.forEach((e) => {
      baseNode.appendChild(e.toNode());
    });
  } else if (math2.children.length > 1) {
    baseNode.textContent = "";
    math2.children.forEach((e) => {
      baseNode.appendChild(e.toNode());
    });
  } else {
    baseNode.appendChild(math2.toNode());
  }
};
if (typeof document !== "undefined") {
  if (document.compatMode !== "CSS1Compat") {
    typeof console !== "undefined" && console.warn(
      "Warning: Temml doesn't work in quirks mode. Make sure your website has a suitable doctype."
    );
    render = function() {
      throw new ParseError("Temml doesn't work in quirks mode.");
    };
  }
}
var renderToString = function(expression, options) {
  const markup = renderToMathMLTree(expression, options).toMarkup();
  return markup;
};
var generateParseTree = function(expression, options) {
  const settings = new Settings(options);
  return parseTree(expression, settings);
};
var definePreamble = function(expression, options) {
  const settings = new Settings(options);
  settings.macros = /* @__PURE__ */ Object.create(null);
  if (!(typeof expression === "string" || expression instanceof String)) {
    throw new TypeError("Temml can only parse string typed expression");
  }
  const parser = new Parser(expression, settings, true);
  delete parser.gullet.macros.current["\\df@tag"];
  const macros2 = parser.parse();
  return macros2;
};
var renderError = function(error, expression, options) {
  if (options.throwOnError || !(error instanceof ParseError)) {
    throw error;
  }
  const node = new Span(["temml-error"], [new TextNode$1(expression + "\n\n" + error.toString())]);
  node.style.color = options.errorColor;
  node.style.whiteSpace = "pre-line";
  return node;
};
var renderToMathMLTree = function(expression, options) {
  const settings = new Settings(options);
  try {
    const tree = parseTree(expression, settings);
    const style = new Style({
      level: settings.displayMode ? StyleLevel.DISPLAY : StyleLevel.TEXT,
      maxSize: settings.maxSize
    });
    return buildMathML(tree, expression, style, settings);
  } catch (error) {
    return renderError(error, expression, settings);
  }
};
var temml$1 = {
  /**
   * Current Temml version
   */
  version: version2,
  /**
   * Renders the given LaTeX into MathML, and adds
   * it as a child to the specified DOM node.
   */
  render,
  /**
   * Renders the given LaTeX into MathML string,
   * for sending to the client.
   */
  renderToString,
  /**
   * Finds all the math delimiters in a given element of a running HTML document
   * and converts the contents of each instance into a <math> element.
   */
  renderMathInElement,
  /**
   * Post-process an entire HTML block.
   * Writes AMS auto-numbers and implements \ref{}.
   * Typcally called once, after a loop has rendered many individual spans.
   */
  postProcess,
  /**
   * Temml error, usually during parsing.
   */
  ParseError,
  /**
   * Creates a set of macros with document-wide scope.
   */
  definePreamble,
  /**
   * Parses the given LaTeX into Temml's internal parse tree structure,
   * without rendering to HTML or MathML.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __parse: generateParseTree,
  /**
   * Renders the given LaTeX into a MathML internal DOM tree
   * representation, without flattening that representation to a string.
   *
   * NOTE: This method is not currently recommended for public use.
   * The internal tree representation is unstable and is very likely
   * to change. Use at your own risk.
   */
  __renderToMathMLTree: renderToMathMLTree,
  /**
   * adds a new symbol to builtin symbols table
   */
  __defineSymbol: defineSymbol,
  /**
   * adds a new macro to builtin macro list
   */
  __defineMacro: defineMacro
};

// vendor/copylee-office/src/omml.ts
var render2 = temml$1.__renderToMathMLTree;
var NARY = /* @__PURE__ */ new Set(["\u2211", "\u220F", "\u2210", "\u222B", "\u222C", "\u222D", "\u222E", "\u222F", "\u2230", "\u22C3", "\u22C2", "\u22C1", "\u22C0", "\u2A01", "\u2A02", "\u2A00"]);
var ACCENTS = {
  "\u02C6": "\u0302",
  "^": "\u0302",
  "\u02DC": "\u0303",
  "~": "\u0303",
  "\u2192": "\u20D7",
  "\u02D9": "\u0307",
  "\xA8": "\u0308",
  "\u02C7": "\u030C",
  "\u02D8": "\u0306",
  "\xB4": "\u0301",
  "`": "\u0300",
  "\u20D7": "\u20D7",
  "\u02DA": "\u030A",
  "\u2190": "\u20D6",
  "\u2194": "\u20E1"
};
var BARS = /* @__PURE__ */ new Set(["\u203E", "\xAF", "\u2015", "_", "\u0332"]);
var esc = (text2) => text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var FONT = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr>';
function run(text2, style = "") {
  if (text2.length === 0) return "";
  const props = style === "normal" ? "<m:rPr><m:nor/></m:rPr>" : style === "plain" ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : "";
  return `<m:r>${props}${FONT}<m:t xml:space="preserve">${esc(text2)}</m:t></m:r>`;
}
var textOf = (node) => node === void 0 ? "" : node.text !== void 0 && node.type === void 0 ? node.text : (node.children ?? []).map(textOf).join("");
var isToken = (node, type) => node !== void 0 && node.type === type;
function flat(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type === void 0 && node.children !== void 0) out.push(...flat(node.children));
    else if ((node.type === "mrow" || node.type === "mstyle" || node.type === "mpadded" || node.type === "semantics") && !isFenced(node)) out.push(...flat(node.children ?? []));
    else out.push(node);
  }
  return out;
}
function isFenced(node) {
  const children = node.children ?? [];
  if (node.type !== "mrow" || children.length < 2) return false;
  const first = children[0], last = children[children.length - 1];
  return isToken(first, "mo") && first.attributes?.fence === "true" && isToken(last, "mo") && last.attributes?.fence === "true";
}
var naryOf = (node) => {
  if (!["msubsup", "munderover", "msub", "msup", "munder", "mover"].includes(node.type ?? "")) return void 0;
  const base = node.children?.[0];
  const sign = isToken(base, "mo") ? textOf(base) : "";
  return NARY.has(sign) ? sign : void 0;
};
function space(node) {
  const width = /^(-?[\d.]+)em$/.exec(node.attributes?.width ?? "");
  const em = width ? Number(width[1]) : 0;
  if (em >= 1.5) return run("\u2003\u2003");
  if (em >= 0.8) return run("\u2003");
  if (em >= 0.2) return run("\u2005");
  if (em >= 0.1) return run("\u2009");
  return "";
}
function table(node) {
  const rows = (node.children ?? []).filter((row) => row.type === "mtr" || row.type === "mlabeledtr");
  const columns = Math.max(1, ...rows.map((row) => (row.children ?? []).length));
  const side = [];
  for (let c = 0; c < columns; c++) {
    const cell2 = rows.map((row) => row.children?.[c]).find(Boolean);
    side.push(cell2?.classes?.includes("tml-left") ? "left" : cell2?.classes?.includes("tml-right") ? "right" : "center");
  }
  const mcs = side.map((jc) => `<m:mc><m:mcPr><m:count m:val="1"/><m:mcJc m:val="${jc}"/></m:mcPr></m:mc>`).join("");
  const body = rows.map((row) => {
    const cells = (row.children ?? []).map((cell2) => `<m:e>${seq(cell2.children ?? [])}</m:e>`);
    while (cells.length < columns) cells.push("<m:e/>");
    return `<m:mr>${cells.join("")}</m:mr>`;
  }).join("");
  return `<m:m><m:mPr><m:mcs>${mcs}</m:mcs></m:mPr>${body}</m:m>`;
}
var arg = (node) => node === void 0 ? "" : seq([node]);
function one(node) {
  const kids = node.children ?? [];
  switch (node.type) {
    case "mi": {
      const text2 = textOf(node);
      return run(text2, node.attributes?.mathvariant === "normal" || [...text2].length > 1 ? "plain" : "");
    }
    case "mn":
      return run(textOf(node));
    case "mo": {
      const text2 = textOf(node);
      return text2 === "\u2061" || text2 === "\u2062" || text2 === "\u2063" ? "" : run(text2);
    }
    case "mtext":
      return run(textOf(node), "normal");
    case "mspace":
      return space(node);
    case "mfrac": {
      const bar = node.attributes?.linethickness === "0px" || node.attributes?.linethickness === "0" ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : "";
      return `<m:f>${bar}<m:num>${arg(kids[0])}</m:num><m:den>${arg(kids[1])}</m:den></m:f>`;
    }
    case "msqrt":
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${seq(kids)}</m:e></m:rad>`;
    case "mroot":
      return `<m:rad><m:deg>${arg(kids[1])}</m:deg><m:e>${arg(kids[0])}</m:e></m:rad>`;
    case "msup":
      return `<m:sSup><m:e>${arg(kids[0])}</m:e><m:sup>${arg(kids[1])}</m:sup></m:sSup>`;
    case "msub":
      return `<m:sSub><m:e>${arg(kids[0])}</m:e><m:sub>${arg(kids[1])}</m:sub></m:sSub>`;
    case "msubsup":
      return `<m:sSubSup><m:e>${arg(kids[0])}</m:e><m:sub>${arg(kids[1])}</m:sub><m:sup>${arg(kids[2])}</m:sup></m:sSubSup>`;
    case "mmultiscripts":
      return `<m:sPre><m:sub>${arg(kids[3])}</m:sub><m:sup>${arg(kids[4])}</m:sup><m:e>${arg(kids[0])}</m:e></m:sPre>`;
    case "mover": {
      const mark2 = textOf(kids[1]);
      if (isToken(kids[1], "mo") && BARS.has(mark2)) return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${arg(kids[0])}</m:e></m:bar>`;
      if (isToken(kids[1], "mo") && ACCENTS[mark2] !== void 0) return `<m:acc><m:accPr><m:chr m:val="${ACCENTS[mark2]}"/></m:accPr><m:e>${arg(kids[0])}</m:e></m:acc>`;
      if (isToken(kids[1], "mo") && mark2 === "\u23DE") return `<m:groupChr><m:groupChrPr><m:chr m:val="\u23DE"/><m:pos m:val="top"/><m:vertJc m:val="bot"/></m:groupChrPr><m:e>${arg(kids[0])}</m:e></m:groupChr>`;
      return `<m:limUpp><m:e>${arg(kids[0])}</m:e><m:lim>${arg(kids[1])}</m:lim></m:limUpp>`;
    }
    case "munder": {
      const mark2 = textOf(kids[1]);
      if (isToken(kids[1], "mo") && BARS.has(mark2)) return `<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr><m:e>${arg(kids[0])}</m:e></m:bar>`;
      if (isToken(kids[1], "mo") && mark2 === "\u23DF") return `<m:groupChr><m:groupChrPr><m:chr m:val="\u23DF"/><m:pos m:val="bot"/><m:vertJc m:val="top"/></m:groupChrPr><m:e>${arg(kids[0])}</m:e></m:groupChr>`;
      return `<m:limLow><m:e>${arg(kids[0])}</m:e><m:lim>${arg(kids[1])}</m:lim></m:limLow>`;
    }
    case "munderover":
      return `<m:limUpp><m:e><m:limLow><m:e>${arg(kids[0])}</m:e><m:lim>${arg(kids[1])}</m:lim></m:limLow></m:e><m:lim>${arg(kids[2])}</m:lim></m:limUpp>`;
    case "menclose": {
      const notation = node.attributes?.notation ?? "";
      if (notation.includes("top")) return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${seq(kids)}</m:e></m:bar>`;
      if (notation.includes("bottom")) return `<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr><m:e>${seq(kids)}</m:e></m:bar>`;
      if (notation.includes("box")) return `<m:borderBox><m:e>${seq(kids)}</m:e></m:borderBox>`;
      return seq(kids);
    }
    case "mtable":
      return table(node);
    case "mphantom":
      return "";
    case "mrow": {
      if (isFenced(node)) {
        const open2 = textOf(kids[0]), close2 = textOf(kids[kids.length - 1]);
        return `<m:d><m:dPr><m:begChr m:val="${esc(open2)}"/><m:endChr m:val="${esc(close2)}"/></m:dPr><m:e>${seq(kids.slice(1, -1))}</m:e></m:d>`;
      }
      return seq(kids);
    }
    default:
      return seq(kids);
  }
}
function seq(nodes) {
  const list = flat(nodes);
  let out = "";
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    const sign = naryOf(node);
    if (sign === void 0) {
      out += one(node);
      continue;
    }
    const kids = node.children ?? [];
    const under = node.type === "munderover" || node.type === "munder" || node.type === "mover";
    const sub = node.type === "msup" || node.type === "mover" ? void 0 : kids[1];
    const sup = node.type === "msup" || node.type === "mover" ? kids[1] : node.type === "msubsup" || node.type === "munderover" ? kids[2] : void 0;
    let operand = "";
    while (i + 1 < list.length && list[i + 1].type === "mspace") i++;
    if (i + 1 < list.length && !(isToken(list[i + 1], "mo") && !isFenced(list[i + 1]))) operand = one(list[++i]);
    out += `<m:nary><m:naryPr><m:chr m:val="${sign}"/><m:limLoc m:val="${under ? "undOvr" : "subSup"}"/>${sub === void 0 ? '<m:subHide m:val="1"/>' : ""}${sup === void 0 ? '<m:supHide m:val="1"/>' : ""}</m:naryPr><m:sub>${arg(sub)}</m:sub><m:sup>${arg(sup)}</m:sup><m:e>${operand}</m:e></m:nary>`;
  }
  return out;
}
function latexToOmml(tex, display) {
  try {
    const tree = render2(tex, { displayMode: display, annotate: false, throwOnError: true, strict: false });
    const body = seq(tree.children ?? []);
    return body.length === 0 ? void 0 : `<m:oMath>${body}</m:oMath>`;
  } catch {
    return void 0;
  }
}
var DOLLARS = /\$\$([^$\r\n]+?)\$\$|\$([^$\r\n]+?)\$(?!\$)/g;
var TAG = /\\tag\s*\{([^}]*)\}/;
function formulasOf(value, found = {}) {
  if (typeof value === "string") {
    if (!value.includes("$")) return found;
    for (const match of value.matchAll(DOLLARS)) {
      const display = match[1] !== void 0;
      const source = (match[1] ?? match[2] ?? "").trim().replace(TAG, "").trim();
      const key2 = (display ? "d:" : "i:") + source;
      if (source.length === 0 || found[key2] !== void 0) continue;
      const omml = latexToOmml(source, display);
      if (omml !== void 0) found[key2] = omml;
    }
  } else if (Array.isArray(value)) {
    for (const item of value) formulasOf(item, found);
  } else if (value !== null && typeof value === "object") {
    for (const [name2, item] of Object.entries(value)) {
      if (name2 === "latex" && typeof item === "string") {
        const source = item.trim().replace(/^\$+|\$+$/g, "").trim();
        const omml = source.length === 0 || found[`d:${source}`] !== void 0 ? void 0 : latexToOmml(source, true);
        if (omml !== void 0) found[`d:${source}`] = omml;
      } else formulasOf(item, found);
    }
  }
  return found;
}

// vendor/copylee-office/src/tools.ts
var { extname, isAbsolute } = win32;
var IMAGE = {
  type: "object",
  additionalProperties: false,
  properties: {
    attachmentId: { type: "string", required: true },
    mediaType: { type: "string", required: true },
    bytes: { type: "integer", required: true },
    width: { type: "integer", required: true },
    height: { type: "integer", required: true },
    name: { type: "string" },
    originalDimensions: { type: "object", additionalProperties: false, properties: { width: { type: "integer", required: true }, height: { type: "integer", required: true } } }
  }
};
var output = {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string", required: true },
      image: IMAGE,
      more: { type: "array", items: IMAGE }
    }
  },
  render: (_args, value) => [
    { type: "text", text: value.text },
    ...[value.image, ...value.more ?? []].filter((image) => image !== void 0).map((image) => ({ type: "image", attachment: image }))
  ]
};
function toJson(ref) {
  return {
    attachmentId: String(ref.attachmentId),
    mediaType: ref.mediaType,
    bytes: ref.bytes,
    width: ref.width,
    height: ref.height,
    ...ref.name === void 0 ? {} : { name: ref.name },
    ...ref.originalDimensions === void 0 ? {} : { originalDimensions: { width: ref.originalDimensions.width, height: ref.originalDimensions.height } }
  };
}
var card = (title) => ({ card: "generic", title, kind: "other" });
var EXTENSIONS = {
  ".docx": "word",
  ".doc": "word",
  ".docm": "word",
  ".rtf": "word",
  ".dotx": "word",
  ".xlsx": "excel",
  ".xls": "excel",
  ".xlsm": "excel",
  ".xlsb": "excel",
  ".csv": "excel",
  ".pptx": "ppt",
  ".ppt": "ppt",
  ".pptm": "ppt"
};
function appOf(args) {
  if (args.app !== void 0) {
    if (args.app !== "word" && args.app !== "excel" && args.app !== "ppt") throw new Error("app must be word, excel or ppt.");
    return args.app;
  }
  const kind = EXTENSIONS[extname(args.path ?? args.doc ?? "").toLowerCase()];
  if (!kind) throw new Error("Say which app: pass app (word, excel or ppt), or name the document with its extension.");
  return kind;
}
var fileName = (doc) => (doc ?? "").split(/[\\/]/).pop() ?? "";
var DOC = { type: "string", description: "The open document: its full path or its window name (e.g. report.docx). Default: the document you last opened or worked on." };
var APP = { type: "string", enum: ["word", "excel", "ppt"], description: "Only to pick the active document of another app, or when doc has no extension." };
var SILENT = `Silent mode is on (the user chose it in the settings): the document is open in the background, with no window, and the user is not watching. Work as usual \u2014 research_office_edit, research_office_render to look at the result, research_office_save \u2014 only unseen. When you stop, what was opened in the background is saved and closed by itself; say in your answer where the file is.
- Excel data work may use Python here when that is quicker (pandas / openpyxl for cleaning, joining and aggregating large tables): run it on the file on disk while the workbook is NOT open in Excel (before research_office_open, or after research_office_close), or compute in Python and put the results in with write_range. Charts, number formats, conditional formats and layout still go through research_office_edit, which lets Excel itself draw them. Word and PowerPoint documents are always built with research_office_edit: file libraries lose their layout.
- Look at the result with research_office_render before you finish, exactly as otherwise: nobody else sees it until it is done.
- If something can only be done on the window itself with mouse / keyboard tools, call research_office_open {path, show: true} first: it brings the document into view. That is slow; use it only when research_office_edit has no operation for the job.`;
var TAIL = `Colours are "#RRGGBB"; align is left | center | right | justify; file paths are absolute.`;
var EDIT_CORE = `Edit a document that is open in Word, Excel or PowerPoint, live: each change appears in the window, and the user can keep working in it. Runs ops in order and stops at the first that fails. Does not save (use research_office_save). Word edits are one undo step for the user; Excel and PowerPoint edits cannot be undone with Ctrl+Z.
Each op is {op: name, ...fields}. The operations of an app and their fields are listed in the result of your first research_office_open / research_office_read for that app, and again by research_office_help {app} at any time: read that list before you write ops, and do not guess names or fields.
Formulas are LaTeX between dollar signs in any text you write ($...$ in a sentence, $$...$$ on a line of its own) and become native equations. ${TAIL}`;
var GUIDES = {
  word: `Word ops. para = paragraph number from research_office_read; pass expect = its first words so a number made stale by other edits is caught. where = after (default with para) | before | start | end (default without para: the very end of the document).
In a form or template whose sections are table cells, write INSIDE the cell: give para = a paragraph of that cell. Without para the text or table lands after everything, outside the form.
When you add to a document that already has headings of the kind you are writing (\uFF08\u4E00\uFF09.., 1.1 ..), give yours the same look: the same style, bold and size, and the same indent \u2014 firstLineIndent: 0 when theirs start at the margin, since a body style with a first-line indent would push yours in. Compare them on the page with research_office_render.
Formulas: write LaTeX between dollar signs in any text (paragraphs, table cells, captions, replace_text): $...$ inside a sentence, $$...$$ as a paragraph of its own. Every symbol, subscript, power, norm or matrix in running text goes between dollar signs too ($\\kappa(A)$, $\\|x\\|_2$, $10^{-8}$, \\begin{pmatrix}..\\end{pmatrix}, \\begin{cases}..\\end{cases}); do not type them with Unicode characters such as \u2016x\u2016\u2082 or \u03BA\u2082. Number a display formula when the document numbers its formulas by ending it with \\tag{1}: $$T=2\\pi\\sqrt{l/g} \\tag{1}$$ puts (1) flush right. They become native Word equations; Word itself reads the LaTeX, so ordinary LaTeX works as you would write it (\\mathfrak, \\mathcal, \\bigoplus, \\cong, \\operatorname, \\not\\equiv, matrices, cases, aligned ...) \u2014 there is no need to try symbols out first. Never write a formula as plain text such as T = 2\u03C0\u221A(l/g). A unit after a number inside a formula is upright: $$D=(42.0\\pm0.5)\\ \\mathrm{mm}$$, $\\mathrm{m/s}$, $\\mathrm{m\\cdot s^{-1}}$.
- insert_paragraphs {items:[{text, style?}], para?, expect?, where?} \u2014 style: Normal, Title, Heading 1..6, List Bullet, List Number, Quote, or a style name the document has. Without style a paragraph is body text in the font, size and spacing of the text it is placed next to. A newline in text starts another paragraph. Items also take the format_text fields.
- set_text {para, expect, text} \u2014 rewrite one paragraph, keeping its style. expect is required ("" for an empty paragraph).
- Native footnotes: insert_footnote {para, expect, text, find?, occurrence?, where?: before|after, ...format fields}. Without find inserts at paragraph end; with find defaults to after its first occurrence. Native numbering and Footnote Text/Reference styles follow the document. Text may contain **bold** and $LaTeX$.
- edit_footnote {footnote, expect, text?, ...format fields}; delete_footnote {footnote, expect}. footnote is the collection index returned by research_office_read, NOT the displayed number. expect is the first words of the note text, required even for formatting. Reread after inserts/deletes. format_text also accepts {footnote, expect, find?, ...format fields} instead of para/to.
- footnote_settings {numbering: continuous|section|page, section?} \u2014 changes numbering for the document, or one section. Insertions preserve existing settings. Read all notes with research_office_read {footnotes:true, full:true}; by default only notes anchored in the paragraphs read are listed. The body shows [footnote:i].
- Inline footnotes in insert_paragraphs/set_text/replace_text: [fn:full citation] or \\footnote{full citation}, multiple per paragraph. Balanced braces/brackets and escaped delimiters are supported, nested/empty/unclosed notes are rejected. Escape the opener with a backslash to keep literal syntax. set_text refuses paragraphs with existing footnotes; use a smaller replace_text that does not cross their reference marks. delete_range explicitly removes notes anchored in its deleted text.
- replace_text {find, replace, all?} \u2014 find is literal text within one paragraph; replace may hold formulas and citations.
- format_text {para?, to?, find?, style?, font?, size?, bold?, italic?, latinFont?, underline?, superscript?, subscript?, color?, align?, indentChars?, firstLineIndent?, spaceBefore?, spaceAfter?, lineSpacing?} \u2014 para..to, or the first match of find (e.g. {find:"\u5173\u952E\u8BCD\uFF1A", bold:true}). In any text you write, **\u6458\u8981\uFF1A** makes that part bold. lineSpacing: a number is a multiple (1.5 = 1.5 \u500D\u884C\u8DDD), "20pt" an exact height (\u56FA\u5B9A\u503C 20 \u78C5), "at least 20pt" a minimum (\u6700\u5C0F\u503C). Paragraphs that hold a formula or a picture automatically get an exact height as a minimum instead, so nothing tall is cut off \u2014 do not fix that by hand. firstLineIndent: 2 = two characters (\u9996\u884C\u7F29\u8FDB 2 \u5B57\u7B26, same as indentChars), 0 = none, "0.74cm" / "24pt" a length.
- delete_range {para, expect, to?} \u2014 expect is required; para..to in one operation removes a run of paragraphs (leftover hints, surplus blank lines). A table goes with them when the run covers all of it: to remove a table, give its first and last paragraph as research_office_read lists them (i\u2013to); a run that covers only part of a table empties those cells and the table stays. Paragraph numbers shift after every insert or delete; each result tells you the new numbers. A table counts one paragraph for each cell and one more at the end of each row (3 rows of 4 cells: 15).
- insert_table {data:[[cell,..],..], caption?, borders?: "grid"|"three-line"|"none", para?, where?, header?} \u2014 borders "three-line" is the \u4E09\u7EBF\u8868 of papers (heavy rule above and below, light rule under the header, no other lines). A table goes inside a cell of another table only with nested: true. Several tables or pictures in ONE call: each insert shifts every paragraph number after it (a table adds a paragraph per cell), so give them from the END of the document towards the start, or read again between them. set_cell {table, row, col, text}
- format_table {table | para, borders?, size?, font?, latinFont?, align?, header?, rowHeight?, lineSpacing?, autofit?: "window"|"content"|"fixed", keepTogether?: true} \u2014 change a table that is already there; para (any paragraph of it) names a table that sits inside a cell of another and so has no number. keepTogether: when a table breaks across two pages and looks bad that way (two or three rows cut off from the rest), this puts it whole on one page \u2014 unless that would leave more than about a third of the page before it empty, in which case it tells you so and you change the text above instead ("force" moves it regardless). A long table may simply run over the page.
- Captions: give caption (the title only, no "\u8868 1") on insert_table / insert_image. It is set the standard way: numbered automatically ("\u8868 1", "\u56FE 1"), centred, above a table and below a figure. Do not write captions as ordinary paragraphs.
- insert_diagram {nodes: [{id, text, row, col, shape?}], edges: [{from, to, label?}], caption?, para?, where?} \u2014 a flow chart or block diagram drawn with Word's own shapes (the user can edit every box and line), in line with the text like a picture. Place the nodes on a grid: row 1 is the top, col 1 the left; a top-down flow is one column with the branches in the columns beside it. Shapes: rect (a step; the default), round, diamond (a decision), terminator (start / end), io (input / output), document, database, ellipse. Edges are arrows that find their own way with square corners: downwards bottom to top, sideways right to left, back up around the right; say fromSide / toSide (top | bottom | left | right) to choose, label for "\u662F" / "\u5426" on a branch, dashed: true, arrow: false. style: "outline" (the default: white boxes with thin black lines in the document's own type \u2014 right for papers, theses and formal documents), "modern" (flat tinted boxes, start / end in the accent colour, decisions in a warm tone, thin grey arrows, a sans type \u2014 only when the user asks for colour or the document itself is colourful), "classic" (pale blue with dark outlines); accent: "#RRGGBB" recolours the modern look to match the document. Other options: cellWidth (150), cellHeight (76), nodeWidth (112), nodeHeight (40), size, font, fill, color, ink; a node may give its own width, height, fill, color, bold, or box: [x, y, w, h] in points instead of row / col. Keep node text short (up to about 8 Chinese characters a line; "
" breaks a line). Use this, not a picture drawn with matplotlib, for flow charts, process diagrams and structure diagrams in a document.
- insert_image {path, caption?, para?, where?, width?} \u2014 the picture is centred on a line of its own. width is in points, or "12cm". set_image {image: n | para, width?, height?, align?} resizes a picture that is already there.
- In insert_paragraphs, an item may also be a picture {path, caption?, width?} or a table {data, caption?, borders?}: it is put in right there, between the paragraphs before and after it \u2014 no paragraph numbers needed.
- Tables, pictures, their size and their borders are all done with these operations; do not use the mouse for them.
- Citations: write \\cite{1}, \\cite{2,5} or \\cite{3-6} in the text where the source is used; they become superscript [1] that jump to the reference. List the sources with insert_references {items:["Author. Title[M]. ...", ..], para?, where?} (numbered [1], [2].. in order; put it under a "\u53C2\u8003\u6587\u732E" heading). A [1] typed by hand in the text, and a reference list typed as "[1] ..." paragraphs, are converted the same way.
- style_format {style, font?, latinFont?, size?, bold?, italic?, color?, align?, indentChars?, firstLineIndent?, spaceBefore?, spaceAfter?, lineSpacing? (1.5 | "20pt" | "at least 20pt"), pageBreakBefore?, numbering?: false} \u2014 change what a style looks like everywhere it is used (e.g. Heading 1 in \u9ED1\u4F53 \u4E09\u53F7 without automatic numbers; Normal in \u5B8B\u4F53 \u5C0F\u56DB, 1.5 lines, 2-character first-line indent). Set the styles first, then write; this replaces fiddling with Word's style dialogs.
- fill_gaps {} \u2014 where a figure or table did not fit under the text before it and went to the next page, leaving the foot of that page empty, the paragraphs that follow it are brought before it (as a typesetter would); and a table from which the page break cut off a single row (its last row alone on the next page, or just its header and one row at the foot of the first) gets its rows together again. Run it once the document is written, before the final look.
- Figures you draw yourself (matplotlib etc.): draw each for the width it will have on the page (a full-width figure is about 6 in wide: figsize=(6, 3.6)), with type of 9\u201310.5 pt at that size, so it is not shrunk; one idea per figure rather than several panels in a row; leave room so labels, legends and lines do not overlap (constrained layout; look at the picture before you insert it); save as .svg (vector, stays sharp; set svg.fonttype to "path" for Chinese labels) or as .png at 300 dpi. Insert without "width" (it then keeps the size it was drawn at) or with the width it was drawn for. If the result says a figure is shown much smaller than it was drawn, draw it again for that size.
- page_setup {paper?: A4|A3|B5|Letter, orientation?, top?, bottom?, left?, right?} (margins in cm); page_numbers {align?, start?}; header {text}; page_break {para, expect} (that paragraph starts a new page); insert_toc {title?, levels?, para?, where?}; update_fields {}`,
  excel: `Excel ops. sheet = sheet name (default: the active sheet). A range may name its sheet: "\u4EA7\u54C1\u8868!A1:E13". Where an op takes "range" for a block of data and you leave it out, it means everything filled on the sheet, the first row being the headers; a column is named by its header ("\u91D1\u989D"), or by its letter.
Reading: research_office_read shows the first 60 rows; for a longer table it adds a profile of every column (kinds of values, min / median / max, the distinct values with counts, and what looks wrong: stray spaces, numbers or dates written as text, mixed kinds, far-off values, empty and repeated rows). Work from the profile, do not page through thousands of rows; research_office_read {profile: true, range?} gives it for any block. Dates are shown as dates.
- write_range {range: top-left cell, values:[[..],..]} \u2014 a string starting with "=" is a formula; also takes the format_range fields.
- fill_formula {range: "F2:F500", formula: "=D2*E2"} \u2014 one formula down (or across) a range: write it for the first cell, relative references adjust; use $ to pin. add_column {header, formula | value, after?: column, numberFormat?, values?: true} \u2014 a new column at the right of the data (or after a column) with the formula filled down all data rows, written for row 2; values: true leaves the results instead of formulas; an existing header is filled again. Both report cells that show an error.
- Cleaning (each says how many cells or rows it changed, and for a column of few values what it holds afterwards):
  \xB7 clean {column | columns, trim?: true, noSpaces?, remove?: ["\u5E02"], case?: upper|lower|proper, map?: {"East": "\u534E\u4E1C", ..}, to?: number|date|text, year?} \u2014 tidy the texts of columns: spaces, pieces to drop, case, values to rename, and reading "\xA51,299" / "89\u5143" / "10%" as numbers or "2025/3/1" / "2025.03.01" / "20250301" / "3\u67081\u65E5" as dates. Cells it cannot read are left and listed.
  \xB7 replace {find, replace, column?, whole?, matchCase?}; fill_blanks {column | columns, with: value | "above" | "mean" | "median" | "mode"}
  \xB7 remove_duplicates {columns?: [..]} \u2014 rows with the same values in those columns (default: whole rows); the first is kept.
  \xB7 delete_rows {blank: true} (entirely empty rows) or {where: {column, is: blank | = | <> | > | < | >= | <= | contains | text | error, value?} | {column, values: [..]}}; also {row, count?}. insert_rows {row, count?}; insert_columns / delete_columns {column: "C", count?}.
  \xB7 sort {by: [{column, order?: asc|desc}, ..]}; filter {column, values: [..] | criteria: ">100", criteria2?, join?: and|or} hides rows (it does not delete them); clear_filter {}.
  \xB7 copy_range {range, to, values?: true} \u2014 e.g. keep the raw sheet and clean a copy: add_sheet {name: "\u6E05\u6D17\u540E"} then copy_range {range: "\u539F\u59CB!A1:L1205", to: "\u6E05\u6D17\u540E!A1", values: true}.
- Analysis: pivot {source?, rows: [..], columns?: [..], values: [{field, fn?: sum|count|average|max|min, name?}], filters?, group?: {field: a date column, by: month|quarter|year}, sort?: {field, by?: a value name, order?}, to?: "\u6C47\u603B!A3", name?} \u2014 a pivot table (on a new sheet named by "name" unless "to" is given); the result is returned, no need to read it. For figures that should stay as plain cells use formulas (SUMIFS, COUNTIFS, AVERAGEIFS, XLOOKUP / VLOOKUP, TEXT(date,"yyyy-mm")) with fill_formula.
- Charts: add_chart {type: column | bar | stacked | stacked bar | line | pie | doughnut | scatter | scatter line | area | radar | combo, range (categories in its first column, a header row of series names) | categories: range + series: [{name: text or a cell, values: range, x?, chart?: line (for a combo), axis?: secondary, color?}], title?, xTitle?, yTitle?, labels?: true | "percent", legend?: bottom|right|top|none, numberFormat?, min?, max?, at?: cell, width?, height?, name?}. The result gives the cells the chart covers: place the next one clear of them (a chart of the default size covers about 9 columns x 21 rows). set_chart {chart: name, ..same fields} changes one; delete_chart {chart}. Chart plain cells, not a pivot table (a chart on a pivot table shows all its values). research_office_render {sheet, range} pictures cells with the charts over them; {sheet, chart: name} one chart.
- Presentation: format_range {range, bold?, italic?, size?, font?, color?, fill?, numberFormat?, align?, wrap?, border?, merge?, columnWidth?, rowHeight?}; autofit {range?}; freeze {cell: "A2"} (put it last in a batch: it is the one step that needs the sheet in front); table {range?, name?, style?} (banded rows and filter arrows); conditional_format {range, rule: > | < | >= | <= | = | <> | between | top | bottom | duplicate | blank | formula | colorscale | databar | clear, value?, value2?, fill?, color?}; validation {range, list: [..]}.
- add_sheet {name}; rename_sheet {sheet, name}; delete_sheet {sheet}
- How to do data work well: read first and plan from the profile; keep the raw data (clean a copy on a new sheet); after cleaning read the profile again and check that nothing is left under LOOK; say in your answer what you changed and how many rows each step touched, and what you left alone and why (a far-off value may be real: ask or flag it rather than delete it silently); put results on their own sheets with clear headers, number formats and fitted columns; give every chart a title that states what it shows and axis titles with units; look at the result with research_office_render before you finish.`,
  ppt: `PowerPoint: build a deck out of DESIGNED SLIDES. One "slide" op makes one finished slide \u2014 laid out, coloured, set in type, with its page number, transition and entrance animation \u2014 from the content you give; you do not place boxes yourself. A whole deck is one or two research_office_edit calls.
- theme {name, background?, primary?, accent?, bg?, surface?, text?, muted?, titleFont?, bodyFont?, transition?: fade|push|wipe|split|none, animate?, section?: solid|side|band|number, corners?: soft|square|round|pill, cards?: soft|outline|shadow, marks?: square|dot|dash|triangle, chrome?: plain|beamer, author?, talk?} \u2014 set it FIRST, once. corners, cards and marks restyle the small parts every layout is built from, for the whole deck: the corners of cards and panels; the ground of a card (soft = a tinted fill, outline = a thin frame on the page colour, shadow = white with a soft shadow); the mark before a point. Choose them with the theme so decks do not all look alike \u2014 square corners with outline cards and dash marks read sober and academic, round corners with shadow cards read friendly, soft is the middle. A single card of a grid or canvas takes style: soft|outline|shadow of its own. chrome: beamer gives the deck the frame of a LaTeX Beamer talk (the Madrid look): every title on a band across the top with the kicker on a strip above it, a foot line with the speaker, the short title of the talk and the page, triangles before the points, theorems as titled blocks, the cover, section and closing pages with the title in a box in the middle. Use it ONLY when the user asks for Beamer, LaTeX or a "mathematical" classic look; it combines with any colour theme (academic or ink suit it; primary recolours it). author and talk are what the foot line says (left and middle); left out, they are taken from the cover's meta and title. section is how the section slides of the deck look (a full ground of colour; a panel at the left with the number; a band across; a huge faint number): leave it out and one is taken by chance, so decks differ. name: ink (white, navy + red; business reports, data), academic (pure white, deep blue with a restrained red, nothing behind the content; thesis defences, course-paper and research reports, conference talks \u2014 the default for anything academic), paper (warm white with a paper grain, serif titles; lessons, popular science, essays), sepia (aged paper, dark red + gold, serif; history, literature, the humanities), crimson (warm white, red + gold; Party and government, commemoration, festive), slate (cool grey with a fine grid; engineering, technology), ocean, forest, graphite (light) or night (near-black with gold; pitches, stories), chalk (blackboard green; lessons), plum (dark). Pick by the subject and the audience \u2014 a deck on a revolution, a dynasty or a writer is not a quarterly report: do not fall back on ink for everything; change single colours to match a brand. background: what lies behind the content \u2014 plain, paper (grain, darker edges), gradient, grid, dots, or the path of a picture laid faintly behind every slide (a period photograph, a texture, a map); each theme has its own default, set it when the subject asks for more atmosphere. An academic or formal report keeps a plain white ground: no paper, no gradient, no picture behind the slides unless the user asks.
- slide {kind, title, subtitle?, kicker?, note?, notes?, image?, callout?, at?, ...} \u2014 kicker: the small line above the title (the section, e.g. "\u4E8C\u3001\u65B9\u6CD5"); note: the source line at the foot; notes: speaker notes; callout: one sentence set apart at the foot of the body; image: path of a picture. In every text **words** are set bold in the accent colour and $...$ is a formula.
  kinds and their own fields:
  \xB7 cover {title, subtitle?, kicker?, meta?, image?, style?: "full"} \u2014 the opening slide; closing {title, subtitle?, image?, style?} \u2014 the last one. A photograph stands at the right behind a fade; style "full" lays it over the whole slide with the words in white on it.
  \xB7 section {number?, title, subtitle?, image?, style?} \u2014 a divider before each part ("01", "02" ..), in the look the theme fixed.
  \xB7 agenda {points:[..]} \u2014 the numbered outline.
  \xB7 bullets {points:[text | {head, text}], image?} \u2014 at most 5 points; prefer {head, text}. With an image the slide is laid out around it: a wide drawing goes across the slide with the points in a row under it, others stand beside the text.
  \xB7 cards {cards:[{head, text, icon?, value?}]} \u2014 2 to 6 parallel ideas side by side.
  \xB7 stats {stats:[{value, unit?, label, delta?, icon?}], points?} \u2014 2 to 4 big numbers.
  \xB7 chart {chart, side?:[{head, text}]} \u2014 a chart drawn from your numbers in the deck's colours, with remarks beside it. chart is one of:
      {type: column|bar|line, categories:[..], series:[{name, values:[..]}], unit?, highlight?: a category, decimals?}
      {type: scatter, series:[{name?, points:[[x, y], ..]}], fit?: true (least-squares line with its equation and R\xB2), xTitle?, yTitle?, xMin?, xMax?, yMin?, yMax?} \u2014 measurements over two number axes
      {type: curve, series:[{name?, x:[..], y:[..], dashed?, color?}], xTitle?, yTitle?, endValues?: true, lines?:[{y | x, text?}], annotations?:[{text, x, y}], yMin?, yMax?} \u2014 graphs of functions, training curves, simulations: give 20\u2013100 points per curve (compute them; a short script that prints the numbers is fine). Each line is named at its end, the names kept apart; lines marks a threshold or a moment, annotations puts words at a point.
      {type: pie | donut, categories:[..], values:[..], unit?} \u2014 shares of a whole, at most 8 parts
  \xB7 table {data:[[header..],[row..]..]} \u2014 up to 8 rows; cells may hold $formulas$.
  \xB7 formula {formulas:[{latex, label?}], points?:[text | {head, text}], layout?: focus|side|stack} \u2014 1 to 3 formulas with what they mean. Three arrangements: focus (ONE formula set large on a band, its remarks in columns underneath \u2014 the key result of a talk), side (formulas at the left, a remark beside each \u2014 give as many points as formulas and they pair up), stack (formulas over a list of remarks). Left out, one formula is focus, two with remarks are side, three stack. Do not make every formula slide the same: a derivation reads well as a grid with formula parts and arrows of text between them, a formula with a figure as a grid of [formula, image], a definition as theorem.
  \xB7 theorem {label?: "\u5B9A\u7406 2.1", name?, statement, proof?:[text | {head, text}], proofTitle?} \u2014 a definition, theorem, lemma or law set apart on a card, with the steps that lead to it (or what it means) underneath.
  \xB7 gallery {images:[{image, caption?, focus?, fit?}] (2\u20136), text?} \u2014 pictures side by side with captions: the people of a story, the panels of an experiment, results to compare. Upright pictures (portraits) stand in one row; a last row that is not full stands in the middle.
  \xB7 Photographs are cut to fill their place (split, gallery, cover, image, a photo beside bullets); of a tall picture the upper part is kept, where heads are. "focus": top | center | bottom | left | right on the slide (or on a gallery item) moves the cut; "fit": "contain" on a gallery item shows the picture whole. The result names the pictures that lost much: look at those slides.
  \xB7 summary {points:[{head, text}] (2\u20134)} \u2014 what to take away, numbered large; the first stands out.
  \xB7 code {code, language?, points?:[{head, text}]} \u2014 a listing on a dark panel with line numbers and coloured keywords, remarks beside it; 8\u201316 lines read best.
  \xB7 split {title, text?, points?, image, side?: left|right, kicker?} \u2014 half the slide is the picture, edge to edge; the words stand on the other half. A change of rhythm among content slides.
  \xB7 grid {title, rows:[[part, part, ..], [part], ..], edges?, callout?} \u2014 COMPOSE YOUR OWN SLIDE without coordinates: each row is a list of parts that stand side by side, the rows stand under one another, and the places, gaps and sizes are worked out for you so the body is filled evenly. A part is {type, span?: relative width (default 1), ..} with the types of a canvas item below (no box): text, heading, card, stat, chart, image, formula, table, bullets, steps, callout, quote, panel, node, icon, line, or space (an empty cell). {type: "stack", span?, items:[part, ..]} puts parts under one another inside one cell \u2014 a chart at the left with a heading, two stats and a remark stacked at its right; a picture beside numbered steps; a table over a quote. Headings, stats, formulas, callouts and short texts take the height they need and charts, pictures, tables, cards and stacks share the rest ("height": points, or "weight" on a row {cells:[..], weight} to change that). Nodes placed in a grid are joined with edges:[{from, to, kind?, label?}] at slide level. Use grid whenever the fixed kinds would repeat themselves or leave half a slide empty: it is how a deck gets pages that are not all rows of blocks.
  \xB7 canvas {title?, items:[{type, box:[x, y, w, h], ..}]} \u2014 exact placement, for a drawing no grid can hold: place items on the 960 x 540 canvas (the title takes the top 118; keep to x 48\u2013912, y 130\u2013494). Types: text {text, size?, bold?, color?, align?, valign?}, heading {text}, card {head, text, icon?, value?}, panel {fill?, text?, shape?: round|circle}, line / arrow {box: start x, y, then width and height as the run}, image {image, fit?: cover|contain}, formula {latex, label?}, stat {value, unit?, label}, chart {chart}, table {data}, icon {icon}, bullets {points}, steps {steps:[{head, text}]} (numbered, one under another), callout {text}, quote {text, by?}. Colours by role: primary, accent, text, muted, surface, line, or #RRGGBB. For block diagrams (a network architecture, a pipeline, a system) give the boxes an id \u2014 node {id, box, text, fill?} \u2014 and join them with edge {from, to, kind?: elbow|straight|curve, label?, dashed?, fromSide?, toSide?: top|bottom|left|right} (among the items, or all together in edges:[..] beside items): the connector joins the sides that face each other and carries an arrow; kind curve is a jump over what lies between (a skip connection, a feedback path) and arches above a row of boxes. Keep boxes of a diagram small (about 150 x 70) with 50 or more between them so the arrows show, and put the same top and height on boxes of one row. Each item comes in as its own animation step ("with": true joins it to the one before). Keep a grid: equal gaps, aligned edges; look at the result.
  \xB7 timeline {steps:[{when, head, text}]}; process {steps:[{head, text}]} \u2014 up to 5; compare {left:{head, points:[..]}, right:{head, points:[..]}}.
  \xB7 image {image, title, text?, caption?} \u2014 a photograph fills the slide with the words on it; a chart or diagram is shown whole, as large as the slide allows, under the title (a squarish one at the left with the text beside it). Figures drawn for a paper are not slide material as they are: a picture with several panels shows each one small \u2014 redraw what the deck can draw (chart, canvas) and give the rest one panel per slide. quote {text, by?}.
  icon: check clock search star chart list people target bolt flag globe lock book calendar document layers trend link code heart warning home idea pin money arrow cloud mail shield eye pie wave question info grid edit plus play.
- How to make a deck people want to look at:
  \xB7 Plan it as a talk: cover, agenda, then for each part a section slide and 2\u20134 content slides, a closing. 10\u201316 slides for a normal report.
  \xB7 Give every slide ONE message, and write the title as that message, a full statement ("\u5BA2\u8FD0\u91CF\u8D85\u8FC7 2019 \u5E74\u9AD8\u70B9"), not a topic ("\u5BA2\u8FD0\u60C5\u51B5").
  \xB7 Change the kind from slide to slide: never two bullets slides in a row, and no more than a third of the deck as bullets. Numbers go on stats or chart, parallel ideas on cards, a sequence on process or timeline, two sides on compare, a formula on formula, a definition or theorem on theorem, several figures on gallery, the conclusion on summary; vary how pictures stand (beside the text, split, image, a full cover).
  \xB7 A research talk or thesis defence: cover; background and the question (split or bullets); contributions (cards or summary); method (process, theorem, formula, or a canvas for the pipeline diagram); experiments (table for the setup, chart / scatter / curve drawn from the numbers, gallery for result figures); discussion (compare); conclusion (summary); references (bullets, small); thanks (closing). A course lecture: definitions and theorems on theorem slides, worked examples on process, intuition on image or curve.
  \xB7 A layout you built once (a canvas, or any slide) is reused with reuse_slide {from: n, texts: {..}}: the copy keeps the arrangement and takes new words.
  \xB7 Keep text short: a point is one line, a card text two. What you would say aloud goes into notes.
  \xB7 Fill the page and vary it. A slide whose content ends half way down looks unfinished: when a kind would hold only a little (a table of three rows, two remarks, three short cards), add what belongs with it \u2014 the figure beside the table, the conclusion as a callout, a stat \u2014 or build the page as a grid. In a deck of 15 slides at least three or four should be grids or canvases of your own, not the same card rows again.
  \xB7 Use pictures: a photograph on the cover and on an image slide or two lifts a deck more than anything else. Get them with your web / image tools (search and download, or generate) into the working folder, then pass the path; a chart or diagram you draw yourself is shown whole on a card.
  \xB7 DRAW IN THE DECK, NOT IN MATPLOTLIB. What the deck can draw from shapes looks far better on a slide than a pasted picture, stays sharp and editable, and takes the theme: bar / column / line charts, scatter plots with a fit, curves of functions and training runs (type curve, with the lines named at their ends), pie and ring charts, tables, formulas, code listings (kind code), block diagrams and pipelines (canvas with node and edge), timelines and processes. Make a picture file only for what none of these can show: a heat map, a 3-D surface, a photograph, an image from a paper, a plot with thousands of points.
  \xB7 Numbers you have belong on a chart slide (drawn in the deck's own colours and type), not on a picture of a chart. A drawing you do make yourself (a diagram, a plot of a function) must suit a slide: ONE idea per drawing, not several panels side by side; drawn for the place it goes (about 9 x 3.5 in across a slide, 5 x 4 in beside text) with type of 14 pt or more at that size, few words, thick lines, the deck's colours; nothing overlapping (check the picture itself before you use it). A drawing that matters gets a slide of its own (kind image). If the result says a figure is shown much smaller than it was drawn, act on it.
  \xB7 If the user has not said what the deck should look like (no template, no style, no audience to go by) and you have a tool for asking the user a question, ask once before you build: offer two to four of the themes with a word on each, and whether they have a template or example to follow. If they said to decide yourself, or there is no such tool, choose and say what you chose.
  \xB7 Look at the result with research_office_render {overview: true} and fix slides whose text is cut off or crowded (shorten the words, or split the slide).
- Working from a TEMPLATE or an EXAMPLE the user gives (a .pptx whose look the deck should have): do not rebuild its look by hand, work inside a copy of it.
  1. research_office_open {path: the new file, template: the user's file}, then research_office_render {overview: true} (again with slide numbers for the rest of a long template) to see every page, and research_office_read {slide: n} for the pages you will use: it lists each text and picture with its "#id".
  2. For each slide of your deck pick the template page that fits what it says (cover, contents, section, text + picture, three points, comparison, timeline, thanks ..) and make it with reuse_slide {from: n, texts: {"#id" or name: new text, ..}, images?: {"#id": path}, delete?: ["#id", ..], notes?} \u2014 a copy of page n with your words in place of its sample text, its look and animation kept. Replace EVERY sample text of the page (Lorem ipsum, "SAMPLE TITLE", xxxx) or delete the shape; keep your text about as long as the sample it replaces. New slides are added after the template's pages, so the numbers of the template pages stay valid.
  3. Where no page fits (a chart, big figures, a formula, a table): slide {kind, .., base: n, area: [left, top, width, height]} draws that kind on a copy of template page n (a page with little on it: a content page with its sample deleted, or a plain background), inside the free area you give in points; set theme {primary, accent, text, bg, titleFont..} first to the template's colours (read them off the render) so the two match. theme {base, area} makes this the default for every slide op \u2014 the way to use a template that is only background pictures.
  4. Finish with delete_slides {from: 1, to: last template page} so only your slides remain, render the overview and check that no sample text is left.
The operations below are for touching up a designed slide or for the rare slide no kind fits.

PowerPoint ops. slide = slide number; shape = a shape name or "#id" from research_office_read, or "title" / "body". Positions and sizes are in points. Formulas: write LaTeX between dollar signs in any slide text (title, body, text box), as in Word; they become native PowerPoint equations, inline with the text. A formula on its own gets a text box of its own.
- add_slide {layout?: title|title_content|two_content|title_only|blank|section, title?, body?, notes?, at?} \u2014 body: lines separated by newlines become bullets.
- set_text {slide, shape, text, size?, bold?, color?, align?} \u2014 a line that starts with a tab (or two spaces) is a bullet one level down.
- format_text {slide, shape, find?, font?, size?, bold?, italic?, underline?, color?, align?, bullets?, lineSpacing?, fit?: "shrink"|"grow"|"none"} \u2014 the whole text of the shape, or only the part that reads find.
- add_textbox {slide, text, left, top, width, height, size?, bold?, color?, align?, fill?, name?}
- add_image {slide, path, left, top, width?, height?, name?}
- add_smartart {slide, layout, items, left?, top?, width?, height?, colors?, look?, name?} \u2014 a native SmartArt diagram. layout: list | bullet_list | horizontal_list | process | chevron | arrows | timeline | steps | cycle | radial | hierarchy | org_chart | tree | pyramid | venn | matrix | funnel | target | balance | gear, or the name a layout has in PowerPoint. items: texts, or {text, children:[..]} for the levels below (the branches of a hierarchy, the bullets under a step). Prefer it to hand-drawn boxes and arrows for steps, cycles, structures and comparisons.
- add_table {slide, data:[[cell,..],..], left?, top?, width?, height?, size?, font?, align?, header?, name?} \u2014 a native table; formulas in its cells are set as text with real subscripts and powers.
- add_shape {slide, kind, left, top, width, height, text?, fill?, line?: colour|"none", lineWidth?, size?, bold?, color?, name?} \u2014 kind: rectangle | rounded | ellipse | diamond | triangle | arrow | arrow_left | arrow_up | arrow_down | chevron | pentagon | hexagon | star | callout | cloud | line | arrow_line (for a line, width and height are how far it runs).
- set_shape {slide, shape, left?, top?, width?, height?, fill?, name?}; delete_shape {slide, shape}
- reuse_slide {from, texts?, images?, delete?, at?, notes?}; delete_slides {from, to}; delete_slide {slide}; move_slide {slide, to} (to = the number the slide has afterwards; page numbers follow); duplicate_slide {slide, to?}; set_layout {slide, layout}; set_background {slide, color}; set_notes {slide, text}`
};
function createTools(host) {
  const { helper } = host;
  const tools = [];
  let current;
  const own = /* @__PURE__ */ new Set();
  const unseen = /* @__PURE__ */ new Set();
  const keyOf = (on) => `${on.app}:${fileName(on.doc).toLowerCase()}`;
  const told = /* @__PURE__ */ new Map();
  const sessionOf = (exec) => exec?.agent?.session?.id ?? "default";
  const guide = (exec, kind) => {
    const session = sessionOf(exec);
    let seen = told.get(session);
    if (!seen) {
      seen = /* @__PURE__ */ new Set();
      told.set(session, seen);
    }
    if (seen.has(kind)) return "";
    seen.add(kind);
    return `

${APP_NAMES[kind]} operations for research_office_edit (this list is given once; research_office_help {app: "${kind}"} gives it again):
${GUIDES[kind]}`;
  };
  const picture = async (on, first, last, extra2, width) => {
    const folder = join2(tmpdir2(), "research-workbench-office");
    await mkdir2(folder, { recursive: true });
    const lines = [];
    const images = [];
    let total;
    for (let number = first; number <= last; number++) {
      const out = join2(folder, `render-${process.pid}-${Date.now()}-${number}.png`);
      try {
        const which = on.app === "word" ? { page: number } : on.app === "ppt" ? { slide: number } : {};
        const result = await helper.call("render", { ...on, ...extra2, ...which, out, width }, 5e4);
        images.push(toJson(await host.saveImage(await readFile2(out), `${on.app}-${result.what.replace(/[^\w一-龥]+/g, "-")}.png`)));
        lines.push(`${APP_NAMES[on.app]} ${result.what}, ${result.width}\xD7${result.height}.`);
        const of = / of (\d+)$/.exec(result.what);
        if (of) {
          total = Number(of[1]);
          last = Math.min(last, total);
        }
      } catch (error) {
        if (images.length === 0) throw error;
        if (on.app === "word") lines.push(error instanceof Error ? error.message : String(error));
        break;
      } finally {
        await rm2(out, { force: true });
      }
    }
    return { lines, images, ...total === void 0 ? {} : { total } };
  };
  const overview = async (on) => {
    if (on.app === "excel") return picture(on, 0, 0, {}, Math.min(host.settings().renderWidth, 1e3));
    const folder = join2(tmpdir2(), "research-workbench-office");
    await mkdir2(folder, { recursive: true });
    const lines = [];
    const images = [];
    let total = 1;
    for (let from2 = 1; from2 <= Math.min(total, 18); from2 += 6) {
      const out = join2(folder, `sheet-${process.pid}-${Date.now()}-${from2}.png`);
      try {
        const result = await helper.call("render", { ...on, sheet: true, from: from2, to: from2 + 5, out, width: 640 }, 11e4);
        total = result.total;
        images.push(toJson(await host.saveImage(await readFile2(out), `${on.app}-overview-${from2}.png`)));
        lines.push(`${APP_NAMES[on.app]} ${result.what}, tiled in one picture.`);
      } finally {
        await rm2(out, { force: true });
      }
    }
    if (total > 18) lines.push(`Only the first 18 of ${total} are shown.`);
    return { lines, images };
  };
  const target = (args) => {
    if (args.doc === void 0 && args.app === void 0) {
      if (!current) throw new Error("No document yet: call research_office_open first, or pass doc.");
      return current;
    }
    const app = appOf({ ...args.app === void 0 ? {} : { app: args.app }, ...args.doc === void 0 ? {} : { doc: args.doc } });
    current = { app, ...args.doc === void 0 ? {} : { doc: args.doc } };
    return current;
  };
  const quietTold = /* @__PURE__ */ new Set();
  const quietNote = (exec) => {
    const session = sessionOf(exec);
    if (quietTold.has(session)) return "";
    quietTold.add(session);
    return "\n\n" + SILENT;
  };
  tools.push(defineTool({
    name: "research_office_open",
    description: "Open a .docx / .xlsx / .pptx file in Word, Excel or PowerPoint so the user watches the work and can edit alongside; a path that does not exist yet creates the file. If the file is already open it is used as it is. Call this before the other research_office_ tools.",
    parameters: {
      path: { type: "string", description: "Absolute path of the file. Omit to start an unsaved new document (then app is required)." },
      template: { type: "string", description: "Absolute path of a template or an example to start from: it is copied to path (which must not exist yet) and the copy is opened, the original left untouched. Use it when the user gives a template or a sample whose look the new document should have." },
      app: { type: "string", enum: ["word", "excel", "ppt"], description: "Needed only without path." },
      show: { type: "boolean", description: "true brings the document's window into view even in silent mode. Needed only before working on the window itself with mouse / keyboard tools." }
    },
    output,
    timeoutMs: 9e4,
    async execute(args, exec) {
      const { path, app, template, show } = args;
      if (path !== void 0 && !isAbsolute(path)) throw new Error("path must be an absolute path.");
      if (template !== void 0) {
        if (path === void 0) throw new Error("With template, give path: where the copy is to be saved.");
        if (!isAbsolute(template)) throw new Error("template must be an absolute path.");
        if (extname(template).toLowerCase() !== extname(path).toLowerCase()) throw new Error("template and path must be the same kind of file.");
        if (await access(path).then(() => true, () => false)) throw new Error(`${path} exists already: pick a path that does not, the template is copied there.`);
        await copyFile(template, path).catch((error) => {
          throw new Error(`Could not copy the template: ${error instanceof Error ? error.message : String(error)}`);
        });
      }
      const kind = appOf({ ...app === void 0 ? {} : { app }, ...path === void 0 ? {} : { path } });
      const { showOnOpen, follow, typing, card: card2, silent } = host.settings();
      const quiet = silent && show !== true;
      const doc = await helper.call("open", quiet ? { app: kind, ...path === void 0 ? {} : { path }, silent: true, show: false } : { app: kind, ...path === void 0 ? {} : { path }, show: show === true ? true : showOnOpen, follow, typing, card: silent ? false : card2 }, 8e4);
      current = { app: kind, doc: doc.path ?? doc.name };
      if (doc.how !== "attached") own.add(keyOf(current));
      return { text: formatOpened(doc) + (quiet ? quietNote(exec) : "") + guide(exec, kind) };
    },
    presentCall: (args) => card(`\u6253\u5F00 ${fileName(args.path) || "\u65B0\u6587\u6863"}`)
  }));
  tools.push(defineTool({
    name: "research_office_status",
    description: "List what is open in Word, Excel and PowerPoint right now, and which documents have unsaved changes.",
    parameters: {},
    output,
    isConcurrencySafe: () => true,
    async execute() {
      return { text: formatStatus(await helper.call("status", {}, 3e4)) };
    },
    presentCall: () => card("\u67E5\u770B Office \u72B6\u6001")
  }));
  tools.push(defineTool({
    name: "research_office_read",
    description: "Read an open document as text, exactly as it is now (including what the user just changed). Word: numbered paragraphs with heading levels and tables; table=N reads one table. Excel: the sheets, then the cells of a range (default: the used range of the active sheet) with their formulas. PowerPoint: every slide with its shapes (name, type, [left, top, width, height] in points, text).",
    parameters: {
      doc: DOC,
      app: APP,
      from: { type: "integer", description: "Word: first paragraph to list (default 1)." },
      count: { type: "integer", description: "Word: how many paragraphs (default 120, max 400)." },
      full: { type: "boolean", description: "Word / PowerPoint: full text instead of the first 100 / 200 characters of each paragraph / shape." },
      footnotes: { type: "boolean", description: "Word: include every native footnote, independent of the body paragraph range. Default: only notes anchored in the paragraphs read. Use full:true for complete note text." },
      table: { type: "integer", description: "Word: read the cells of table N." },
      sheet: { type: "string", description: "Excel: sheet name." },
      range: { type: "string", description: "Excel: A1-style range, e.g. A1:F40." },
      profile: { type: "boolean", description: "Excel: also describe every column of the block (kinds of values, range, distinct values, what looks wrong). Given by itself for a table too long to show whole." },
      slide: { type: "integer", description: "PowerPoint: only this slide." }
    },
    output,
    timeoutMs: 6e4,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const input = args;
      const { doc: _doc, app: _app, ...rest } = input;
      const on = target(input), kind = on.app;
      const result = await helper.call("read", { ...on, ...rest }, 5e4);
      return { text: (kind === "word" ? formatWord(result) : kind === "excel" ? formatExcel(result) : formatPpt(result)) + guide(exec, kind) };
    },
    presentCall: (args) => card(`\u8BFB\u53D6 ${fileName(args.doc) || "\u5F53\u524D\u6587\u6863"}`)
  }));
  tools.push(defineTool({
    name: "research_office_edit",
    description: EDIT_CORE,
    parameters: {
      doc: DOC,
      app: APP,
      ops: {
        type: "array",
        required: true,
        description: 'Operations to run in order, e.g. [{"op":"set_text","para":3,"expect":"Old start","text":"New text"}].',
        items: { type: "object", additionalProperties: true, properties: { op: { type: "string", required: true, description: "Operation name." } } }
      }
    },
    output,
    timeoutMs: 5 * 6e4,
    async execute(args, exec) {
      const input = args;
      if (!Array.isArray(input.ops) || input.ops.length === 0) throw new Error("ops must be a non-empty array.");
      if (input.ops.length > 200) throw new Error("At most 200 operations per call.");
      const { follow, typing, card: card2, silent } = host.settings();
      const on = target(input);
      const math2 = formulasOf(input.ops);
      const result = await helper.call("edit", { ...on, ops: input.ops, follow, typing, card: silent ? false : card2, silent, ...Object.keys(math2).length > 0 ? { math: math2 } : {} }, 4.5 * 6e4);
      if (result.done.length > 0) unseen.add(keyOf(on));
      return { text: formatEdit(result) + guide(exec, on.app) };
    },
    presentCall: (args) => {
      const { doc, ops } = args;
      return card(`\u7F16\u8F91 ${fileName(doc) || "\u5F53\u524D\u6587\u6863"}${Array.isArray(ops) ? ` \xB7 ${ops.length} \u9879` : ""}`);
    }
  }));
  tools.push(defineTool({
    name: "research_office_help",
    description: "The operations research_office_edit takes for one app, with their fields: Word (text, formulas, tables, pictures, citations, styles, page setup), Excel (cells, formats, sheets, charts) or PowerPoint (slides, text, pictures, SmartArt, tables, shapes). Call it whenever you are not sure what an operation is called or what fields it takes.",
    parameters: {
      app: { type: "string", enum: ["word", "excel", "ppt"], required: true, description: "Which app." }
    },
    output,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const kind = appOf({ app: args.app ?? "" });
      const session = sessionOf(exec);
      if (!told.has(session)) told.set(session, /* @__PURE__ */ new Set());
      told.get(session).add(kind);
      return { text: `${APP_NAMES[kind]} operations for research_office_edit:
${GUIDES[kind]}

${TAIL}` };
    },
    presentCall: (args) => card(`\u67E5\u770B ${APP_NAMES[appOf({ app: args.app ?? "word" })]} \u64CD\u4F5C\u8BF4\u660E`)
  }));
  tools.push(defineTool({
    name: "research_office_render",
    description: 'Get a picture of how the open document really looks: a Word page, a PowerPoint slide (with "to": up to 4 in a row), an Excel range (default: the used range), or with overview: true the whole document tiled into one picture. Use it on every page you changed before you finish: it shows what research_office_read cannot, such as content that landed outside its frame, a table that is too wide, text that overflows. It pictures the document as Word itself lays it out, unsaved changes included, with the window in the background.',
    parameters: {
      doc: DOC,
      app: APP,
      page: { type: "integer", description: "Word: page number (default 1)." },
      slide: { type: "integer", description: "PowerPoint: slide number." },
      to: { type: "integer", description: "Word / PowerPoint: last page or slide, to get up to 4 in one call." },
      overview: { type: "boolean", description: "Word / PowerPoint: every page or slide tiled into one picture (6 pages per picture, numbered): the whole document at a glance, for the final check. Then look closer at a page with page / slide." },
      sheet: { type: "string", description: "Excel: sheet name." },
      range: { type: "string", description: "Excel: range to picture (charts lying over it are in the picture)." },
      chart: { type: "string", description: "Excel: name of one chart to picture, instead of a range." }
    },
    output,
    timeoutMs: 6e4,
    async execute(args, exec) {
      const input = { ...args };
      const on = target(input), kind = on.app;
      if (kind === "ppt" && input.slide === void 0 && typeof input.page === "number") input.slide = input.page;
      if (kind === "ppt" && input.slide === void 0 && input.overview !== true) throw new Error("slide is required for PowerPoint (or pass overview: true).");
      if (!await host.vision(exec)) return { text: "The current model cannot view images; check the result with research_office_read instead." };
      if (input.overview === true && kind !== "excel") {
        const all = await overview(on);
        unseen.delete(keyOf(on));
        const [image2, ...more2] = all.images;
        return { text: all.lines.join("\n"), ...image2 === void 0 ? {} : { image: image2 }, ...more2.length ? { more: more2 } : {} };
      }
      const { doc: _doc, app: _app, to, page: _page, slide: _slide, overview: _overview, ...rest } = input;
      const first = kind === "word" ? input.page ?? 1 : kind === "ppt" ? input.slide : 0;
      const last = kind === "excel" || to === void 0 ? first : Math.min(Math.max(to, first), first + 3);
      const { lines, images } = await picture(on, first, last, rest, host.settings().renderWidth);
      unseen.delete(keyOf(on));
      const [image, ...more] = images;
      return { text: lines.join("\n"), ...image === void 0 ? {} : { image }, ...more.length ? { more } : {} };
    },
    presentCall: (args) => card(`\u67E5\u770B ${fileName(args.doc) || "\u5F53\u524D\u6587\u6863"} \u7684\u6392\u7248`)
  }));
  tools.push(defineTool({
    name: "research_office_save",
    description: "Save the open document; if you have edited since you last looked at it, the reply also shows you its pages for a final check. With path: save a copy under another name or format (.pdf exports a PDF and keeps the document as it is; other extensions switch the document to the new file).",
    parameters: {
      doc: DOC,
      app: APP,
      path: { type: "string", description: "Absolute path to save as. Omit to save in place." }
    },
    output,
    timeoutMs: 12e4,
    async execute(args, exec) {
      const input = args;
      if (input.path !== void 0 && !isAbsolute(input.path)) throw new Error("path must be an absolute path.");
      const on = target(input);
      let tidied = "";
      if (on.app === "word" && unseen.has(keyOf(on)) && extname(input.path ?? "").toLowerCase() !== ".pdf") {
        try {
          const pass = await helper.call("edit", { ...on, ops: [{ op: "fill_gaps" }] }, 1e5);
          const said = pass.done?.[0] ?? "";
          if (said !== "" && !/^no page/.test(said)) tidied = ` Before saving, ${said}.`;
        } catch {
        }
      }
      const result = await helper.call("save", { ...on, ...input.path === void 0 ? {} : { path: input.path } }, 11e4);
      const moved = input.path !== void 0 && extname(input.path).toLowerCase() !== ".pdf";
      const wasUnseen = unseen.delete(keyOf(on));
      if (moved) {
        if (own.delete(keyOf(on))) own.add(keyOf({ app: on.app, doc: result.path }));
        current = { app: on.app, doc: result.path };
      }
      const text2 = `Saved ${result.path} (${result.bytes} bytes).${moved ? " The open document is now this file." : ""}${tidied}`;
      if (!wasUnseen || !host.settings().finalCheck || !await host.vision(exec)) return { text: text2 };
      try {
        const now = moved ? { app: on.app, doc: result.path } : on;
        const shown = await overview(now);
        const [image, ...more] = shown.images;
        return {
          text: `${text2}
Final check: you edited after you last looked at the document, so here is the whole of it as it is now. ${shown.lines.join(" ")}
Go through every page before you tell the user it is done. If anything is off (content outside its frame, uneven fonts or spacing, formulas as plain text, bad tables, leftover hints, blank gaps, a nearly empty last page), look closer with research_office_render, fix it with research_office_edit and save again; if all is well, say so.`,
          ...image === void 0 ? {} : { image },
          ...more.length ? { more } : {}
        };
      } catch {
        return { text: text2 };
      }
    },
    presentCall: (args) => card(`\u4FDD\u5B58 ${fileName(args.path ?? args.doc) || "\u5F53\u524D\u6587\u6863"}`)
  }));
  tools.push(defineTool({
    name: "research_office_close",
    description: "Close a document that YOU opened or created with research_office_open (a scratch file, a source you are done with). Documents the user already had open are theirs and are refused. Unsaved changes are refused unless you pass save.",
    parameters: {
      doc: DOC,
      app: APP,
      save: { type: "boolean", description: "true: save and close. false: close and drop unsaved changes." }
    },
    output,
    timeoutMs: 6e4,
    async execute(args) {
      const input = args;
      const on = target(input);
      if (!own.has(keyOf(on))) throw new Error("This document was open before you came to it, or was not opened by you: leave closing it to the user.");
      if (input.save === void 0) {
        const apps = await helper.call("status", {}, 3e4);
        const info = apps.flatMap((app) => app.documents).find((doc) => doc.app === on.app && fileName(doc.path ?? doc.name).toLowerCase() === fileName(on.doc).toLowerCase());
        if (info && !info.saved) throw new Error("It has unsaved changes: pass save: true to keep them or save: false to drop them.");
      }
      await helper.call("close", { ...on, save: input.save === true }, 5e4);
      own.delete(keyOf(on));
      unseen.delete(keyOf(on));
      if (current && keyOf(current) === keyOf(on)) current = void 0;
      return { text: `Closed ${fileName(on.doc)}.` };
    },
    presentCall: (args) => card(`\u5173\u95ED ${fileName(args.doc) || "\u6587\u6863"}`)
  }));
  return tools;
}

// vendor/copylee-office/src/index.ts
var name = "dsh-research-workbench/native-office";
var inject = ["tools", "attachments"];
var Config = Schema.object({
  suite: Schema.string().default("auto").volatile().i18n({
    "zh-CN": { $description: "\u529E\u516C\u5957\u4EF6\uFF1Aauto\uFF08\u81EA\u52A8\uFF1A\u88C5\u4E86\u5FAE\u8F6F Office \u5C31\u7528\u5B83\uFF0C\u5426\u5219\u7528 WPS\uFF09| office\uFF08\u5FAE\u8F6F Office\uFF09| wps\uFF08WPS Office\uFF09\u3002\u5DF2\u7ECF\u6253\u5F00\u7740\u7684\u6587\u6863\u59CB\u7EC8\u5728\u5B83\u6240\u5728\u7684\u8F6F\u4EF6\u91CC\u4FEE\u6539" },
    "en-US": { $description: "Office suite: auto (Microsoft Office when installed, else WPS) | office | wps. A document that is already open is always edited where it is" }
  }),
  follow: Schema.boolean().default(true).volatile().i18n({
    "zh-CN": { $description: "\u8DDF\u968F AI \u6B63\u5728\u4FEE\u6539\u7684\u4F4D\u7F6E\uFF08\u81EA\u52A8\u6EDA\u52A8\u5230\u90A3\u91CC\uFF09\uFF1B\u5173\u95ED\u4E3A\u9759\u9ED8\u6267\u884C\uFF0C\u4E0D\u52A8\u4F60\u7684\u89C6\u56FE" },
    "en-US": { $description: "Scroll to where the AI is editing; off = silent, your view is left alone" }
  }),
  silent: Schema.boolean().default(false).volatile().i18n({
    "zh-CN": { $description: "\u9759\u9ED8\u6A21\u5F0F\uFF1A\u5728\u540E\u53F0\u5B8C\u6210\uFF0C\u4E0D\u5F39\u51FA\u4EFB\u4F55\u7A97\u53E3\u548C\u8FF7\u4F60\u5361\u7247\uFF0C\u4E00\u6B21\u5199\u5165\uFF08\u4E0D\u9010\u5B57\uFF09\uFF1B\u56DE\u5408\u7ED3\u675F\u65F6\u81EA\u52A8\u4FDD\u5B58\u5E76\u5173\u95ED\u540E\u53F0\u6253\u5F00\u7684\u6587\u6863\u3002\u5F00\u542F\u540E\u4E0B\u9762\u7684\u201C\u8DDF\u968F\u201D\u201C\u9010\u5B57\u201D\u201C\u8FF7\u4F60\u5361\u7247\u201D\u4E0D\u518D\u8D77\u4F5C\u7528" },
    "en-US": { $description: "Silent mode: work in the background with no window and no card, text written at once; what was opened is saved and closed when the turn ends. Follow, typing and the card do not apply while it is on" }
  }),
  typing: Schema.boolean().default(true).volatile().i18n({
    "zh-CN": { $description: "\u6587\u5B57\u50CF\u6253\u5B57\u4E00\u6837\u9010\u6B65\u5199\u51FA\uFF0C\u800C\u4E0D\u662F\u6574\u5757\u51FA\u73B0\uFF08\u6BCF\u6BB5\u7EA6\u591A\u82B1 0.3 \u79D2\uFF09" },
    "en-US": { $description: "Write text progressively like typing instead of all at once (about 0.3 s more per paragraph)" }
  }),
  card: Schema.boolean().default(true).volatile().i18n({
    "zh-CN": { $description: "AI \u7F16\u8F91\u65F6\u5728\u5C4F\u5E55\u53F3\u4E0B\u89D2\u663E\u793A\u8FF7\u4F60\u5361\u7247\uFF0C\u53EF\u968F\u65F6\u5F00\u5173\u201C\u67E5\u770B\u201D\u548C\u201C\u5FEB\u901F\u201D\uFF08\u5FEB\u901F = \u4E0D\u9010\u5B57\u5199\u5165\uFF09" },
    "en-US": { $description: "Show a small card at the bottom right while the AI edits, with switches for following and typing" }
  }),
  finalCheck: Schema.boolean().default(true).volatile().i18n({
    "zh-CN": { $description: "\u4EA4\u4ED8\u524D\u6574\u4F53\u89C6\u89C9\u68C0\u67E5\uFF1A\u4FDD\u5B58\u65F6\u5982\u679C AI \u6539\u5B8C\u540E\u8FD8\u6CA1\u770B\u8FC7\u6210\u54C1\uFF0C\u81EA\u52A8\u628A\u5404\u9875\u6E32\u67D3\u6210\u56FE\u7247\u7ED9\u5B83\u68C0\u67E5" },
    "en-US": { $description: "Whole-document visual check: on save, show the AI every page if it has not looked since its last edits" }
  }),
  preferLive: Schema.boolean().default(true).volatile().i18n({
    "zh-CN": { $description: "\u4F18\u5148\u5728\u771F\u5B9E Office \u91CC\u64CD\u4F5C\uFF1AAI \u60F3\u52A0\u8F7D DSH \u81EA\u5E26\u7684 office-docx / office-pptx \u6280\u80FD\uFF08\u7528\u811A\u672C\u6539\u6587\u4EF6\uFF09\u65F6\uFF0C\u5148\u628A\u5B83\u5F15\u56DE\u672C\u63D2\u4EF6\uFF1B\u8868\u683C\u7684 office-xlsx \u6280\u80FD\u7167\u5E38\u52A0\u8F7D" },
    "en-US": { $description: "Prefer the real Office app: when the AI reaches for the host's file-based office-docx / office-pptx skills, point it back to this plugin first; office-xlsx loads as usual" }
  }),
  showOnOpen: Schema.boolean().default(true).volatile().i18n({
    "zh-CN": { $description: "\u6253\u5F00\u6587\u6863\u65F6\u628A\u5B83\u7684\u7A97\u53E3\u5E26\u5230\u524D\u53F0" },
    "en-US": { $description: "Bring the document window to the front when it is opened" }
  }),
  renderWidth: Schema.natural().min(600).max(2e3).default(1100).volatile().i18n({
    "zh-CN": { $description: "\u7ED9\u6A21\u578B\u6838\u5BF9\u6392\u7248\u7684\u56FE\u7247\u5BBD\u5EA6\uFF08\u50CF\u7D20\uFF09\uFF1B\u8D8A\u5927\u8D8A\u6E05\u6670\u3001\u8D8A\u8D39 token" },
    "en-US": { $description: "Width in pixels of the pictures the model checks layout with" }
  })
});
function apply(ctx, config = {}) {
  if (process.platform !== "win32") {
    ctx.logger.warn("dsh-office only supports Windows; no tools registered.");
    return;
  }
  const settings = () => resolveConfig(config);
  const client = new HelperClient((message) => ctx.logger.warn(message));
  const helper = {
    call: (cmd, args = {}, timeoutMs) => trackOfficeCall(() => client.call(cmd, { suite: settings().suite, ...args }, timeoutMs)),
    onEvent: (listener) => client.onEvent(listener),
    dispose: () => client.dispose()
  };
  ctx.effect(() => () => helper.dispose(), "office: helper");
  const visionCache = /* @__PURE__ */ new Map();
  const supportsVision = (agent, signal) => {
    const route = agent?.session.requestHeader?.()?.config ?? agent?.options;
    const provider = route?.provider;
    const model = route?.model;
    const llm = ctx.get("llm");
    if (!provider || !model || typeof llm?.resolveModelInfo !== "function") return Promise.resolve(true);
    const key2 = `${provider}\0${model}`;
    let cached = visionCache.get(key2);
    if (!cached) {
      cached = llm.resolveModelInfo(provider, model, signal).then((info) => info.inputModalities === void 0 || info.inputModalities.includes("image")).catch(() => {
        visionCache.delete(key2);
        return true;
      });
      visionCache.set(key2, cached);
    }
    return cached;
  };
  const tools = createTools({
    helper,
    settings,
    saveImage: (data, fileName2) => ctx.attachments.saveImage({ data, mediaType: "image/png", name: fileName2 }),
    vision: (raw) => {
      const exec = raw;
      return supportsVision(exec.agent, exec.signal);
    }
  });
  for (const tool of tools) ctx.effect(() => ctx.tools.register(tool), `office: tool ${tool.name}`);
  let installed;
  const installedApps = () => {
    installed ??= helper.call("status", {}, 3e4).then((apps) => new Set(apps.filter((app) => app.installed).map((app) => app.app))).catch(() => {
      installed = void 0;
      return /* @__PURE__ */ new Set();
    });
    return installed;
  };
  const working = /* @__PURE__ */ new Set();
  let carded = false;
  ctx.on("tools/pre-execute", (exec, next) => {
    if (exec.name.startsWith("research_office_") && exec.agent) {
      working.add(exec.agent);
      carded = true;
    }
    return next();
  });
  const retire = (agent) => {
    if (!carded || typeof agent !== "object" || agent === null || !working.has(agent)) return;
    working.delete(agent);
    if (working.size > 0) return;
    void helper.call("card", { text: "AI \u5DF2\u5B8C\u6210", hold: false }, 5e3).catch(() => {
    });
    void helper.call("settle", {}, 6e4).then((said) => {
      for (const line of said) ctx.logger.info(`office: ${line}`);
    }).catch(() => {
    });
  };
  ctx.on("agent/status", ({ agent, status }) => {
    if (status === "idle") retire(agent);
  });
  ctx.on("agent/disposed", ({ agent }) => {
    retire(agent);
  });
  const redirected = /* @__PURE__ */ new Set();
  ctx.on("tools/post-execute", async (exec, result, next) => {
    if (exec.name !== "skill" || result.isError || !settings().preferLive) return next();
    const skill = String(exec.arguments?.name ?? "");
    const app = FILE_SKILLS[skill];
    if (app === void 0) return next();
    const session = exec.agent?.session?.id ?? "default";
    const key2 = `${session}:${skill}`;
    if (redirected.has(key2) || !(await installedApps()).has(app)) return next();
    redirected.add(key2);
    return { kind: "accept", content: [{ type: "text", text: redirectText(skill, app) }] };
  });
  ctx.inject(["connection"], (webCtx) => {
    webCtx.effect(() => webCtx.get("connection").fetch.register({
      path: "/api/research-workbench/office/status",
      methods: ["POST"],
      requestBody: "streaming",
      fetch: async () => {
        try {
          return Response.json({ ok: true, apps: await helper.call("status", {}, 3e4) }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { headers: { "cache-control": "no-store" } });
        }
      }
    }), "research-office: authenticated status");
  });
  ctx.inject(["systemPrompt"], (promptCtx) => {
    promptCtx.effect(() => promptCtx.systemPrompt.section({ name: "research-office:guide", order: 73, text: promptText() }), "office: prompt");
  });
}

// src/native-office.ts
function apply2(ctx, config = {}) {
  apply(ctx, config);
  if (process.platform !== "win32") return;
  ctx.inject(["systemPrompt"], (scope) => {
    scope.effect(() => scope.systemPrompt.section({
      name: "research-office:research-routing",
      order: 74,
      text: [
        "# Research Workbench and native Office",
        "For local .docx/.xlsx/.pptx files or work explicitly requested in WPS/Office, use the research_office_* tools. Name the target document explicitly when several are open.",
        "When the user explicitly asks to modify a saved Research Workbench proposal, slides or IP draft by its project/ID, use research_artifact_* with its revision checks. LaTeX sources use research_paper_write. These are separate from a native Office file.",
        "Editing an exported Office file does not automatically update a structured Research Workbench draft. Do not claim the two have synchronized; tell the user which file or draft was changed. Preserve original templates and use a copy when asked."
      ].join("\n")
    }), "research-office: research routing");
  });
}
export {
  Config,
  DEFAULTS,
  ENTRY_ID,
  HelperClient,
  apply2 as apply,
  createTools,
  ensureHelperExe,
  helperSourcePath,
  inject,
  name,
  promptText,
  redirectText,
  resolveConfig
};
