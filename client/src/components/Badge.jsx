// Props: variant ("green"|"red"|"orange"|"yellow"|"blue"|"gray"), children
export default function Badge({ variant = 'gray', children }) {
  return (
    <span className={`badge ${variant}`}>
      {children}
    </span>
  );
}
