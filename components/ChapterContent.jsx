export default function ChapterContent({ blocks }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return <h2 key={i}>{block.text}</h2>;
          case "ul":
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre key={i}>
                <code>{block.text}</code>
              </pre>
            );
          case "quote":
            return <blockquote key={i}>{block.text}</blockquote>;
          case "p":
          default:
            return <p key={i}>{block.text}</p>;
        }
      })}
    </>
  );
}
