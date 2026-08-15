import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonPathfinder } from './index.js';

test('README example', () => {
    const j = '{\n\
    "foo": "bar",\n\
    "baz": [{ \n\
        "hello": "world" \n\
    }]\n\
}';
    const p = jsonPathfinder(j);
    assert.equal(p('$.baz[0].hello'), 4);
    assert.equal(p('$.foo'), 2);
});

test('nested object followed by a sibling key', () => {
    const j = `{
  "a": {
    "b": 1
  },
  "c": 2
}`;
    const p = jsonPathfinder(j);
    assert.equal(p('$.a'), 2);
    assert.equal(p('$.a.b'), 3);
    assert.equal(p('$.c'), 5);
});

test('array of strings containing reserved characters', () => {
    const j = `{
  "arr": ["a{b", "c"],
  "after": 5
}`;
    const p = jsonPathfinder(j);
    assert.equal(p('$.arr'), 2);
    assert.equal(p('$.after'), 3);
});

test('escaped quote inside a string value', () => {
    const j = `{
  "a": "va\\"lue",
  "b": 2
}`;
    const p = jsonPathfinder(j);
    assert.equal(p('$.a'), 2);
    assert.equal(p('$.b'), 3);
});

test('mixed nested arrays and objects', () => {
    const j = `{
  "matrix": [
    [1, 2],
    {"x": 9}
  ],
  "deep": {
    "l1": {
      "l2": {
        "l3": "v"
      }
    },
    "sibling": true
  }
}`;
    const p = jsonPathfinder(j);
    assert.equal(p('$.matrix[1].x'), 4);
    assert.equal(p('$.deep.l1.l2.l3'), 9);
    assert.equal(p('$.deep.sibling'), 12);
});

test('unicode escape in a key, queried via dot-shorthand', () => {
    const j = `{
  "caf\\u00e9": 1,
  "next": 2
}`;
    const p = jsonPathfinder(j);
    assert.equal(p('$.café'), 2);
    assert.equal(p('$.next'), 3);
});

test('escaped backslash and quotes do not confuse the parser', () => {
    const j = `{
  "a": "back\\\\slash \\"and quote\\"",
  "b": {"c": [ "x", "y}z", "]w" ]},
  "d": 9
}`;
    const p = jsonPathfinder(j);
    assert.equal(p('$.b.c'), 3);
    assert.equal(p('$.d'), 4);
});

test('keys containing literal dots and brackets require bracket notation', () => {
    const j = `{
  "a.b": 1,
  "c[0]": 2,
  "z": 3
}`;
    const p = jsonPathfinder(j);
    assert.equal(p("$['a.b']"), 2);
    assert.equal(p("$['c[0]']"), 3);
    assert.equal(p('$.z'), 4);
});

test('malformed/truncated JSON does not throw', () => {
    const j = `{ "a": { "b": 1, `;
    assert.doesNotThrow(() => jsonPathfinder(j));
});

test('deeply nested arrays without objects do not corrupt state', () => {
    const j = `{"a": [[[[1,2],[3,4]],[[5,6]]]], "after": 7}`;
    const p = jsonPathfinder(j);
    assert.equal(p('$.after'), 1);
});

test('unknown path returns -1', () => {
    const p = jsonPathfinder('{"a": 1}');
    assert.equal(p('$.nope'), -1);
});

test('dot notation and bracket notation resolve to the same location', () => {
    const j = `{"a": {"b": [{"c": 1}]}}`;
    const p = jsonPathfinder(j);
    const dot = p('$.a.b[0].c');
    const bracket = p("$['a']['b'][0]['c']");
    const doubleQuoted = p('$["a"]["b"][0]["c"]');
    assert.equal(dot, 1);
    assert.equal(bracket, dot);
    assert.equal(doubleQuoted, dot);
});

test('a syntactically invalid query throws instead of returning -1', () => {
    const p = jsonPathfinder('{"a": 1}');
    assert.throws(() => p('a.b'), /must start with/); // missing leading '$'
    assert.throws(() => p('$.'), /expected a name/);
    assert.throws(() => p("$['a'"), /expected .\].|unterminated/);
    assert.throws(() => p('$.a$b'), /unexpected character/);
});
