import { loadAtlasPage, type AtlasPage } from '@nomos/render-gl/map';

let page: Promise<AtlasPage> | null = null;

// The town atlas, fetched and decoded once for the page, since the Town skin and the blob portrait draw from the same page.
export function townAtlas(): Promise<AtlasPage> {
  const base = document.baseURI;
  page ??= loadAtlasPage(new URL('atlas/atlas.json', base).href, new URL('atlas/atlas.webp', base).href);
  return page;
}
