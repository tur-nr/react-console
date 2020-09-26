# React Console

A reconciler for rendering components to the browser's console, because why not?

```jsx
import React from "react";
import console from "react-console";

const name = "Chris";
const color = "#21a0a0";

console.log(
  <div>
    Hello,{" "}
    <strong>
      <em style={{ color }}>{name}</em>
    </strong>
    !
  </div>
);
```

![](support/screenshot-1.png)

## Usage

### Install

Add `react-console` as a dependency to your project.

```
npm install react-console
```

### Console

`react-console` exports a console context with an additional `render` method.
This can be a used a replacement to the global `console` object, however it
allows rendering of React components.

#### Methods

The following methods will render a component if the ***first and only***
argument is a React element.

* `.log`
* `.info`
* `.debug`
* `.warn`
* `.error`
* `.group`
* `.groupCollapsed`
* `.trace`

#### Render

The methods above are just sugar for the `render` method.

```jsx
import React from 'react';
import console from "react-console";

console.render(<span>Ouch</span>, window.console, "error");
// same as
console.error(<span>Ouch</span>);
```

### Host Components

`react-console` only supports inline text elements.

* `<a>`, `<abbr>`
* `<b>`, `<bdi>`, `<bdo>`, `<br>`
* `<cite>`, `<code>`
* `<data>`, `<dfn>`
* `<em>`
* `<i>`
* `<kbd>`
* `<mark>`
* `<q>`
* `<rb>`, `<rp>`, `<rt>`, `<rtc>`, `<ruby>`
* `<s>`, `<samp>`, `<small>`, `<span>`, `<strong>`, `<sub>`, `<sup>`
* `<time>`
* `<u>`
* `<var>`
* `<wbr>`

#### Anchors

Anchor elements will have their hrefs appended.

```js
import React from "react";
import console from "react-console";

console.log(<a href="https://google.com">Google</a>);
```

![](support/screenshot-2.png)


### User Components

You can render any user defined component as long as they result to host
components that are supported.

```jsx
import React from "react";
import console from "react-console";

function Diff(props) {
  return (
    <>
      <del style={{ color: "red" }}>{props.previous}</del>
      <span> → </span>
      <ins style={{ color: "green" }}>{props.next}</ins>
    </>
  );
}

console.log(<Diff previous="foo" next="bar" />);
```

![](support/screenshot-3.png)
