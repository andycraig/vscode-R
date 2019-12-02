"use strict";

import { Position, Range, window } from "vscode";
import { TextDecoder } from "util";

const fenceRegex = /^```({r.*?})?.*/;

function findFenceLine(line: number, forward: boolean, getLine: (line: number) => string) {
    const delta = forward ? 1 : -1;
    let currentLine = line;
    let flagFence = false;
    while((currentLine >= 0) && (currentLine < currentDocument.LENGTH) && MATCH REGEX) {
        currentLine += delta;
        const text = getLine(currentLine);
        if (text.match(fenceRegex)[1]) {
            flagFence = true;
            break;
        }
    }
    if (flagFence) {
        return currentLine;
    } else {
        NOT FOUND CASE - ERROR
    }
}

function getChunksFrom(startLine: number, endLine: number, getLine: (line: number) => string) {
    const chunkLines = [];
    let currentLine = line + 1;
    while (currentLine > endLine) {
        const nextStartFenceLine = findFenceLine(currentLine, true, getLine);
        const currentLine = findFenceLine(nextStartFenceLine, true, getLine);
        if(IS VALID) {
            chunkLines.push( startLine: nextStartFenceLine, endLine: currentLine });
        }   
    }
    return chunkLines;
}

function getChunks(startLine: number, endLine: number, getLine: (line: number) => string) {
    let chunkLines;
    const previousFenceLine = findFenceLine(line, false);
    if (isRChunkFence(previousFenceLine)) { // In chunk
        chunkLines = getChunksFrom(previousFenceLine, endLine, getLine);
    } else { // Not in chunk
        chunkLines = getChunksFrom(nextFenceLine, endLine, getLine);
    }
    return chunkLines;
}

funtion getCurrentChunk(line: number) {
    getChunks(line, -1);
}

function getAllChunks(line: number) {
    getChunks(0, currentDocument.LINES);
}

function getAllChunksAboveNotIncludingCurrent(line: number) {
    getChunks(0, line);
}

function getAllChunksBelowIncludingCurrent(line: number) {
    getChunks(line, currentDocument.LINES);
}
