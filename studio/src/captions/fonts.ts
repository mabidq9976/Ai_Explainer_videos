import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";

// Headline + tag face (condensed caps) and subtitle face (geometric bold), as in pro short-form edits.
export const HEADLINE = loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const SUBTITLE = loadMontserrat("normal", { weights: ["700", "800", "900"], subsets: ["latin"] }).fontFamily;
