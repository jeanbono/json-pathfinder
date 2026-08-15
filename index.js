const ESCAPES = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

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

    // Advances past a string without decoding it — used for values, whose
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
    // decoded content — used for keys, since callers query decoded paths.
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
            const keyPath = path === '' ? key : `${path}.${key}`;
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

    skipValue('');

    return (path) => pathToLine.get(path) ?? -1;
};
