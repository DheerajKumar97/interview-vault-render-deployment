// Quick test of the regex pattern
const question = "Who is founder of this application?";
const lowerQuestion = question.toLowerCase().trim();

console.log("Testing question:", lowerQuestion);
console.log("");

// Test individual patterns
const pattern1 = /who (is|are|created|made|built|developed|founded)/;
const pattern2 = /who.*?(dheeraj|creator|developer|founder|made|built|owner)/;
const pattern4 = /founder of (this|the)? ?(app|application|interview vault)/;

console.log("Pattern 1 test:", pattern1.test(lowerQuestion), "- Pattern:", pattern1.toString());
console.log("Pattern 2 test:", pattern2.test(lowerQuestion), "- Pattern:", pattern2.toString());
console.log("Pattern 4 test:", pattern4.test(lowerQuestion), "- Pattern:", pattern4.toString());

// Check what matches
if (pattern1.test(lowerQuestion)) {
    console.log("\n✅ Pattern 1 MATCHES!");
    console.log("Match:", lowerQuestion.match(pattern1));
}

if (pattern2.test(lowerQuestion)) {
    console.log("\n✅ Pattern 2 MATCHES!");
    console.log("Match:", lowerQuestion.match(pattern2));
}

if (pattern4.test(lowerQuestion)) {
    console.log("\n✅ Pattern 4 MATCHES!");
    console.log("Match:", lowerQuestion.match(pattern4));
}
