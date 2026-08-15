const ESCAPES = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

// Renders a member name as an RFC 9535 section 2.7 "Normalized Path"
// segment: single-quoted, with backslash/quote/control-character escaping.
const quoteName = (name) => {
    let out = "'";
    for (const ch of name) {
        if (ch === '\\') out += '\\\\';
        else if (ch === "'") out += "\\'";
        else if (ch === '\n') out += '\\n';
        else if (ch === '\r') out += '\\r';
        else if (ch === '\t') out += '\\t';
        else if (ch === '\b') out += '\\b';
        else if (ch === '\f') out += '\\f';
        else if (ch.codePointAt(0) < 0x20) out += `\\u${ch.codePointAt(0).toString(16).padStart(4, '0')}`;
        else out += ch;
    }
    return out + "'";
};

const isAsciiAlpha = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isAsciiDigit = (c) => c >= '0' && c <= '9';
const isNameFirst = (c) => isAsciiAlpha(c) || c === '_' || c.codePointAt(0) > 0x7f;
const isNameChar = (c) => isNameFirst(c) || isAsciiDigit(c);

// Parses a JSONPath *singular query* -- the root identifier followed by
// name/index segments only (RFC 9535 section 2.1: no wildcards, slices,
// filters, or descendant selectors, since those can match more than one
// location and this library maps exactly one path to exactly one line).
// Accepts both dot-shorthand (`$.foo.bar`) and bracket notation
// (`$['foo'][0]`), mixed freely, and returns the RFC 9535 Normalized Path
// so it can be looked up directly against the map built while scanning
// the document.
const normalizeQuery = (query) => {
    const m = query.length;
    let j = 0;

    const fail = (msg) => {
        throw new Error(`Invalid JSONPath query "${query}": ${msg} (at index ${j})`);
    };

    if (query[0] !== '$') fail("must start with '$'");
    j++;
    let out = '$';

    while (j < m) {
        if (query[j] === '.') {
            j++;
            const start = j;
            if (j < m && isNameFirst(query[j])) j++;
            while (j < m && isNameChar(query[j])) j++;
            if (j === start) fail("expected a name after '.'");
            out += `[${quoteName(query.slice(start, j))}]`;
            continue;
        }

        if (query[j] === '[') {
            j++;
            if (query[j] === "'" || query[j] === '"') {
                const quote = query[j];
                j++;
                let value = '';
                while (j < m && query[j] !== quote) {
                    if (query[j] === '\\') {
                        const esc = query[j + 1];
                        if (esc === 'u') {
                            value += String.fromCharCode(parseInt(query.slice(j + 2, j + 6), 16));
                            j += 6;
                        } else {
                            value += ESCAPES[esc] ?? esc ?? '';
                            j += 2;
                        }
                    } else {
                        value += query[j];
                        j++;
                    }
                }
                if (query[j] !== quote) fail('unterminated quoted name');
                j++;
                out += `[${quoteName(value)}]`;
            } else {
                const start = j;
                while (j < m && isAsciiDigit(query[j])) j++;
                if (j === start) fail('expected a quoted name or a non-negative index inside [...]');
                out += `[${query.slice(start, j)}]`;
            }
            if (query[j] !== ']') fail("expected ']'");
            j++;
            continue;
        }

        fail(`unexpected character '${query[j]}'`);
    }

    return out;
};

export const jsonPathfinder = (jsonString) => {
    const pathToLine = new Map();
    const n = jsonString.length;
    let line = 1;
    let i = 0;

    const skipWhitespace = () => {
        while (i < n) {
            const c = jsonString[i];
            if (c === '\n') line++;
            else if (c !== ' ' && c !== '\t' && c !== '\r') break;
            i++;
        }
    };

    // Advances past a string without decoding it -- used for values, whose
    // content is never queried, only their span.
    const skipString = () => {
        i++; // opening quote
        while (i < n) {
            const c = jsonString[i];
            if (c === '"') {
                i++;
                return;
            }
            if (c === '\\') {
                i += 2;
                continue;
            }
            if (c === '\n') line++;
            i++;
        }
    };

    // Reads a JSON string starting at jsonString[i] === '"' and returns its
    // decoded content -- used for keys, since callers query decoded paths.
    // Copies whole runs of plain characters via slice() instead of
    // accumulating one character at a time.
    const readString = () => {
        let result = '';
        let start = ++i; // opening quote
        while (i < n) {
            const c = jsonString[i];
            if (c === '"') {
                result += jsonString.slice(start, i);
                i++;
                return result;
            }
            if (c === '\\') {
                result += jsonString.slice(start, i);
                const esc = jsonString[i + 1];
                if (esc === 'u') {
                    result += String.fromCharCode(parseInt(jsonString.slice(i + 2, i + 6), 16));
                    i += 6;
                } else {
                    result += ESCAPES[esc] ?? esc ?? '';
                    i += 2;
                }
                start = i;
                continue;
            }
            if (c === '\n') line++;
            i++;
        }
        result += jsonString.slice(start, i);
        return result; // unterminated string: best-effort on malformed input
    };

    const skipValue = (path) => {
        skipWhitespace();
        switch (jsonString[i]) {
            case '"':
                skipString();
                return;
            case '{':
                parseObject(path);
                return;
            case '[':
                parseArray(path);
                return;
            default:
                while (i < n && !',}] \t\n\r'.includes(jsonString[i])) i++;
        }
    };

    function parseObject(path) {
        i++; // '{'
        skipWhitespace();
        while (i < n && jsonString[i] !== '}') {
            skipWhitespace();
            const key = readString();
            const keyPath = `${path}[${quoteName(key)}]`;
            skipWhitespace();
            i++; // ':'
            pathToLine.set(keyPath, line);
            skipValue(keyPath);
            skipWhitespace();
            if (jsonString[i] === ',') {
                i++;
                skipWhitespace();
            }
        }
        i++; // '}'
    }

    function parseArray(path) {
        i++; // '['
        skipWhitespace();
        let index = 0;
        while (i < n && jsonString[i] !== ']') {
            skipValue(`${path}[${index}]`);
            skipWhitespace();
            if (jsonString[i] === ',') {
                i++;
                skipWhitespace();
                index++;
            }
        }
        i++; // ']'
    }

    skipValue('$');

    return (query) => pathToLine.get(normalizeQuery(query)) ?? -1;
};
