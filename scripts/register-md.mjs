// Lets tsx scripts import *.md prompt files as strings (Next uses a webpack asset/source rule).
import { register } from "node:module";
register("./md-hooks.mjs", import.meta.url);
