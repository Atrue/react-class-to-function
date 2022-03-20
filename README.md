# react-class-to-functional

This extension provides a command to trigger a React codemod that turns class components into functional components.

Warning: the current state is a minimalistic program that only supports TSX.

## Usage

In VS Code, open a module containing class components, then open the Command Palette and execute `react-class-to-functional.transform`.
This will turn all classes into functions without saving the changes.

## How It Works

It looks for classes extending `React.Component` (literally) then applies the following modifications:

- the `render` method becomes the component itself;
- `componentDidMount`, `componentDidUpdate` and `componentWillUnmount` are turned into `useEffect` calls;
- `React.createRef` calls are turned into `useRef` calls;
- state is split into multiple `useState` calls;
- props are retrieved and declared in the function arguments;
- methods are turned into internal functions;
- `this` keywords are removed;
- state interface is removed;
- React import is adapted.
