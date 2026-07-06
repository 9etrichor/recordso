import { RefObject } from "react";

export function CalendarButton({ inputRef, small }: { inputRef: RefObject<HTMLInputElement | null>; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.showPicker()}
      className={`rounded-lg font-normal ${small ? "p-1.5" : "px-3 py-2"}`}
      style={{ backgroundColor: "#000000", color: "#ffffff" }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className={small ? "h-4 w-4" : "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>
  );
}
