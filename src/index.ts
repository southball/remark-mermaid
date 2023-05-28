import type { Transformer } from "unified";
import { Parent, SKIP, visit } from "unist-util-visit";
import type { Node } from "unist";
import { Data } from "vfile";
import { exec } from "child_process";
import * as fs from "fs";
import which from "which";
import type { Code } from "mdast";
import jsdom from "jsdom";
import * as os from "os";

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
const renderSVG = async (
  mermaidContent: string,
  theme: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const prefix = `${os.tmpdir()}/mermaid-${Math.random()}`;
    fs.writeFileSync(`${prefix}.mmd`, mermaidContent);
    exec(
      `${which.sync("mmdc")} ` +
        `-i "${prefix}.mmd" ` +
        `-o "${prefix}.svg" ` +
        `-t ${theme} ` +
        `-b transparent`,
      (err, data) => {
        if (err) reject(err);
        else {
          resolve(
            postprocess(
              fs.readFileSync(`${prefix}.svg`, "utf-8"),
              `remark-mermaid-postprocess-${theme}-`
            )
          );
        }
      }
    );
  });
};

export default function remarkMermaid(
  options: RemarkMermaidOptions = defaultOptions
): Transformer {
  let diagramCount = 0;
  const diagramThemes: string[] = [];
  const diagrams: Promise<string>[] = [];
  let awaitedDiagrams: string[];

  return async (node: Node<Data>, vFile, callback) => {
    visit(node, (node) => node.type === "code", ((
      node: Code,
      index: number,
      parent: Parent
    ) => {
      const { lang, value, position } = node;

      if (lang !== "mermaid") return SKIP;

      const newNodes = options.themes.map((theme) => {
        diagrams.push(renderSVG(value, theme));
        diagramThemes.push(theme);
        return {
          type: "html",
          value: `REMARK_MERMAID_INTERNAL:${diagramCount++}`,
        };
      });

      parent.children.splice(index, 1, ...newNodes);

      return SKIP;
    }) as any);

    awaitedDiagrams = await Promise.all(diagrams);

    visit(node, (node) => node.type === "html", ((
      node: Code,
      index: number,
      parent: Parent
    ) => {
      const { value } = node;

      if (!value.startsWith("REMARK_MERMAID_INTERNAL:")) return SKIP;

      const diagramId = parseInt(value.replace("REMARK_MERMAID_INTERNAL:", ""));

      const newNode = {
        type: "html",
        value: `<div class="remark-mermaid remark-mermaid-${diagramThemes[diagramId]}">${awaitedDiagrams[diagramId]}</div>`,
      };

      parent.children.splice(index, 1, newNode);

      return SKIP;
    }) as any);

    if (typeof callback === "function") return callback(null, node, vFile);
    else return node;
  };
}
