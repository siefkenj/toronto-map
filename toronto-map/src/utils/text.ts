/**
 * Insert zero-width breakable spaces into a title string
 * at non-space word boundaries.
 */
export function makeTitleBreakable(title: string): string {
    //title = title.replace(/(\w)(?=\W)|(\W)(?=\w)/g, "$1$2\u2009");
    //// Replace any \u200B\s with the \s
    //title = title.replace(/\u200B(\s)/g, " ");
    //// Replace any \s\u200B with the \s
    //title = title.replace(/(\s)\u200B/g, " ");

    // Replace hyphens with en-dashes
    title = title.replace(/-/g, " \u2013 ");

    return title;
}
