import * as ts from "typescript";
import { tsquery } from "@phenomnomnominal/tsquery";

// const print = (...args: any[]) => console.log(...args.reduce((r, a) => r.concat(a, "\n"), []));

const uppercaseFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatSetState = (value: string) => "set" + uppercaseFirst(value);

export const main = async (ts: typeof import("typescript"), rawCode: string, fileName: string) => {

  const { SyntaxKind, factory, EmitHint, ScriptKind, ScriptTarget, createSourceFile, createPrinter, NewLineKind } = ts;

  const resultFile = createSourceFile("someFileName.ts", "", ScriptTarget.Latest, false, ScriptKind.TSX);
  const printer = createPrinter({ newLine: NewLineKind.LineFeed });


  const removeNode = (node: ts.Node) => {
    for (let key in node.parent) {
      if (!["statements", "declarations", "elements", "declarationList", "arguments",].includes(key) || !Array.isArray((node.parent as any)[key])) {
        continue;
      }
      const index = (node.parent as any)[key].indexOf(node);
      if (index !== -1) {
        (node.parent as any)[key].splice(index, 1);
        return;
      }
    }
  };

  const getText = (node: any): string => {
    switch (node.kind) {
      case SyntaxKind.Identifier:
        return node.escapedText.toString();
      case SyntaxKind.PropertyAccessExpression:
        return getText(node.expression) + "." + getText(node.name);
      default:
        return "";
    }
  };

  const printNode = (node: ts.Node) => printer.printNode(EmitHint.Unspecified, node, resultFile);

  interface UseEffectOptions {
    watchables?: ts.ArrayLiteralExpression;
    cleanup?: ts.Block;
  }

  const createUseEffectCall = (body: ts.Block, { watchables, cleanup }: UseEffectOptions) => {
    const block: ts.Block = body;

    if (cleanup) {
      (block.statements as any).push(factory.createReturnStatement(factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        factory.createToken(SyntaxKind.EqualsGreaterThanToken),
        factory.createBlock(
          [cleanup],
          false
        )
      )));
    }

    const params: (ts.ArrowFunction | ts.ArrayLiteralExpression)[] = [
      factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        factory.createToken(SyntaxKind.EqualsGreaterThanToken),
        block,
      ),
    ];
    if (watchables) {
      params.push(watchables);
    }
    return factory.createExpressionStatement(factory.createCallExpression(
      factory.createIdentifier("useEffect"),
      undefined,
      params
    ));
  };

  const clearAttribute = (target: ts.Node, attribute: "props" | "state") => {
    const thisAttributeExpressions = tsquery<ts.ThisExpression>(target, `PropertyAccessExpression > ThisKeyword ~ Identifier[name=${attribute}]`);
    thisAttributeExpressions.forEach((expression) => {
      let parent = expression.parent;
      while (parent.parent.kind === SyntaxKind.PropertyAccessExpression) {
        parent = parent.parent;
      }

      const newNode = (parse(printNode(parent).replace(`this.${attribute}.`, "")).statements[0] as ts.ExpressionStatement).expression;
      // print(printNode(parent.parent), SyntaxKind[parent.parent.kind], printNode(newNode), SyntaxKind[newNode.kind]);
      switch (parent.parent.kind) {
        case SyntaxKind.IfStatement:
          (parent.parent as any).expression = newNode;
          break;
        case SyntaxKind.CallExpression:
          (parent.parent as any).expression = newNode;
          break;
        case SyntaxKind.VariableDeclaration:
          (parent.parent as any).initializer = newNode;
          break;
        case SyntaxKind.BinaryExpression:
          const side = (parent.parent as any).left === parent ? "left" : "right";
          (parent.parent as any)[side] = newNode;
          break;

        default:
          break;
      }
    });
  };

  const clearPropsAttribute = (target: ts.Node) => clearAttribute(target, "props");
  const clearStateAttribute = (target: ts.Node) => clearAttribute(target, "state");

  const createFunctionalComponent = (component: ts.ClassDeclaration, bodyItems: (ts.ExpressionStatement | ts.VariableStatement)[], props: ts.ParameterDeclaration) => {

    const [renderMethodNode] = tsquery<ts.Identifier>(component, "MethodDeclaration > Identifier[name=render]");

    return factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(
          factory.createIdentifier(component.name!.getText()),
          undefined,
          undefined,
          factory.createArrowFunction(
            undefined,
            undefined,
            [props],
            undefined,
            factory.createToken(SyntaxKind.EqualsGreaterThanToken),

            factory.createBlock([
              ...bodyItems,
              ...(renderMethodNode.parent as ts.MethodDeclaration).body?.statements!,
            ],
              true
            )
          )
        )],
        ts.NodeFlags.Const
      )
    );
  };



  const parse = (code: string, scriptKind = ScriptKind.TSX) => createSourceFile(
    "any",
    code,
    ScriptTarget.Latest,
    undefined,
    scriptKind
  );

  let generatedCode = rawCode;


  // await fs.rm(generatedFile);

  // https://ts-ast-viewer.com/#code/JYWwDg9gTgLgBAJQKYEMDG8BmUIjgIilQ3wG4AoUSWOAbzgBVQkAbYAOyQBlgYkAaOAAUIAdyRQAzIIbik7HnzgBfONlwEA5gGcUYMuUrho8egggQYgrigCeEAK5W4AWQgATFCwDqUPWAlBAGEcbW0glghtATgQqPDI6IBJNAh2YLS+dhhffwkVNRw8fAA6AHoAZRhbFiQDI2p4NFCEqKQUtMKNfAABKi8UMpQwpBhtMuBU9nHm+IBaNESkOZAPLxLtADdNAyoTOnI4OAAhSxhcLiRMGCCACyRNnHTDk7PcBGBNW5v7x7T+F4MCBgS7XO4PJ4Ao5AsAfL4-CH-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
  // https://github.com/phenomnomnominal/tsquery
  const ast = tsquery.ast(rawCode, fileName, ScriptKind.TSX);

  const classDeclarationNodes = tsquery<ts.ClassDeclaration>(ast, "ClassDeclaration");

  const prepareComponent = (component: ts.ClassDeclaration) => {

    const typeNodes = tsquery<ts.TypeReferenceNode>(component, "HeritageClause TypeReference");

    const interfaces = tsquery<ts.InterfaceDeclaration>(ast, "InterfaceDeclaration");

    const propsNodes = tsquery<ts.Identifier>(component, "PropertyAccessExpression > ThisKeyword ~ Identifier[name=props]", { visitAllChildren: true });

    const stateNodes = tsquery<ts.Identifier>(component, "PropertyAccessExpression > ThisKeyword ~ Identifier[name=state]", { visitAllChildren: true });

    const mergedPropsNodes = propsNodes.map(node => ((node.parent.parent as ts.VariableDeclaration).name as ts.ObjectBindingPattern).elements || [factory.createBindingElement(
      undefined,
      undefined,
      factory.createIdentifier((node.parent.parent as ts.VariableDeclaration).name.getText()),
      undefined
    )]).flat();

    const mergedStateNodes = stateNodes.filter(node => node.parent.parent.kind === SyntaxKind.VariableDeclaration).map(node => ((node.parent.parent as ts.VariableDeclaration).name as ts.ObjectBindingPattern).elements || [factory.createBindingElement(
      undefined,
      undefined,
      factory.createIdentifier((node.parent.parent as ts.VariableDeclaration).name.getText()),
      undefined
    )]).flat();

    const [componentDidMountNode] = tsquery<ts.Identifier>(component, "MethodDeclaration > Identifier[name=componentDidMount]", { visitAllChildren: true });
    const effects: ts.ExpressionStatement[] = [];

    if (componentDidMountNode) {
      const options: UseEffectOptions = {
        watchables: factory.createArrayLiteralExpression(
          [],
          false
        )
      };

      const [componentWillUnmountNode] = tsquery<ts.Identifier>(component, "MethodDeclaration > Identifier[name=componentWillUnmount]");

      if (componentWillUnmountNode) {
        options.cleanup = (componentWillUnmountNode.parent as ts.MethodDeclaration).body!;
      }

      const useEffectCall = createUseEffectCall((componentDidMountNode.parent as ts.MethodDeclaration).body!, options);

      effects.push(useEffectCall);
    }

    const [componentDidUpdateNode] = tsquery<ts.Identifier>(component, "MethodDeclaration > Identifier[name=componentDidUpdate]");
    if (componentDidUpdateNode) {

      const componentDidUpdateMethod = componentDidUpdateNode.parent as ts.MethodDeclaration;
      const conditionExpressionNodes = tsquery<ts.IfStatement>(componentDidUpdateMethod, "IfStatement");


      type CollectableExpressions = ts.Identifier | ts.PropertyAccessExpression | ts.BinaryExpression;

      const collectProperties = (node: CollectableExpressions): string[] => {
        if (node.kind === SyntaxKind.BinaryExpression) {
          return [...collectProperties(node.left as CollectableExpressions), ...collectProperties(node.right as CollectableExpressions)];
        } else if (node.kind === SyntaxKind.Identifier) {
          return [getText(node)];
        } else if (node.kind === SyntaxKind.PropertyAccessExpression) {
          return [getText(node)];
        }
        console.log("not handled:", SyntaxKind[(node as CollectableExpressions).kind]);

        return [];
      };

      conditionExpressionNodes.forEach(ifStatement => {

        clearPropsAttribute(ifStatement);

        const watchableProperties = collectProperties(ifStatement.expression as CollectableExpressions).filter(item => !componentDidUpdateMethod.parameters.some(parameter => item.startsWith(parameter.name.getText()))).map((item) => {
          return factory.createIdentifier(item);
        });

        const useEffectCall = createUseEffectCall(ifStatement.thenStatement as ts.Block, {
          watchables: factory.createArrayLiteralExpression(
            watchableProperties,
            false
          )
        });

        effects.push(useEffectCall);
      });
    }

    const propertyDeclarationNodes = tsquery<ts.PropertyDeclaration>(component, "PropertyDeclaration");
    const functions: ts.VariableStatement[] = [];
    const refs: ts.VariableStatement[] = [];

    propertyDeclarationNodes.filter(node => node.type ? (typeNodes[1] ? (node.type as ts.TypeReferenceNode).typeName.getText() !== typeNodes[1].typeName.getText() : true) : true).forEach(node => {
      if (node.initializer?.kind === SyntaxKind.ArrowFunction) {
        tsquery<ts.Identifier>(node, "PropertyAccessExpression > ThisKeyword ~ Identifier[name=props]", { visitAllChildren: true }).forEach(identifier => removeNode(identifier.parent.parent.parent));

        const variableStatement = factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
              factory.createIdentifier(node.name.getText()),
              undefined,
              undefined,
              factory.createCallExpression(
                factory.createIdentifier("useCallback"),
                undefined,
                [
                  factory.createArrowFunction(
                    undefined,
                    undefined,
                    (node.initializer as ts.ArrowFunction).parameters,
                    undefined,
                    factory.createToken(SyntaxKind.EqualsGreaterThanToken),
                    (node.initializer as ts.ArrowFunction).body!
                  ),
                  factory.createArrayLiteralExpression(
                    [],
                    false
                  )
                ]
              )
            )],
            ts.NodeFlags.Const
          )
        );
        functions.push(variableStatement);
      } else if (node.type?.getText().startsWith("React.RefObject")) {
        refs.push(factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
              factory.createIdentifier(node.name.getText()),
              undefined,
              undefined,
              factory.createCallExpression(
                factory.createIdentifier("useRef"),
                (node.type as ts.TypeReferenceNode)?.typeArguments,
                []
              )
            )],
            ts.NodeFlags.Const
          )
        ));
      }
    });

    const stateInterface = interfaces.find(node => node.name.getText() === typeNodes[1].typeName.getText());

    const [stateDeclaration] = tsquery(component, "PropertyDeclaration > Identifier[name=state]");
    let states: ts.VariableStatement[] = [];

    if (stateDeclaration) {
      const propertyDeclaration = stateDeclaration.parent as ts.PropertyDeclaration;
      states = (propertyDeclaration.initializer as ts.ObjectLiteralExpression)?.properties.map((node) => {
        const member = (stateInterface?.members.find(member => member.name?.getText() === node.name?.getText()) as ts.PropertySignature);

        return factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
              factory.createArrayBindingPattern([
                factory.createBindingElement(
                  undefined,
                  undefined,
                  factory.createIdentifier(node.name!.getText()),
                  undefined
                ),
                factory.createBindingElement(
                  undefined,
                  undefined,
                  factory.createIdentifier(formatSetState(node.name!.getText())),
                  undefined
                )
              ]),
              undefined,
              undefined,
              factory.createCallExpression(
                factory.createIdentifier("useState"),
                member?.questionToken ? [
                  factory.createUnionTypeNode([
                    member?.type!,
                    factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword)
                  ])
                ] :
                  undefined,
                [(node as ts.PropertyAssignment).initializer!]
              )
            )],
            ts.NodeFlags.Const
          )
        );

      });

      const setStateIdentifiers = tsquery<ts.Identifier>(component, "CallExpression > PropertyAccessExpression > ThisKeyword ~ Identifier[name=setState]");
      setStateIdentifiers.forEach(identifier => {
        const callExpression = (identifier.parent.parent as ts.CallExpression);
        const setters = (callExpression.arguments[0] as ts.ObjectLiteralExpression).properties.map(property => factory.createExpressionStatement(factory.createCallExpression(
          factory.createIdentifier(formatSetState(property.name!.getText())),
          undefined,
          (property as ts.PropertyAssignment).initializer ? [(property as ts.PropertyAssignment).initializer] : undefined,
        )));
        (callExpression as any).parent.parent.statements.splice((callExpression.parent.parent as ts.Block).statements.indexOf(callExpression.parent as ts.Block), 1, ...setters);
      });

      mergedStateNodes.forEach(node => {
        if ((propertyDeclaration.initializer as ts.ObjectLiteralExpression)?.properties.find(property => node.name.getText() === property.name?.getText())) {
          return;
        }

        const member = (stateInterface?.members.find(member => member.name?.getText() === node.name?.getText()) as ts.PropertySignature);

        states.push(factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
              factory.createArrayBindingPattern([
                factory.createBindingElement(
                  undefined,
                  undefined,
                  factory.createIdentifier(node.name!.getText()),
                  undefined
                ),
                factory.createBindingElement(
                  undefined,
                  undefined,
                  factory.createIdentifier(formatSetState(node.name!.getText())),
                  undefined
                )
              ]),
              undefined,
              undefined,
              factory.createCallExpression(
                factory.createIdentifier("useState"),
                member?.questionToken ? [
                  factory.createUnionTypeNode([
                    member?.type!,
                    factory.createKeywordTypeNode(SyntaxKind.UndefinedKeyword)
                  ])
                ] :
                  undefined,
                undefined
              )
            )],
            ts.NodeFlags.Const
          )
        ));
      });
    }

    const methodDeclarationNodes = tsquery<ts.MethodDeclaration>(component, "MethodDeclaration");
    methodDeclarationNodes.filter(node => !["render", "componentDidUpdate", "componentDidMount", "componentWillUnmount"].includes(node.name.getText())).forEach(node => {

      tsquery<ts.Identifier>(node, "PropertyAccessExpression > ThisKeyword ~ Identifier[name=props]", { visitAllChildren: true }).forEach(identifier => removeNode(identifier.parent.parent.parent));

      const variableStatement = factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(
            factory.createIdentifier(node.name.getText()),
            undefined,
            undefined,
            factory.createCallExpression(
              factory.createIdentifier("useCallback"),
              undefined,
              [
                factory.createArrowFunction(
                  undefined,
                  undefined,
                  node.parameters,
                  undefined,
                  factory.createToken(SyntaxKind.EqualsGreaterThanToken),
                  node.body!
                ),
                factory.createArrayLiteralExpression(
                  [],
                  false
                )
              ]
            )
          )],
          ts.NodeFlags.Const
        )
      );
      functions.push(variableStatement);
    });

    tsquery<ts.Identifier>(component, "PropertyAccessExpression > ThisKeyword ~ Identifier[name=props]", { visitAllChildren: true }).forEach(identifier => removeNode(identifier.parent.parent.parent.parent));
    tsquery<ts.Identifier>(component, "PropertyAccessExpression > ThisKeyword ~ Identifier[name=state]", { visitAllChildren: true }).forEach(identifier => removeNode(identifier.parent.parent.parent.parent));

    clearPropsAttribute(component);


    const thisExpressions = tsquery<ts.ThisExpression>(component, "ThisKeyword");
    thisExpressions.forEach((expression) => {
      (expression.parent.parent as any).expression = (expression.parent as any).name;
    });

    const functionProps: ts.BindingElement[] = [];
    const functionPropsNames: Set<string> = new Set();
    mergedPropsNodes.forEach(node => {
      const name = (node.name as ts.Identifier).escapedText.toString().trim();

      if (functionPropsNames.has(name)) {
        return;
      }

      functionPropsNames.add(name);

      functionProps.push(node);

    });

    const functionalComponent = createFunctionalComponent(component, [...states, ...refs, ...effects, ...functions], factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      factory.createObjectBindingPattern(functionProps),
      undefined,
      typeNodes[0] || undefined,
      undefined
    ));

    if (stateInterface) {
      removeNode(stateInterface);
    }

    return { functionalComponent, effects, states, refs, functions, classComponent: component };
  };
  const swappingNodes = classDeclarationNodes.filter(node => {
    if (!node.heritageClauses) {
      return false;
    }
    const identifiers = tsquery(node, "Identifier[name=React] ~ Identifier[name=Component]", { visitAllChildren: true });
    return identifiers;
  }).map((node) => prepareComponent(node));


  const namedImports = [];
  if (swappingNodes.some(({ states }) => states.length)) {
    namedImports.push(factory.createImportSpecifier(
      false,
      undefined,
      factory.createIdentifier("useState")
    ));
  }

  if (swappingNodes.some(({ effects }) => effects.length)) {
    namedImports.push(factory.createImportSpecifier(
      false,
      undefined,
      factory.createIdentifier("useEffect")
    ));
  }

  if (swappingNodes.some(({ functions }) => functions.length)) {
    namedImports.push(factory.createImportSpecifier(
      false,
      undefined,
      factory.createIdentifier("useCallback")
    ));
  }

  if (swappingNodes.some(({ refs }) => refs.length)) {
    namedImports.push(factory.createImportSpecifier(
      false,
      undefined,
      factory.createIdentifier("useRef")
    ));
  }

  const reactImports = factory.createImportDeclaration(
    undefined,
    undefined,
    factory.createImportClause(
      false,
      factory.createIdentifier("React"),
      namedImports.length ? factory.createNamedImports(namedImports) : undefined
    ),
    factory.createStringLiteral("react"),
    undefined
  );

  const [reactImportLiteral] = tsquery<ts.StringLiteral>(ast, "ImportDeclaration StringLiteral[text=react]");
  (reactImportLiteral.parent.parent as any).statements.splice((reactImportLiteral.parent.parent as ts.SourceFile).statements.indexOf((reactImportLiteral.parent as ts.ImportDeclaration)), 1, reactImports);

  let updatedSourceFile = ast;

  swappingNodes.forEach(({ classComponent, functionalComponent }) => {
    updatedSourceFile = factory.updateSourceFile(ast, ast.statements.map(node => node === classComponent ? functionalComponent : node));
  });

  generatedCode = printNode(updatedSourceFile);
  // clear unused, like state interfaces

  return generatedCode;
};
