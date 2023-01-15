import type { Transformer } from "unified";
import { Parent, SKIP, visit } from "unist-util-visit";
import type { Node } from "unist";
import { Data } from "vfile";
import { execSync } from "child_process";
import * as fs from "fs";
import which from "which";
import type { Code } from "mdast";

type RemarkMermaidOptions = {
  themes: string[];
};

const defaultOptions = {
  themes: ["default"],
};

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
  return fs.readFileSync(`${prefix}.svg`, "utf-8");
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
