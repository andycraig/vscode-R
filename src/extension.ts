"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, ExtensionContext, languages, Position, Range, window, workspace} from "vscode";
import { createGitignore } from "./rGitignore";
import { createRTerm, deleteTerminal, rTerm } from "./rTerminal";
import { checkForSpecialCharacters, checkIfFileExists, config, delay } from "./util";

import fs = require("fs-extra");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    function runSource(echo: boolean)  {
        const wad = window.activeTextEditor.document;
        wad.save();
        let rPath = ToRStringLiteral(wad.fileName, '"');
        let encodingParam = config.get("source.encoding") as string;
        if (encodingParam) {
            encodingParam = `encoding = "${encodingParam}"`;
            rPath = [rPath, encodingParam].join(", ");
        }
        if (echo) {
            rPath = [rPath, "echo = TRUE"].join(", ");
        }
        if (!rTerm) {
            const success = createRTerm(true);
            if (!success) { return; }
        }
        rTerm.sendText(`source(${rPath})`);
        setFocus();
    }

    function bracketsMatch(a: string, b: string): boolean {
        switch (a) {
            case "(": {
                return (b == ")");
                break;
            }
            case "[": {
                return (b == "]");
                break;
            }
            case "{": {
                return (b == "}");
                break;
            }
            case ")": {
                return (b == "(");
                break;
            }
            case "]": {
                return (b == "[");
                break;
            }
            case "}": {
                return (b == "{");
                break;
            }
            default: {
                return (false);
            }
        }
    }

    function endsInFoldable(text: string): boolean {
        //TODO Should quotes "' be removed?
        //TODO Should possibly check for and ignore comments itself.
        return (0 <= text.search(/.*?\+|!|"\$|\^|&|\*|-|=|:|\'|~|\||\/|\?|%\S*%$/));
    }

    function checkLineForward(text: string, unmatchedOpeningBrackets: string[], unmatchedClosingBrackets: string[], isCursorLine: boolean, expandToThisLine: boolean) {
        let inQuote = false;
        let quoteType = "";
        let flagAbort = false;
        let flagFinish = false;
        let flagComment = false;
        let closeBraceOnCursorLine = false;
        let expandToNextLine = false;
        let cs = text.split('');
        let c = '';
        let iChar = -1;
        while ((c = cs.shift()) && !flagFinish && !flagAbort && !flagComment) {
            iChar++;
            if (!inQuote && (c == "#")) {
                flagComment = true;
            }
            let cRegexp = new RegExp('\\' + c);
            if (-1 < "\"\'\`".search(cRegexp)) {
                if (inQuote) {
                    if (c == quoteType) {
                        inQuote = false;
                    }
                } else {
                    inQuote = true;
                    quoteType = c;
                }
            } else if (!inQuote) {
                if (-1 < "\(\[\{".search(cRegexp)) {
                    unmatchedOpeningBrackets.push(c);    
                } else if (-1 < "\)\]\}".search(cRegexp)) {
                    if (0 < unmatchedOpeningBrackets.length) {
                        if (!bracketsMatch(c, unmatchedOpeningBrackets.pop())) {
                            flagAbort = true;
                        }
                    } else {
                        unmatchedClosingBrackets.push(c);
                        if (-1 < "\)\]".search(cRegexp)) {
                            expandToThisLine = true;
                        }
                    }
                }
            }
        }
        if (inQuote) {
            // Line either starts or ends a multi-line string, but can't be sure which
            // without checking from start of document, so abort.
            flagAbort = true;
        }
        if ((0 == unmatchedOpeningBrackets.length) && (unmatchedClosingBrackets[unmatchedClosingBrackets.length - 1] == "}")) {
            unmatchedClosingBrackets.pop();
            if (isCursorLine) {
                closeBraceOnCursorLine = true;    
            } else {
                flagFinish = true; 
            }
        }
        if (!flagFinish && expandToThisLine && endsInFoldable(text.slice(0, iChar))) {
            expandToNextLine = true;
        }
        return { flagFinish: flagFinish, flagAbort: flagAbort, 
            expandToThisLine: expandToThisLine, expandToNextLine: expandToNextLine, 
            unmatchedOpeningBrackets: unmatchedOpeningBrackets, unmatchedClosingBrackets: unmatchedClosingBrackets, 
            closeBraceOnCursorLine: closeBraceOnCursorLine };
    }
/*
console.log(checkLineForward("a)e", [], [], false));
console.log(checkLineForward("a(e", [], [], false));
console.log(checkLineForward("a\"e", [], [], false));
console.log(checkLineForward("a)e", ["("], [], false));
console.log(checkLineForward("a}e", [], [], false));
console.log(checkLineForward("a)}e", [], [], false));
console.log(checkLineForward("ae", [], [], false));
console.log(checkLineForward("ae", [], [], false));
console.log(checkLineForward("a()e", [], [], false));
console.log(checkLineForward("a)(e", [], [], false));
console.log(checkLineForward("a[)e", [], [], false));
console.log(checkLineForward("a}+", [], [], false));
console.log(checkLineForward("a}+", [], [], true));
console.log(checkLineForward("a)}b", ["("], [], true)); // What is correct behaviour here?
*/

    function checkLineBackward(text: string, unmatchedOpeningBrackets: string[], unmatchedClosingBrackets: string[]) {
        let inQuote = false;
        let quoteType = "";
        let flagAbort = false;
        let flagFinish = false;
        let flagComment = false;
        let expandToThisLine = false;
        let cs = text.split('');
        let c = '';
        let iChar = -1;
        while ((c = cs.shift()) && !flagFinish && !flagAbort && !flagComment) {
            iChar++;
            if (!inQuote && (c == "#")) {
                flagComment = true;
            }
            let cRegexp = new RegExp('\\' + c);
            if (-1 < "\"\'\`".search(cRegexp)) {
                if (inQuote) {
                    if (c == quoteType) {
                        inQuote = false;
                    }
                } else {
                    inQuote = true;
                    quoteType = c;
                }
            } else if (!inQuote) {
                if (-1 < "\(\[\{".search(cRegexp)) {
                     if (0 < unmatchedClosingBrackets.length) {
                        if (!bracketsMatch(c, unmatchedClosingBrackets.shift())) {
                            flagAbort = true;
                        }
                    }
                } else if (-1 < "\)\]\}".search(cRegexp)) {
                    unmatchedClosingBrackets.unshift(c);
                }
            }
        }
        if (inQuote) {
            // Line either starts or ends a multi-line string, but can't be sure which
            // without checking from start of document, so abort.
            flagAbort = true;
        }
        if (0 == unmatchedClosingBrackets.length) {
            flagFinish = true; 
        }
        //TODO Check for and remove initial opening brackets on the same line as last matched bracket.
        //TODO In this case, RStudio basically fails.
        return { flagFinish: flagFinish, flagAbort: flagAbort, 
            unmatchedOpeningBrackets: unmatchedOpeningBrackets, unmatchedClosingBrackets: unmatchedClosingBrackets };
    }

    function getSelection(): any {
        console.log("hello from getSelection");
        const selection = { linesDownToMoveCursor: 0, selectedTextArray: [] };
        const { start, end } = window.activeTextEditor.selection;
        const currentDocument = window.activeTextEditor.document;
        const range = new Range(start, end);

        let selectedLine = currentDocument.getText(range);
        if (!selectedLine) {
            console.log("Nothing selected");
            // No characters selected; expand
            //TODO Continue } %>% only if it is the first line.
            let toLineIndex = start.line - 1;
            let checkingLineIndex = start.line - 1;
            let checkStatus = { unmatchedOpeningBrackets: [], unmatchedClosingBrackets: [], flagFinish: false, flagAbort: false,
                expandToThisLine: true, expandToNextLine: false };
            // Forwards
            while (!checkStatus.flagFinish && !checkStatus.flagAbort) {
                checkingLineIndex++;
                //TODO Check not EOF. If EOF, flagFinish effectively true.
                //TODO Use? window.activeTextEditor.document.lineAt(newStart.line) // returns a TextLine
                //TODO Use? currentDocument.getText(new Range(start, end)) // returns a string
                //TODO Use? currentDocument.lineAt(end.line + lineIndex).text;
                let text = currentDocument.lineAt(checkingLineIndex).text;
                checkStatus = checkLineForward(text, checkStatus.unmatchedOpeningBrackets, checkStatus.unmatchedClosingBrackets, 
                    checkingLineIndex === 0, checkStatus.expandToThisLine);
                console.log(text);
                console.log(checkStatus);
                if (checkStatus.expandToNextLine) {
                    //TODO Deal with case in which this goes beyond EOF.
                    toLineIndex = checkingLineIndex + 1;
                } else if (checkStatus.expandToThisLine) {
                    toLineIndex = checkingLineIndex;
                }
            }
                //TODO Handle if there was a } on the cursor line, probably by adding a } back in to unmatchedClosingBrackets.
        //         // Backwards
        //         checkStatus.flagFinish = false;
        //         let fromLineIndex = start.line;
        //         while (!checkStatus.flagFinish && !checkStatus.flagAbort) {
        //             fromLineIndex--;
        //             let text = currentDocument.lineAt(fromLineIndex).text;
        //             checkStatus = checkLineForward(text, checkStatus.unmatchedOpeningBrackets, checkStatus.unmatchedClosingBrackets, checkingLineIndex == 0);
        //         }
        //         while (!checkStatus.flagAbort && !endsInFoldable(currentDocument.lineAt(fromLineIndex - 1).text)) {
        //             fromLineIndex--;
        //         }
        //         if (checkStatus.flagAbort) {
        //             selectedLine = currentDocument.getText(new Range(start, end));
        //             selection.linesDownToMoveCursor = 1;
        //         } else {
        //             selection.selectedTextArray = currentDocument.getText(new Range(fromLineIndex, toLineIndex));
        //             selection.linesDownToMoveCursor = toLineIndex - start.line;
        //         }
        //         //TODO return something?
        //     } else { // Multiple characters on line selected
        //         selection.linesDownToMoveCursor = 0;
        //         selection.selectedTextArray = [currentDocument.getText(new Range(start, end))];
        //         return selection;
        //TODO When does this happen? Check that it is consistent with what has been added.
        //TODO Remove original code below.
            // const newStart = new Position(start.line, 0);
            // commands.executeCommand("cursorMove", { to: "wrappedLineEnd", by: "line", value: 1 });
            // const charactersOnLine = window.activeTextEditor.document.lineAt(newStart.line).text.length;
            // const newEnd = new Position(start.line, charactersOnLine);
            // selectedLine = currentDocument.getText(new Range(newStart, newEnd));
        } else {
            console.log("something was selected");
            selection.selectedTextArray = currentDocument.getText(new Range(start, end));
            //TODO In this case, DON'T expand selection.
        }
        return selection;
    }

    async function runSelection() {
        const selection = getSelection();

        // if (!rTerm) {
        //     const success = createRTerm(true);
        //     if (!success) { return; }
        //     await delay (200); // Let RTerm warm up
        // }
        // if (selection.linesDownToMoveCursor > 0) {
        //     commands.executeCommand("cursorMove", { to: "down", value: selection.linesDownToMoveCursor });
        //     commands.executeCommand("cursorMove", { to: "wrappedLineEnd" });
        // }
        // for (const line of selection.selectedTextArray) {
        //     if (checkForComment(line)) { continue; }
        //     await delay(8); // Increase delay if RTerm can't handle speed.
        //     rTerm.sendText(line);
        // }
        // setFocus();
    }

    function setFocus() {
        const focus = config.get("source.focus") as string;
        if (focus === "terminal") {
            rTerm.show();
        }
    }

    function checkForComment(line: string): boolean {
        let index = 0;
        while (index < line.length) {
            if (!(line[index] === " ")) { break; }
            index++;
        }
        return line[index] === "#";
    }

    function removeCommentedLines(selection: string[]): string[] {
        const selectionWithoutComments = [];
        selection.forEach((line) => {
            if (!checkForComment(line)) { selectionWithoutComments.push(line); }
        });
        return selectionWithoutComments;
    }

    function makeTmpDir() {
        let tmpDir = workspace.rootPath;
        if (process.platform === "win32") {
            tmpDir = tmpDir.replace(/\\/g, "/");
            tmpDir += "/tmp";
        } else {
            tmpDir += "/.tmp";
        }
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }
        return tmpDir;
    }

    async function previewEnvironment() {
        if (!rTerm) {
            const success = createRTerm(true);
            if (!success) { return; }
        }
        const tmpDir = makeTmpDir();
        const pathToTmpCsv = tmpDir + "/environment.csv";
        const envName = "name=ls()";
        const envClass = "class=sapply(ls(), function(x) {class(get(x))})";
        const envOut = "out=sapply(ls(), function(x) {capture.output(str(get(x)), silent = T)[1]})";
        const rWriteCsvCommand = "write.csv(data.frame("
                                 + envName + ","
                                 + envClass + ","
                                 + envOut + "), '"
                                 + pathToTmpCsv + "', row.names=FALSE, quote = TRUE)";
        rTerm.sendText(rWriteCsvCommand);
        await openTmpCSV(pathToTmpCsv, tmpDir);
    }

    async function previewDataframe() {
        if (!rTerm) {
            const success = createRTerm(true);
            if (!success) { return; }
        }

        const dataframeName = getSelection();

        if (!checkForSpecialCharacters(dataframeName)) {
            window.showInformationMessage("This does not appear to be a dataframe.");
            return false;
        }

        const tmpDir = makeTmpDir();

        // Create R write CSV command.  Turn off row names and quotes, they mess with Excel Viewer.
        const pathToTmpCsv = tmpDir + "/" + dataframeName + ".csv";
        const rWriteCsvCommand = "write.csv(" + dataframeName + ", '"
                                + pathToTmpCsv
                                + "', row.names = FALSE, quote = FALSE)";
        rTerm.sendText(rWriteCsvCommand);
        await openTmpCSV(pathToTmpCsv, tmpDir);
    }

    async function openTmpCSV(pathToTmpCsv: string, tmpDir: string) {
        await delay(350); // Needed since file size has not yet changed

        if (!checkIfFileExists(pathToTmpCsv)) {
            window.showErrorMessage("Dataframe failed to display.");
            fs.removeSync(tmpDir);
            return false;
        }

        // Async poll for R to complete writing CSV.
        const success = await waitForFileToFinish(pathToTmpCsv);
        if (!success) {
            window.showWarningMessage("Visual Studio Code currently limits opening files to 20 MB.");
            fs.removeSync(tmpDir);
            return false;
        }

        if (process.platform === "win32") {
            const winattr = require("winattr");
            winattr.setSync(tmpDir, {hidden: true});
        }

        // Open CSV in Excel Viewer and clean up.
        workspace.openTextDocument(pathToTmpCsv).then(async (file) => {
            await commands.executeCommand("csv.preview", file.uri);
            fs.removeSync(tmpDir);
                });
    }

    async function waitForFileToFinish(filePath) {
        const fileBusy = true;
        let currentSize = 0;
        let previousSize = 1;

        while (fileBusy) {
            const stats = fs.statSync(filePath);
            currentSize = stats.size;

            // UPDATE: We are now limited to 20 mb by MODEL_TOKENIZATION_LIMIT
            // https://github.com/Microsoft/vscode/blob/master/src/vs/editor/common/model/textModel.ts#L34
            if (currentSize > 2 * 10000000) { // 20 MB
                return false;
            }

            if (currentSize === previousSize) {
                return true;
            } else {
                previousSize = currentSize;
            }
            await delay(50);
        }
    }

    async function loadAllPkg() {
        if (!rTerm) {
            const success = createRTerm(true);
            if (!success) { return; }
        }

        const rLoadAllCommand = "devtools::load_all('.')";
        rTerm.sendText(rLoadAllCommand);
    }

    async function testPkg() {
        if (!rTerm) {
            const success = createRTerm(true);
            if (!success) { return; }
        }

        const rTestCommand = "devtools::test()";
        rTerm.sendText(rTestCommand);
    }

    async function installPkg() {
        if (!rTerm) {
            const success = createRTerm(true);
            if (!success) { return; }
        }

        const rInstallCommand = "devtools::install()";
        rTerm.sendText(rInstallCommand);
    }

    async function buildPkg() {
        if (!rTerm) {
            const success = createRTerm(true);
            if (!success) { return; }
        }

        const rBuildCommand = "devtools::build()";
        rTerm.sendText(rBuildCommand);
    }

    async function documentPkg() {
        if (!rTerm) {
            const success = createRTerm(true);
            if (!success) { return; }
        }

        const rDocumentCommand = "devtools::document()";
        rTerm.sendText(rDocumentCommand);
    }

    context.subscriptions.push(
        commands.registerCommand("r.runSource", () => runSource(false)),
        commands.registerCommand("r.createRTerm", createRTerm),
        commands.registerCommand("r.runSourcewithEcho", () => runSource(true)),
        commands.registerCommand("r.runSelection", runSelection),
        commands.registerCommand("r.createGitignore", createGitignore),
        commands.registerCommand("r.previewDataframe", previewDataframe),
        commands.registerCommand("r.previewEnvironment", previewEnvironment),
        commands.registerCommand("r.loadAll", loadAllPkg),
        commands.registerCommand("r.test", testPkg),
        commands.registerCommand("r.install", installPkg),
        commands.registerCommand("r.build", buildPkg),
        commands.registerCommand("r.document", documentPkg),
        window.onDidCloseTerminal(deleteTerminal),
    );

    function ToRStringLiteral(s: string, quote: string) {
        if (s === null) {
            return "NULL";
        }
        return (quote +
                s.replace(/\\/g, "\\\\")
                .replace(/"""/g, "\\" + quote)
                .replace(/\\n/g, "\\n")
                .replace(/\\r/g, "\\r")
                .replace(/\\t/g, "\\t")
                .replace(/\\b/g, "\\b")
                .replace(/\\a/g, "\\a")
                .replace(/\\f/g, "\\f")
                .replace(/\\v/g, "\\v") +
                quote);
    }
}

// This method is called when your extension is deactivated
// export function deactivate() {

// }
