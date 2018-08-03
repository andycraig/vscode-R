/**
 * Like vscode's Position, but allows negative values.
 */
class PositionNeg {
    line: number;
    character: number;
    constructor(_line: number, _character: number) {
        this.line = _line;
        this.character = _character;
    }
}

class NextChar {
    char: string;
    pos: PositionNeg;
    endOfCodeLine: boolean;
    constructor(_char: string, _pos: PositionNeg, _endOfCodeLine: boolean) {
        this.char = _char;
        this.pos = _pos;
        this.endOfCodeLine = _endOfCodeLine;
    }
}
 
class LineCache {
    lineCache: Map<number, string>;
    endOfCodeLineCache: Map<number, boolean>;
    getLine: (number) => string;
    lineCount: number;
    constructor(_getLine: (number) => string, _lineCount: number) {
        this.getLine = _getLine;
        this.lineCount = _lineCount;
        this.lineCache = new Map<number, string>();
        this.endOfCodeLineCache = new Map<number, boolean>();
    }
    getLineFromCache(line: number) {
        let lineInCache = this.lineCache.has(line);
        if (!lineInCache) {
            this.addLineToCache(line);
        }
        let s = this.lineCache.get(line);
        return (s);
    }
    getIsEndOfCodeLineFromCache(line: number) {
        let lineInCache = this.lineCache.has(line);
        if (!lineInCache) {
            this.addLineToCache(line);
        }
        let s = this.endOfCodeLineCache.get(line);
        return (s);
    }
    addLineToCache(line: number) {
        let cleaned = cleanLine(this.getLine(line));
        let endOfCodeLine = isEndOfCodeLine(cleaned);
        this.lineCache.set(line, cleaned);
        this.endOfCodeLineCache.set(line, endOfCodeLine);
    }
}

function bracketsMatch(a: string, b: string): boolean {
    let matches = { "(":")", "[":"]", "{":"}", ")":"(", "]":"[", "}":"{" };
    return matches[a] == b;
}

function isBracket(c: string, forward: boolean) {
    if (forward) {
        return ((c == "(") || (c == "[") || (c == "{"));
    } else {
        return ((c == ")") || (c == "]") || (c == "}"));
    }
}

