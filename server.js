const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

const db = new sqlite3.Database('data-library.db');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // parses incoming requests with URL-encoded payloads.
                                                          // It allows the server to access data submitted 
                                                          //    through HTML forms or other URL-encoded sources. 
app.use(express.json());

//_____________________________________________________________________________________________________________________

// This Site has A Cool 'Student Schedule' to test the DSL in a server environment
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

// This Site is the main DSL Page of our DataBase
app.get('/dsl', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dsl.html'));
});

// Dr. Tomai's fancy code organizer
app.get('/api/schedule', (req, res) => {
  const { stuID, term, isMedical } = req.query;
  //SQlite
  let query = `SELECT * FROM schedule WHERE 1=1`;
  const params = [];

  if (stuID) {
    query += ` AND stuID = ?`; // added condition
    params.push(stuID); //push array to params (new element)
  }
  if (term) {
    query += ` AND Term = ?`;
    params.push(term);
  }
 if (isMedical === '1') {
  query += ` AND IsMedical = 1`;
} else if (isMedical === '0') {
  query += ` AND IsMedical = 0`;
}
// error handler
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Application Programming Interface to insert DSL
app.post('/api/insert-dsl', (req, res) => {
  const { dsl } = req.body; //const is a variable that once it has been created, its value can never change. const has a block scope.
  const results = []; //a keyword that defines a variable or pointer as unchangeable.
                      // A const may be applied in an object declaration to indicate that the object, unlike a standard variable, does not change. 

  const studentBlocks = [...dsl.matchAll(/student\s+"([^"]+)"\s*{([^}]+)}/g)]; // <-- template DSL
/*
                                                                self notes:
-----------------------------------------------------------------------------------------------------------------------------------------------------

const studentBlocks = ...
  => The resulting array of matches is assigned to a constant variable named studentBlocks.
  => Each element in the studentBlocks array will be an array containing the full matched 
          string and its captured groups

[...] => spread syntax; The spread syntax (...) is used to convert the iterator returne
            by matchAll() into an array.

dsl => string variable containing the DSL text

.matchAll() => this method is called on the `dsl` string and returns an
                  iterator () of all matches found by the regular expression ()

/student\s+"([^"+)"\s*{([^}]+)}/g
  => `student` matches the literal string "student"

  => `\s+` matches one or more whitespace characters (spaces, tabs, newlines)
  
  => `([^"]+)` capturing group
      ==> " --double quote character
      ==> [^"]+ --matches non double quotes;
                  captures student's name enclosed in double quotes;
      ==> " --matches a closing double quote character

  => `\s*` matches zero or more whitespace characters
  
  => `{` Matches a literal curly brace character.

  => `([^}]+)` This is another capturing group.
    ==> [^}]+ --Matches one or more characters that are not closing curly braces. This captures the content within the curly braces, likely representing details about the student.
  
  =>`}` Matches a closing curly brace character.
  
  => `/g` The g flag (global) indicates that the regex should find all occurrences that match the pattern, not just the first one

*/

//error handling
if (studentBlocks.length === 0) {
  return res.status(400).json([
    { name: "Error", status: "No valid student blocks found. Check your DSL formatting." }
  ]);
}
//___________________________________________________________________________________________

//insertion code for DB
  const insert = db.prepare(`
    INSERT INTO schedule (stuID, stuName, CRN, Term, IsMedical)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.serialize(() => { //Each command inside the serialize() function is guaranteed to finish
                            // executing before the next one starts.
                                // without it, it will start so quickly one after another
    for (const [, name, block] of studentBlocks) {
      const stuID = (block.match(/id:\s*(\d{8})/) || [])[1];
      const term = (block.match(/term:\s*(\d{6})/) || [])[1];
      const isMedical = (block.match(/isMedical:\s*(\d)/) || [])[1];
      const crns = (block.match(/courses:\s*\[(.*?)\]/) || [])[1]
        .split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));


//________________________________________________________________
     
// Basic checks
if (!/^20\d{6}$/.test(stuID)) {
  results.push({ name, status: "Invalid stuID: Must begin with '20' and be 8 digits long" });
  continue;
}

if (!/^\d{6}$/.test(term)) {
  results.push({ name, status: "Invalid term format" });
  continue;
}

if (!['0', '1'].includes(isMedical)) {
  results.push({ name, status: "Invalid isMedical value" });
  continue;
}


/*
                                  self notes:
-----------------------------------------------------------------------------------
expression evaluates to true if the student ID does not start with
    "20" followed by exactly six digits, triggering the code within the if block. 
=> `^` matches the beginning of the input string

=> `20` matches the literal characters "20"

=> `\d` shorthand character class that matches any digit from 0 to 9

=> `{6}` quantifier species that the preceding character class (\d)
            must be matched exactly six times

=> `$` matches the end of the input string

=> `.test` the test() method of the RegExp object returns TRUE if the
            regular expression matches a string
*/


//__________________________________________________________________


// Medical constraint check
const termCode = parseInt(term.slice(-2));

//                    seelf notes:
//-------------------------------------------------------------------
/*
this code snippet extracts the last two digits from a string (term)
    and treats them as a numerical code stored in the termCode variable

const termCode = ...;:
  => const declares a constant variable named termCode.
  => The result of parseInt() is assigned to termCode

parseInt()
  => attempts to convert a string into an integer.

term.slice(-2):
  => It is assumed that term is a string.
  => The .slice() method extracts a portion of the string.
  => The argument -2 indicates the extraction of characters starting
        from the second to last position in the string.
  => This returns a new string containing the last two characters of term
*/

const allowedMedicalCodes = [19, 29, 39, 49];
if (isMedical === '1' && !allowedMedicalCodes.includes(termCode)) {
  results.push({ name, status: `Term ${term} not valid for Medical student` });
  continue;
}


      for (const crn of crns) {
        if (crn.toString().length !== 5) {
          results.push({ name, status: `Invalid CRN: ${crn}` });
          continue;
        }
const duplicate = db.prepare(`
  SELECT 1 FROM schedule WHERE stuID = ? AND CRN = ? AND Term = ?
`).get(stuID, crn, term);

if (duplicate) {
  results.push({ name, status: "Not Inserted (duplicate CRN for this student and term)" });
  continue;
}

//______________________________________________________________________________________________________

// Safe to insert
insert.run([stuID, name, crn, term, isMedical]); //check to see if the template from our block is applicable
results.push({ name, status: "Inserted" }); //if so, note to programmer/user

      }
    }
    insert.finalize(() => res.json(results)); //then insert into the database
  });
});

//___________________________________________________________________

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`~Server running at http://localhost:${PORT}~`);
});
