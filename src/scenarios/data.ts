export interface Fruit {
  readonly value: string;
  readonly label: string;
}

const BASE: readonly Fruit[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
  { value: 'mango', label: 'Mango' },
];

function requestedSize(): number {
  if (typeof location === 'undefined') {
    return BASE.length;
  }
  const size = Number(new URLSearchParams(location.search).get('size'));
  return Number.isInteger(size) && size > BASE.length ? size : BASE.length;
}

export const FRUITS: readonly Fruit[] = [
  ...BASE,
  ...Array.from({ length: requestedSize() - BASE.length }, (_, index) => ({
    value: `item-${index + BASE.length + 1}`,
    label: `Item ${index + BASE.length + 1}`,
  })),
];
