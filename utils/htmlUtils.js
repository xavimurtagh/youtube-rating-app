// utils/htmlUtils.js
export function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return text;
  
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}

export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
