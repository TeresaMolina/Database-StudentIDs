# Database-StudentIDs
This is a student record management system powered by a domain-specific language (DSL) that allows programmers to define student enrollments in a readable, structured format. 

  --it is also a similar feature to an existing web system call WebFocus that UTRGV uses
        to search student schedules when needing a student's course information for assistance
            with issues/questions (COLTT/U-Central);
    --However, the creation aspect is mostly similar to Registrar's way of creating student
        course schedules by gathering their Student Information & using special course codes
            and term codes.

The DSL acts as a "source of truth" that is parsed and converted into valid SQLite database
    entries used by an administrative web interface.
_____________________________________________________________________________________________

Language Purpose:
--------------------
The language enables developers to define...

    => student names

    => student IDs

    => term codes

    => course CRNs

    => medical status

...all within a flexible syntax that’s both human-readable and machine-processable.
_____________________________________________________________________________________________

Sample DSL Input:
---------------------
student "Teresa Molina" {
  id: 20568783
  term: 202510
  courses: [12345, 12346]
  isMedical: 0
}
_____________________________________________________________________________________________

What are the statements?
--------------------------
The core statement is the student "..." { ... } block.

This block groups related data about a student. Inside, you have field assignments...

=> id: 20000000 - 29999999

=> term: <Year><Term Code> (202510 = Fall 2025)

=> courses: [...] (5 digit CRN code of a course)

=> isMedical: 0 || 1

Each of these functions like a field declaration or statement in traditional programming languages.
_____________________________________________________________________________________________

What is the environment?
---------------------------
The language affects a real-world SQLite database as its runtime environment.

Specifically...

=> It inserts validated records into the schedule table of data-library.db

=> Each entry updates real rows that are later queried via a web UI

No variables or memory contexts are updated — 
    the language is designed purely to transform DSL into persistent data.
_____________________________________________________________________________________________

What are the expressions and operations?
---------------------------------------------
The language is declarative, not imperative, so expressions are minimal but include:

Field   |      Type      |   Notes
------------------------------------
id       |  Integer      | Must match 8-digit format starting with 20
term     |  Integer      | Must match 6-digit format [year][term code]
courses	 | List[Int]     | Each must be 5-digit CRNs
isMedical| Boolean (0/1) | If 1 → must validate special term rule

Operations performed:

=> Pattern matching via RegEx

=> Type checks

=> Constraint checks (duplicate CRNs, medical/term link)

=> Database inserts via SQL
_____________________________________________________________________________________________

Evaluate function (and examples)
----------------------------------
The evaluate function is the parseAndInsertDSL() function:

function evaluateDSL(dslText) {
  const parsed = parseDSL(dslText);   // RegEx extract + type checking
  const validated = validate(parsed); // term rules, CRN format, medical match
  const inserted = insertToDatabase(validated); // into schedule table
  return inserted;
}

Test Example:
----------------

DSL Input
student "Kai Rivera" {
  id: 20191234
  term: 202529
  courses: [55555]
  isMedical: 1
}

~Expected Output~

    => Passed all validations

    => Inserted 1 row into the database

Failure Example
-----------------
student "Fake Student" {
  id: 999
  term: abcdef
  courses: [12]
  isMedical: 1
}

~Output~

    => Invalid stuID format

    => Invalid term format

    => Invalid CRN

    => Medical mismatch with term
