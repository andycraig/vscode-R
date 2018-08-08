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

export function cleanLine(text: string) {
    const cleaned = text.replace(/\s*\#.*/, ""); // Remove comments and preceeding spaces
    return (cleaned);
}

/**
 * Returns which of two PositionNegs are 'further'.
 * @param p A PositionNeg to compare.
 * @param q A PositionNeg to compare.
 * @param lookingForward If true, PositionNegs closer to the end of the document are 'further'.
 */
function getExtremalPos(p: PositionNeg, q: PositionNeg, lookingForward: boolean) {
    if (lookingForward) {
        if (p.line > q.line) return (p);
        else if (p.line < q.line) return (q);
        else return (p.character > q.character ? p : q)
    } else {
        if (p.line > q.line) return (q);
        else if (p.line < q.line) return (p);
        else return (p.character > q.character ? q : p)
    }
}

export function doesLineEndInOperator(text: string) {
    const endingOperatorIndex = text.search(/(,|\+|!|\$|\^|&|\*|-|=|:|\'|~|\||\/|\?|%.*%)(\s*|\s*\#.*)$/);
    const spacesOnlyIndex = text.search(/^\s*$/); // Space-only lines also counted.
    return ((0 <= endingOperatorIndex) || (0 <= spacesOnlyIndex));
}

/**
 * From a given position, return the 'next' character, its position, and whether it is at the end of an 
 * 'extended' line.
 * The next character may be on a different line if at the start/end of a line, or it may be the
 * same character if at the start/end of a document.
 * Considers the start and end of each line to be special distinct characters.
 * @param p The starting position.
 * @param lookingForward true if looking for a bracket toward the end of the document, false for looking toward the start.
 * @param getLine A function that returns the string at the given line.
 * @param getDoesLineEndInOperator A function that returns whether the given line ends in an operator.
 * @param lineCount The number of lines in the document.
 */
export function getNextChar(p: PositionNeg, lookingForward: boolean, getLine: (number) => string, getDoesLineEndInOperator: (number) => boolean, lineCount) {
    const s = getLine(p.line);
    let nextPos: PositionNeg = null;
    let endOfCodeLine = false;
    if (lookingForward) {
        if (p.character != s.length) {
            nextPos = new PositionNeg(p.line, p.character + 1);
        } else if (p.line < (lineCount - 1)) {
            nextPos = new PositionNeg(p.line + 1, -1);
        } else {
            // At end of document. Return same character.
            nextPos = new PositionNeg(p.line, p.character);
        }
        const nextLine: string = getLine(nextPos.line);
        if (nextPos.character === nextLine.length) {
            if ((nextPos.line === (lineCount - 1)) || !getDoesLineEndInOperator(nextPos.line)) {
                endOfCodeLine = true;
            }
        }
    } else {
        if (p.character != -1) {
            nextPos = new PositionNeg(p.line, p.character - 1);
        } else if (p.line > 0) { 
            nextPos = new PositionNeg(p.line - 1, getLine(p.line - 1).length - 1);
        } else {
            // At start of document. Return same charater.
            nextPos = new PositionNeg(p.line, p.character);
        }
        if (nextPos.character === -1) {
            if ((nextPos.line <= 0) || !getDoesLineEndInOperator(nextPos.line - 1)) {
                endOfCodeLine = true;
            }
        }
    }
    // Represent the start and end of the line with special characters.
    let nextChar = '';
    if (nextPos.character === s.length) {
        nextChar = "EOL";
    } else if (nextPos.character === -1) {
        nextChar = "START_OF_LINE";
    } else {
        nextChar = getLine(nextPos.line)[nextPos.character];
    }
    return ({ nextChar: nextChar, nextPos: nextPos, endOfCodeLine: endOfCodeLine });
}

/**
 * Finds the position of the match of a given bracket. Returns flagAbort = true if brackets are inconsistent
 * or start/end of file is reached.
 * @param b The bracket character to match.
 * @param pos The position at which to start looking. The first position AFTER this will be the first one checked.
 * @param getLine A function that returns the string at the given line.
 * @param getDoesLineEndInOperator A function that returns whether the given line ends in an operator.
 * @param lookingForward true if looking for a bracket toward the end of the document, false for looking toward the start.
 * @param lineCount The number of lines in the document.
 */
export function findMatchingBracket(b: string, pos: PositionNeg, getLine: (number) => string, getDoesLineEndInOperator: (number) => boolean, lookingForward: boolean, lineCount: number) {
    let flagAbort = false;
    let unmatchedBrackets: string[] = [];
    var nextPos = pos;
    var nextChar = '';
    var endOfCodeLine = false;
    let possibleMatch = '';
    while (!doBracketsMatch(possibleMatch, b) && !flagAbort) { 
        var { nextChar, nextPos, endOfCodeLine } = getNextChar(nextPos, lookingForward, getLine, getDoesLineEndInOperator, lineCount);
        if (isBracket(nextChar, lookingForward)) {
            unmatchedBrackets.push(nextChar);
        } else if (isBracket(nextChar, !lookingForward)) {
           if (unmatchedBrackets.length === 0) {
                possibleMatch = nextChar;
            } else if (!doBracketsMatch(nextChar, unmatchedBrackets.pop())) {
                flagAbort = true;
            }
        }
        let atStartOfFile = !lookingForward && (nextPos.line === 0) && (endOfCodeLine);
        let atEOF = lookingForward && (nextPos.line === (lineCount - 1)) && (endOfCodeLine);
        if (atStartOfFile || atEOF) {
            // Have hit the start or end of the file without finding the matching bracket.
            flagAbort = true;
        }
    }
    return ({ nextPos: nextPos, flagAbort: flagAbort });
}

/**
 * Finds the next bracket, or the termination of a line of code which is possibly split over multiple lines,
 * whichever comes first.
 * @param pos The position at which to start looking. The first position AFTER this will be the first one checked.
 * @param getLine A function that returns the string at the given line.
 * @param getDoesLineEndInOperator A function that returns whether the given line ends in an operator.
 * @param lookingForward true if looking toward the end of the document, false for looking toward the start.
 * @param lineCount The number of lines in the document.
 */
export function findBracketOrLineTermination(pos: PositionNeg, getLine: (number) => string, getDoesLineEndInOperator: (number) => boolean, lookingForward: boolean, lineCount: number) {
    var { nextChar, nextPos, endOfCodeLine } = getNextChar(pos, lookingForward, getLine, getDoesLineEndInOperator, lineCount);
    while (!endOfCodeLine && !(isBracket(nextChar, true) || isBracket(nextChar, false))) {
        var { nextChar, nextPos, endOfCodeLine } = getNextChar(nextPos, lookingForward, getLine, getDoesLineEndInOperator, lineCount);
    }
    return ({ nextChar: nextChar, nextPos: nextPos, endOfCodeLine: endOfCodeLine });
}

/**
 * Given a line number, determines the first and last lines required to 
 * include all the matching brackets and all the 'extended lines' (single code lines
 * split into multiple lines each ending in an operator) from that line.
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
    let flagFinish = { 0: false, 1: false }; // 1 represents looking forward, 0 represents looking back.
    var flagAbort = false;
    // Check characters on current line. If a bracket, extend to the corresponding
    // matching bracket. If the termination of an 'extended line' is reached, we are finished
    // extending in that direction. Continue until there are no more unmatched brackets, 
    // and the we have reached the ends of the 'extended lines' both forwards and backwards.
    while (!flagAbort && (!flagFinish[0] || !flagFinish[1])) {
        let { nextChar, nextPos, endOfCodeLine } = findBracketOrLineTermination(poss[lookingForward ? 1 : 0], getLineFromCache, getEndsInOperatorFromCache, lookingForward, lineCount);
        if (isBracket(nextChar, true) || isBracket(nextChar, false)) {
            // Check which direction in which we need to look for the matching bracket.
            lookingForward = isBracket(nextChar, true);
            flagFinish[lookingForward ? 1 : 0] = false;
            // Start looking for the corresponding matching bracket from the next character
            // or from the furthest point we had previously reached, whichever is further
            // from the original line.
            poss[lookingForward ? 1 : 0] = getExtremalPos(poss[lookingForward ? 1: 0], nextPos, lookingForward);
            poss[!lookingForward ? 1 : 0] = getExtremalPos(poss[!lookingForward ? 1: 0], nextPos, !lookingForward);
            var { "nextPos": foundPos, flagAbort} =  findMatchingBracket(nextChar, poss[lookingForward ? 1 : 0], getLineFromCache, getEndsInOperatorFromCache, lookingForward, lineCount);
            poss[lookingForward ? 1 : 0] = foundPos;
        } else if (endOfCodeLine) {
            // Found the end of the extended line.
            // Now, carry on checking from the furthest point reached in the opposite direction.
            flagFinish[lookingForward ? 1 : 0] = true;
            lookingForward = !lookingForward; 
        }
    }
    if (flagAbort) {
        return ({ startLine: line, endLine: line });
    } else {
        return ({ startLine: poss[0].line, endLine: poss[1].line });
    }
}

