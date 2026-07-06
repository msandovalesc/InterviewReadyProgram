const BAR_HEIGHTS = [12, 22, 16, 28, 14, 20, 10, 24, 18];

export default function Waveform() {
  return (
    <div className="waveform">
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="waveform-bar"
          style={{
            height: h,
            animationDuration: `${0.35 + i * 0.07}s`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}
