//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../src/extension';
import { extend, cleanLine, isEndOfCodeLine } from "../src/extendSelection";

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", () => {

    test("Sending multi-line bracketed expression to console", () => {
        let doc1 = `
        function (x) {
            y = x
            y
        }
        `.split("\n");
        function f1(i) {return (doc1[i])}
        function e1(i) {return (isEndOfCodeLine(cleanLine(doc1[i])))}

        assert.equal(extend(1, f1, 6).startLine, 1);
        assert.equal(extend(1, f1, 6).endLine, 4);

        let doc2 = `
        a = list(x = 1,
            y = 2)
        `.split("\n");
        function f2(i) {return (doc2[i])}
        function e2(i) {return (isEndOfCodeLine(cleanLine(doc2[i])))}

        assert.equal(extend(1, f2, 4).startLine, 1);
        assert.equal(extend(1, f2, 4).endLine, 2);
    })

    test("Sending nested bracketed expression to console", () => {
        let doc7 = `
        (
            c(
                2
            )
        )
        `.split("\n");
        function f7(i) {return (doc7[i])}
        function e7(i) {return (isEndOfCodeLine(cleanLine(doc7[i])))}

        assert.equal(extend(4, f7, 6).startLine, 2);
        assert.equal(extend(4, f7, 6).endLine, 4);
        assert.equal(extend(1, f7, 6).startLine, 1);
        assert.equal(extend(1, f7, 6).endLine, 5);
 
        let doc8 = `
        {
            c(
                2
            )}
        `.split("\n");
        function f8(i) {return (doc8[i])}
        function e8(i) {return (isEndOfCodeLine(cleanLine(doc8[i])))}

        assert.equal(extend(3, f8, 5).startLine, 3);
        assert.equal(extend(3, f8, 5).endLine, 3);
        assert.equal(extend(4, f8, 5).startLine, 1);
        assert.equal(extend(4, f8, 5).endLine, 4);
 
    })

    test("Sending brackets and pipes to console", () => {
        let doc4 = `
        {
            1
        } %>%
            c(
                2
            )
        `.split("\n");
        function f4(i) {return (doc4[i])}
        function e4(i) {return (isEndOfCodeLine(cleanLine(doc4[i])))}

        assert.equal(extend(0, f4, 6).startLine, 0);
        assert.equal(extend(0, f4, 6).endLine, 6);
        assert.equal(extend(1, f4, 6).startLine, 1);
        assert.equal(extend(1, f4, 6).endLine, 6);
        assert.equal(extend(2, f4, 6).startLine, 2);
        assert.equal(extend(2, f4, 6).endLine, 2);
        assert.equal(extend(3, f4, 6).startLine, 1);
        assert.equal(extend(3, f4, 6).endLine, 6);
        assert.equal(extend(4, f4, 6).startLine, 1);
        assert.equal(extend(4, f4, 6).endLine, 6);
        assert.equal(extend(5, f4, 6).startLine, 5);
        assert.equal(extend(5, f4, 6).endLine, 5);
        
        let doc10 = `
        {
            1
        } %>%

            c(
                2
            )
        `.split("\n");
        function f10(i) {return (doc10[i])}
        function e10(i) {return (isEndOfCodeLine(cleanLine(doc10[i])))}

        assert.equal(extend(5, f10, 7).startLine, 1);
        assert.equal(extend(5, f10, 7).endLine, 7);
        assert.equal(extend(5, f10, 8).startLine, 1);
        assert.equal(extend(5, f10, 8).endLine, 7);
    })

    test("Sending large code example to console", () => {
        let doc9 = `
        if (TRUE) {              #  1. RStudio sends lines 1-17; VSCode-R sends 1-17
                                 #  2. RStudio sends lines 2-4; VSCode-R sends 2-4
          a = data.frame(x = 2,  #  3. RStudio sends lines 2-4; VSCode-R sends 3-4
            y = 3)               #  4. RStudio sends lines 2-4; VSCode-R sends 3-4
          print(                 #  5. RStudio sends lines 5-15; VSCode-R sends 5-15
            a[                   #  6. RStudio sends lines 5-15; VSCode-R sends 6-14
              if (TRUE) {        #  7. RStudio sends lines 7-13; VSCode-R sends 7-13
                {                #  8. RStudio sends lines 8-12; VSCode-R sends 8-12
                  (              #  9. RStudio sends lines 9-11; VSCode-R sends 9-11
                    1            # 10. RStudio sends lines 9-11; VSCode-R sends 10
                  )              # 11. RStudio sends lines 9-11; VSCode-R sends 9-11
                }                # 12. RStudio sends lines 8-12; VSCode-R sends 8-12
              }                  # 13. RStudio sends lines 5-15; VSCode-R sends 7-13
              ]                  # 14. RStudio sends lines 5-15; VSCode-R sends 6-14
          )                      # 15. RStudio sends lines 5-15; VSCode-R sends 5-15
                                 # 16. RStudio sends lines 16-17; VSCode-R sends 1-17
        }                        # 17. RStudio sends lines 1-17; VSCode-R sends 1-17
        `.split("\n");
        function f9(i) {return (doc9[i])}
        function e9(i) {return (isEndOfCodeLine(cleanLine(doc9[i])))}

        assert.equal(extend(1, f9, 18).startLine, 1);
        assert.equal(extend(1, f9, 18).endLine, 17);
        assert.equal(extend(2, f9, 18).startLine, 2);
        assert.equal(extend(2, f9, 18).endLine, 4);
        assert.equal(extend(3, f9, 18).startLine, 3);
        assert.equal(extend(3, f9, 18).endLine, 4);
        assert.equal(extend(4, f9, 18).startLine, 3);
        assert.equal(extend(4, f9, 18).endLine, 4);
        assert.equal(extend(5, f9, 18).startLine, 5);
        assert.equal(extend(5, f9, 18).endLine, 15);
        assert.equal(extend(6, f9, 18).startLine, 6);
        assert.equal(extend(6, f9, 18).endLine, 14);
        assert.equal(extend(7, f9, 18).startLine, 7);
        assert.equal(extend(7, f9, 18).endLine, 13);
        assert.equal(extend(8, f9, 18).startLine, 8);
        assert.equal(extend(8, f9, 18).endLine, 12);
        assert.equal(extend(9, f9, 18).startLine, 9);
        assert.equal(extend(9, f9, 18).endLine, 11);
        assert.equal(extend(10, f9, 18).startLine, 10);
        assert.equal(extend(10, f9, 18).endLine, 10);
        assert.equal(extend(11, f9, 18).startLine, 9);
        assert.equal(extend(11, f9, 18).endLine, 11);
        assert.equal(extend(12, f9, 18).startLine, 8);
        assert.equal(extend(12, f9, 18).endLine, 12);
        assert.equal(extend(13, f9, 18).startLine, 7);
        assert.equal(extend(13, f9, 18).endLine, 13);
        assert.equal(extend(14, f9, 18).startLine, 6);
        assert.equal(extend(14, f9, 18).endLine, 14);
        assert.equal(extend(15, f9, 18).startLine, 5);
        assert.equal(extend(15, f9, 18).endLine, 15);
        assert.equal(extend(16, f9, 18).startLine, 1);
        assert.equal(extend(16, f9, 18).endLine, 17);
        assert.equal(extend(17, f9, 18).startLine, 1);
        assert.equal(extend(17, f9, 18).endLine, 17);
    });

    test("Sending badly-formed blocks to console", () => {
        let doc5 = `
            1
        } %>%
            c(
                2
            )
        `.split("\n");
        function f5(i) {return (doc5[i])}
        function e5(i) {return (isEndOfCodeLine(cleanLine(doc5[i])))}

        let doc6 = `
            c(
                2
        `.split("\n");
        function f6(i) {return (doc6[i])}
        function e6(i) {return (isEndOfCodeLine(cleanLine(doc6[i])))}

        let doc11 = `
                2
            )
        `.split("\n");
        function f11(i) {return (doc11[i])}
        function e11(i) {return (isEndOfCodeLine(cleanLine(doc11[i])))}

        assert.equal(extend(5, f5, 6).startLine, 5);
        assert.equal(extend(5, f5, 6).endLine, 5);
        assert.equal(extend(1, f6, 2).startLine, 1);
        assert.equal(extend(1, f6, 2).endLine, 1);
        assert.equal(extend(1, f11, 2).startLine, 1);
        assert.equal(extend(1, f11, 2).endLine, 1);
        assert.equal(extend(2, f11, 2).startLine, 2);
        assert.equal(extend(2, f11, 2).endLine, 2);
    });
});