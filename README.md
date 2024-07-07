# JSON Pathfinder

JSON Pathfinder is a javascript library dedicated to finding the line number for a given json path in a json string

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
console.log(pathfinder('baz[0].hello'));
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License

[ISC](https://choosealicense.com/licenses/isc/)