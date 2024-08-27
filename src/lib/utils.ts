import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const KEYPAD = {
  "1": 0x1,
  "2": 0x2,
  "3": 0x3,
  "C": 0xC,
  "4": 0x4,
  "5": 0x5,
  "6": 0x6,
  "D": 0xD,
  "7": 0x7,
  "8": 0x8,
  "9": 0x9,
  "E": 0xE,
  "A": 0xA,
  "0": 0x0,
  "B": 0xB,
  "F": 0xF,
} as const;

export const KEYPAD_ORDER: Array<keyof typeof KEYPAD> = [
  "1", "2", "3", "C",
  "4", "5", "6", "D",
  "7", "8", "9", "E",
  "A", "0", "B", "F",
];