export function cleanLine(text: string) {
    let cleaned = text.replace(/\s*\#.*/, ""); // Remove comments and preceeding spaces
    return (cleaned);
}

/**
 * Returns which of two Positions are 'further'.
 * @param p A PositionNeg to compare.
 * @param q A PositionNeg to compare.
 * @param lookingForward If true, Positions closer to the end of the document are 'further'.
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

/**
 * Is given text the end of a line of code (which is possibly split over multiple linees)?
 * @param text Text to check.
 */
export function isEndOfCodeLine(text: string) {
    let endingOperatorIndex = text.search(/(,|\+|!|"\$|\^|&|\*|-|=|:|\'|~|\||\/|\?|%.*%)(\s*|\s*\#.*)$/);
    let spacesOnlyIndex = text.search(/^\s*$/);
    return ((0 > endingOperatorIndex) && (0 > spacesOnlyIndex));
}

/**
 * From a given position, return the 'next' character and some associated information.
 * The next character may be on a different line if at the start/end of a line, or it may be the
 * same character if at the start/end of a document.
 * Considers the start and end of each line to be distinct characters.
 * @param p The starting position.
 * @param lookingForward true if looking for a bracket toward the end of the document, false for looking toward the start.
 * @param getLine A function that returns the string at the given line.
 * @param getIsEndOfCodeLine A function that returns whether the given line is the end of a code line (which is possibly split over multiple lines).
 * @param lineCount The number of lines in the document.
 */
export function getNextCharAndPos(p: PositionNeg, lookingForward: boolean, getLine: (number) => string, getIsEndOfCodeLine: (number) => boolean, lineCount): NextChar {
    let s = getLine(p.line);
    let nextChar = "";
    let nextPos = null;
    let endOfCodeLine = false;
    if (lookingForward) {
        if (p.character != s.length) {
            nextPos = new PositionNeg(p.line, p.character + 1);
        } else if (p.line < lineCount) {
            nextPos = new PositionNeg(p.line + 1, -1);
        } else {
            // At end of document. Return same character.
            nextPos = new PositionNeg(p.line, p.character);
        }
        let nextLine: string = getLine(nextPos.line);
        if (nextPos.character == nextLine.length) {
            if ((nextPos.line == lineCount) || getIsEndOfCodeLine(nextPos.line)) {
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
        if (nextPos.character == -1) {
            if ((nextPos.line <= 0) || getIsEndOfCodeLine(nextPos.line - 1)) {
                endOfCodeLine = true;
            }
        }
    }
    // Represent the start and end of the line with special characters.
    if (nextPos.character == s.length) {
        nextChar = "EOL";
    } else if (nextPos.character == -1) {
        nextChar = "START_OF_LINE";
    } else {
        nextChar = getLine(nextPos.line)[nextPos.character];
    }
    return (new NextChar(nextChar, nextPos, endOfCodeLine));
}

/**
 * Finds the position of the match of a given bracket.
 * @param b The bracket character to match.
 * @param pos The position at which to start looking. The first position AFTER this will be the first one checked.
 * @param getLine A function that returns the string at the given line.
 * @param getIsEndOfCodeLine A function that returns whether the given line is the end of a code line (which is possibly split over multiple lines).
 * @param lookingForward true if looking for a bracket toward the end of the document, false for looking toward the start.
 * @param lineCount The number of lines in the document.
 */
export function findMatchingBracket(b: string, pos: PositionNeg, getLine: (number) => string, getIsEndOfCodeLine: (number) => boolean, lookingForward: boolean, lineCount: number) {
    let flagAbort = false;
    let unmatchedBrackets: string[] = [];
    let nextPos = pos;
    let possibleMatch = '';
    while (!bracketsMatch(possibleMatch, b) && !flagAbort) { 
        let result = getNextCharAndPos(nextPos, lookingForward, getLine, getIsEndOfCodeLine, lineCount);
        let nextChar = result.char;
        nextPos = result.pos;
        if (isBracket(nextChar, lookingForward)) {
            unmatchedBrackets.push(nextChar);
        } else if (isBracket(nextChar, !lookingForward)) {
           if (unmatchedBrackets.length == 0) {
                possibleMatch = nextChar;
            } else if (!bracketsMatch(nextChar, unmatchedBrackets.pop())) {
                flagAbort = true;
            }
        }
        let atStartOfFile = !lookingForward && (nextPos.line == 0) && (result.endOfCodeLine);
        let atEOF = lookingForward && (nextPos.line == lineCount) && (result.endOfCodeLine);
        if (atStartOfFile || atEOF) {
            flagAbort = true;
        }
    }
    return ({ pos: nextPos, flagAbort: flagAbort });
}

/**
 * Finds the termination of a line of code which is possibly split over multiple lines.
 * @param pos The position at which to start looking. The first position AFTER this will be the first one checked.
 * @param getLine A function that returns the string at the given line.
 * @param getIsEndOfCodeLine A function that returns whether the given line is the end of a code line (which is possibly split over multiple lines).
 * @param lookingForward true if looking for a bracket toward the end of the document, false for looking toward the start.
 * @param lineCount The number of lines in the document.
 */
export function processRestOfExtendedLine(pos: PositionNeg, getLine: (number) => string, getIsEndOfCodeLine: (number) => boolean, lookingForward: boolean, lineCount: number): NextChar {
    let result = getNextCharAndPos(pos, lookingForward, getLine, getIsEndOfCodeLine, lineCount);
    while (!result.endOfCodeLine && !(isBracket(result.char, true) || isBracket(result.char, false))) {
        result = getNextCharAndPos(result.pos, lookingForward, getLine, getIsEndOfCodeLine, lineCount);
    }
    return (result);
}

/**
 * Given a line number, determines the first and last lines required to 
 * include all the matching brackets and all the 'extended lines' (single code lines
 * split over multiple lines, or lines joined by pipe operators) from that line.
 * 
 * For example, say these are some lines of an R script:
 * 
 * library(magrittr)  # Line 1
 * list(x = 1,        # Line 2
 *      y = 2) %>%    # Line 3  
 *      print()       # Line 4
 * 
 * Say we start from line 3. We will proceed forward, then hit the ')'. We will then look backward
 * for the matching bracket. We find that on line 2.
 * @param line The line of the document at which to start.
 * @param getLine A function that returns the string at the given line.
 * @param lineCount The number of lines in the document.
 */
export function extend(line: number, getLine: (number) => string, lineCount: number) {
    let lc = new LineCache(getLine, lineCount);
    let getLineFromCache = function(x) { return (lc.getLineFromCache(x)); }
    let getIsEndOfCodeLineFromCache = function(x) { return (lc.getIsEndOfCodeLineFromCache(x)); }
    let lookingForward = true;
    // poss[1] is the furthest point reached looking forward from the current line,
    // and poss[0] is the furthest point reached looking backward from the current line.
    let poss = { 0: new PositionNeg(line, 0), 1: new PositionNeg(line, -1) };
    let flagFinish = { 0: false, 1: false }; // 1 represents looking forward, 0 represents looking back.
    let flagAbort = false;
    // Check characters on current line. If a bracket, extend to the corresponding
    // matching bracket. If the end of an 'extended line' is reached, we are finished
    // extending in that direction. Continue until there are no more unmatched brackets, 
    // and the we have reached the ends of the 'extended lines' both forwards and backwards.
    while (!flagAbort && (!flagFinish[0] || !flagFinish[1])) {
        let result = processRestOfExtendedLine(poss[lookingForward ? 1 : 0], getLineFromCache, getIsEndOfCodeLineFromCache, lookingForward, lineCount);
        if (isBracket(result.char, true) || isBracket(result.char, false)) {
            // Check which direction in which we need to look for the matching bracket.
            lookingForward = isBracket(result.char, true);
            flagFinish[lookingForward ? 1 : 0] = false;
            // Start looking for the corresponding matching bracket from the next character
            // or from the furthest point we had previously reached, whichever is further
            // from the original line.
            poss[lookingForward ? 1 : 0] = getExtremalPos(poss[lookingForward ? 1: 0], result.pos, lookingForward);
            poss[!lookingForward ? 1 : 0] = getExtremalPos(poss[!lookingForward ? 1: 0], result.pos, !lookingForward);
            let findResult =  findMatchingBracket(result.char, poss[lookingForward ? 1 : 0], getLineFromCache, getIsEndOfCodeLineFromCache, lookingForward, lineCount);
            poss[lookingForward ? 1 : 0] = findResult.pos;
            flagAbort = findResult.flagAbort;
        } else if (result.endOfCodeLine) {
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

