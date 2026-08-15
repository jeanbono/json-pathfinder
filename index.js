const ESCAPES = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

export const jsonPathfinder = (jsonString) => {
    const pathToLine = {};
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

    // Reads a JSON string starting at jsonString[i] === '"' and returns its
    // decoded content, with i left just past the closing quote.
    const readString = () => {
        let result = '';
        i++; // opening quote
        while (i < n) {
            const c = jsonString[i];
            if (c === '"') {
                i++;
                return result;
            }
            if (c === '\\') {
                const esc = jsonString[i + 1];
                if (esc === 'u') {
                    result += String.fromCharCode(parseInt(jsonString.slice(i + 2, i + 6), 16));
                    i += 6;
                } else {
                    result += ESCAPES[esc] ?? esc ?? '';
                    i += 2;
                }
                continue;
            }
            if (c === '\n') line++;
            result += c;
            i++;
        }
        return result; // unterminated string: best-effort on malformed input
    };

    // Skips a value (string/object/array/number/true/false/null) at the
    // current position, recursing into containers under `path`.
    const skipValue = (path) => {
        skipWhitespace();
        switch (jsonString[i]) {
            case '"':
                readString();
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
            pathToLine[keyPath] = line;
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

    return (path) => pathToLine[path] ?? -1;
};
