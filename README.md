# JSON Pathfinder

JSON Pathfinder is a javascript library dedicated to finding the line number for a given [JSONPath](https://www.rfc-editor.org/rfc/rfc9535) query in a json string

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install json-pathfinder.

```bash
npm -i @jeanbono/json-pathfinder
```

## Usage

```javascript
import { jsonPathfinder } from '@jeanbono/json-pathfinder';

const jsonString = '{\n\
    "foo": "bar",\n\
    "baz": [{ \n\
        "hello": "world" \n\
    }]\n\
}';

// parse the json string
const pathfinder = jsonPathfinder(jsonString);

// returns line number 4
console.log(pathfinder('$.baz[0].hello'));
```

## Path syntax

Queries follow [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535) (JSONPath),
restricted to *singular queries* — the root identifier `$` followed by
member-name and array-index segments. Wildcards, slices, filters, and
descendant selectors aren't supported, since they can match more than one
location and this library always resolves to exactly one line.

Both forms below are accepted and resolve to the same result — bracket
notation is required for member names that aren't valid identifiers
(containing a literal `.`, `[`, whitespace, ...):

```javascript
pathfinder('$.baz[0].hello');
pathfinder("$['baz'][0]['hello']");
```

A syntactically invalid query throws; a valid query with no matching
location returns `-1`.

> **Note:** versions before 2.0.0 used a bare `a.b[0].c` syntax without a
> leading `$`. Prefix existing queries with `$.` (or switch to bracket
> notation) to upgrade.

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License

[ISC](https://choosealicense.com/licenses/isc/)