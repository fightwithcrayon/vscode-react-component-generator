'use strict';
import { ExtensionContext, workspace, window, commands } from 'vscode';
import { paramCase } from 'change-case';
import { Observable } from 'rxjs';

import { FileHelper, logger } from './helpers';

export function activate(context: ExtensionContext) {

    const createComponent = (uri, suffix: string = '') => {
        let enterComponentNameDialog$ = Observable.from(
            window.showInputBox(
                {prompt: 'Please enter the component name'}
            ));

        enterComponentNameDialog$
            .concatMap( val => {
                if (val.length === 0) {
                    logger('error', 'Component name can not be empty!');
                    throw new Error('Component name can not be empty!');
                }
                let componentName = paramCase(val);
                let componentDir = FileHelper.createComponentDir(uri, componentName);

                return Observable.forkJoin(
                    FileHelper.createComponent(componentDir, componentName, suffix),
                    FileHelper.createCSS(componentDir, componentName),
                );
            })
            .concatMap(result => Observable.from(result))
            .filter(path => path.length > 0)
            .first()
            .concatMap(filename => Observable.from(workspace.openTextDocument(filename)))
            .concatMap(textDocument => {
                if (!textDocument) {
                    logger('error', 'Could not open file!');
                    throw new Error('Could not open file!');
                };
                return Observable.from(window.showTextDocument(textDocument))
            })
            .do(editor => {
                if (!editor) {
                    logger('error', 'Could not open file!');
                    throw new Error('Could not open file!')
                };
            })
            .subscribe(
                (c) => logger('success', 'React component successfully created!'),
                err => logger('error', err.message)
            );
    };

    const componentArray = [
        { type: "container", commandId: 'extension.genReactContainerComponentFiles' },
        { type: "stateless", commandId: 'extension.genReactStatelessComponentFiles' },
        { type: "reduxContainer", commandId: 'extension.genReactReduxContainerComponentFiles' },
        { type: "reduxStateless", commandId: 'extension.genReactReduxStatelessComponentFiles' },
    ];

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    componentArray.forEach(c => {
        const suffix = `-${c.type}`;
        const disposable = commands.registerCommand(
            c.commandId, (uri) => createComponent(uri, suffix));

        // Add to a list of disposables which are disposed when this extension is deactivated.
        context.subscriptions.push(disposable);
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
    // code whe
}
