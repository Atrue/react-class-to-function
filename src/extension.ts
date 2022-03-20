import * as ts from "typescript";
import * as vscode from "vscode";
import { main } from "./main";

export async function activate (context: vscode.ExtensionContext) {

  const disposable = vscode.commands.registerCommand("react-class-to-functional.transform", async () => {
    if (!ts) {
      vscode.window.showErrorMessage("Could not find a TypeScript package in the workspace, aborting.");
      return;
    }

    const rawCode = vscode.window.activeTextEditor?.document.getText();

    if (rawCode) {

      const out = await main(ts, rawCode, vscode.window.activeTextEditor?.document.fileName!);
      vscode.window.activeTextEditor?.edit(editBuilder => {
        editBuilder.replace(
          new vscode.Range(new vscode.Position(0, 0), vscode.window.activeTextEditor?.document.positionAt(rawCode.length)!),
          out
        );
      });
      vscode.window.showInformationMessage("Done!");
    } else {
      vscode.window.showInformationMessage("Please execute the command in an open document.");
    }
  });
  context.subscriptions.push(disposable);
}

export function deactivate () { }
