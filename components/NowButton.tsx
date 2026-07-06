export function NowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[68px] py-2 rounded-lg font-normal text-center"
      style={{ backgroundColor: "#000000", color: "#ffffff" }}
    >
      Now
    </button>
  );
}