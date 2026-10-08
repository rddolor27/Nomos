import { SKINS, type Skin } from './skin.ts';

// What the toggle needs of a renderer. setSkin answers with the skin it will really draw.
export interface SkinRenderer {
  setSkin(skin: Skin): Skin;
  setLod(policy: 'auto' | 'fixed'): void;
}

const CHOICES = ['auto', ...SKINS] as const;
type Choice = (typeof CHOICES)[number];

function labelOf(choice: Choice): string {
  return choice.charAt(0).toUpperCase() + choice.slice(1);
}

function choose(renderer: SkinRenderer, choice: Choice, output: HTMLOutputElement): void {
  if (choice === 'auto') {
    renderer.setLod('auto');
    output.value = '';
    return;
  }
  renderer.setLod('fixed');
  const drawn = renderer.setSkin(choice);
  output.value = drawn === choice ? '' : `${labelOf(choice)} is not built yet: showing ${drawn}`;
}

// Radios share the name "skin", so the arrow keys move between them; mount one toggle per page.
export function mountSkinToggle(parent: HTMLElement, renderer: SkinRenderer, initial: Skin | 'auto'): HTMLFieldSetElement {
  const doc = parent.ownerDocument;
  const fieldset = doc.createElement('fieldset');
  const legend = doc.createElement('legend');
  legend.textContent = 'Skin';
  const output = doc.createElement('output');
  output.setAttribute('aria-live', 'polite');
  fieldset.append(legend);
  for (const choice of CHOICES) {
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = 'skin';
    input.value = choice;
    input.checked = choice === initial;
    input.addEventListener('change', () => {
      choose(renderer, choice, output);
    });
    const label = doc.createElement('label');
    label.append(input, labelOf(choice));
    fieldset.append(label);
  }
  fieldset.append(output);
  choose(renderer, initial, output);
  parent.append(fieldset);
  return fieldset;
}
