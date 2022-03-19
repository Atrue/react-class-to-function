import * as ts from "typescript";
import * as vscode from "vscode";
import { main } from "./main";

const useLocalPackage = async (name: string, folders: string[]) => (await Promise.all(folders.map(folder => import(folder + `/node_modules/${name}`)))).find(mod => mod);

export async function activate (context: vscode.ExtensionContext) {
  const folders = vscode.workspace.workspaceFolders?.map(folder => folder.uri.path);
  // let ts: typeof import("typescript") | undefined;
  let prettier: typeof import("prettier") | undefined;
  if (folders) {
    // try {
    //   ts = await useLocalPackage("typescript", folders);
    // } catch (e) {
    //   vscode.window.showWarningMessage("You need TypeScript installed in your current workspace to use the react-class-to-functional extension properly.");
    // }

    try {
      // prettier = await useLocalPackage("prettier", folders);
    } catch (e) {
      vscode.window.showInformationMessage("Could not find a Prettier package in the workspace, format step will be skipped.");
    }
  }

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
          prettier ? prettier.format(out, { parser: "typescript", tabWidth: 2 }) : out
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
