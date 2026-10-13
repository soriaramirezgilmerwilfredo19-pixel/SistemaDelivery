export default function Stars({ value = 0, size = '1rem' }) {
  const rounded = Math.round(Number(value));
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? 'star star-on' : 'star'}>★</span>
      ))}
    </span>
  );
}
