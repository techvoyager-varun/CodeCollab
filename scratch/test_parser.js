const React = {
  createElement: (type, props, ...children) => ({ type, props, children })
};

function parseInlineMarkdown(text) {
  const parts = [];
  let remaining = text;
  
  while (remaining) {
    const boldIndex = remaining.indexOf('**');
    const codeIndex = remaining.indexOf('`');
    
    if (boldIndex === -1 && codeIndex === -1) {
      parts.push(remaining);
      break;
    }
    
    if (boldIndex !== -1 && (codeIndex === -1 || boldIndex < codeIndex)) {
      if (boldIndex > 0) {
        parts.push(remaining.substring(0, boldIndex));
      }
      const rest = remaining.substring(boldIndex + 2);
      const closeIndex = rest.indexOf('**');
      if (closeIndex === -1) {
        parts.push(remaining.substring(boldIndex));
        break;
      }
      parts.push(
        React.createElement('strong', { key: `b-${remaining.length}` }, rest.substring(0, closeIndex))
      );
      remaining = rest.substring(closeIndex + 2);
    } else {
      if (codeIndex > 0) {
        parts.push(remaining.substring(0, codeIndex));
      }
      const rest = remaining.substring(codeIndex + 1);
      const closeIndex = rest.indexOf('`');
      if (closeIndex === -1) {
        parts.push(remaining.substring(codeIndex));
        break;
      }
      parts.push(
        React.createElement('code', { key: `c-${remaining.length}` }, rest.substring(0, closeIndex))
      );
      remaining = rest.substring(closeIndex + 1);
    }
  }
  
  return parts;
}

const input = "* **Purpose:** This line imports...";
const listContent = input.replace(/^\s*[\-\*]\s+/, '');
console.log('listContent:', JSON.stringify(listContent));
console.log('Result:', JSON.stringify(parseInlineMarkdown(listContent), null, 2));
