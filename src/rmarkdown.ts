"use strict";

export enum FenceType {
    None,
    Start,
    End,
}

export function getFenceType(text: string): FenceType {
    const match = text.match(/^```({r.*?})?.*/);
    if (match[0]) {
        if (match[1]) {
            return (FenceType.Start);
        } else {
            return (FenceType.End);
        }
    } else {
        return (FenceType.None);
    }
}

// function findFenceLine(line: number, forward: boolean, docLength: number, getLine: (line: number) => string) {
//     const delta = forward ? 1 : -1;
//     let currentLine = line;
//     let fenceType = FenceType.None;
//     while((currentLine >= 0) && (currentLine < docLength)) {
//         const text = getLine(line);
//         fenceType = getFenceType(text);
//         if (fenceType !== FenceType.None) {
//             break;
//         }
//         currentLine += delta;
//     }
//     return { line: currentLine, fenceType: fenceType };
// }

// function getChunksFrom(startLine: number, endLine: number, docLength: number, getLine: (line: number) => string) {
//     const chunkLines = [];
//     let line = startLine;
//     let fenceType = FenceType.None;
//     while (line > endLine) {
//         { line, fenceType } = findFenceLine(line, true, docLength, getLine);
//         const chunkStartLine = line;
//         const startFenceType = fenceType;
//         { line, fenceType } = findFenceLine(line, true, docLength, getLine);
//         if (startFenceType === FenceType.Start && fenceType === FenceType.End) {
//             if (line - chunkStartLine > 1) {
//                 chunkLines.push({ startLine: chunkStartLine + 1, endLine: line - 1 });
//             }
//         }
//     }
//     return (chunkLines);
// }

// function getChunks(startLine: number, endLine: number, getLine: (line: number) => string) {
//     let chunkLines;
//     // TODO endLine should be doc length
//     const { line, fenceType } = findFenceLine(startLine, false, endLine, getLine);
//     if (fenceType === FenceType.Start) {
//         // In chunk
//         chunkLines = getChunksFrom(line, endLine, getLine);
//     } else {
//         // Not in chunk
//         chunkLines = getChunksFrom(line + 1, endLine, getLine);
//     }
//     return chunkLines;
// }

// function getCurrentChunk(line: number) {
//     getChunks(line, -1);
// }

// function getAllChunks(line: number) {
//     getChunks(0, currentDocument.LINES);
// }

// function getAllChunksAboveNotIncludingCurrent(line: number) {
//     getChunks(0, line);
// }

// function getAllChunksBelowIncludingCurrent(line: number) {
//     getChunks(line, currentDocument.LINES);
// }
