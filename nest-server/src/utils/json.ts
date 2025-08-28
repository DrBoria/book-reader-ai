export function fixCommonJsonIssues(jsonString: string): string {
    // Remove trailing commas
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

    // Fix unterminated strings by finding unmatched quotes
    let fixed = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];

        if (escapeNext) {
            escapeNext = false;
            fixed += char;
            continue;
        }

        if (char === '\\') {
            escapeNext = true;
            fixed += char;
            continue;
        }

        if (char === '"') {
            inString = !inString;
        }

        fixed += char;
    }

    // If we ended in a string, close it
    if (inString) {
        fixed += '"';
    }

    return fixed;
}
