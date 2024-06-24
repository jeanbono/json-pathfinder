export const jsonPathfinder = (jsonString) => {
    let currentLine = 1;
    let stack = []; // contains the state of the element being parse : null for an object and the current index of the array if it's an array
    let isInKey = false;
    let currentPath = '';
    let ignoreNextKey = false;
    let pathToLine = {};

    for (const char of jsonString) {
        if (char === '\n') {
            currentLine++;
            continue;
        }

        if (char === '"') {
            if (stack.length > 0 && stack[stack.length -1] === null) {
                isInKey = !isInKey;
                if (!ignoreNextKey && isInKey) { // end of key
                    if (currentPath !== '') {
                        currentPath += '.';
                    }
                }
            }
            continue;
        }

        if (isInKey && stack.length > 0 && stack[stack.length - 1] === null) {
            if (!ignoreNextKey) {
                currentPath += char;
            }
            continue;
        }

        if (char === '{') {
            ignoreNextKey = false;
            if (stack.length > 0 && typeof stack[stack.length - 1] === "number") { // We are in an array
                currentPath += '[' + stack[stack.length - 1] + ']';
            }
            stack.push(null)
            continue;
        }

        if (char === '}') {
            stack.pop();
            if (stack.length > 0 && typeof stack[stack.length - 1] === "number") {
                currentPath = currentPath.substring(0, currentPath.lastIndexOf('['));
            }
            continue;
        }

        if (char === '[') {
            stack.push(0);
            continue;
        }

        if (char === ']') {
            stack.pop();
            continue;
        }

        if (char === ':') {
            ignoreNextKey = true;
            pathToLine[currentPath] = currentLine;
            continue;
        }

        if (char === ',') {
            if (stack.length > 0 && typeof stack[stack.length - 1] === "number") { // We are in an array
                stack[stack.length - 1]++;
            } else if (stack.length > 0 && stack[stack.length - 1] === null) { // We are in an object
                currentPath = currentPath.substring(0, currentPath.lastIndexOf('.'));
                ignoreNextKey = false;
            }
            continue;
        }

        if (char === ' ' || char === '\t') {
            continue;
        }
    }

    return (path) => pathToLine[path] ?? -1;
}