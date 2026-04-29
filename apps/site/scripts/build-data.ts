import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const postsDir = path.resolve(process.cwd(), "../../content/posts");
const outputFile = path.resolve(process.cwd(), "./src/generated/posts.json");

async function markdownToHtml(markdown: string) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

async function main() {
  try {
    const files = await fs.readdir(postsDir);
    const posts = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const fullPath = path.join(postsDir, file);
      const raw = await fs.readFile(fullPath, "utf-8");
      const { data, content } = matter(raw);

      const html = await markdownToHtml(content);

      posts.push({
        ...data,
        slug: data.slug || file.replace(".md", ""),
        html,
        date: data.date || new Date().toISOString(),
      });
    }

    // 按日期倒序
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(posts, null, 2));
    console.log(`Successfully generated ${posts.length} posts.`);
  } catch (err) {
    console.error("Build data failed:", err);
    // 如果目录不存在，先创建一个空的 posts.json
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, "[]");
  }
}

main();
