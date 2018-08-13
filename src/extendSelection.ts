/**
 * Like vscode's Position class, but allows negative values.
 */
class PositionNeg {
    line: number;
    character: number;
    constructor(_line: number, _character: number) {
        this.line = _line;
        this.character = _character;
    }
}

/**
 * Class to hold lines that have been fetched from the document after they have been preprocessed.
 */
class LineCache {
    lineCache: Map<number, string>;
    endsInOperatorCache: Map<number, boolean>;
    getLine: (number) => string;
    lineCount: number;
    constructor(_getLine: (number) => string, _lineCount: number) {
        this.getLine = _getLine;
        this.lineCount = _lineCount;
        this.lineCache = new Map<number, string>();
        this.endsInOperatorCache = new Map<number, boolean>();
    }
    getLineFromCache(line: number) {
        const lineInCache = this.lineCache.has(line);
        if (!lineInCache) {
            this.addLineToCache(line);
        }
        const s = this.lineCache.get(line);
        return (s);
    }
    getEndsInOperatorFromCache(line: number) {
        const lineInCache = this.lineCache.has(line);
        if (!lineInCache) {
            this.addLineToCache(line);
        }
        const s = this.endsInOperatorCache.get(line);
        return (s);
    }
    addLineToCache(line: number) {
        const cleaned = cleanLine(this.getLine(line));
        const endsInOperator = doesLineEndInOperator(cleaned);
        this.lineCache.set(line, cleaned);
        this.endsInOperatorCache.set(line, endsInOperator);
    }
}

function doBracketsMatch(a: string, b: string): boolean {
    const matches = { "(":")", "[":"]", "{":"}", ")":"(", "]":"[", "}":"{" };
    return matches[a] === b;
}

function isBracket(c: string, forward: boolean) {
    if (forward) {
        return ((c === "(") || (c === "[") || (c === "{"));
    } else {
        return ((c === ")") || (c === "]") || (c === "}"));
    }
}

