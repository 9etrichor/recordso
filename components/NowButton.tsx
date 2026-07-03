export function NowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg font-normal"
      style={{ backgroundColor: "#000000", color: "#ffffff" }}
    >
      Now
    </button>
  );
}