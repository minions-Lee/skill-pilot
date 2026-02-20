import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownViewProps {
  content: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-[15px] font-bold text-[var(--color-text)] mt-4 mb-2 pb-1 border-b border-[var(--color-border)]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[14px] font-semibold text-[var(--color-text)] mt-3 mb-1.5 pb-1 border-b border-[var(--color-border)]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[13px] font-semibold text-[var(--color-text)] mt-2.5 mb-1">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-semibold text-[var(--color-text)] mt-2 mb-1">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-2">
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--color-accent)] hover:underline"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside text-[13px] text-[var(--color-text-secondary)] mb-2 space-y-0.5 pl-2">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside text-[13px] text-[var(--color-text-secondary)] mb-2 space-y-0.5 pl-2">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
      {children}
    </li>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code
          className={`block bg-[var(--color-surface)] rounded-md p-3 text-[12px] font-mono text-[var(--color-text)] overflow-x-auto whitespace-pre ${className ?? ""}`}
        >
          {children}
        </code>
      );
    }
    return (
      <code className="bg-[var(--color-surface)] rounded px-1.5 py-0.5 text-[12px] font-mono text-[var(--color-accent)]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-[var(--color-surface)] rounded-md mb-2 overflow-x-auto border border-[var(--color-border)]">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--color-accent)] pl-3 my-2 text-[13px] text-[var(--color-text-muted)] italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-[13px] border-collapse border border-[var(--color-border)]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--color-surface)]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-[var(--color-border)] px-3 py-1.5 text-left text-[12px] font-semibold text-[var(--color-text)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)]">
      {children}
    </td>
  ),
  hr: () => <hr className="border-[var(--color-border)] my-3" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--color-text)]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[var(--color-text-secondary)]">{children}</em>
  ),
};

export function MarkdownView({ content }: MarkdownViewProps) {
  if (!content) {
    return (
      <p className="text-xs text-[var(--color-text-muted)] italic">
        No SKILL.md content available.
      </p>
    );
  }

  return (
    <div className="markdown-view">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
