export function NowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-white font-medium"
      style={{ backgroundColor: "#B05B2D" }}
    >
      Now
    </button>
  );
}
