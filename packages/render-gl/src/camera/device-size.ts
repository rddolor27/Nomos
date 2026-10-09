type OnSize = (deviceWidth: number, deviceHeight: number, dpr: number) => void;

function nativeSize(entry: ResizeObserverEntry): [number, number] {
  const { inlineSize, blockSize } = entry.devicePixelContentBoxSize[0];
  return [inlineSize, blockSize];
}

function roundedSize(entry: ResizeObserverEntry): [number, number] {
  const { width, height } = entry.contentRect;
  return [Math.round(width * devicePixelRatio), Math.round(height * devicePixelRatio)];
}

// Safari has no device-pixel-content-box, so there (and under forceFallback, for tests) the CSS size is rounded.
export function observeDeviceSize(element: Element, onSize: OnSize, forceFallback = false): () => void {
  const native = !forceFallback && 'devicePixelContentBoxSize' in ResizeObserverEntry.prototype;
  const sizeOf = native ? nativeSize : roundedSize;
  const options: ResizeObserverOptions = native ? { box: 'device-pixel-content-box' } : {};
  const observer = new ResizeObserver((entries) => {
    const [width, height] = sizeOf(entries[entries.length - 1]);
    onSize(width, height, devicePixelRatio);
  });

  // A zoom or a move to another screen changes the ratio without always changing the size, so the observer alone could
  // miss it. Observing again makes it report the size afresh, under the new ratio.
  let ratioQuery: MediaQueryList;
  const watchRatio = (): void => {
    ratioQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    ratioQuery.addEventListener('change', onRatioChange, { once: true });
  };
  const onRatioChange = (): void => {
    watchRatio();
    observer.unobserve(element);
    observer.observe(element, options);
  };

  observer.observe(element, options);
  watchRatio();
  return () => {
    observer.disconnect();
    ratioQuery.removeEventListener('change', onRatioChange);
  };
}
