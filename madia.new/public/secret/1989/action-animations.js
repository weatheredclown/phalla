const defaultSelectors = [
  'button',
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  'a[data-action]'
];

function resetAnimation(element, className) {
  if (!element.classList.contains(className)) {
    return;
  }
  element.classList.remove(className);
  // Force reflow for Safari/WebKit to restart the animation
  void element.offsetWidth;
  element.classList.add(className);
}

export function animateAction(element, variant = 'pulse') {
  if (!element) {
    return;
  }
  const baseClass = 'action-animate';
  const variantClass = `${baseClass}--${variant}`;
  element.classList.remove(baseClass, variantClass);
  // Force restart when applying twice quickly
  void element.offsetWidth;
  element.classList.add(baseClass, variantClass);
  const cleanup = () => {
    element.classList.remove(baseClass, variantClass);
  };
  element.addEventListener('animationend', cleanup, { once: true });
}

export function enableActionAnimations(options = {}) {
  const { root = document.body, selectors = defaultSelectors, variant = 'press' } = options;
  if (!root) {
    return () => {};
  }
  const handleClick = (event) => {
    for (const selector of selectors) {
      const target = event.target.closest(selector);
      if (!target) {
        continue;
      }
      if ('disabled' in target && target.disabled) {
        continue;
      }
      const customVariant = target.dataset.actionAnim || variant;
      animateAction(target, customVariant);
      return;
    }
  };
  root.addEventListener('click', handleClick);
  return () => {
    root.removeEventListener('click', handleClick);
  };
}

export function animateListEntry(element, variant = 'flash') {
  if (!element) {
    return;
  }
  const baseClass = 'action-animate';
  const variantClass = `${baseClass}--${variant}`;
  resetAnimation(element, variantClass);
  animateAction(element, variant);
}

export function animateCounter(element) {
  animateAction(element, 'score');
}

export function animateWarning(element) {
  animateAction(element, 'shake');
}
