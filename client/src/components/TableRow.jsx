// Wraps a <tr> and sets --row-idx for stagger animation
export default function TableRow({ index = 0, flash = false, children, ...props }) {
  return (
    <tr
      style={{ '--row-idx': index }}
      className={flash ? 'row-flash' : undefined}
      {...props}
    >
      {children}
    </tr>
  );
}