function cleanLine(text: string) {
    const cleaned = text.replace(/\s*\#.*/, ""); // Remove comments and preceeding spaces
    return (cleaned);
}

function doesLineEndInOperator(text: string) {
    const endingOperatorIndex = text.search(/(,|\+|!|\$|\^|&|\*|-|=|:|\'|~|\||\/|\?|%.*%)(\s*|\s*\#.*)$/);
    const spacesOnlyIndex = text.search(/^\s*$/); // Space-only lines also counted.
    return ((0 <= endingOperatorIndex) || (0 <= spacesOnlyIndex));
}

/**
 * From a given position, return the 'next' character, its position, whether it is at the termination of an 
 * 'extended' line, and whether it is the end of the file.
 * The next character may be on a different line if at the start/end of a line, or it may be the
 * same character if at the start/end of a document.
 * Considers the start and end of each line to be special distinct characters.
 * @param p The starting position.
 * @param lookingForward true if looking for a bracket toward the end of the document, false for looking toward the start.
 * @param getLine A function that returns the string at the given line.
 * @param getDoesLineEndInOperator A function that returns whether the given line ends in an operator.
 * @param lineCount The number of lines in the document.
 */
function getNextChar(p: PositionNeg, lookingForward: boolean, getLine: (number) => string, getDoesLineEndInOperator: (number) => boolean, lineCount) {
    const s = getLine(p.line);
    let nextPos: PositionNeg = null;
    let isEndOfCodeLine = false;
    let isEndOfFile = false;
    if (lookingForward) {
        if (p.character != s.length) {
            nextPos = new PositionNeg(p.line, p.character + 1);
        } else if (p.line < (lineCount - 1)) {
            nextPos = new PositionNeg(p.line + 1, -1);
        } else {
            // At end of document. Return same character.
            isEndOfFile = true;
            nextPos = new PositionNeg(p.line, p.character);
        }
        const nextLine: string = getLine(nextPos.line);
        if (nextPos.character === nextLine.length) {
            if ((nextPos.line === (lineCount - 1)) || !getDoesLineEndInOperator(nextPos.line)) {
                isEndOfCodeLine = true;
            }
        }
    } else {
        if (p.character != -1) {
            nextPos = new PositionNeg(p.line, p.character - 1);
        } else if (p.line > 0) { 
            nextPos = new PositionNeg(p.line - 1, getLine(p.line - 1).length - 1);
        } else {
            // At start of document. Return same charater.
            isEndOfFile = true;
            nextPos = new PositionNeg(p.line, p.character);
        }
        if (nextPos.character === -1) {
            if ((nextPos.line <= 0) || !getDoesLineEndInOperator(nextPos.line - 1)) {
                isEndOfCodeLine = true;
            }
        }
    }
    // Represent the start and end of the line with special characters.
    let nextChar = getLine(nextPos.line)[nextPos.character];
    return ({ nextChar: nextChar, nextPos: nextPos, isEndOfCodeLine: isEndOfCodeLine, isEndOfFile: isEndOfFile });
}

/**
 * Given a line number, determines the first and last lines required to include all the matching brackets 
 * and all the 'extended lines' (complete lines of code, possibly split into multiple lines
 * each ending in an operator) from that line.
 * @param line The line of the document at which to start.
 * @param getLine A function that returns the string at the given line.
 * @param lineCount The number of lines in the document.
 */
export function extendSelection(line: number, getLine: (number) => string, lineCount: number) {
    const lc = new LineCache(getLine, lineCount);
    const getLineFromCache = function(x) { return (lc.getLineFromCache(x)); }
    const getEndsInOperatorFromCache = function(x) { return (lc.getEndsInOperatorFromCache(x)); }
    let lookingForward = true;
    // poss[1] is the furthest point reached looking forward from the current line,
    // and poss[0] is the furthest point reached looking backward from the current line.
    let poss = { 0: new PositionNeg(line, 0), 1: new PositionNeg(line, -1) };
    let flagsFinish = { 0: false, 1: false }; // 1 represents looking forward, 0 represents looking back.
    let flagAbort = false;
    //TODO Make unmatched elements be vectors of strings.
    let unmatched = { 0: [], 1: []};
    // Check characters in direction given by lookingForward. 
    // If a bracket is encountered, extend selection to the corresponding matching bracket.
    // If the termination of a code line is reached, we are finished
    // extending in that direction. Continue until there are no more unmatched brackets, 
    // and we have reached the ends of the code lines both forwards and backwards.
    while (!flagAbort && !(flagsFinish[0] && flagsFinish[1])) {
        let { nextChar, nextPos, isEndOfCodeLine, isEndOfFile } = getNextChar(poss[lookingForward ? 1 : 0], lookingForward, getLineFromCache, getEndsInOperatorFromCache, lineCount);
        poss[lookingForward ? 1 : 0] = nextPos;
        if (isBracket(nextChar, lookingForward)) {
            unmatched[lookingForward ? 1 : 0].push(nextChar);
        } else if (isBracket(nextChar, !lookingForward)) {
            if (unmatched[lookingForward ? 1 : 0].length === 0) {
                lookingForward = !lookingForward;
                unmatched[lookingForward ? 1 : 0].push(nextChar);
                flagsFinish[lookingForward ? 1 : 0] = false;
            } else {
                let needsToMatch = unmatched[lookingForward ? 1 : 0].pop();
                if (!doBracketsMatch(nextChar, needsToMatch)) {
                    flagAbort = true;
                }
            }
        } else if (isEndOfCodeLine) { 
            if (unmatched[lookingForward ? 1 : 0].length === 0) {
                // We have found everything we need to. Continue looking in the other direction.
                flagsFinish[lookingForward ? 1 : 0] = true;
                lookingForward = !lookingForward; 
            } else if (isEndOfFile) {
                // Have hit the start or end of the file without finding the matching bracket.
                flagAbort = true;
            }
        }
    }
    if (flagAbort) {
        return ({ startLine: line, endLine: line });
    } else {
        return ({ startLine: poss[0].line, endLine: poss[1].line });
    }
}

