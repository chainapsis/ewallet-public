export function htmlFromString<T extends HTMLElement>(html: string): T {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild as T;
}

export function svgFromHtml(html: string): SVGSVGElement {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild as SVGSVGElement;
}
