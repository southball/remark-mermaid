import type { Transformer } from "unified";
import { Parent, SKIP, visit } from "unist-util-visit";
import type { Node } from "unist";
import { Data } from "vfile";
import { execSync } from "child_process";
import * as fs from "fs";
import which from "which";
import type { Code } from "mdast";
import jsdom from "jsdom";

type RemarkMermaidOptions = {
  themes: string[];
};

const defaultOptions = {
  themes: ["default"],
};

/**
 * Reprefixing the IDs of definitions in SVG in order to show multiple diagrams
 * with different themes on the same page.
 */
const postprocess = (svgContent: string, prefix: string): string => {
  const svg = new jsdom.JSDOM(svgContent);
  const defines = [...svg.window.document.querySelectorAll("defs marker")];

  const replacements = [];

  for (const define of defines) {
    replacements.push([`url(#${define.id})`, `url(#${prefix}${define.id})`]);
    define.id = prefix + define.id;
  }

  return replacements.reduce(
    (content, [before, after]) => content.replaceAll(before, after),
    svg.window.document.body.innerHTML
  );
};

/**
 * Renders the given mermaid content to SVG.
 */
const renderSVG = (mermaidContent: string, theme: string): string => {
  const prefix = `/tmp/mermaid-${Math.random()}`;
  fs.writeFileSync(`${prefix}.mmd`, mermaidContent);
  execSync(
    `${which.sync("mmdc")} ` +
      `-i "${prefix}.mmd" ` +
      `-o "${prefix}.svg" ` +
      `-t ${theme} ` +
      `-b transparent`
  );
  return postprocess(
    fs.readFileSync(`${prefix}.svg`, "utf-8"),
    `remark-mermaid-postprocess-${theme}-`
  );
};

export default function remarkMermaid(
  options: RemarkMermaidOptions = defaultOptions
): Transformer {
  return (node: Node<Data>, vFile, callback) => {
    visit(node, (node) => node.type === "code", ((
      node: Code,
      index: number,
      parent: Parent
    ) => {
      const { lang, value, position } = node;

      if (lang !== "mermaid") return SKIP;

      const newNodes = options.themes.map((theme) => ({
        type: "html",
        value: `<div class="remark-mermaid remark-mermaid-${theme}">${renderSVG(
          value,
          theme
        )}</div>`,
      }));

      parent.children.splice(index, 1, ...newNodes);

      return SKIP;
    }) as any);

    if (typeof callback === "function") return callback(null, node, vFile);
    else return node;
  };
}
