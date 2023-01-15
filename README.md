# @southball/remark-mermaid

A [remark](https://www.npmjs.com/package/remark) plugin to convert code blocks
with `mermaid` language set to SVGs.

All generated SVGs are placed in a `div` with `remark-mermaid` class set. In
addition, the class `remark-mermaid-${theme}` is also set.

## Installation

```sh
npm install @southball/remark-mermaid @mermaid-js/mermaid-cli
```

or, if using `yarn`,

```sh
yarn add @southball/remark-mermaid @mermaid-js/mermaid-cli
```

## Configuration

By default, only the SVG for `default` theme is generated and inlined.

To set the themes, pass the option like follows:

```json
{
  "themes": ["default", "dark"]
}
```

The diagram for each theme will then be generated in `div`s with class
`remark-mermaid-default` and `remark-mermaid-dark` respectively. They can then
be shown or hidden with custom CSS or JS.
