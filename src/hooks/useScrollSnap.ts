export function useScrollSnap() {
  const containerClass = 'h-screen overflow-y-auto snap-y snap-proximity relative';
  const sectionClass = 'snap-start';

  return { containerClass, sectionClass } as const;
}
