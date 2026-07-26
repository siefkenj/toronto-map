// @ts-ignore
import _Text from "react-svg-text";

import type { FC } from "react";

export interface ReactSvgTextProps {
    x?: number;
    y?: number;
    dx?: number;
    dy?: number;
    width?: number;
    scaleToFit?: boolean;
    angle?: number;
    textAnchor?: "start" | "middle" | "end" | "inherit";
    verticalAnchor?: "start" | "middle" | "end";
    lineHeight?: string;
    capHeight?: string;
    [key: string]: any; // for additional props
}

/**
 * Re-exported Text component from react-svg-text.
 * Allows line wrapping of text.
 */
export const Text = _Text as FC<ReactSvgTextProps>;
