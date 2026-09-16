/**
 * Calculates the next unique untitled request name within a specific request scope.
 *
 * Pattern:
 * - 1st: "Untitled Request"
 * - 2nd: "Untitled Request 2"
 * - 3rd: "Untitled Request 3"
 *
 * @param {string[]} existingNames Array of existing request names within the relevant scope.
 * @returns {string} The next available untitled request name.
 */
export function getNextUntitledName(existingNames = []) {
    const baseName = "Untitled Request";
    const nameSet = new Set(
        (existingNames || [])
            .filter(Boolean)
            .map((n) => n.trim().toLowerCase())
    );

    if (!nameSet.has(baseName.toLowerCase())) {
        return baseName;
    }

    let i = 2;
    while (nameSet.has(`${baseName.toLowerCase()} ${i}`)) {
        i++;
    }
    return `${baseName} ${i}`;
}
